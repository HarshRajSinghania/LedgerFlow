"""
AI layer - sits AROUND the deterministic matching engine, never inside it.

Two jobs:
  1. Executive summary  - a few plain-English sentences for the finance team.
  2. Exception narration - per-row explanation of *why* a line was flagged,
     with a confidence tag, mirroring the [Confirmed]/[Likely]/[Insufficient
     evidence] pattern from the Antarctica triage pipeline.

If NVIDIA_API_KEY is set in the environment, this calls NVIDIA NIM (via OpenAI compatible API).
If not, it falls back to a deterministic, rule-based narrator so the app still
demos end-to-end with zero setup. The fallback is not a toy - it's what
ships when a judge asks "what if the API is down at demo time?".
"""

import os

import pandas as pd

# Try to import OpenAI for NVIDIA NIM
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

MODEL = "nvidia/nemotron-4-340b-instruct"  # Example model, can be configured via env
BASE_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")


def _get_client():
    """Initialize OpenAI client for NVIDIA NIM if API key is available."""
    if not OPENAI_AVAILABLE:
        return None
    key = os.environ.get("NVIDIA_API_KEY")
    if not key:
        return None
    try:
        return OpenAI(
            base_url=BASE_URL,
            api_key=key
        )
    except Exception:
        return None


def _rule_based_note(row) -> tuple[str, str]:
    """Fallback narrator. Returns (note, confidence)."""
    status = row["Status"]
    exposure = row.get("Financial_Exposure") or 0

    if status == "MISSING_IN_PO":
        return (
            f"Invoice {row['Invoice_ID']} bills for {row['Product_Name']} "
            f"(£{abs(exposure):,.2f}) but no matching Purchase Order exists. "
            f"Could be an unauthorized purchase, a mis-typed PO reference, or a duplicate "
            f"invoice from the supplier. Hold for investigation before payment.",
            "Likely" if abs(exposure) > 1000 else "Insufficient evidence",
        )
    if status == "MISSING_IN_INVOICE":
        return (
            f"PO {row['Invoice_ID']} ordered {row['Product_Name']} but no invoice has "
            f"arrived yet. Likely goods in transit or an unbilled delivery - not a loss, "
            f"but track it so it doesn't get forgotten and paid twice later.",
            "Likely",
        )
    if status == "VALUE_MISMATCH":
        return (
            f"{row['Invoice_ID']}/{row['Product_Code']}: PO and Invoice both exist but "
            f"disagree (PO total £{row['PO_Total']:,.2f} vs Invoice total "
            f"£{row['Invoice_Total']:,.2f}). Classic overbilling/underbilling case - "
            f"verify quantity received and unit price against the supplier contract.",
            "Confirmed",
        )
    if status.startswith("DUPLICATE_KEY"):
        return (
            f"{row['Invoice_ID']}/{row['Product_Code']} appears more than once in the "
            f"same file. Automated matching was skipped for this key to avoid guessing "
            f"which rows pair together - needs manual review.",
            "Confirmed",
        )
    return ("", "")


def annotate_exceptions(report: pd.DataFrame) -> pd.DataFrame:
    """Adds AI_Note and AI_Confidence columns to non-MATCHED rows."""
    client = _get_client()
    notes, confidences = [], []

    exceptions = report[report["Status"] != "MATCHED"]

    if client is not None and len(exceptions) > 0:
        # Batch the exceptions into one call for efficiency
        rows_text = "\n".join(
            f"{i}. Status={r['Status']} Invoice_ID={r['Invoice_ID']} "
            f"Product={r['Product_Name']} PO_Total={r['PO_Total']} "
            f"Invoice_Total={r['Invoice_Total']} Exposure={r['Financial_Exposure']}"
            for i, r in exceptions.iterrows()
        )
        prompt = (
            "You are a finance audit assistant. For each numbered reconciliation "
            "exception below, write ONE short sentence (max 30 words) explaining the "
            "likely business cause and what the finance team should do, then tag it "
            "with a confidence: [Confirmed] if the data proves it, [Likely] if it's the "
            "probable explanation, or [Insufficient evidence] if you can't tell without "
            "more context. Reply as 'INDEX | note | confidence_tag' one per line, same "
            "order as given, no other text.\n\n" + rows_text
        )
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            content = resp.choices[0].message.content
            if content is None:
                raise ValueError("Empty response from NIM")
            text = content.strip()
            parsed = {}
            for line in text.splitlines():
                parts = line.split("|")
                if len(parts) >= 3:
                    idx = parts[0].strip()
                    parsed[idx] = (parts[1].strip(), parts[2].strip())
            for i, r in exceptions.iterrows():
                if str(i) in parsed:
                    n, c = parsed[str(i)]
                else:
                    n, c = _rule_based_note(r)
                notes.append((i, n))
                confidences.append((i, c))
        except Exception:
            # Fallback to rule-based on any error
            for i, r in exceptions.iterrows():
                n, c = _rule_based_note(r)
                notes.append((i, n))
                confidences.append((i, c))
    else:
        for i, r in exceptions.iterrows():
            n, c = _rule_based_note(r)
            notes.append((i, n))
            confidences.append((i, c))

    note_map = dict(notes)
    conf_map = dict(confidences)
    report = report.copy()
    report["AI_Note"] = report.index.map(lambda i: note_map.get(i, ""))
    report["AI_Confidence"] = report.index.map(lambda i: conf_map.get(i, ""))
    return report


def executive_summary(report: pd.DataFrame, stats: dict) -> str:
    """One paragraph for the finance team. Uses NVIDIA NIM if available, else rule-based."""
    client = _get_client()

    top_suppliers = (
        report[report["Status"] != "MATCHED"]
        .groupby("Supplier")["Financial_Exposure"]
        .apply(lambda s: s.abs().sum())
        .sort_values(ascending=False)
        .head(3)
    )

    if client is not None:
        prompt = (
            "Write a 4-6 sentence executive summary for a finance team, in plain "
            "English, based on this invoice reconciliation run. Be direct and specific "
            "with numbers. No headers, no bullet points, just prose.\n\n"
            f"Total lines reconciled: {stats['total_lines']}\n"
            f"Matched: {stats['matched']}\n"
            f"Missing in Invoice (goods ordered, not yet billed): {stats['missing_in_invoice']}\n"
            f"Missing in PO (billed with no matching order - possible fraud/error): {stats['missing_in_po']}\n"
            f"Value mismatches (billed differently than ordered): {stats['value_mismatch']}\n"
            f"Duplicate keys needing manual review: {stats['duplicates']}\n"
            f"Total financial exposure in unresolved lines: £{stats['total_exposure']:,.2f}\n"
            f"Top suppliers by exposure: {top_suppliers.to_dict()}\n"
        )
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )
            content = resp.choices[0].message.content
            if content is None:
                raise ValueError("Empty response from NIM")
            return content.strip()
        except Exception:
            pass  # Fallback to rule-based

    # Rule-based fallback
    top_str = ", ".join(f"{s} (£{v:,.2f})" for s, v in top_suppliers.items()) or "none"
    return (
        f"Reconciliation covered {stats['total_lines']} PO-product lines across the year. "
        f"{stats['matched']} lines matched cleanly and are cleared for payment. "
        f"{stats['missing_in_po']} invoice line(s), worth part of the £{stats['total_exposure']:,.2f} "
        f"total exposure, bill for goods with no corresponding Purchase Order and should be "
        f"held for investigation before payment - this is the highest-risk category. "
        f"{stats['missing_in_invoice']} PO line(s) have not yet been billed, which is normal "
        f"if goods are still in transit but should be tracked so they aren't paid twice later. "
        f"{stats['value_mismatch']} line(s) were billed at different quantities or prices than "
        f"ordered and need a manual pricing check. "
        f"Suppliers contributing the most exposure: {top_str}."
    )