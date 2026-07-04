"""
LedgerFlow Invoice Reconciliation — Flask backend (API only, no frontend).

Endpoints
---------
GET  /api/health
    -> {"status": "ok"}

POST /api/reconcile
    multipart/form-data with two files: `po_file`, `invoice_file`
    -> JSON: {
         "job_id": "...",
         "stats": {...},
         "summary": "...",
         "warnings": [...],
         "report": [ {...one row per PO/Invoice line...} ],
         "download_url": "/api/reconcile/<job_id>/download"
       }

GET  /api/reconcile/<job_id>/download
    -> streams the generated .xlsx report

GET  /api/reconcile/<job_id>
    -> re-fetch the same JSON result for a previous job_id (kept in memory
       for this process's lifetime — swap for Redis/DB before production)

Run:
    pip install -r requirements.txt
    python app.py            # dev server on :5000
"""

import math
import os
import tempfile
import uuid

import pandas as pd
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from ai_insights import annotate_exceptions, executive_summary
from reconciliation_engine import ReconciliationError, run_reconciliation
from report_writer import write_report

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional; environment variables can be set externally

app = Flask(__name__)
CORS(app)  # frontend will be served from a different origin

app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25MB upload cap

JOBS_DIR = os.path.join(tempfile.gettempdir(), "ledgerflow_recon_jobs")
os.makedirs(JOBS_DIR, exist_ok=True)

# In-memory job store: job_id -> {"json": {...}, "xlsx_path": "..."}
# Fine for a hackathon MVP / single-process demo. Replace with Redis or a DB
# table before running more than one worker process, since this dict is not
# shared across processes.
JOBS = {}


def _json_safe(value):
    """Convert pandas/numpy types to plain JSON-serializable values."""
    if value is None:
        return None
    try:
        if pd.isna(value):  # catches NaN, NaT, None in one shot
            return None
    except (TypeError, ValueError):
        pass  # value isn't the kind pd.isna can evaluate (e.g. a string) - fine
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    if hasattr(value, "item"):  # numpy scalar
        try:
            return value.item()
        except Exception:
            return value
    return value


def _report_to_json(report: pd.DataFrame) -> list:
    cols = [
        "Invoice_ID", "Product_Code", "Status", "Supplier", "Product_Name",
        "PO_Date", "Invoice_Date", "PO_Quantity", "Invoice_Quantity",
        "PO_Unit_Price", "Invoice_Unit_Price", "PO_Total", "Invoice_Total",
        "Financial_Exposure", "AI_Confidence", "AI_Note",
    ]
    records = []
    for _, row in report[cols].iterrows():
        records.append({c: _json_safe(row[c]) for c in cols})
    return records


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/reconcile", methods=["POST"])
def reconcile():
    if "po_file" not in request.files or "invoice_file" not in request.files:
        return jsonify({
            "error": "Both 'po_file' and 'invoice_file' must be provided as "
                     "multipart/form-data fields."
        }), 400

    po_file = request.files["po_file"]
    inv_file = request.files["invoice_file"]

    if po_file.filename == "" or inv_file.filename == "":
        return jsonify({"error": "One or both files are empty/unselected."}), 400

    try:
        report, warnings, stats = run_reconciliation(po_file, inv_file)
    except ReconciliationError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Unexpected error during reconciliation: {e}"}), 500

    report = annotate_exceptions(report)
    summary = executive_summary(report, stats)

    job_id = str(uuid.uuid4())
    xlsx_path = os.path.join(JOBS_DIR, f"{job_id}.xlsx")
    write_report(xlsx_path, report, stats, summary, warnings)

    result = {
        "job_id": job_id,
        "stats": stats,
        "summary": summary,
        "warnings": warnings,
        "report": _report_to_json(report),
        "download_url": f"/api/reconcile/{job_id}/download",
    }

    JOBS[job_id] = {"json": result, "xlsx_path": xlsx_path}

    return jsonify(result), 200


@app.route("/api/reconcile/<job_id>", methods=["GET"])
def get_job(job_id):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "job_id not found (server may have restarted)."}), 404
    return jsonify(job["json"]), 200


@app.route("/api/reconcile/<job_id>/download", methods=["GET"])
def download_job(job_id):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "job_id not found (server may have restarted)."}), 404
    return send_file(
        job["xlsx_path"],
        as_attachment=True,
        download_name="LedgerFlow_Reconciliation_Report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large (25MB limit)."}), 413


if __name__ == "__main__":
    app.run(debug=True, port=5000)