# PharmaSync CARE — API Contract Specification

> **Specification Status:** PRODUCTION READY / ACTIVE  
> **API Version:** 2.4.0  
> **Target Backend:** Python Flask + MySQL  
> **Frontend Integration:** Vanilla JavaScript ES Modules (`frontend/js/api.js`)  
> **Standard:** RESTful HTTP JSON APIs with Unified Response Envelope

---

## 1. General Architecture & API Conventions

### 1.1 Base URL & Environment Configuration
- **Local Development Base URL:** `http://127.0.0.1:5000/api`
- **Frontend Configuration File:** `frontend/js/config.js` (`config.API_BASE_URL`)
- **CORS Configuration:** Flask backend enables `flask-cors` for origins:
  - `http://127.0.0.1:5500` (VS Code Live Server)
  - `http://localhost:5500`
  - `http://127.0.0.1:8000` / `http://localhost:8000` (Python http.server)
  - `http://127.0.0.1:3000` / `http://localhost:3000`

### 1.2 Request Headers
Every client HTTP request initiated by the frontend sends:
```http
Content-Type: application/json
Accept: application/json
X-Client-App: PharmaSync-CARE-Frontend
X-User-Id: <user_id>
```

### 1.3 Unified Response Envelopes
To satisfy both the frontend fetch handler (`frontend/js/api.js`, which expects `json.data` and checks `response.ok`) and standard REST API clients, all endpoints return a consistent unified response envelope.

#### Successful Collection Response (`200 OK`)
```json
{
  "status": "success",
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "per_page": 20
  }
}
```

#### Successful Single-Resource Response (`200 OK`, `201 Created`)
```json
{
  "status": "success",
  "success": true,
  "data": { ... }
}
```

#### Error Response (`400`, `401`, `403`, `404`, `409`, `422`, `500`)
```json
{
  "status": "error",
  "success": false,
  "code": 422,
  "message": "The supplied inventory data is invalid.",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The supplied inventory data is invalid.",
    "details": {
      "expiryDate": "Expiry date cannot be in the past."
    }
  }
}
```

### 1.4 Data Types, Formats, and Enums
- **Dates:** ISO-8601 Calendar Date: `YYYY-MM-DD` (e.g., `2026-11-20`).
- **Timestamps:** ISO-8601 UTC / Local: `YYYY-MM-DDTHH:mm:ssZ` or formatted `YYYY-MM-DD HH:mm:ss`.
- **Quantities:** Strictly non-negative integers (`0`, `150`, `1200`). Negative quantities are rejected.
- **Prices & Currency:** Decimal numbers formatted with 2 decimal places (`145.00`).
- **Geographic Coordinates:** Synthetic 2-element array `[latitude, longitude]` as `[float, float]` (e.g., `[12.9716, 77.5946]`).
- **Identifier Conventions:**
  - Facilities: `FAC-001`, `FAC-002`, ...
  - Medicines: `MED-001`, `MED-002`, ...
  - Inventory Batches: `BAT-101`, `BAT-102`, ...
  - Shortage Tickets: `SHT-201`, `SHT-202`, ...
  - Transfers: `TRF-501`, `TRF-502` with human-readable tracking code `TRF-2026-001`.
  - Simulations: `SIM-8801`, `SIM-8802`, ...
  - Optimization Runs: `OPT-4401`, `OPT-4402`, ...
  - Audit Logs: `LOG-901`, `LOG-902`, ...
  - Users: `USR-801`, `USR-802`, ...

#### Standard Status Enums
| Enum Domain | Allowed Values | Description |
| :--- | :--- | :--- |
| **Shortage Urgency** | `EMERGENCY`, `HIGH`, `ROUTINE` | Clinical priority assigned at declaration |
| **Shortage Status** | `OPEN`, `PARTIALLY_MATCHED`, `FULFILLED` | Lifecycle state of medicine need |
| **Transfer Status** | `PROPOSED`, `REQUESTED`, `APPROVED`, `DISPATCHED`, `RECEIVED`, `CANCELLED` | Custody lifecycle progression |
| **Surplus Recommendation** | `TRANSFER`, `MONITOR`, `RETAIN`, `BLOCK` | Algorithmic redistribution recommendation |
| **Facility Types** | `Hospital Pharmacy`, `Community Pharmacy`, `Rural Health Centre`, `Charitable Clinic`, `Distribution Hub` | Certified facility node classification |

---

## 2. Page-to-Endpoint Mapping Table

This matrix maps every screen and user action in the PharmaSync CARE frontend to its backing HTTP API endpoint.

| Frontend Page / Route | User Action / UI Trigger | HTTP Method & Path | Operation Classification | Mutates Inventory? |
| :--- | :--- | :--- | :--- | :--- |
| **Landing** (`#/landing`) | View public coordination summary & network KPIs | `GET /api/dashboard/summary` | Read-Only | No |
| **Login** (`#/login`) | Authenticate user credentials & establish session | `POST /api/auth/login` | Session Authentication | No |
| **Dashboard** (`#/dashboard`) | Load high-level executive KPI cards | `GET /api/dashboard/summary` | Read-Only | No |
| **Dashboard** (`#/dashboard`) | Load redistribution trends and network participation | `GET /api/dashboard/analytics` | Read-Only | No |
| **Medicine Stock** (`#/inventory`) | Load inventory batches with facility & expiry filters | `GET /api/inventory` | Read-Only | No |
| **Medicine Stock** (`#/inventory`) | Click "+ Add Medicine Batch" modal submit | `POST /api/inventory` | Persistent Mutation | **Yes (Inserts Stock)** |
| **Medicine Stock** (`#/inventory`) | Click "Edit Stock" modal to modify quantity or buffer | `PUT /api/inventory/<id>` | Persistent Mutation | **Yes (Updates Stock)** |
| **Stock Available to Share** (`#/rescue`) | Load surveillance batches & rescue priority scores | `GET /api/rescue/candidates` | Demand Surplus Surveillance | No (Analytical Preview) |
| **Stock Available to Share** (`#/rescue`) | Click "Propose Transfer" from surplus batch | `POST /api/transfers` | Persistent Mutation | **Yes (Reserves Stock)** |
| **Medicine Needed** (`#/shortages`) | Load open & fulfilled clinical shortage tickets | `GET /api/shortages` | Read-Only | No |
| **Medicine Needed** (`#/shortages`) | Click "+ Create Medicine Request" modal submit | `POST /api/shortages` | Persistent Mutation | No (Creates Shortage) |
| **Find Medicines** (`#/matching`) | Select shortage & evaluate candidate donor batches | `POST /api/matching/candidates`<br>*(Alias: `POST /api/matching/recommendations`)* | Explainable Scoring Preview | No (Pure Evaluation) |
| **Find Medicines** (`#/matching`) | Click "Select & Create Transfer" modal confirm | `POST /api/transfers` | Persistent Mutation | **Yes (Atomically Reserves)** |
| **Transfers** (`#/transfers`) | Load active & completed transfer manifests | `GET /api/transfers` | Read-Only | No |
| **Transfers** (`#/transfers`) | Inspect single transfer order, line items & history | `GET /api/transfers/<id>` | Read-Only | No |
| **Transfers** (`#/transfers`) | Advance status: Click "Approve &rarr;" | `POST /api/transfers/<id>/approve`<br>*(or `PUT /api/transfers/<id>/status`)* | Persistent Mutation | No (Locks Reservation) |
| **Transfers** (`#/transfers`) | Advance status: Click "Dispatch &rarr;" | `POST /api/transfers/<id>/dispatch`<br>*(or `PUT /api/transfers/<id>/status`)* | Persistent Mutation | No (In-Transit Custody) |
| **Transfers** (`#/transfers`) | Advance status: Click "Mark Received &#10003;" | `POST /api/transfers/<id>/receive`<br>*(or `PUT /api/transfers/<id>/status`)* | Persistent Mutation | **Yes (Transfers Stock)** |
| **Transfers** (`#/transfers`) | Abort transfer: Click "Cancel Transfer" | `POST /api/transfers/<id>/cancel`<br>*(or `PUT /api/transfers/<id>/status`)* | Persistent Mutation | **Yes (Releases Reserve)** |
| **Fair Allocation** (`#/fairshare`) | Adjust urgency/vulnerability sliders to simulate | `POST /api/allocation/simulate`<br>*(Alias: `POST /api/allocations/preview`)* | Non-Mutating Simulation | **No (Zero State Change)** |
| **Fair Allocation** (`#/fairshare`) | Commit simulated fairshare proposal to real transfers | `POST /api/allocations/commit` | Persistent Transaction | **Yes (Atomic Reservations)** |
| **Scenario Simulator** (`#/digital-twin`) | Select disruption scenario & run sandboxed simulation | `POST /api/simulations` | Sandboxed Digital Twin | **No (Zero State Change)** |
| **Scenario Simulator** (`#/digital-twin`) | Retrieve historical simulation runs | `GET /api/simulations` | Read-Only | No |
| **Compare Allocation** (`#/optimization`) | Run Pareto multi-objective optimization | `POST /api/optimization/runs` | Algorithmic Optimization | **No (Zero State Change)** |
| **What If? Analysis** (`#/decision-explorer`) | Perturb parameters (stock, demand, expiry, distance) | `POST /api/optimization/counterfactuals` | Counterfactual Sensitivity | **No (Zero State Change)** |
| **Healthcare Facilities** (`#/network`) | Load facilities directory and coordinates for map | `GET /api/facilities` | Read-Only | No |
| **Healthcare Facilities** (`#/network`) | Register new healthcare node | `POST /api/facilities` | Persistent Mutation | No (Facility Node) |
| **Reports & Analytics** (`#/analytics`) | Aggregated performance metrics & participation | `GET /api/dashboard/analytics` | Read-Only | No |
| **System Settings** (`#/admin`) | Test backend health & connectivity status | `GET /api/health` | Diagnostic Ping | No |
| **System Settings** (`#/admin`) | View immutable regulatory audit log trail | `GET /api/audit-logs` | Read-Only | No |
| **System Settings** (`#/admin`) | View authorized clinical personnel directory | `GET /api/users` | Read-Only | No |

---

## 3. Operational Semantics: Preview vs. Persistent State

To preserve database integrity and prevent accidental stock drift, the contract strictly defines two operational modes:

### 3.1 Non-Mutating Previews & Simulations
- **Endpoints:**
  - `POST /api/matching/candidates` (or `/api/matching/recommendations`)
  - `POST /api/allocation/simulate` (or `/api/allocations/preview`)
  - `POST /api/simulations`
  - `POST /api/optimization/runs`
  - `POST /api/optimization/counterfactuals`
- **Behavioral Guarantee:**
  - These operations compute algorithmic scores, Pareto frontiers, and equity shares in-memory or in sandbox storage.
  - They **NEVER** modify `inventory_batches.available_quantity`, `reserved_quantity`, or `total_quantity`.
  - They **NEVER** insert records into `transfers` or `transfer_items`.
  - They can be executed hundreds of times without side effects.

### 3.2 Persistent State Mutations & Transaction Invariants
- **Endpoints:**
  - `POST /api/transfers`
  - `POST /api/allocations/commit`
  - `PUT /api/transfers/<id>/status` (and `/approve`, `/dispatch`, `/receive`, `/cancel`)
  - `POST /api/inventory`
  - `PUT /api/inventory/<id>`
- **Database Transaction Guarantees:**
  - **Over-allocation Prevention:** When initiating a transfer (`POST /api/transfers`), the backend verifies `available_quantity >= transfer_quantity` using row-level locking (`SELECT ... FOR UPDATE`).
  - **Atomicity:**
    - `available_quantity` is decremented by `quantity`.
    - `reserved_quantity` is incremented by `quantity`.
    - A `transfers` record is created in status `REQUESTED` (or `PROPOSED`).
    - An immutable `audit_logs` record is inserted with the acting user's signature.
  - **Receipt Completion:** On `/receive`, `sender.reserved_quantity` is decremented by `quantity`, `sender.total_quantity` is decremented by `quantity`, and a corresponding batch or quantity is credited to `recipient.available_quantity`.
  - **Safe Rollback on Cancellation:** On `/cancel`, `sender.reserved_quantity` is decremented by `quantity`, and `sender.available_quantity` is incremented by `quantity`, restoring available stock.
  - **Expiry Guard:** Batches where `expiry_date <= CURRENT_DATE` cannot be reserved, transferred, or matched.

---

## 4. Detailed Specification of Core API Operations

---

### 4.1 Medicine Stock Inventory (`GET /api/inventory`)

#### Description
Returns a list of medicine inventory batches across all healthcare facilities in the network. Supports text search and filtering by facility and remaining shelf-life status. Powers the **Medicine Stock** screen (`#/inventory`).

#### HTTP Method & URL
```http
GET /api/inventory
```

#### Query Parameters
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `facilityId` | `string` | Optional | Specific facility ID or `ALL` | `FAC-001` |
| `category` | `string` | Optional | Therapeutic category (`Antibiotics`, `Analgesics`, `Cardiovascular`, `IV Fluids`) | `Antibiotics` |
| `expiryStatus`| `string` | Optional | `SOON` (&le; 45 days) or `SAFE` (&gt; 45 days) | `SOON` |
| `search` | `string` | Optional | Case-insensitive substring match on medicine name, batch number, or generic name | `Ceftriaxone` |

#### Headers
```http
Accept: application/json
```

#### Successful Response (`200 OK`)
```json
{
  "status": "success",
  "success": true,
  "data": [
    {
      "id": "BAT-101",
      "batchNumber": "CTX-2026-B1",
      "medicineName": "Ceftriaxone Injection",
      "genericName": "Ceftriaxone Sodium",
      "strength": "1g Vial",
      "dosageForm": "Injectable",
      "category": "Antibiotics",
      "totalQuantity": 650,
      "reservedQuantity": 100,
      "availableQuantity": 550,
      "eligibleSurplusQuantity": 280,
      "expectedMonthlyDemand": 200,
      "safetyStockThreshold": 70,
      "expiryDate": "2026-11-20",
      "unitPrice": 145.00,
      "facilityId": "FAC-001",
      "facilityName": "Apex Central Hospital",
      "coldChainRequired": false,
      "status": "SURPLUS_RISK"
    },
    {
      "id": "BAT-102",
      "batchNumber": "AZM-2026-B2",
      "medicineName": "Azithromycin Tablets",
      "genericName": "Azithromycin Dihydrate",
      "strength": "500mg Tablet",
      "dosageForm": "Oral Solid",
      "category": "Antibiotics",
      "totalQuantity": 1200,
      "reservedQuantity": 0,
      "availableQuantity": 1200,
      "eligibleSurplusQuantity": 600,
      "expectedMonthlyDemand": 400,
      "safetyStockThreshold": 200,
      "expiryDate": "2026-12-15",
      "unitPrice": 32.50,
      "facilityId": "FAC-002",
      "facilityName": "City Care Pharmacy",
      "coldChainRequired": false,
      "status": "ADEQUATE"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "per_page": 50
  }
}
```

#### Field Specifications & Data Types
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique synthetic identifier for the batch (`BAT-XXX`) |
| `batchNumber` | `string` | Manufacturer lot/batch tracking code printed on packaging |
| `medicineName` | `string` | Commercial or standard product name |
| `genericName` | `string` | Active pharmaceutical ingredient (API) composition |
| `strength` | `string` | Dosage strength specification (e.g., `1g Vial`, `500mg Tablet`) |
| `dosageForm` | `string` | Physical administration form (`Injectable`, `Oral Solid`, `IV Fluid`, `Oral Liquid`) |
| `category` | `string` | Pharmacological classification |
| `totalQuantity` | `integer` | Total physical units physically present in the warehouse |
| `reservedQuantity` | `integer` | Units locked for approved/dispatched redistribution orders |
| `availableQuantity` | `integer` | Units free for local dispensing or newly approved transfers (`total - reserved`) |
| `eligibleSurplusQuantity` | `integer` | Units exceeding expected demand + safety buffer that can be safely transferred |
| `expectedMonthlyDemand` | `integer` | Projected 30-day facility consumption rate |
| `safetyStockThreshold` | `integer` | Non-negotiable local reserve cushion |
| `expiryDate` | `string (YYYY-MM-DD)` | Manufacturer expiration date |
| `unitPrice` | `float` | Estimated procurement unit cost in standard currency |
| `facilityId` | `string` | ID of the holding facility |
| `facilityName` | `string` | Human-readable name of holding facility |
| `coldChainRequired` | `boolean` | Indicates if continuous 2-8°C storage is required |
| `status` | `string` | Stock disposition (`ADEQUATE`, `SURPLUS_RISK`, `CRITICAL_EXPIRY`) |

---

### 4.2 Executive Dashboard Summary (`GET /api/dashboard/summary`)

#### Description
Returns aggregated system-wide KPI metrics summarizing total batches, units in stock, open clinical shortages, active redistribution transfers, and total surplus stock ready to share. Powers the **Dashboard** (`#/dashboard`) and **Landing** (`#/landing`) pages.

#### HTTP Method & URL
```http
GET /api/dashboard/summary
```

#### Query Parameters
| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `facilityId` | `string` | Optional | Scope metrics to a specific facility, or omit for network-wide | `FAC-001` |

#### Successful Response (`200 OK`)
```json
{
  "status": "success",
  "success": true,
  "data": {
    "totalBatches": 12,
    "totalAvailableUnits": 12840,
    "openShortagesCount": 3,
    "totalUnmetUnits": 330,
    "ongoingTransfersCount": 2,
    "completedTransfersCount": 2,
    "surplusUnitsAvailable": 3842,
    "urgentAttentionCount": 4
  }
}
```

#### Field Specifications
| Field | Type | Description |
| :--- | :--- | :--- |
| `totalBatches` | `integer` | Total active medicine batches tracked in the relational database |
| `totalAvailableUnits` | `integer` | Sum of `available_quantity` across all active unexpired batches |
| `openShortagesCount` | `integer` | Number of shortage tickets with status `OPEN` or `PARTIALLY_MATCHED` |
| `totalUnmetUnits` | `integer` | Sum of remaining unmet requested medicine units |
| `ongoingTransfersCount` | `integer` | Number of transfers currently in `REQUESTED`, `APPROVED`, or `DISPATCHED` |
| `completedTransfersCount` | `integer` | Number of transfers successfully delivered (`RECEIVED`) |
| `surplusUnitsAvailable` | `integer` | Total units identified by surveillance algorithm as safe to share |
| `urgentAttentionCount` | `integer` | Batches within &le; 30 days of expiry requiring clinical decision |

---

### 4.3 Algorithmic Matching & Candidate Discovery (`POST /api/matching/recommendations`)
*(Also supported at frontend route: `POST /api/matching/candidates`)*

#### Description
Evaluates an active medicine shortage ticket against all inventory batches in the network. Performs multi-criteria constraint filtering (same medicine, cold-chain compatibility, minimum remaining shelf life buffer, and donor surplus availability) and calculates an explainable Match Score (0–100) with detailed clinical justifications.

This operation is a **non-mutating preview**. It does not alter inventory.

#### HTTP Method & URL
```http
POST /api/matching/recommendations
```

#### Request Body
```json
{
  "shortageId": "SHT-201"
}
```

#### Validation Rules
- `shortageId` is mandatory and must correspond to an existing `OPEN` or `PARTIALLY_MATCHED` shortage ticket.
- Returns `404 Not Found` if `shortageId` does not exist.

#### Successful Response (`200 OK`)
```json
{
  "status": "success",
  "success": true,
  "data": {
    "shortage": {
      "id": "SHT-201",
      "facilityId": "FAC-003",
      "facilityName": "Green Valley Health Centre",
      "medicineName": "Ceftriaxone Injection",
      "genericName": "Ceftriaxone Sodium",
      "strength": "1g Vial",
      "dosageForm": "Injectable",
      "requiredQuantity": 150,
      "unmetQuantity": 150,
      "urgency": "EMERGENCY",
      "requiredByDate": "2026-10-28",
      "reason": "Post-monsoon enteric fever surge."
    },
    "candidates": [
      {
        "batchId": "BAT-101",
        "batchNumber": "CTX-2026-B1",
        "medicineName": "Ceftriaxone Injection",
        "strength": "1g Vial",
        "donorFacilityId": "FAC-001",
        "donorFacilityName": "Apex Central Hospital",
        "donorType": "Hospital Pharmacy",
        "availableSurplus": 280,
        "daysToExpiry": 40,
        "expiryDate": "2026-11-20",
        "distanceKm": 13.5,
        "coldChainRequired": false,
        "matchScore": 88,
        "isEligible": true,
        "reasons": [
          "Shelf life verified: 40 days remaining (buffer satisfied).",
          "Available surplus: 280 units (can fulfill 100% of 150 units needed).",
          "Transit zone: Local tier (13.5 km, transit under 2h)."
        ]
      }
    ]
  }
}
```

#### Scoring Rules & Constraints
1. **Donor Identity Exclusion:** A facility cannot donate stock to itself (`donorFacilityId != recipientFacilityId`).
2. **Shelf-Life Buffer:** Batches with remaining days &lt; policy buffer (45 days) receive an eligibility penalty or rejection unless overridden with clinical approval.
3. **Cold-Chain Certification:** If `medicine.coldChainRequired == true`, both the donor and recipient facilities must possess `coldChainCertified == true`.
4. **Scoring Breakdown (Max 100 Points):**
   - Expiry Buffer Fit: 40 points.
   - Fulfillment Capability: Up to 30 points (`(surplus / unmetQuantity) * 30`).
   - Proximity & Transit Distance: Local (&lt;15 km) = 15 points; Regional (&lt;60 km) = 10 points; Extended = 5 points.
   - Verified Cold-Chain Route: 15 points.

---

### 4.4 FairShare Multi-Facility Allocation Preview (`POST /api/allocations/preview`)
*(Also supported at frontend route: `POST /api/allocation/simulate`)*

#### Description
Simulates the distribution of scarce donor surplus across competing clinical shortage requests from multiple healthcare facilities. Generates a side-by-side comparison between standard First-Come-First-Served (FCFS) and the FairShare Multi-Criteria Proportional model.

This operation is a **non-mutating simulation**. It does not reserve stock or create transfers.

#### HTTP Method & URL
```http
POST /api/allocations/preview
```

#### Request Body
```json
{
  "totalAvailableUnits": 200,
  "weights": {
    "urgencyWeight": 0.45,
    "vulnWeight": 0.35,
    "demandWeight": 0.20
  },
  "requests": [
    {
      "facilityId": "FAC-001",
      "facilityName": "Apex Central Hospital",
      "requested": 120,
      "bedCapacity": 450,
      "urgency": "EMERGENCY",
      "vulnerabilityScore": 0.80
    },
    {
      "facilityId": "FAC-003",
      "facilityName": "Green Valley Health Centre",
      "requested": 90,
      "bedCapacity": 30,
      "urgency": "EMERGENCY",
      "vulnerabilityScore": 0.95
    },
    {
      "facilityId": "FAC-005",
      "facilityName": "St. Jude Charitable Dispensary",
      "requested": 80,
      "bedCapacity": 15,
      "urgency": "HIGH",
      "vulnerabilityScore": 0.85
    }
  ]
}
```

#### Validation Rules
- `totalAvailableUnits` must be an integer &gt; 0.
- `weights` must sum to approximately 1.0 (0.95–1.05 accepted).
- `requests` must contain at least 2 facility request items.

#### Successful Response (`200 OK`)
```json
{
  "status": "success",
  "success": true,
  "data": {
    "totalAvailableSupply": 200,
    "totalDemand": 290,
    "deficit": 90,
    "comparison": {
      "fcfs": [
        {
          "facilityId": "FAC-001",
          "facilityName": "Apex Central Hospital",
          "requested": 120,
          "allocated": 120,
          "fulfillmentPct": 100,
          "unmet": 0
        },
        {
          "facilityId": "FAC-003",
          "facilityName": "Green Valley Health Centre",
          "requested": 90,
          "allocated": 80,
          "fulfillmentPct": 89,
          "unmet": 10
        },
        {
          "facilityId": "FAC-005",
          "facilityName": "St. Jude Charitable Dispensary",
          "requested": 80,
          "allocated": 0,
          "fulfillmentPct": 0,
          "unmet": 80
        }
      ],
      "fairShare": [
        {
          "facilityId": "FAC-001",
          "facilityName": "Apex Central Hospital",
          "requested": 120,
          "allocated": 82,
          "fulfillmentPct": 68,
          "unmet": 38,
          "criteriaScore": 41
        },
        {
          "facilityId": "FAC-003",
          "facilityName": "Green Valley Health Centre",
          "requested": 90,
          "allocated": 68,
          "fulfillmentPct": 76,
          "unmet": 22,
          "criteriaScore": 34
        },
        {
          "facilityId": "FAC-005",
          "facilityName": "St. Jude Charitable Dispensary",
          "requested": 80,
          "allocated": 50,
          "fulfillmentPct": 63,
          "unmet": 30,
          "criteriaScore": 25
        }
      ]
    },
    "explanation": "Supply (200 units) is 69% of total demand (290 units). FairShare prevented complete starvation of St. Jude Charitable Dispensary (which received 0 units under FCFS) by prioritizing clinical urgency and facility vulnerability index rather than request timestamp."
  }
}
```

---

### 4.5 Create & Commit Medicine Transfer (`POST /api/transfers`)

#### Description
Initiates a new medicine redistribution order between a donor facility and recipient facility. Executes within an **atomic database transaction**: validates available stock, locks the inventory row, decrements `available_quantity`, increments `reserved_quantity`, assigns an order tracking code, and writes an audit log entry.

#### HTTP Method & URL
```http
POST /api/transfers
```

#### Request Body
```json
{
  "senderFacilityId": "FAC-001",
  "recipientFacilityId": "FAC-003",
  "batchId": "BAT-101",
  "medicineName": "Ceftriaxone Injection",
  "strength": "1g Vial",
  "quantity": 120,
  "urgency": "HIGH",
  "notes": "Direct matched transfer for shortage SHT-201"
}
```

#### Validation Rules
- `senderFacilityId`, `recipientFacilityId`, `batchId`, `medicineName`, and `quantity` are required.
- `senderFacilityId` must NOT equal `recipientFacilityId`.
- `quantity` must be an integer &gt; 0.
- `quantity` must NOT exceed the donor batch's `availableQuantity`.
- Returns `422 Unprocessable Entity` if requested quantity exceeds available stock.
- Returns `404 Not Found` if batch or facilities do not exist.

#### Successful Response (`201 Created`)
```json
{
  "status": "success",
  "success": true,
  "data": {
    "id": "TRF-509",
    "transferCode": "TRF-2026-005",
    "senderFacilityId": "FAC-001",
    "senderFacilityName": "Apex Central Hospital",
    "recipientFacilityId": "FAC-003",
    "recipientFacilityName": "Green Valley Health Centre",
    "batchId": "BAT-101",
    "medicineName": "Ceftriaxone Injection",
    "strength": "1g Vial",
    "quantity": 120,
    "urgency": "HIGH",
    "status": "REQUESTED",
    "lifecycleIndex": 1,
    "requestedDate": "2026-10-21 14:40",
    "carrierName": "Pending Assignment",
    "temperatureLog": "Ambient / Standard Cold",
    "notes": "Direct matched transfer for shortage SHT-201",
    "statusHistory": [
      {
        "status": "REQUESTED",
        "timestamp": "2026-10-21 14:40",
        "by": "Dr. Sunita Nair",
        "note": "Transfer order submitted and units reserved in donor stock."
      }
    ]
  }
}
```

#### Error Response: Insufficient Stock (`422 Unprocessable Entity`)
```json
{
  "status": "error",
  "success": false,
  "code": 422,
  "message": "Cannot create transfer: requested quantity (120) exceeds available stock (50).",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Cannot create transfer: requested quantity (120) exceeds available stock (50).",
    "details": {
      "batchId": "BAT-101",
      "availableQuantity": 50,
      "requestedQuantity": 120
    }
  }
}
```

---

## 5. Secondary API Specifications

### 5.1 Healthcare Facilities

#### `GET /api/facilities`
- **Purpose:** Retrieve all registered network facilities.
- **Query Params:** `type`, `cold_chain` (`true`/`false`), `search`.
- **Response `200 OK`:** Array of facility objects.

#### `GET /api/facilities/<id>`
- **Purpose:** Retrieve profile of a single healthcare facility.

#### `POST /api/facilities`
- **Purpose:** Register a new healthcare facility node.
- **Request:**
```json
{
  "name": "Eastside Community Clinic",
  "type": "Rural Health Centre",
  "address": "55 Lake Road, East District",
  "coordinates": [12.9400, 77.6100],
  "coldChainCertified": false,
  "licenseNumber": "KA-BLR-RHC-2026-9921",
  "bedCapacity": 20,
  "contactPerson": "Dr. R. Menon",
  "phone": "+91 80 2888 1234"
}
```
- **Response `201 Created`:** Created facility record with assigned `id`.

---

### 5.2 Surplus Surveillance & Rescue Centre

#### `GET /api/rescue/candidates`
*(Supported aliases: `GET /api/rescue-centre/risks`, `GET /api/rescue-centre/surplus`)*
- **Purpose:** Evaluates all batches against local consumption rates and remaining days to expiry. Returns transparent Rescue Priority Scores (0–100) and redistribution recommendations (`TRANSFER`, `MONITOR`, `RETAIN`, `BLOCK`).
- **Response `200 OK`:**
```json
{
  "status": "success",
  "success": true,
  "data": [
    {
      "id": "BAT-101",
      "batchNumber": "CTX-2026-B1",
      "medicineName": "Ceftriaxone Injection",
      "strength": "1g Vial",
      "facilityId": "FAC-001",
      "availableQuantity": 550,
      "expectedMonthlyDemand": 200,
      "safetyStockThreshold": 70,
      "potentialSurplus": 280,
      "daysToExpiry": 40,
      "expiryDate": "2026-11-20",
      "priorityScore": 88,
      "recommendation": "TRANSFER",
      "reasons": [
        "Expires in 40 days. 280 units exceed local projected demand.",
        "Local safety cushion (70 units) fully preserved."
      ]
    }
  ]
}
```

---

### 5.3 Clinical Shortages

#### `GET /api/shortages`
- **Purpose:** Retrieve clinical shortage tickets.
- **Query Params:** `urgency` (`EMERGENCY`, `HIGH`, `ROUTINE`, `ALL`), `status` (`OPEN`, `PARTIALLY_MATCHED`, `FULFILLED`, `ALL`).
- **Response `200 OK`:** Array of shortage tickets.

#### `POST /api/shortages`
- **Purpose:** Declare a new shortage ticket.
- **Request:**
```json
{
  "facilityId": "FAC-003",
  "medicineName": "Ceftriaxone Injection",
  "genericName": "Ceftriaxone Sodium",
  "strength": "1g Vial",
  "dosageForm": "Injectable",
  "requiredQuantity": 150,
  "urgency": "EMERGENCY",
  "requiredByDate": "2026-10-28",
  "reason": "Post-monsoon enteric fever surge."
}
```
- **Response `201 Created`:** Created shortage ticket with assigned `id`.

---

### 5.4 Transfer Order Lifecycle Progression

#### `PUT /api/transfers/<id>/status`
- **Purpose:** Advance or abort transfer custody status (`REQUESTED` &rarr; `APPROVED` &rarr; `DISPATCHED` &rarr; `RECEIVED` or `CANCELLED`).
- **Request:**
```json
{
  "status": "APPROVED",
  "note": "Verified cold-chain vehicle logistics and released stock."
}
```

#### Aliased Action Endpoints:
- `POST /api/transfers/<id>/approve` &rarr; Sets status to `APPROVED`.
- `POST /api/transfers/<id>/dispatch` &rarr; Sets status to `DISPATCHED`.
- `POST /api/transfers/<id>/receive` &rarr; Sets status to `RECEIVED`. Increments recipient inventory, clears sender reserved inventory.
- `POST /api/transfers/<id>/cancel` &rarr; Sets status to `CANCELLED`. Atomically releases sender reserved quantity back to available stock.

---

### 5.5 Multi-Facility Allocation Commit

#### `POST /api/allocations/commit`
- **Purpose:** Atomically commits a multi-facility FairShare allocation proposal into persistent database transfers.
- **Request:**
```json
{
  "donorFacilityId": "FAC-001",
  "batchId": "BAT-101",
  "allocations": [
    { "recipientFacilityId": "FAC-001", "quantity": 82 },
    { "recipientFacilityId": "FAC-003", "quantity": 68 },
    { "recipientFacilityId": "FAC-005", "quantity": 50 }
  ],
  "notes": "Committed via FairShare Multi-Facility Equity run."
}
```
- **Behavior:** Executes a single database transaction creating 3 transfer orders and reserving 200 units on `BAT-101`. If total exceeds available surplus, rolls back cleanly.

---

### 5.6 Digital Twin Sandboxed Simulation

#### `POST /api/simulations`
- **Purpose:** Runs a discrete-event logistics simulation evaluating supply network resilience under synthetic shock scenarios (epidemics, transit strikes, expiry clusters).
- **Request:**
```json
{
  "scenarioName": "Epidemic Demand Surge",
  "demandMultiplier": 2.5,
  "delayHours": 4,
  "safetyMarginPct": 15,
  "expiryClusterDays": 30
}
```
- **Response `200 OK`:**
```json
{
  "status": "success",
  "success": true,
  "data": {
    "simulationId": "SIM-8801",
    "isSandboxed": true,
    "metrics": {
      "simulatedDemand": 8500,
      "unmanagedStockouts": 3077,
      "suppliedViaNetwork": 2215,
      "resilienceFulfillmentPct": 92,
      "isolatedServiceLevelPct": 65
    }
  }
}
```

---

### 5.7 Optimization & Counterfactual Sensitivity

#### `POST /api/optimization/runs`
- **Purpose:** Evaluates Pareto multi-objective trade-offs between waste prevention, transport distance, and fulfillment speed.
- **Request:**
```json
{
  "weights": {
    "wastePrevention": 0.80,
    "distanceMinimization": 0.50,
    "fairAllocation": 0.75,
    "donorSafetyBuffer": 0.60
  }
}
```

#### `POST /api/optimization/counterfactuals`
- **Purpose:** Computes sensitivity analysis showing how decision recommendations pivot when key parameters are perturbed.
- **Request:**
```json
{
  "transferCode": "TRF-2026-001",
  "donorStock": 550,
  "donorMonthlyDemand": 200,
  "daysToExpiry": 40,
  "distanceKm": 14
}
```

---

### 5.8 Audit Logging, Users & Diagnostics

#### `GET /api/audit-logs`
- **Purpose:** Retrieve immutable regulatory audit log entries.
- **Response `200 OK`:**
```json
{
  "status": "success",
  "success": true,
  "data": [
    {
      "id": "LOG-901",
      "timestamp": "2026-10-10 14:32:00",
      "user": "Dr. Sunita Nair",
      "role": "Chief Pharmacist",
      "action": "TRANSFER_APPROVED",
      "entity": "TRF-2026-001",
      "details": "Verified cold-chain route and authorized dispatch.",
      "ipAddress": "192.168.1.105"
    }
  ]
}
```

#### `GET /api/users`
- **Purpose:** List authorized clinical and administrative personnel.

#### `POST /api/auth/login`
- **Purpose:** Authenticate user credentials and issue session token.
- **Request:**
```json
{
  "username": "admin",
  "password": "pharmasync2026"
}
```

#### `GET /api/health`
- **Purpose:** Verify Flask server operation and relational database connectivity.
- **Response `200 OK`:**
```json
{
  "status": "success",
  "success": true,
  "data": {
    "status": "OK",
    "mode": "LIVE_DATABASE",
    "database": "CONNECTED",
    "engine": "MySQL",
    "timestamp": "2026-10-21T14:30:00Z"
  }
}
```

---

## 6. Implementation Notes & Best Practices

1. **No Frontend Code Redesign:** The endpoint names, query parameter names, and response JSON field shapes strictly mirror the existing frontend implementation in `frontend/js/pages/` and `frontend/js/api.js`.
2. **Unified Envelope Compatibility:** Every response includes both `status: "success"` and `success: true` to satisfy code checking either `res.data` or `res.success`.
3. **Zero Direct DB Access from Frontend:** The frontend interacts exclusively via HTTP fetch requests against the `/api/*` endpoints.
4. **Synthetic Data Exclusivity:** All IDs, facility names, coordinates, and batch lot numbers are synthetic. No real patient or proprietary pharmacy data is used.
