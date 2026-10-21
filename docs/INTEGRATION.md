# PharmaSync CARE — Frontend & Backend Integration Guide

> **Audience:** Development team (Frontend engineer & Backend Flask/MySQL engineer)  
> **Purpose:** Step-by-step instructions for running, testing, and integrating the standalone frontend with the independently developed Flask + MySQL backend.

---

## 1. Repository Structure & Separation of Concerns

The repository is structured to maintain clean boundaries between frontend and backend:

```
DBS Project/
├── frontend/             # Single-Page Frontend (HTML5, CSS3, Vanilla JS ES Modules)
│   ├── index.html        # Entry page
│   ├── css/              # Design tokens, layout, components, page styles
│   ├── js/               # Application logic
│   │   ├── api.js        # Central API communication client
│   │   ├── config.js     # Global configuration (API URL, Demo toggle, facility context)
│   │   ├── demo-data.js  # Synthetic demonstration datasets
│   │   ├── router.js     # Client-side hash routing
│   │   ├── components/   # Sidebar, Topbar, Modal, Toast, CSV exporter
│   │   └── pages/        # 13 page view controllers
│   └── assets/           # Local vendor libraries (Chart.js, Leaflet)
├── backend/              # Flask Backend (Python) — Developed independently
│   ├── app.py
│   ├── routes/
│   ├── models/
│   └── requirements.txt
├── sql/                  # MySQL schema DDL & seed scripts
│   ├── schema.sql
│   └── seed_data.sql
├── docs/                 # Collaboration documentation
│   ├── API_CONTRACT.md   # Proposed REST API endpoints & schemas
│   └── INTEGRATION.md    # This integration guide
└── README.md
```

### Safety Rules:
1. **Frontend responsibilities:** UI rendering, client-side validation, charts, user interaction, demo mode fallback, and API calls via `frontend/js/api.js`.
2. **Backend responsibilities:** Relational database connections (MySQL), business logic, authorization, data persistence, and mathematical optimization solvers.
3. The frontend **never** connects directly to MySQL and never stores database credentials.

---

## 2. Running the Two Applications Locally

### A. Running the Frontend
The frontend requires only a lightweight static HTTP server (to support ES modules without CORS issues from `file://`):

**Option 1: Using Python (Recommended)**
```bash
# From the project root:
python -m http.server 8000 --directory frontend
```
Then open your browser to: **`http://localhost:8000`**

**Option 2: Using Node.js**
```bash
npx serve frontend -l 8000
```

### B. Running the Flask Backend
In a separate terminal window:
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # On Windows
pip install -r requirements.txt
python app.py
```
The Flask backend will typically run on **`http://127.0.0.1:5000`**.

---

## 3. Configuring the API Base URL

In `frontend/js/config.js`:
```javascript
export const config = {
  // Point to the live Flask API
  API_BASE_URL: 'http://127.0.0.1:5000/api',

  // Toggle between Synthetic Demo Mode (true) and Live Backend (false)
  DEMO_MODE: true,
  ...
};
```

You can also change the API URL live in the browser via the **Administration** page (`#/admin`) or toggle Demo Mode directly in the topbar pill.

---

## 4. Enabling CORS in Flask (CRITICAL)

Because the frontend runs on port `8000` and the Flask backend runs on port `5000`, the browser will block requests unless Cross-Origin Resource Sharing (CORS) is enabled.

In `backend/app.py`:
```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Explicitly permit requests from local frontend origin
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://127.0.0.1:8000",
            "http://localhost:8000",
            "http://127.0.0.1:5500",
            "http://localhost:5500"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept", "X-Client-App", "X-User-Id"]
    }
})
```

---

## 5. Demo Mode vs Live API Mode

1. **Demo Mode (`config.DEMO_MODE = true`):**
   - Ideal for student presentations, standalone testing, and testing when MySQL is offline.
   - All state modifications (adding inventory, declaring shortages, advancing transfers) persist in local browser memory.
2. **Live API Mode (`config.DEMO_MODE = false`):**
   - The frontend issues real `fetch()` HTTP requests to `config.API_BASE_URL`.
   - **Crucial Rule:** If the Flask backend is unreachable or errors, the frontend **does not secretly fabricate fake data**. It displays a clear, descriptive banner: `"Cannot connect to Flask API at http://127.0.0.1:5000/api. Is the server running?"` with a button to switch back to Demo Mode.

---

## 6. Authentication & User Headers

Until full JWT authentication is implemented, the frontend identifies the active user via HTTP headers on every request:
- `X-User-Id`: Current synthetic user ID (e.g. `USR-801`)
- `X-Client-App`: `PharmaSync-CARE-Frontend`

The backend can read these headers in Flask:
```python
user_id = request.headers.get('X-User-Id')
```

---

## 7. Troubleshooting Common Integration Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Browser console: CORS Policy Error** | Flask is missing `flask-cors` or doesn't allow port 8000 | Install `pip install flask-cors` and configure `CORS(app, origins=...)` as shown in Section 4. |
| **Fetch failed: Connection Refused** | Flask server is not running on port 5000 | Verify Flask is running with `python app.py` and output says `Running on http://127.0.0.1:5000`. |
| **HTTP 404 on API endpoints** | URL prefix mismatch (`/api` omitted) | Ensure backend routes match `docs/API_CONTRACT.md` (e.g. `/api/inventory`, not `/inventory`). |
| **HTTP 500 Internal Server Error** | MySQL database connection error or missing table | Inspect Flask terminal traceback and verify MySQL database credentials in backend config. |
| **Empty tables in UI** | Backend returned `{}` instead of `{ "status": "success", "data": [...] }` | Wrap all responses in the standard JSON envelope defined in `docs/API_CONTRACT.md`. |

---

## 8. Integration Checklist for Backend Teammate

Before connecting the frontend to Flask:
- [ ] Review `docs/API_CONTRACT.md` and confirm endpoint routes and JSON field names.
- [ ] Implement `GET /api/health` returning `{"status": "success", "data": {"status": "OK"}}`.
- [ ] Configure `flask-cors` to allow `http://localhost:8000`.
- [ ] Seed the MySQL database with initial test facilities and medicine batches.
- [ ] In the frontend topbar, switch the mode toggle pill from **Demo Mode** to **Switch Live** to test the live connection!
