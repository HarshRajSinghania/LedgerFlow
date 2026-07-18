# LedgerFlow Frontend — Minimal Vintage Audit UI

This is the React web interface for **LedgerFlow**, designed to reconcile Purchase Orders against Invoices using deterministic matching coupled with an intelligent AI exception narration layer.

The interface features an editorial, **Minimal Vintage** aesthetic styled after a physical print accounting ledger, leveraging serif headings, custom monospace tabular reports, terracotta accents, and flat stamped badges.

---

## 🛠️ Technology Stack

1. **Core**: [React 19](https://react.dev/) + [Vite](https://vite.dev/) (fast HMR, hot reloading)
2. **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (using `@tailwindcss/vite` compiler)
3. **Charts**: [Recharts](https://recharts.org/) (vintage-styled vector graphs)
4. **Icons**: [Lucide React](https://lucide.dev/) (clean vector stroke icons)
5. **Local State**: Built-in React hooks (`useState`, `useEffect`, `useMemo`, `useRef`)
6. **Persistence**: `localStorage` (caching the last 5 reconciliation runs)

---

## ✨ Features & Design Details

### 1. Ingestion Area (`UploadZone`)
- Dual-file drag & drop zone for Purchase Orders and Invoice sheets.
- File type validation (requires `.xlsx` or `.xls`) and file size/name metadata reporting.
- Features a flat, parchment-colored drop container with terracotta borders.

### 2. High-Impact KPI Dashboard (`StatsGrid`)
- Cards tracking critical metrics: **Financial Exposure**, **Matched Lines** (with accuracy percentage), **Active Discrepancies** (with exception rate), and **Total Ingestion Row Count**.
- A custom interactive SVG accuracy progress ring colored in vintage sage-green and rust.
- Flat sub-KPI grid separating exceptions by status (Missing in PO, Missing in Invoice, Value Mismatch, Duplicates).

### 3. AI Exception Narrations (`ExecutiveSummary`)
- Executive summary report with simulated typing animation on load.
- Text parser automatically highlighting financial values (currencies), percentage figures, and statuses dynamically.
- Ingestion warning logs showing skipped/corrupt rows in a typewritten format.

### 4. Interactive Audit Charts (`ReconciliationChart`)
- Interactive toggle tab to switch between:
  - **Financial Exposure by Vendor**: A bar chart illustrating exposure amounts for the top 6 vendors.
  - **Discrepancy Volume**: A count of exceptions sorted by mismatch status.
- Styled in sepia grids and Space Mono labeling to match the vintage print theme.

### 5. Ledger Sheet (`ReconciliationTable`)
- Full sorting by status, exposure, and ID.
- Status filters (All, Missing PO, Mismatch, Missing Invoice, Duplicates, Matched) with record count badges.
- Live text search across Invoice IDs, product names, product codes, and suppliers.
- **Audit Inspector Side-Drawer**: Clicking any record opens a detailed paper card showing a side-by-side comparison of the Purchase Order vs the Invoice (dates, quantities, prices, totals), financial exposure, and the detailed **AI Exception Note** explaining the discrepancy.

### 6. Local Job Log (`HistorySidebar`)
- Automatically saves up to 5 historical runs in browser cache.
- Lists file names, dates, accuracy ratings, and financial exposures.
- Supports switching back to past runs or deleting old logs.

---

## 🚀 Setup & Execution

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (LTS recommended).

### Running the App
1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run the local development server**:
   ```bash
   npm run dev
   ```
   *By default, the server runs on [http://localhost:5173/](http://localhost:5173/).*

### API Proxy Configuration
Vite is configured to proxy all traffic targeting `/api/*` to the Python backend running at `http://localhost:5000/api/*` in `vite.config.js`. This prevents cross-origin (CORS) errors during development.
