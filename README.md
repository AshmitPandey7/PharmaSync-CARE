# PharmaSync CARE

> **An Intelligent, Predictive, and Explainable Medicine Redistribution Network**  
> An open healthcare technology platform connecting hospital pharmacies, community pharmacies, and clinics to eliminate medicine waste and resolve urgent clinical shortages.

[![Python](https://img.shields.io/badge/Python-3.10%2B%20%7C%203.13-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1%2B-black.svg)](https://flask.palletsprojects.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB%20Atlas-Cloud%20Database-green.svg)](https://www.mongodb.com/atlas)
[![Pytest](https://img.shields.io/badge/Tests-68%20Passed-brightgreen.svg)](https://docs.pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Prerequisites](#5-prerequisites)
6. [Environment Configuration](#6-environment-configuration)
7. [Installation and Setup](#7-installation-and-setup)
8. [Database Initialization and Seeding](#8-database-initialization-and-seeding)
9. [How to Run](#9-how-to-run)
10. [API and Health Check](#10-api-and-health-check)
11. [Testing](#11-testing)
12. [Demonstration Accounts](#12-demonstration-accounts)
13. [Troubleshooting](#13-troubleshooting)
14. [Security and Data Disclaimer](#14-security-and-data-disclaimer)
15. [Technical Documentation](#15-technical-documentation)

---

## 1. Project Overview

In regional healthcare ecosystems, hospitals and large pharmacies frequently hold expiring surplus medicines that cannot be consumed locally, while neighboring health centres and charitable clinics face severe medicine stockouts. 

**PharmaSync CARE** is an intelligent, explainable medicine redistribution network designed to bridge these inventory imbalances. The platform monitors batch-level inventory, calculates demand-aware surplus, discovers compatible donor facilities within viable geographic transit tiers, and generates auditable transfer manifests before life-saving medicines expire.

The system is architected as a decoupled full-stack platform:
- A **Vanilla JavaScript Single-Page Application (SPA)** frontend using ES modules, Chart.js, and Leaflet.
- A **Python Flask REST API** service layer enforcing clinical validation and safety policies.
- A **MongoDB Atlas** cloud document database with geospatial querying, atomic conditional reservations, and an in-memory `mongomock` fallback for isolated automated testing.

---

## 2. Key Features

| Capability | Module / Route | Description |
| :--- | :--- | :--- |
| **Executive Dashboard** | `#/dashboard` | Real-time counts of available units, unmet shortage quantities, active transfers, and a guided 5-step redistribution workflow. |
| **Healthcare Facilities** | `#/network` | Directory of hospitals, community pharmacies, clinics, and distribution hubs with cold-chain badges, license numbers, and Leaflet map pins. |
| **Medicine Catalogue** | `#/inventory` | Standardized formulary records tracking dosage forms, strengths, therapeutic categories, and cold-chain requirements. |
| **Medicine Stock & Expiry** | `#/inventory` | Batch-level inventory management with days-to-expiry calculation, demand-aware surplus estimation, stock updates, and CSV export. |
| **Shortage Management** | `#/shortages` | Clinical shortage ticket declaration with urgency classification (`EMERGENCY`, `HIGH`, `MEDIUM`, `ROUTINE`), reason tracking, and 1-click supplier discovery. |
| **Explainable Matching** | `#/matching` | Evaluates eligible donor batches against clinical shortages, enforcing formulation compatibility, transit distance tiering, and a strict 45-day recipient shelf-life buffer. |
| **FairShare Allocation** | `#/fairshare` | Multi-facility proportional equity balancing comparing First-Come-First-Served (FCFS) against clinical urgency and vulnerability scoring. |
| **Custody Transfers** | `#/transfers` | 5-stage lifecycle manifest (`PROPOSED` &rarr; `REQUESTED` &rarr; `APPROVED` &rarr; `DISPATCHED` &rarr; `RECEIVED`) with atomic stock reservation and status audit logging. |
| **Rescue Surveillance** | `#/rescue` | Identifies batches ready to share, classifying items into `TRANSFER`, `MONITOR`, `RETAIN`, or `BLOCK` with plain-English safety rationales. |
| **Digital Twin Simulator** | `#/digital-twin` | Sandboxed discrete-event simulation projecting network resilience under epidemic demand surges and transit delay scenarios. |
| **Multi-Objective Optimization** | `#/optimization` | Pareto trade-off optimization balancing waste prevention, transport efficiency, and fulfillment speed with counterfactual sensitivity analysis. |
| **System Administration** | `#/admin` | Buffer policy configuration, user role permissions matrix, audit log inspection, and live backend connection diagnostics. |

---

## 3. Technology Stack

### Frontend
- **Markup & Layout:** Semantic HTML5, modern CSS3 (Custom Monochrome Design System)
- **Language:** Vanilla JavaScript (ES6+ Modules, native browser imports — zero build tooling or bundler required)
- **Visualizations:** [Chart.js](https://www.chartjs.org/) v4.4.1 (Time-series trends and participation ledgers)
- **Geographic Mapping:** [Leaflet](https://leafletjs.com/) v1.9.4 (Interactive facility map and coordinates)
- **Animations:** [Anime.js](https://animejs.com/) v4.5.0 (Constellation network on landing page)

### Backend
- **Language:** Python 3.10+ (Tested and verified on Python 3.13)
- **Framework:** Flask 3.1+ (Application factory, modular route blueprints, centralized JSON envelopes)
- **CORS Handling:** Flask-CORS (Configurable allowed origins and headers)
- **Database Driver:** PyMongo 4.6+ (Connection pooling, schema validation, and atomic conditional updates)
- **Testing:** Pytest 8.0+ and `pytest-mock` (68 automated unit, integration, and MongoDB feature tests)

### Database
- **Primary Database:** MongoDB Atlas (Cloud document database with replica set clustering and 2dsphere geospatial indexing)
- **Test Engine / Offline Fallback:** `mongomock` 4.3+ (In-memory MongoDB simulation for fast, isolated, headless automated test execution)

---

## 4. Project Structure

```
PharmaSync-CARE/
├── frontend/                   # Client-Side Single-Page Application
│   ├── index.html              # HTML5 application shell
│   ├── css/                    # Custom Monochrome Design System
│   │   ├── base.css            # CSS variables, typography & reset
│   │   ├── layout.css          # Grid layouts, sidebar, topbar & navigation
│   │   ├── components.css      # Cards, tables, badges, modals, empty states
│   │   └── pages.css           # Page-specific styling rules
│   ├── js/                     # ES6+ JavaScript modules
│   │   ├── main.js             # Bootstrap entrypoint & lifecycle handlers
│   │   ├── config.js           # Central configuration (API base URL, mode switch)
│   │   ├── api.js              # Central API client (HTTP fetch & demo-state store)
│   │   ├── auth.js             # Session authentication & route protection guards
│   │   ├── demo-data.js        # Deterministic clinical baseline records
│   │   ├── router.js           # Hash-based client router with route guards
│   │   ├── components/         # Reusable UI modules
│   │   │   ├── sidebar.js      # Collapsible navigation drawer
│   │   │   ├── topbar.js       # Context header, facility switcher & health dot
│   │   │   ├── modal.js        # Accessible dialog component
│   │   │   ├── toast.js        # Floating notifications
│   │   │   ├── error-state.js  # Reusable offline/error banner with retry
│   │   │   └── export-csv.js   # Client-side CSV export utility
│   │   └── pages/              # 15 page view controllers
│   └── assets/vendor/          # Local vendor libraries (Anime.js, Chart.js, Leaflet)
├── backend/                    # Python Flask REST API
│   ├── app/                    # Flask application package
│   │   ├── __init__.py         # App factory, CORS & blueprint registrations
│   │   ├── config.py           # Environment configuration loader
│   │   ├── database.py         # MongoDB Atlas client manager & mongomock fallback
│   │   ├── routes/             # REST API endpoint blueprints
│   │   │   ├── health.py       # Health check & database ping probes
│   │   │   ├── dashboard.py    # Summary metrics & Chart.js analytics aggregations
│   │   │   ├── facilities.py   # Facility directory & donor lookup
│   │   │   ├── medicines.py    # Formulary catalog CRUD
│   │   │   ├── inventory.py    # Batch tracking & Rescue Centre surveillance
│   │   │   ├── shortages.py    # Clinical shortage ticket declarations
│   │   │   ├── matching.py     # Explainable donor candidate algorithm
│   │   │   ├── allocations.py  # FairShare equity balancing simulation
│   │   │   ├── transfers.py    # Custody manifests & lifecycle progression
│   │   │   ├── simulations.py  # Digital Twin discrete-event scenario engine
│   │   │   ├── optimization.py # Pareto optimization & counterfactuals
│   │   │   ├── audit.py        # System audit event logs
│   │   │   └── auth.py         # User credential verification
│   │   ├── services/           # Domain business logic & calculation services
│   │   ├── repositories/       # PyMongo data access layer with atomic write locks
│   │   └── utils/              # Standard JSON envelopes, validators & Haversine formula
│   ├── scripts/                # Database Administration Scripts
│   │   ├── init_db.py          # Index creation & collection validator setup
│   │   └── seed_data.py        # Deterministic synthetic seed data generator
│   ├── tests/                  # Automated pytest suite (68 tests)
│   ├── run.py                  # Local server startup script
│   ├── requirements.txt        # Python package dependencies
│   ├── .env.example            # Environment variables template
│   └── .env                    # Local secrets (git-ignored)
├── docs/                       # Technical Specifications & Documentation
│   ├── API_CONTRACT.md         # Full REST API specification with synthetic payloads
│   ├── MONGODB_SCHEMA.md       # BSON schema, data types & indexing rules
│   ├── COLLECTION_RELATIONSHIPS.md # Logical relationships & integrity invariants
│   ├── DATA_DICTIONARY.md      # Field-by-field database definitions
│   ├── MONGODB_MIGRATION_PLAN.md # MySQL to MongoDB Atlas transition details
│   └── INTEGRATION.md          # Frontend-backend integration guide
├── sql/                        # [Archived] Legacy MySQL relational schema and seed
├── README.md                   # Project documentation
└── .gitignore                  # Git exclusions for Python, venv, and .env
```

---

## 5. Prerequisites

Before setting up PharmaSync CARE, ensure you have the following installed on your system:

- **Python:** Version 3.10 or higher (Python 3.13 tested and supported).
- **pip:** Python package installer (bundled with Python).
- **MongoDB Atlas Account:** A free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) with a database user and IP access configured. *(Note: An in-memory fallback is included for running automated tests without an active cloud cluster).*
- **Web Browser:** Any modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari).
- **Shell:** Windows PowerShell (or Bash on macOS/Linux).

---

## 6. Environment Configuration

The backend reads configuration settings from environment variables via `backend/.env`.

### Step 1: Copy the Template

Create your local `.env` file by copying `backend/.env.example`:

```powershell
Copy-Item backend\.env.example backend\.env
```

### Step 2: Configure Environment Variables

Open `backend/.env` in your text editor and specify your local configuration:

```ini
# Flask Server Configuration
FLASK_ENV=development
PORT=5000
HOST=127.0.0.1
SECRET_KEY=pharmasync-care-local-dev-secret-key-2026

# Allowed Frontend Origins for Flask-CORS (comma-separated)
CORS_ORIGINS=http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5500,http://localhost:5500

# MongoDB Atlas Configuration
# Enter your actual MongoDB Atlas connection URI locally:
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=pharmasync_care
MONGODB_TIMEOUT_MS=3000

# Healthcare Safety Policy Defaults
MIN_SHELF_LIFE_DAYS=45
SAFETY_STOCK_BUFFER_PCT=0.20
LOCAL_RADIUS_KM=15.0
REGIONAL_RADIUS_KM=60.0
```

> [!IMPORTANT]
> **Never commit real MongoDB credentials or `.env` files to version control.** The `.env` file is explicitly excluded via `.gitignore`.

---

## 7. Installation and Setup

Execute the following commands in **Windows PowerShell** from the root of the project:

### 1. Clone the repository (if starting from a fresh checkout)

```powershell
git clone https://github.com/AshmitPandey7/PharmaSync-CARE.git
cd PharmaSync-CARE
```

### 2. Create and activate the virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install backend dependencies

```powershell
pip install -r backend\requirements.txt
```

---

## 8. Database Initialization and Seeding

Once your virtual environment is active and `backend/.env` is configured with your Atlas URI, initialize the database collections, indexes, and synthetic baseline records:

```powershell
$env:PYTHONPATH = "backend"
python backend\scripts\init_db.py
python backend\scripts\seed_data.py
```

### What these scripts do:
1. **`init_db.py`**: Connects to the database and creates unique indexes (e.g. `facilities.id`, `medicines.code`, `inventory_batches.batchNumber`), compound indexes (e.g. `facilityId` + `status`), and 2dsphere geospatial indexes on coordinates.
2. **`seed_data.py`**: Executes deterministic, idempotent upserts populating 6 regional healthcare facilities, 12 medicine catalog entries, 14 inventory batches across varied shelf lives, 3 clinical shortage tickets, and 4 multi-stage transfer manifests.

---

## 9. How to Run

To run the complete application, open **two separate PowerShell terminal windows**:

### Terminal 1: Start the Flask Backend Server

```powershell
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = "backend"
python backend\run.py
```
* The backend API server will start at: **`http://127.0.0.1:5000`**
* Health probe: **`http://127.0.0.1:5000/api/health`**

### Terminal 2: Start the Frontend HTTP Server

```powershell
python -m http.server 8080 --directory frontend
```
* The web application will be served at: **`http://localhost:8080`**

### Accessing the Application

Open your browser and navigate to:
- **Frontend Web UI:** [`http://localhost:8080`](http://localhost:8080)
- **Backend API Base:** [`http://127.0.0.1:5000/api`](http://127.0.0.1:5000/api)
- **API Health Check:** [`http://127.0.0.1:5000/api/health`](http://127.0.0.1:5000/api/health)

---

## 10. API and Health Check

The backend exposes a standardized RESTful API returning consistent JSON response envelopes:
```json
{
  "status": "success",
  "success": true,
  "data": { ... },
  "meta": { "total": 14 }
}
```

### Health Check Endpoint
- **URL:** `GET http://127.0.0.1:5000/api/health`
- **Response Example:**
  ```json
  {
    "status": "success",
    "success": true,
    "data": {
      "status": "OK",
      "engine": "MongoDB Atlas",
      "cluster": "Connected",
      "database": "CONNECTED",
      "mode": "LIVE_DATABASE",
      "timestamp": "2026-10-21T16:00:16.266487+00:00"
    }
  }
  ```

### Overview of Implemented REST Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/api/health` | Service and MongoDB Atlas connection status |
| | `GET` | `/api/health/db` | Direct database ping verification |
| **Dashboard** | `GET` | `/api/dashboard/summary` | Key metrics, available stock, unmet shortages, transfer counts |
| | `GET` | `/api/dashboard/analytics` | Time-series transfers, prevented waste, facility participation |
| **Facilities** | `GET` | `/api/facilities` | List facilities with optional `type`, `cold_chain`, and `search` filters |
| | `GET` | `/api/facilities/<id>` | Detail view for a specific facility |
| | `POST` | `/api/facilities` | Register a new healthcare facility |
| | `PUT` | `/api/facilities/<id>` | Update facility attributes or bed capacity |
| | `GET` | `/api/network/donors` | Discover authorized donor facilities |
| **Medicines** | `GET` | `/api/medicines` | Medicine formulary catalogue with search and category filters |
| | `GET` | `/api/medicines/<id>` | Retrieve formulation details and storage criteria |
| | `POST` | `/api/medicines` | Add a new formulation to the catalogue |
| | `PUT` | `/api/medicines/<id>` | Update medicine specifications |
| **Inventory** | `GET` | `/api/inventory` | Inventory batches with demand-aware surplus calculation |
| | `GET` | `/api/inventory/<id>` | Batch inspection with shelf-life metrics |
| | `POST` | `/api/inventory` | Register a new inventory batch (enforces positive quantities and valid dates) |
| | `PUT` | `/api/inventory/<id>` | Update available quantity or batch parameters |
| | `GET` | `/api/rescue/candidates` | Rescue surveillance evaluating batches for `TRANSFER`, `MONITOR`, `RETAIN`, or `BLOCK` |
| **Shortages** | `GET` | `/api/shortages` | Open shortage requests with urgency and status filters |
| | `GET` | `/api/shortages/<id>` | Detail view of a shortage ticket |
| | `POST` | `/api/shortages` | Declare an urgent clinical shortage |
| | `PUT` | `/api/shortages/<id>` | Update ticket status or fulfillment quantity |
| **Matching** | `POST` | `/api/matching/candidates` | Algorithmic donor matching verifying compatibility, distance, and 45-day shelf-life safety |
| **Allocations** | `POST` | `/api/allocation/simulate` | FairShare equity balancing simulation vs FCFS baseline |
| | `POST` | `/api/allocations/commit` | Persist allocation manifests |
| **Transfers** | `GET` | `/api/transfers` | Transfer manifests and shipment tracking |
| | `GET` | `/api/transfers/<id>` | Inspect manifest and custody audit history |
| | `POST` | `/api/transfers` | Create a transfer manifest and reserve inventory atomically |
| | `PUT` | `/api/transfers/<id>/status` | Advance lifecycle status (`REQUESTED` &rarr; `APPROVED` &rarr; `DISPATCHED` &rarr; `RECEIVED`) |
| | `POST` | `/api/transfers/<id>/approve` | Donor pharmacy approval endpoint |
| | `POST` | `/api/transfers/<id>/dispatch`| Mark manifest as dispatched with carrier assignment |
| | `POST` | `/api/transfers/<id>/receive` | Recipient check-in completing stock ingestion |
| **Simulations** | `GET` | `/api/simulations` | List historical Digital Twin simulation runs |
| | `POST` | `/api/simulations` | Execute sandboxed epidemic demand surge simulation |
| **Optimization** | `GET` | `/api/optimization/runs` | List multi-objective optimization runs |
| | `POST` | `/api/optimization/runs` | Execute Pareto strategy optimization run |
| | `POST` | `/api/optimization/counterfactuals` | Sensitivity analysis exploring constraint alterations |
| **Audit Logs** | `GET` | `/api/audit-logs` | Immutable audit log trail of clinical actions |

---

## 11. Testing

The repository contains an automated `pytest` test suite covering **68 test cases** across API endpoints, validation boundaries, atomic inventory reservation safety, and MongoDB Atlas features:

```powershell
.\.venv\Scripts\pytest -v backend\tests
```

*(Alternatively, run using the virtual environment Python interpreter):*
```powershell
$env:PYTHONPATH = "backend"
.\.venv\Scripts\python -m pytest -v backend\tests
```

### Test Suite Summary:
- **`test_health.py`**: Server health probes, live ping verification, 503 error handling on connection failure.
- **`test_mongodb_features.py`**: BSON ObjectId conversion, flexible identifier queries, duplicate code prevention, atomic conditional reservations, and Digital Twin sandbox isolation.
- **`test_facilities.py`**: Facility listings, cold-chain verification, creation, updating (PATCH), 404 missing, 422 validation, pagination.
- **`test_medicines.py`**: Formulary listing, category filtering, text search, detail view, creation, updating (PATCH), 404 missing, 422 validation, pagination.
- **`test_inventory.py`**: Batch listing, detail view, positive quantity enforcement, negative quantity rejection, expired batch rejection, demand-aware surplus calculation, stock update (PATCH), pagination.
- **`test_shortages.py`**: Shortage declarations, detail view, urgency validation, past deadline rejection, ticket updates (PATCH), 404 missing, 422 validation, pagination.
- **`test_rollback.py`**: Transaction rollback and atomic stock reservation protection against over-allocation.
- **`test_matching.py`**: Algorithmic donor matching, Haversine distance tiering, shelf-life safety buffer exclusion (45-day floor), cold-chain compatibility, explainability reasons.
- **`test_allocations.py`**: FairShare multi-facility proportional allocation, FCFS baseline comparison, clinical urgency weighting, over-allocation prevention.
- **`test_transfers.py`**: Transfer manifest creation, atomic inventory reservation, lifecycle progression (`PROPOSED` &rarr; `REQUESTED` &rarr; `APPROVED` &rarr; `DISPATCHED` &rarr; `RECEIVED`), invalid transition rejection, reservation release on cancellation.
- **`test_simulations.py`**: Sandboxed Digital Twin projections, demand surge modeling, complete data isolation from operational inventory.
- **`test_optimization.py`**: Multi-objective Pareto strategy optimization (waste vs distance vs speed), counterfactual sensitivity analysis.
- **`test_analytics.py`**: Dashboard summary aggregates, facility filter, Chart.js time series, facility participation ledger.

---

## 12. Demonstration Accounts

You can sign in to the application using any of the pre-configured clinical user accounts:

| Username | Role | Facility Context | Password |
| :--- | :--- | :--- | :--- |
| **`admin`** | Chief Pharmacist (System Admin) | Apex Central Hospital | `pharmasync2026` |
| **`dr.nair`** | Chief Pharmacist | Apex Central Hospital | `pharmasync2026` |
| **`venkat`** | Community Pharmacist | City Care Community Pharmacy | `pharmasync2026` |
| **`joseph`** | Clinical Officer | Green Valley Health Centre | `pharmasync2026` |

---

## 13. Troubleshooting

| Symptom / Error | Probable Cause | Recommended Resolution |
| :--- | :--- | :--- |
| **`ServerSelectionTimeoutError`** | MongoDB Atlas IP whitelist is blocking your IP address. | Log in to the [MongoDB Atlas Console](https://cloud.mongodb.com/), navigate to **Network Access**, and add your current public IP address (or `0.0.0.0/0` for development). |
| **`OperationFailure: Authentication failed`** | Incorrect username or password in `MONGODB_URI`. | Verify credentials in `backend/.env`. If your password contains special characters (e.g. `@`, `:`, `/`), URL-encode them using `urllib.parse.quote_plus`. |
| **`ModuleNotFoundError: No module named 'app'`** | Python ran without `backend` in the Python search path. | Set the environment variable in PowerShell: `$env:PYTHONPATH = "backend"` before running scripts. |
| **Frontend shows "Flask API Offline" banner** | Flask server is not running on port 5000. | Open Terminal 1, activate the virtual environment, and run `python backend\run.py`. Ensure it outputs `Running on http://127.0.0.1:5000`. |
| **CORS Error in Browser Developer Console** | Frontend port is not listed in allowed origins. | Check `CORS_ORIGINS` in `backend/.env`. Ensure it includes your frontend origin (e.g. `http://localhost:8080`, `http://127.0.0.1:8080`). |
| **Port 5000 or 8080 Already in Use** | Another application or previous process is occupying the port. | Change the port: for backend, set `PORT=5001` in `backend/.env` and update `frontend/js/config.js`. For frontend, run `python -m http.server 8081 --directory frontend`. |
| **Missing Dependencies Error** | Dependencies not installed in active virtual environment. | Ensure `.venv` is activated (`.\.venv\Scripts\Activate.ps1`) and run `pip install -r backend\requirements.txt`. |

---

## 14. Security and Data Disclaimer

1. **Credentials & Secrets Protection:**
   - Never commit `.env` files, MongoDB Atlas connection strings, or private credentials to Git repositories.
   - All connection strings and application secrets must be supplied through local environment variables.
2. **Database Isolation & Network Security:**
   - The browser frontend connects **exclusively** to the Python Flask REST API over HTTP/HTTPS.
   - Browser JavaScript **never** connects directly to MongoDB Atlas.
3. **Synthetic Demonstration Data Only:**
   - All facilities, medicines, batch numbers, patient counts, and clinician names in this repository are **fictional synthetic demonstration records**.
   - No Protected Health Information (PHI) or real hospital data is present or stored.

---

## 15. Technical Documentation

Detailed architecture specifications and interface documentation are maintained in the [`docs/`](docs/) directory:

- **[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md):** Complete REST API specification with parameter tables and example payloads.
- **[`docs/MONGODB_SCHEMA.md`](docs/MONGODB_SCHEMA.md):** MongoDB collection design, BSON data types, embedded structures, and indexing rules.
- **[`docs/COLLECTION_RELATIONSHIPS.md`](docs/COLLECTION_RELATIONSHIPS.md):** Logical relationships, aggregate boundaries, and integrity invariants.
- **[`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md):** Field-by-field database dictionary with constraints and business rules.
- **[`docs/MONGODB_MIGRATION_PLAN.md`](docs/MONGODB_MIGRATION_PLAN.md):** Architecture transition specification and concurrency invariants.
- **[`docs/INTEGRATION.md`](docs/INTEGRATION.md):** Detailed guide on frontend-backend communication and error states.

---

## Author

Developed by **Ashmit Pandey** ([@AshmitPandey7](https://github.com/AshmitPandey7))  
Repository: [https://github.com/AshmitPandey7/PharmaSync-CARE.git](https://github.com/AshmitPandey7/PharmaSync-CARE.git)
