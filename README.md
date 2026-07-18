# LedgerFlow Invoice Reconciliation — Backend API

Flask JSON API. No frontend here — the frontend team consumes these endpoints.

Matches Purchase Orders against Invoices on `Invoice_ID + Product_Code`,
flags every discrepancy, and returns a JSON report plus a downloadable
audit-ready Excel file — with an optional AI layer that writes plain-English
exception notes.

## Run it

### Backend API
```bash
pip install -r requirements.txt
python app.py            # dev server on http://localhost:5000
```

### Frontend Web App
```bash
cd frontend
npm install
npm run dev              # dev server on http://localhost:5173
```


### Optional: turn on NVIDIA NIM-powered exception notes

```bash
export NVIDIA_API_KEY=nvapi-...
python app.py
```

Without a key, the API still works end-to-end — it falls back to a
deterministic, rule-based narrator (see `ai_insights.py`), so the demo never
depends on network access or an API key.

## API

### `GET /api/health`
```json
{"status": "ok"}
```

### `POST /api/reconcile`
`multipart/form-data` with two file fields: `po_file`, `invoice_file` (both `.xlsx`).

```bash
curl -X POST http://localhost:5000/api/reconcile \\
  -F "po_file=@CircuitCo_PurchaseOrders.xlsx" \\
  -F "invoice_file=@CircuitCo_Invoices.xlsx"
```

Response `200`:
```json
{
  "job_id": "e18211f2-...",
  "stats": {
    "total_lines": 127, "matched": 73,
    "missing_in_invoice": 25, "missing_in_po": 29,
    "value_mismatch": 0, "duplicates": 0,
    "total_exposure": 59161.72,
    "po_row_count": 98, "invoice_row_count": 102
  },
  "summary": "Reconciliation covered 127 PO-product lines ...",
  "warnings": [],
  "report": [
    {
      "Invoice_ID": "PO-2010",
      "Product_Code": "LAP-002",
      "Status": "MISSING_IN_PO",
      "Supplier": "GadgetPro Distribution",
      "Product_Name": "HP Pavilion 15",
      "PO_Date": null,
      "Invoice_Date": "2024-04-16",
      "PO_Quantity": null,
      "Invoice_Quantity": 10.0,
      "PO_Unit_Price": null,
      "Invoice_Unit_Price": 700.0,
      "PO_Total": null,
      "Invoice_Total": 7000.0,
      "Financial_Exposure": 7000.0,
      "AI_Confidence": "Likely",
      "AI_Note": "Invoice PO-2010 bills for HP Pavilion 15 (£7,000.00) but no matching Purchase Order exists. ..."
    }
  ],
  "download_url": "/api/reconcile/e18211f2-.../download"
}
```
`Status` is one of: `MATCHED`, `MISSING_IN_INVOICE`, `MISSING_IN_PO`,
`VALUE_MISMATCH`, `DUPLICATE_KEY_IN_PO`, `DUPLICATE_KEY_IN_INVOICE`.
`report` is sorted worst-risk-first (missing-in-PO and mismatches before
matched lines), so the frontend can render top-to-bottom without re-sorting.

Error responses: `400` (missing/empty files), `422` (file structurally
invalid — e.g. required columns missing after mapping), `413` (>25MB), `500`
(unexpected).

### `GET /api/reconcile/<job_id>`
Re-fetches the same JSON as above for a previous job. `404` if the process
has restarted since (jobs are in-memory — see Notes).

### `GET /api/reconcile/<job_id>/download`
Streams the generated `.xlsx` (color-coded Summary / Reconciliation Report /
Exceptions tabs). `404` under the same condition as above.

## Files

| File | Purpose |
|------|---------|
| `app.py` | Flask routes only — no matching/formatting logic lives here. |
| `reconciliation_engine.py` | Ingestion, column mapping, deterministic matching. No AI here. |
| `ai_insights.py` | Executive summary + per-exception notes. Uses NVIDIA NIM if `NVIDIA_API_KEY` is set, else a rule-based fallback. |
| `report_writer.py` | Builds the formatted, color-coded Excel output. |

## Design decisions

- **Matching is 100% deterministic** — exact match on `Invoice_ID + Product_Code`,
  no fuzzy thresholds. AI sits *around* the matching engine (summary + notes),
  never inside the matching logic itself.
- **Four statuses, not three.** The brief names MATCHED / MISSING IN INVOICE /
  MISSING IN PO, but a key can exist in both files with different quantity,
  price, or total — that's a `VALUE_MISMATCH`, and calling it "matched" would
  be a control failure.
- **Duplicate keys are flagged, never merged.** If the same `Invoice_ID +
  Product_Code` appears twice in one file, the engine surfaces every row as
  `DUPLICATE_KEY_*` for manual review instead of guessing how to pair them.
- **Column-mapping is resilient** — `Qty` vs `Quantity`, `SKU` vs
  `Product_Code`, etc. are auto-aliased, so slightly different headers don't
  break ingestion.
- **Bad rows are quarantined, not fatal** — an unparseable date or blank key
  skips that row (reported in `warnings`) rather than crashing the whole job.

## Notes for the frontend team

- CORS is open (`flask-cors`, all origins) so you can hit this from any dev
  server during the hackathon. Lock it down before anything public-facing.
- Jobs live in an in-memory dict — fine for a single-process demo, but
  restarting the Flask process loses old job IDs. Swap `JOBS = {}` in
  `app.py` for Redis/a DB table if you need persistence across restarts.
- `report` in the POST response already contains everything needed to render
  a table client-side; you only need `/download` if the user wants the
  Excel file itself.

## Tested against

Ran the full pipeline through Flask's test client against the actual
`CircuitCo_PurchaseOrders.xlsx` / `CircuitCo_Invoices.xlsx`: 127 lines
reconciled, correct stats, valid JSON on every field (including the
NaT/NaN edge cases pandas produces for unmatched rows), working
download, and correct 400/404/413 error responses.