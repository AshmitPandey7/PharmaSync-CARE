# PharmaSync CARE — Frontend Application

> **Intelligent, Predictive, Explainable Medicine Redistribution Network**  

---

## 1. Project Overview

**PharmaSync CARE** is an intelligent, explainable healthcare inventory redistribution platform designed to connect hospitals, community pharmacies, and rural clinics. 

The platform identifies potential pre-expiry medicine surpluses, pairs facilities experiencing critical stock shortages with compatible donor batches, performs multi-criteria FairShare allocations, and tracks end-to-end custody transfer manifests.

> **Academic Disclaimer:** This application is a student software prototype operating on synthetic demonstration data. It serves as an academic decision-support concept and does not authorize physical drug transfers or make clinical triage decisions.

---

## 2. Technology Stack

- **Markup & Layout:** Semantic HTML5, CSS3 (Custom Design System with CSS Custom Properties)
- **Programming Language:** Vanilla JavaScript (ES Modules, standard `import` / `export`)
- **Data Visualizations:** Chart.js v4.4.1 (UMD, local vendor copy + CDN fallback)
- **Geographic Mapping:** Leaflet v1.9.4 (local vendor copy + CDN fallback)
- **Networking:** Fetch API with async/await
- **Backend Readiness:** Pre-configured integration layer for Python Flask + MySQL REST API

*No heavy frontend frameworks (React/Angular/Vue) and no complex Node build step are required.*

---

## 3. Quick Start (Running Locally on Windows)

Because the application uses modern JavaScript ES modules, it should be served over HTTP rather than opened as a local `file://` URL.

### Step 1: Open a Terminal in the Project Directory
```powershell
```

### Step 2: Start a Lightweight Local Web Server

**Using Python (Pre-installed):**
```powershell
python -m http.server 8000 --directory frontend
```

*Or using Node.js:*
```powershell
npx serve frontend -l 8000
```

### Step 3: Open in Your Browser
Navigate to: **[http://localhost:8000](http://localhost:8000)**

---

## 4. Implemented Pages & Features

| # | Page / Module | Route | Key Features |
| :-: | :--- | :--- | :--- |
| **A** | **Main Dashboard** | `#/dashboard` | Executive inventory KPIs, surplus indicators, shelf-life risk breakdown, category distribution doughnut chart, live transfer stream. |
| **B** | **Inventory Management** | `#/inventory` | Medicine catalog table, real-time search, filters, pagination, Add/Edit Batch forms with client validation, separate eligible vs reserved stock. |
| **C** | **Rescue Centre** | `#/rescue` | Predictive surplus detection formula: `Available - (Demand + Safety Stock)`, transparent 0-100 Rescue Priority Score, recommendations (`TRANSFER`, `MONITOR`, `RETAIN`, `BLOCK`), and transfer launcher. |
| **D** | **Shortage Management** | `#/shortages` | Stockout reporting, urgency classification (`EMERGENCY`, `HIGH`, `ROUTINE`), unmet deficit calculation, Declare Shortage modal, and direct match launcher. |
| **E** | **Community Network** | `#/network` | Facility directory cards, cold-chain refrigeration status, bed capacities, and an interactive Leaflet map of district healthcare nodes. |
| **F** | **Smart Matching** | `#/matching` | Algorithmic compatibility engine, shelf-life feasibility gating, transparent match score breakdown, candidate rejection explanations, and multi-donor cart builder. |
| **G** | **FairShare Allocation** | `#/fairshare` | Side-by-side comparison of First-Come-First-Served (FCFS) vs FairShare proportional model, interactive weight sliders, and allocation bar charts. |
| **H** | **Transfer Management** | `#/transfers` | Full custody lifecycle stepper: `PROPOSED` &rarr; `REQUESTED` &rarr; `APPROVED` &rarr; `DISPATCHED` &rarr; `RECEIVED`, with rejection/cancellation paths and audit history. |
| **I** | **Digital Twin** | `#/digital-twin` | Isolated simulation sandbox: test Epidemic Demand Surges, Highway Logistics Delays, and Mass Expiry waves without mutating real inventory state. |
| **J** | **Optimization Lab** | `#/optimization` | Multi-objective trade-off tuning (Waste avoidance vs Distance vs Equity vs Buffer), comparing Greedy, Expiry-First, and Balanced Pareto strategies via radar chart. |
| **K** | **Decision Explorer** | `#/decision-explorer` | Interactive sensitivity "What-If" analysis: adjust donor stock, local demand, and shelf-life to observe how algorithmic verdicts pivot with clear explanations. |
| **L** | **Analytics & Reports** | `#/analytics` | Historical trends, units requested vs supplied, waste avoided by category, transfer transit times, and one-click CSV report exports. |
| **M** | **Administration** | `#/admin` | Role-based Access Control (RBAC) matrix, safety buffer thresholds, live Flask API connection test harness, and immutable audit logs. |

---

## 5. Connecting to the Flask + MySQL Backend

The frontend is built to work seamlessly in two modes:

1. **Demo Mode (Default):**
   - Operates on realistic synthetic datasets with in-browser stateful persistence.
   - Allows full interactive testing of every form, modal, and filter without needing Flask or MySQL.
2. **Live API Mode:**
   - In the topbar header, click **"Switch Live"** or configure the API URL in `#/admin`.
   - The frontend will issue standard REST calls to the Flask backend.
   - If the backend is offline, a clear diagnostic message is displayed rather than faking live data.

### Documentation for Team Integration:
- `docs/API_CONTRACT.md` — Proposed API endpoints, HTTP verbs, JSON request/response formats, and schemas.
- `docs/INTEGRATION.md` — Step-by-step instructions for running Flask, configuring CORS, and troubleshooting.

---

## 6. Project Structure

```
frontend/
├── index.html              # Clean semantic HTML5 shell
├── css/
│   ├── variables.css       # Design tokens (Navy, Healthcare Teal, Slate)
│   ├── base.css            # Resets, typography, utilities
│   ├── layout.css          # Responsive app shell & sidebar
│   ├── components.css      # Reusable buttons, badges, tables, modals, toasts
│   └── pages.css           # Page-specific views and metrics
├── js/
│   ├── main.js             # Bootstrap entry point
│   ├── config.js           # Central configuration
│   ├── api.js              # Unified API client (Demo + Live modes)
│   ├── demo-data.js        # Synthetic clinical data
│   ├── router.js           # Client-side hash routing
│   ├── components/         # Reusable UI modules (sidebar, topbar, modal, toast, export)
│   └── pages/              # 13 page view controllers
└── assets/
    └── vendor/             # Local offline copies of Chart.js & Leaflet
docs/
├── API_CONTRACT.md         # Full REST API specification
└── INTEGRATION.md          # Teammate integration guide
```

---

## 7. License & Credits

Developed by **Ashmit** (2nd Year B.Tech CSE) for the Database Management Systems (DBMS) project curriculum.
