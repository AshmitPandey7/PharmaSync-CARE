# PharmaSync CARE — Proposed API Contract Specification

> **Document Status:** PROPOSED INTEGRATION CONTRACT  
> **Notice for Backend Teammate:** This specification outlines the expected REST API endpoints, HTTP verbs, URL parameters, request payloads, response schemas, and error responses designed for the PharmaSync CARE frontend. This contract must be reviewed and mutually agreed upon before connecting the live Flask + MySQL backend. The frontend maintains all API calls in `frontend/js/api.js` so endpoint routes and field mappings can be adjusted in one place.

---

## 1. General API Conventions

### Base URL
- Local Development: `http://127.0.0.1:5000/api`
- Configurable in: `frontend/js/config.js` (`config.API_BASE_URL`)

### Headers
Every client request sends:
```http
Content-Type: application/json
Accept: application/json
X-Client-App: PharmaSync-CARE-Frontend
X-User-Id: <user_id>
```

### Response Envelope Standard
Every API response must follow a predictable JSON envelope structure:

#### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "status": "success",
  "data": { ... } // or array [ ... ]
}
```

#### Error Envelope (`400`, `401`, `403`, `404`, `422`, `500`)
```json
{
  "status": "error",
  "code": 404,
  "message": "Human-readable description of error for display in UI.",
  "errors": {
    "field_name": "Specific validation failure message"
  }
}
```

### Date, Time & Quantity Standards
- **Dates:** ISO-8601 Date format: `YYYY-MM-DD` (e.g. `2026-11-20`)
- **Timestamps:** ISO-8601 DateTime: `YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DD HH:mm`
- **Quantities:** Non-negative integers (e.g. `150`)
- **Prices / Scores:** Numeric floats or integers (e.g. `145.00`, score `88`)

---

## 2. Endpoints by Feature

### 2.1 Health Check
- **Endpoint:** `GET /health`
- **Description:** Verifies Flask server and MySQL database connectivity.
- **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "status": "OK",
    "database": "CONNECTED",
    "timestamp": "2026-10-11T14:30:00Z"
  }
}
```

---

### 2.2 Healthcare Facilities
#### `GET /facilities`
- **Description:** List all registered hospitals, pharmacies, clinics, and distribution hubs.
- **Query Parameters (Optional):**
  - `type`: String (`Hospital Pharmacy`, `Community Pharmacy`, `Rural Health Centre`, `Distribution Hub`)
  - `cold_chain`: Boolean (`true` or `false`)
- **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "FAC-001",
      "name": "Apex Central Hospital",
      "type": "Hospital Pharmacy",
      "typeBadge": "hospital",
      "address": "14 Healthcare Boulevard, Central District",
      "coordinates": [12.9716, 77.5946],
      "distanceKm": 0,
      "coldChainCertified": true,
      "licenseNumber": "KA-BLR-HOSP-2024-0891",
      "bedCapacity": 450,
      "contactPerson": "Dr. Sunita Nair",
      "phone": "+91 80 2234 5671",
      "status": "ACTIVE"
    }
  ]
}
```

#### `GET /facilities/<id>`
- **Description:** Retrieve a single facility profile by ID.

---

### 2.3 Medicine Inventory Batches
#### `GET /inventory`
- **Description:** Retrieve medicine inventory batches across facilities.
- **Query Parameters:**
  - `facilityId` (optional): Filter by facility ID (`FAC-001`)
  - `category` (optional): Filter by therapeutic category (`Antibiotics`, etc.)
  - `search` (optional): Substring search in `medicineName`, `genericName`, or `batchNumber`
- **Response `200 OK`:**
```json
{
  "status": "success",
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
      "coldChainRequired": false,
      "status": "SURPLUS_RISK"
    }
  ]
}
```

#### `POST /inventory`
- **Description:** Register a new medicine batch into inventory.
- **Request Body:**
```json
{
  "medicineName": "Ceftriaxone Injection",
  "genericName": "Ceftriaxone Sodium",
  "strength": "1g Vial",
  "dosageForm": "Injectable",
  "category": "Antibiotics",
  "batchNumber": "CTX-2026-B2",
  "totalQuantity": 500,
  "expectedMonthlyDemand": 150,
  "safetyStockThreshold": 50,
  "expiryDate": "2026-12-30",
  "facilityId": "FAC-001",
  "coldChainRequired": false,
  "unitPrice": 145.00
}
```
- **Response `201 Created`:** Returns created batch object with generated `id`.

#### `PUT /inventory/<id>`
- **Description:** Update quantities, reserved buffer, or demand thresholds of a batch.
- **Request Body:** Fields to update (e.g. `totalQuantity`, `reservedQuantity`, `expectedMonthlyDemand`).

---

### 2.4 Rescue Centre (Surplus Surveillance)
#### `GET /rescue/candidates`
- **Description:** Evaluates inventory batches and returns computed potential surplus, transparent Rescue Priority Scores (0-100), and triage recommendations.
- **Formula:**
  `potentialSurplus = availableQuantity - (expectedMonthlyDemand + safetyStockThreshold)`
- **Response `200 OK`:**
```json
{
  "status": "success",
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

### 2.5 Shortage Management
#### `GET /shortages`
- **Description:** List clinical stock shortage tickets.
- **Query Parameters:**
  - `urgency`: `EMERGENCY`, `HIGH`, `ROUTINE`
  - `status`: `OPEN`, `PARTIALLY_MATCHED`, `FULFILLED`
- **Response `200 OK`:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "SHT-201",
      "facilityId": "FAC-003",
      "facilityName": "Green Valley Health Centre",
      "medicineName": "Ceftriaxone Injection",
      "genericName": "Ceftriaxone Sodium",
      "strength": "1g Vial",
      "dosageForm": "Injectable",
      "requiredQuantity": 150,
      "fulfilledQuantity": 0,
      "unmetQuantity": 150,
      "urgency": "EMERGENCY",
      "requestedDate": "2026-10-09",
      "requiredByDate": "2026-10-15",
      "reason": "Post-monsoon enteric fever surge.",
      "status": "OPEN"
    }
  ]
}
```

#### `POST /shortages`
- **Description:** Create a new shortage ticket.
- **Request Body:**
```json
{
  "facilityId": "FAC-003",
  "medicineName": "Ceftriaxone Injection",
  "genericName": "Ceftriaxone Sodium",
  "strength": "1g Vial",
  "dosageForm": "Injectable",
  "requiredQuantity": 150,
  "urgency": "EMERGENCY",
  "requiredByDate": "2026-10-15",
  "reason": "Post-monsoon enteric fever surge."
}
```

---

### 2.6 Smart Matching Engine
#### `POST /matching/candidates`
- **Description:** Algorithmic matching for a shortage ticket against all network surplus batches.
- **Request Body:**
```json
{
  "shortageId": "SHT-201"
}
```
- **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "shortage": { ... },
    "candidates": [
      {
        "batchId": "BAT-101",
        "batchNumber": "CTX-2026-B1",
        "medicineName": "Ceftriaxone Injection",
        "strength": "1g Vial",
        "donorFacilityId": "FAC-001",
        "donorFacilityName": "Apex Central Hospital",
        "availableSurplus": 280,
        "daysToExpiry": 40,
        "distanceKm": 13.5,
        "coldChainRequired": false,
        "matchScore": 88,
        "isEligible": true,
        "reasons": [
          "Shelf life verified: 40 days remaining (buffer satisfied).",
          "Available surplus: 280 units (can fulfill 100% of demand).",
          "Transit zone: Local tier (13.5 km)."
        ]
      }
    ]
  }
}
```

---

### 2.7 FairShare Allocation
#### `POST /allocation/simulate`
- **Description:** Simulates multi-facility competing requests against limited surplus stock, comparing FCFS with FairShare.
- **Request Body:**
```json
{
  "totalAvailableUnits": 200,
  "requests": [
    { "facilityId": "FAC-001", "requested": 120, "urgency": "EMERGENCY", "vulnerabilityScore": 0.8 },
    { "facilityId": "FAC-003", "requested": 90, "urgency": "EMERGENCY", "vulnerabilityScore": 0.95 },
    { "facilityId": "FAC-005", "requested": 80, "urgency": "HIGH", "vulnerabilityScore": 0.85 }
  ]
}
```
- **Response `200 OK`:**
```json
{
  "status": "success",
  "data": {
    "totalAvailableSupply": 200,
    "totalDemand": 290,
    "deficit": 90,
    "comparison": {
      "fcfs": [ ... ],
      "fairShare": [ ... ]
    },
    "explanation": "Narrative explanation of how allocation was computed."
  }
}
```

---

### 2.8 Transfer Management
#### `GET /transfers`
- **Description:** Retrieve transfer orders across lifecycle states.
- **Query Parameters:** `status` (`PROPOSED`, `REQUESTED`, `APPROVED`, `DISPATCHED`, `RECEIVED`, `REJECTED`, `CANCELLED`).
- **Response `200 OK`:** Array of transfer order manifests.

#### `POST /transfers`
- **Description:** Create a new transfer order.
- **Request Body:**
```json
{
  "senderFacilityId": "FAC-001",
  "recipientFacilityId": "FAC-003",
  "batchId": "BAT-101",
  "medicineName": "Ceftriaxone Injection",
  "strength": "1g Vial",
  "quantity": 120,
  "urgency": "HIGH",
  "notes": "Smart matched order"
}
```

#### `PUT /transfers/<id>/status`
- **Description:** Advance or change the lifecycle status of an order.
- **Request Body:**
```json
{
  "status": "APPROVED",
  "note": "Verified cold-chain route and released units."
}
```

---

### 2.9 Audit Logs & Governance
#### `GET /audit-logs`
- **Description:** Retrieve immutable audit logs.
- **Response `200 OK`:** Array of log events with timestamp, user, action, entity, details, client IP.
