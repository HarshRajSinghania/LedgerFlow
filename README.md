# LedgerFlow — Invoice Reconciliation

Matches Purchase Orders against Invoices on `Invoice_ID + Product_Code`, flags
every discrepancy, scores each exception for risk, and gives the finance team
a workflow (approve/hold/escalate) plus an AI chat to interrogate the results
— not just a diff report.

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
npm run dev              # dev server on http://localhost:5173, proxies /api to :5000
```

### Optional: turn on NVIDIA NIM-powered AI notes and chat

```bash
export NVIDIA_API_KEY=nvapi-...
python app.py
```

Without a key, everything still works end-to-end — exception notes and the
Ask-AI panel both fall back to deterministic, rule-based logic (see
`ai_insights.py`), so the demo never depends on network access or an API key.

## What's new since the MVP

- **Risk scoring** (`risk_scoring.py`) — every exception gets a `Risk_Score`
  (0-100) and explainable `Risk_Flags` (`ROUND_AMOUNT`, `THRESHOLD_SHAVING`,
  `PRICE_DEVIATION`, `SUPPLIER_VELOCITY`, `NO_PO_HIGH_VALUE`). Deterministic
  and traceable — every flag is a concrete rule, not a black-box AI guess.
- **Ask-AI chat** (`POST /api/reconcile/<job_id>/ask`) — ask questions about
  the current run ("which supplier is riskiest?") and get an answer grounded
  in the actual report data, with a rule-based fallback for common question
  patterns when no API key is set.
- **Action workflow** (`POST /api/reconcile/<job_id>/action`) — Approve /
  Hold / Escalate / Clear any exception line. Persists to the job, updates
  the downloadable Excel, and shows up as a badge in the table — this is
  what turns the tool from "detects problems" into "automates the response."
- **Navbar** with New Run / History / Ask AI / Docs / GitHub links, and a
  slide-over AI chat panel (`AskAIPanel.jsx`).

## API

### `GET /api/health`
```json
{"status": "ok"}
```

### `POST /api/reconcile`
`multipart/form-data` with two file fields: `po_file`, `invoice_file` (both `.xlsx`).

```bash
curl -X POST http://localhost:5000/api/reconcile \
  -F "po_file=@CircuitCo_PurchaseOrders.xlsx" \
  -F "invoice_file=@CircuitCo_Invoices.xlsx"
```

Response `200`:
```json
{
  "job_id": "e18211f2-...",
  "po_name": "CircuitCo_PurchaseOrders.xlsx",
  "invoice_name": "CircuitCo_Invoices.xlsx",
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
      "Risk_Score": 40,
      "Risk_Flags": ["NO_PO_HIGH_VALUE"],
      "AI_Confidence": "Likely",
      "AI_Note": "Invoice PO-2010 bills for HP Pavilion 15 (£7,000.00) but no matching Purchase Order exists. ...",
      "Action": "",
      "Action_Note": ""
    }
  ],
  "download_url": "/api/reconcile/e18211f2-.../download"
}
```
`Status` is one of: `MATCHED`, `MISSING_IN_INVOICE`, `MISSING_IN_PO`,
`VALUE_MISMATCH`, `DUPLICATE_KEY_IN_PO`, `DUPLICATE_KEY_IN_INVOICE`.
`report` is sorted worst-risk-first, so the frontend can render top-to-bottom
without re-sorting.

Error responses: `400` (missing/empty files), `422` (file structurally
invalid — e.g. required columns missing after mapping), `413` (>25MB), `500`
(unexpected).

### `GET /api/reconcile/<job_id>`
Re-fetches the same JSON as above (including any actions taken since).
`404` if the process has restarted (jobs are in-memory — see Notes).

### `GET /api/reconcile/<job_id>/download`
Streams the generated `.xlsx` (Summary / Reconciliation Report / Exceptions
tabs, including Risk Score/Flags and any recorded Action). `404` under the
same condition as above.

### `POST /api/reconcile/<job_id>/ask`
```json
{"question": "which supplier is riskiest?"}
```
→
```json
{"answer": "Nexus Wholesale carries the most financial exposure among exceptions, at £20,991.97.", "confidence": "Rule-based"}
```
`confidence` is `"AI-generated"` when `NVIDIA_API_KEY` is set and the call
succeeds, otherwise `"Rule-based"`. The AI is only ever given the current
job's own numbers — it can't invent figures.

### `POST /api/reconcile/<job_id>/action`
```json
{"invoice_id": "PO-2001", "product_code": "ACC-002", "action": "HOLD", "note": "optional"}
```
`action` is one of `APPROVE`, `HOLD`, `ESCALATE`, `CLEAR`. Returns the
updated row and regenerates the downloadable Excel to match. `400` for an
invalid action or missing fields, `404` if the row doesn't exist.

## Files

| File | Purpose |
|------|---------|
| `app.py` | Flask routes only — no matching/scoring/formatting logic lives here. |
| `reconciliation_engine.py` | Ingestion, column mapping, deterministic matching. No AI here. |
| `risk_scoring.py` | Deterministic, explainable risk scoring — sits around the matching engine, same as the AI layer. |
| `ai_insights.py` | Executive summary, per-exception notes, and Ask-AI chat. Uses NVIDIA NIM if `NVIDIA_API_KEY` is set, else rule-based fallbacks. |
| `report_writer.py` | Builds the formatted, color-coded Excel output. |
| `frontend/src/App.jsx` | Shell, navbar, routing between upload/dashboard/history. |
| `frontend/src/components/UploadZone.jsx` | File upload + run trigger. |
| `frontend/src/components/StatsGrid.jsx` / `ReconciliationChart.jsx` | Dashboard metrics and charts. |
| `frontend/src/components/ReconciliationTable.jsx` | Sortable/filterable report table, row inspector, risk badges, action buttons. |
| `frontend/src/components/AskAIPanel.jsx` | Slide-over AI chat panel. |
| `frontend/src/components/HistorySidebar.jsx` | Past reconciliation runs (localStorage). |

## Design decisions

- **Matching is 100% deterministic** — exact match on `Invoice_ID + Product_Code`,
  no fuzzy thresholds. AI and risk scoring sit *around* the matching engine,
  never inside the matching logic itself.
- **Four statuses, not three.** The brief names MATCHED / MISSING IN INVOICE /
  MISSING IN PO, but a key can exist in both files with different quantity,
  price, or total — that's a `VALUE_MISMATCH`, and calling it "matched" would
  be a control failure.
- **Duplicate keys are flagged, never merged.** If the same `Invoice_ID +
  Product_Code` appears twice in one file, the engine surfaces every row as
  `DUPLICATE_KEY_*` for manual review instead of guessing how to pair them.
- **Risk flags are explainable, not black-box.** Every `Risk_Flags` entry
  traces to a concrete, statable rule (round amount, threshold shaving,
  price deviation, supplier velocity) — an auditor can defend each flag.
- **Ask-AI never invents numbers.** The chat endpoint is given only the
  current job's own stats/report as context; nothing is pulled from general
  knowledge.
- **Column-mapping is resilient** — `Qty` vs `Quantity`, `SKU` vs
  `Product_Code`, etc. are auto-aliased, so slightly different headers don't
  break ingestion.
- **Bad rows are quarantined, not fatal** — an unparseable date or blank key
  skips that row (reported in `warnings`) rather than crashing the whole job.

## Notes

- CORS is open (`flask-cors`, all origins) for the hackathon — lock it down
  before anything public-facing.
- Jobs (including their report DataFrame, for `/ask` and `/action`) live in
  an in-memory dict — fine for a single-process demo, but restarting Flask
  loses old job IDs. Swap `JOBS = {}` in `app.py` for Redis/a DB table for
  persistence across restarts or multiple workers.

## Tested against

Ran the full pipeline — ingestion, matching, risk scoring, AI notes, ask,
action, download — through Flask's test client and again through the live
Vite dev server proxy against the actual `CircuitCo_PurchaseOrders.xlsx` /
`CircuitCo_Invoices.xlsx`: 127 lines reconciled, correct stats, valid JSON
on every field, actions persist and regenerate the Excel correctly, and
`npm run build` completes cleanly with no errors.
