# LedgerFlow Frontend — React & Tailwind UI

This is the React web interface for **LedgerFlow**, designed to reconcile Purchase Orders against Invoices using deterministic matching coupled with an intelligent AI narration layer.

The interface is built using a modern, high-fidelity dark dashboard layout featuring responsive cards, glassmorphic panel elements, micro-animations, and full search/filter capabilities.

---

## 🛠️ Technology Stack

1. **Core**: [React 19](https://react.dev/) + [Vite](https://vite.dev/) (fast HMR, hot reloading)
2. **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (using `@tailwindcss/vite` compiler)
3. **Icons**: [Lucide React](https://lucide.dev/) (clean vector stroke icons)
4. **Local State**: Built-in React hooks (`useState`, `useEffect`, `useMemo`, `useRef`)
5. **Persistence**: `localStorage` (caching the last 5 reconciliation runs)

---

## ✨ Features Implemented

### 1. Drag-and-Drop Ingestion (`UploadZone`)
- Dual-file drag & drop zone for Purchase Orders and Invoices sheets.
- File type validation (requires `.xlsx` or `.xls`) and file size/name metadata reporting.
- Loading/progress state representation during the reconciliation process.

### 2. High-Impact KPI Dashboard (`StatsGrid`)
- Cards tracking critical metrics: **Financial Exposure**, **Matched Lines** (with accuracy percentage), **Active Discrepancies** (with exception rate), and **Total Ingestion Row Count**.
- A custom interactive SVG doughnut chart illustrating reconciliation accuracy (Matched vs Exceptions).
- Sub-KPI grid illustrating exception counts by status (Missing in PO, Missing in Invoice, Value Mismatch, Duplicates).

### 3. AI narrative narrations (`ExecutiveSummary`)
- Executive summary report with simulated typing animation on load.
- Regular-expression text parser highlighting financial values (currencies), percentage figures, and statuses dynamically.
- Skipped-row warning log detailing any rows that failed ingestion.

### 4. Interactive Ledger Sheet (`ReconciliationTable`)
- Full sorting by status, exposure, and ID.
- Status filters (All, Missing PO, Value Mismatch, Missing Invoice, Duplicates, Matched) with record count badges.
- Live text search across Invoice IDs, product names, product codes, and suppliers.
- **Audit Inspector Side-Drawer**: Clicking any record opens a detailed side panel showing a side-by-side comparison of the Purchase Order vs the Invoice (dates, quantities, prices, totals), financial exposure, and the detailed **AI Exception Note** explaining the discrepancy.

### 5. Local Job Log (`HistorySidebar`)
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
   *By default, the server runs on [http://localhost:5173/](http://localhost:5173/) or [http://localhost:5174/](http://localhost:5174/).*

### API Proxy Configuration
Vite is configured to proxy all traffic targeting `/api/*` to the Python backend running at `http://localhost:5000/api/*` in `vite.config.js`. This prevents cross-origin (CORS) errors during development.
