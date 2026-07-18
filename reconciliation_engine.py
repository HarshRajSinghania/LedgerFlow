"""LedgerFlow Invoice Reconciliation Engine
=========================================
Implements the 4-stage flow required by the brief:
  1. Ingestion  - read + validate both files
  2. Mapping    - align columns, build composite key (Invoice_ID + Product_Code)
  3. Matching   - two-way match, classify every line
  4. Output     - audit-ready Excel report

Design decisions (so you can defend them):
- Matching is 100% deterministic. No fuzzy thresholds, no LLM in the matching
  loop. AI is used only *around* the deterministic core (see ai_insights.py) -
  for column-mapping resilience and for narrating exceptions in plain English.
- Four statuses, not three. The brief lists MATCHED / MISSING IN INVOICE /
  MISSING IN PO, but a key can appear in both files with different Qty,
  Unit_Price, or Total. That case can't honestly be called "matched", so it
  gets its own status: VALUE_MISMATCH. Silently folding it into MATCHED
  would be a control failure, not a feature.
- Duplicate keys (same Invoice_ID + Product_Code appearing twice in one
  file) are flagged, never silently summed or overwritten - an auditor
  needs to see that, not have it hidden by an aggregation choice we made
  for them.
- Total != Quantity * Unit_Price is treated as a separate data-integrity
  check, independent of PO/Invoice matching, because it's a defect in the
  row itself, not a mismatch between the two files.
"""

import re
from dataclasses import dataclass, field
from datetime import datetime

import pandas as pd

REQUIRED_COLUMNS = [
    "Invoice_ID", "Supplier", "Date", "Product_Code",
    "Product_Name", "Quantity", "Unit_Price", "Total",
]

# Accepts near-miss headers (case/whitespace/underscore variants) so the tool
# survives a supplier sending "Qty" instead of "Quantity", etc.
COLUMN_ALIASES = {
    "invoiceid": "Invoice_ID", "invoice_id": "Invoice_ID", "poref": "Invoice_ID",
    "po": "Invoice_ID", "ponumber": "Invoice_ID", "po_number": "Invoice_ID",
    "poid": "Invoice_ID", "po_id": "Invoice_ID",
    "supplier": "Supplier", "vendor": "Supplier",
    "date": "Date", "invoicedate": "Date", "podate": "Date",
    "productcode": "Product_Code", "product_code": "Product_Code", "sku": "Product_Code",
    "productname": "Product_Name", "product_name": "Product_Name", "description": "Product_Name",
    "quantity": "Quantity", "qty": "Quantity",
    "unitprice": "Unit_Price", "unit_price": "Unit_Price", "price": "Unit_Price",
    "total": "Total", "totalprice": "Total", "linetotal": "Total", "amount": "Total",
}


def _normalize_header(h: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(h).strip().lower())


@dataclass
class IngestResult:
    df: pd.DataFrame
    warnings: list = field(default_factory=list)
    column_map: dict = field(default_factory=dict)


class ReconciliationError(Exception):
    pass


def ingest(path_or_buffer, label: str) -> IngestResult:
    """Stage 1: Ingestion. Reads the file, maps columns to the canonical
    schema, coerces types, and quarantines rows that can't be salvaged
    instead of crashing the whole run."""
    warnings = []

    raw = pd.read_excel(path_or_buffer, dtype=str)
    raw = raw.dropna(how="all")  # drop fully blank rows

    # --- Mapping (column-level) ---
    col_map = {}
    for col in raw.columns:
        norm = _normalize_header(col)
        canonical = COLUMN_ALIASES.get(norm)
        if canonical:
            col_map[col] = canonical
        elif col in REQUIRED_COLUMNS:
            col_map[col] = col

    df = raw.rename(columns=col_map)

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ReconciliationError(
            f"{label}: missing required column(s) after mapping: {missing}. "
            f"Found columns: {list(raw.columns)}"
        )

    df = df[REQUIRED_COLUMNS].copy()

    # --- Type coercion, row by row salvage ---
    good_rows, bad_rows = [], []
    for idx, row in df.iterrows():
        try:
            invoice_id = str(row["Invoice_ID"]).strip().upper()
            product_code = str(row["Product_Code"]).strip().upper()
            supplier = str(row["Supplier"]).strip()
            product_name = str(row["Product_Name"]).strip()

            if not invoice_id or invoice_id == "NAN" or not product_code or product_code == "NAN":
                raise ValueError("empty key field")

            date = pd.to_datetime(row["Date"], dayfirst=True, errors="raise")
            quantity = float(row["Quantity"])
            unit_price = float(row["Unit_Price"])
            total = float(row["Total"])

            good_rows.append({
                "Invoice_ID": invoice_id,
                "Supplier": supplier,
                "Date": date,
                "Product_Code": product_code,
                "Product_Name": product_name,
                "Quantity": quantity,
                "Unit_Price": unit_price,
                "Total": total,
                "_source_row": idx + 2,  # +2: header row + 0-index
            })
        except Exception as e:
            bad_rows.append((idx + 2, str(e)))

    if bad_rows:
        warnings.append(
            f"{label}: quarantined {len(bad_rows)} unparseable row(s): "
            + "; ".join(f"row {r} ({msg})" for r, msg in bad_rows[:10])
            + (" ..." if len(bad_rows) > 10 else "")
        )

    clean = pd.DataFrame(good_rows)
    if clean.empty:
        raise ReconciliationError(f"{label}: no valid rows after ingestion.")

    # --- Data-integrity check: Total should equal Quantity * Unit_Price ---
    calc_total = (clean["Quantity"] * clean["Unit_Price"]).round(2)
    bad_calc = clean[(clean["Total"] - calc_total).abs() > 0.01]
    if not bad_calc.empty:
        warnings.append(
            f"{label}: {len(bad_calc)} row(s) where Total != Quantity x Unit_Price "
            f"(source rows: {list(bad_calc['_source_row'])[:10]})"
        )
    clean["_calc_total_check"] = (clean["Total"] - calc_total).abs() <= 0.01

    # --- Duplicate key detection (flag, never silently merge) ---
    clean["_key"] = clean["Invoice_ID"] + "|" + clean["Product_Code"]
    dup_mask = clean["_key"].duplicated(keep=False)
    if dup_mask.any():
        dup_keys = sorted(clean.loc[dup_mask, "_key"].unique())
        warnings.append(
            f"{label}: {len(dup_keys)} key(s) appear more than once within this file "
            f"and were flagged as DUPLICATE_KEY rather than merged: {dup_keys[:10]}"
        )
    clean["_is_duplicate"] = dup_mask

    return IngestResult(df=clean, warnings=warnings, column_map=col_map)


def match(po: pd.DataFrame, inv: pd.DataFrame) -> pd.DataFrame:
    """Stage 3: Matching. Two-way match on Invoice_ID + Product_Code."""
    po_dupe_keys = set(po.loc[po["_is_duplicate"], "_key"])
    inv_dupe_keys = set(inv.loc[inv["_is_duplicate"], "_key"])

    po_i = po.set_index("_key")
    inv_i = inv.set_index("_key")

    all_keys = sorted(set(po_i.index) | set(inv_i.index))
    rows = []

    for key in all_keys:
        in_po = key in po_i.index
        in_inv = key in inv_i.index
        is_dup = key in po_dupe_keys or key in inv_dupe_keys

        if is_dup:
            # Don't attempt automated matching on an ambiguous key - surface
            # every physical row for manual review instead of guessing which
            # duplicate pairs with which.
            for _, r in (po.loc[po["_key"] == key] if in_po else pd.DataFrame()).iterrows():
                rows.append(_row(key, "DUPLICATE_KEY_IN_PO", r, None))
            for _, r in (inv.loc[inv["_key"] == key] if in_inv else pd.DataFrame()).iterrows():
                rows.append(_row(key, "DUPLICATE_KEY_IN_INVOICE", None, r))
            continue

        if in_po and not in_inv:
            rows.append(_row(key, "MISSING_IN_INVOICE", po_i.loc[key], None))
        elif in_inv and not in_po:
            rows.append(_row(key, "MISSING_IN_PO", None, inv_i.loc[key]))
        else:
            p, i = po_i.loc[key], inv_i.loc[key]
            same = (
                abs(p["Quantity"] - i["Quantity"]) < 1e-9
                and abs(p["Unit_Price"] - i["Unit_Price"]) < 1e-9
                and abs(p["Total"] - i["Total"]) < 1e-9
            )
            status = "MATCHED" if same else "VALUE_MISMATCH"
            rows.append(_row(key, status, p, i))

    return pd.DataFrame(rows)


def _row(key, status, po_row, inv_row):
    def g(row, col):
        return row[col] if row is not None else None

    po_total = g(po_row, "Total")
    inv_total = g(inv_row, "Total")
    diff = None
    if po_total is not None and inv_total is not None:
        diff = round(inv_total - po_total, 2)
    elif po_total is not None:
        diff = round(-po_total, 2)  # billed 0, ordered po_total -> exposure if it never gets invoiced is n/a; kept None-safe below
        diff = None
    elif inv_total is not None:
        diff = round(inv_total, 2)  # full invoice amount is at risk - nothing was ordered

    return {
        "Invoice_ID": key.split("|")[0],
        "Product_Code": key.split("|")[1],
        "Status": status,
        "Supplier": g(po_row, "Supplier") or g(inv_row, "Supplier"),
        "Product_Name": g(po_row, "Product_Name") or g(inv_row, "Product_Name"),
        "PO_Date": g(po_row, "Date"),
        "Invoice_Date": g(inv_row, "Date"),
        "PO_Quantity": g(po_row, "Quantity"),
        "Invoice_Quantity": g(inv_row, "Quantity"),
        "PO_Unit_Price": g(po_row, "Unit_Price"),
        "Invoice_Unit_Price": g(inv_row, "Unit_Price"),
        "PO_Total": po_total,
        "Invoice_Total": inv_total,
        "Financial_Exposure": inv_total if (inv_total is not None and po_total is None) else (
            diff if diff is not None else 0.0
        ),
    }


def run_reconciliation(po_path, inv_path):
    """End-to-end: ingest both files, match, return (report_df, warnings, stats)."""
    po_result = ingest(po_path, "Purchase Orders")
    inv_result = ingest(inv_path, "Invoices")

    report = match(po_result.df, inv_result.df)

    status_order = {
        "MISSING_IN_PO": 0,
        "DUPLICATE_KEY_IN_PO": 1,
        "DUPLICATE_KEY_IN_INVOICE": 1,
        "VALUE_MISMATCH": 2,
        "MISSING_IN_INVOICE": 3,
        "MATCHED": 4,
    }
    report["_sort"] = report["Status"].map(status_order)
    report = report.sort_values(
        ["_sort", "Financial_Exposure"], ascending=[True, False]
    ).drop(columns="_sort").reset_index(drop=True)

    stats = {
        "total_lines": len(report),
        "matched": int((report["Status"] == "MATCHED").sum()),
        "missing_in_invoice": int((report["Status"] == "MISSING_IN_INVOICE").sum()),
        "missing_in_po": int((report["Status"] == "MISSING_IN_PO").sum()),
        "value_mismatch": int((report["Status"] == "VALUE_MISMATCH").sum()),
        "duplicates": int(report["Status"].str.startswith("DUPLICATE_KEY").sum()),
        "total_exposure": float(
            report.loc[report["Status"] != "MATCHED", "Financial_Exposure"].abs().sum()
        ),
        "po_row_count": len(po_result.df),
        "invoice_row_count": len(inv_result.df),
    }

    all_warnings = po_result.warnings + inv_result.warnings
    return report, all_warnings, stats