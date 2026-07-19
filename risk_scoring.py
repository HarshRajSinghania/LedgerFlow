"""
Risk scoring — sits AROUND the deterministic matching engine, same principle
as ai_insights.py: the matching logic in reconciliation_engine.py never
changes based on this. This module only ever reads a finished report and
adds a Risk_Score (0-100) and Risk_Flags (list of short reason codes) so the
Exceptions queue can be triaged by "how likely is this to be a real
problem" instead of raw £ amount alone.

All heuristics are deterministic and explainable - every flag can be traced
back to a concrete rule, which matters for an audit tool: "the AI thought so"
is not an acceptable answer to a finance controller, "flagged because this
invoice is £10,000.00 exactly and no PO exists" is.

Heuristics (each adds points, capped at 100):
  - ROUND_AMOUNT      total is a suspiciously round number (classic manual/
                       fabricated-invoice tell)
  - PRICE_DEVIATION    unit price is far from the median price this same
                       product has been billed/ordered at elsewhere in the
                       dataset
  - SUPPLIER_VELOCITY  this supplier has an unusually high number of
                       exception lines relative to other suppliers
  - THRESHOLD_SHAVING  amount sits just under a common approval threshold
                       (e.g. 4,950 when the approval limit is likely 5,000)
  - NO_PO_HIGH_VALUE   missing-in-PO with high financial exposure - the
                       highest-risk category structurally, weighted up
"""

import pandas as pd

COMMON_THRESHOLDS = [1000, 5000, 10000, 25000, 50000]
THRESHOLD_SHAVE_WINDOW = 0.03  # within 3% below a threshold counts as "shaving"


def _is_round_amount(x) -> bool:
    if x is None or pd.isna(x) or x <= 0:
        return False
    return (x % 500 == 0) or (x % 100 == 0 and x >= 1000)


def _is_threshold_shave(x) -> bool:
    if x is None or pd.isna(x) or x <= 0:
        return False
    for t in COMMON_THRESHOLDS:
        if t * (1 - THRESHOLD_SHAVE_WINDOW) <= x < t:
            return True
    return False


def score_report(report: pd.DataFrame) -> pd.DataFrame:
    """Adds Risk_Score (int) and Risk_Flags (list[str]) columns."""
    report = report.copy()

    # Median unit price per product, computed across whatever price is
    # available (PO or Invoice) for that product, to catch price deviation.
    price_series = report["PO_Unit_Price"].combine_first(report["Invoice_Unit_Price"])
    median_price_by_product = (
        pd.DataFrame({"Product_Code": report["Product_Code"], "Price": price_series})
        .dropna()
        .groupby("Product_Code")["Price"]
        .median()
    )

    # Exception-line count per supplier, to flag suppliers generating an
    # outsized share of problems relative to how often they appear at all.
    non_matched = report[report["Status"] != "MATCHED"]
    exceptions_per_supplier = non_matched["Supplier"].value_counts()
    lines_per_supplier = report["Supplier"].value_counts()
    supplier_exception_rate = (exceptions_per_supplier / lines_per_supplier).fillna(0)

    scores, flags_col = [], []

    for _, row in report.iterrows():
        score = 0
        flags = []

        if row["Status"] == "MATCHED":
            scores.append(0)
            flags_col.append([])
            continue

        # Structural base risk by status
        if row["Status"] == "MISSING_IN_PO":
            score += 25
            if (row["Financial_Exposure"] or 0) > 2000:
                score += 15
                flags.append("NO_PO_HIGH_VALUE")
        elif row["Status"] == "VALUE_MISMATCH":
            score += 20
        elif row["Status"].startswith("DUPLICATE_KEY"):
            score += 15
        elif row["Status"] == "MISSING_IN_INVOICE":
            score += 5  # usually benign timing gap, low base risk

        amount = row["Invoice_Total"] if row["Invoice_Total"] is not None else row["PO_Total"]

        if _is_round_amount(amount):
            score += 15
            flags.append("ROUND_AMOUNT")

        if _is_threshold_shave(amount):
            score += 20
            flags.append("THRESHOLD_SHAVING")

        price = row["Invoice_Unit_Price"] if row["Invoice_Unit_Price"] is not None else row["PO_Unit_Price"]
        median_price = median_price_by_product.get(row["Product_Code"])
        if price is not None and median_price and median_price > 0:
            deviation = abs(price - median_price) / median_price
            if deviation > 0.25:
                score += min(20, int(deviation * 40))
                flags.append("PRICE_DEVIATION")

        supplier_rate = supplier_exception_rate.get(row["Supplier"], 0)
        if supplier_rate > 0.5 and lines_per_supplier.get(row["Supplier"], 0) >= 3:
            score += 10
            flags.append("SUPPLIER_VELOCITY")

        scores.append(min(100, score))
        flags_col.append(flags)

    report["Risk_Score"] = scores
    report["Risk_Flags"] = flags_col
    return report
