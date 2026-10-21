# PharmaSync CARE

> **Intelligent, Predictive, Explainable Medicine Redistribution Network**  
> An open healthcare technology platform connecting hospital pharmacies, community pharmacies, and clinics to eliminate medicine waste and resolve urgent clinical shortages.

---

## 1. Overview

**PharmaSync CARE** is an intelligent medicine redistribution platform designed to bridge regional healthcare inventory imbalances. 

In regional healthcare ecosystems, hospitals and pharmacies frequently hold expiring surplus medicines that cannot be consumed locally, while neighboring clinics experience critical drug stockouts. PharmaSync CARE provides predictive surplus identification, compatibility-verified donor matching, and end-to-end custody transfer manifests to ensure life-saving medications reach patients safely before expiration.

---

## 2. Key Capabilities

- **Landing Page & Overview (`#/landing`):** Interactive landing page with an understated monochrome aesthetic and an **Anime.js** constellation network visualizing facility connections and inventory transit pipelines.
- **Role-Based Authentication (`#/login`):** Session-based login with password visibility toggling, route protection, and demonstration facility profiles.
- **Executive Dashboard (`#/dashboard`):** Real-time inventory metrics, shortage alerts, and a direct 5-step redistribution workflow.
- **Medicine Stock (`#/inventory`):** Dynamic batch tracking with remaining shelf-life calculations, batch addition modals, and CSV export.
- **Medicine Needed (`#/shortages`):** Urgent shortage declaration, deficit calculations, and 1-click supplier discovery.
- **Find Medicines (`#/matching`):** Algorithmic donor matching verifying batch compatibility, transit distance, and a mandatory 45-day recipient shelf-life buffer.
- **Transfers & Custody (`#/transfers`):** 5-stage custody progression (`Proposed` &rarr; `Requested` &rarr; `Approved` &rarr; `Dispatched` &rarr; `Received`) with timestamped audit histories.
- **Healthcare Facilities (`#/network`):** Regional directory cards and interactive Leaflet map view of licensed healthcare nodes.
- **System Administration (`#/admin`):** Buffer safety policy controls, user role management, and live backend connection diagnostics.

---

## 3. Technology Stack

- **Markup & Styling:** Semantic HTML5, modern CSS3 (Custom Monochrome Design System, CSS Custom Properties)
- **Programming Language:** Vanilla JavaScript (ES Modules, native browser imports)
- **Background Animations:** [Anime.js](https://animejs.com/) v4.5.0
- **Data Visualizations:** Chart.js v4.4.1 (UMD)
- **Geographic Mapping:** Leaflet v1.9.4
- **Architecture:** Zero framework dependencies, zero complex build tooling required

---

## 4. Quick Start

Because the application uses modern JavaScript ES modules, serve the files over a local HTTP server:

### Option A: Using Python (Recommended)
```powershell
python -m http.server 8080 --directory frontend
```

### Option B: Using Node.js
```powershell
npx serve frontend -l 8080
```

Open your browser at: **[http://localhost:8080](http://localhost:8080)**

---

## 5. Demo Accounts

For demonstration and testing, use any of the pre-configured accounts:

| Username | Role | Facility | Password |
| :--- | :--- | :--- | :--- |
| **`admin`** | Chief Pharmacist (Admin) | Apex Central Hospital | `pharmasync2026` |
| **`venkat`** | Community Pharmacist | City Care Pharmacy | `pharmasync2026` |
| **`joseph`** | Clinical Officer | Green Valley Clinic | `pharmasync2026` |

---

## 6. Project Architecture

```
frontend/
├── index.html              # Clean semantic HTML5 shell
├── css/
│   ├── variables.css       # Monochrome design tokens (#090909, #111111, #171717, #202020, #303030)
│   ├── base.css            # Typography, resets, utility classes
│   ├── layout.css          # Responsive application layout shell and sidebar
│   ├── components.css      # Reusable buttons, badges, tables, modals, toast alerts
│   └── pages.css           # Landing page, login card, and page views
├── js/
│   ├── main.js             # Application bootstrap
│   ├── auth.js             # Session authentication and route guards
│   ├── config.js           # Central configuration
│   ├── api.js              # Unified API client (Demo dataset + REST backend)
│   ├── demo-data.js        # Realistic clinical inventory and transfer records
│   ├── router.js           # Client-side hash routing with authentication guards
│   ├── components/         # Reusable modules (Anime.js background, sidebar, topbar, modal, toast)
│   └── pages/              # View controllers (landing, login, dashboard, inventory, matching, transfers, etc.)
└── assets/
    └── vendor/             # Anime.js v4, Chart.js, and Leaflet bundles
```

---

## 7. Author

Developed by **Ashmit Pandey** ([@AshmitPandey7](https://github.com/AshmitPandey7)).
