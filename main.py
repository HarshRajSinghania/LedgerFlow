import pandas as pd
from reconciliation_engine import run_reconciliation

po = pd.read_excel("CircuitCo_PurchaseOrders.xlsx")
inv = pd.read_excel("CircuitCo_Invoices.xlsx")

inv2 = inv.copy()
mask = (inv2["Invoice_ID"] == "PO-1003") & (inv2["Product_Code"] == "ACC-004")
inv2.loc[mask, "Quantity"] = 99
inv2.loc[mask, "Total"] = 99 * inv2.loc[mask, "Unit_Price"]

dup_row = po.iloc[[0]].copy()
po2 = pd.concat([po, dup_row], ignore_index=True)
po2.loc[10, "Total"] = 999999          # unrelated row -> calc error
po2.loc[20, "Date"] = "not-a-date"     # unrelated row -> quarantine

po2.to_excel("test_po_edge.xlsx", index=False)
inv2.to_excel("test_inv_edge.xlsx", index=False)

report, warnings, stats = run_reconciliation("test_po_edge.xlsx", "test_inv_edge.xlsx")
print("STATS:", stats)
print("\nWARNINGS:")
for w in warnings: print(" -", w)
print("\nStatus counts:\n", report["Status"].value_counts())
print("\nMismatch row:\n", report[report["Status"]=="VALUE_MISMATCH"][["Invoice_ID","Product_Code","PO_Quantity","Invoice_Quantity","PO_Total","Invoice_Total"]])
print("\nDuplicate rows:\n", report[report["Status"].str.startswith("DUPLICATE")][["Invoice_ID","Product_Code","Status"]])
