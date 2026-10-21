# PharmaSync CARE — MongoDB Schema Specification

> **System:** PharmaSync CARE — Intelligent Medicine Redistribution Network  
> **Database:** MongoDB Atlas (Primary) / PyMongo Driver  
> **Schema Specification Version:** 3.0.0  
> **Reference API Contract:** [`docs/API_CONTRACT.md`](API_CONTRACT.md)

---

## 1. Architectural Strategy & Design Principles

Unlike traditional relational schemas requiring rigid normalization across dozens of tables, the MongoDB document model allows us to model clinical workflows naturally around domain aggregates:

1. **Strategic Embedding:**
   - Transfer status transitions are embedded directly within the transfer document as an array (`statusHistory`), guaranteeing atomic lifecycle auditing without distributed locks.
   - Facility geographic coordinates and contact details are embedded within the facility document.
   - Temperature ranges are embedded within the medicine monograph document.
2. **Denormalization for Read Performance:**
   - Frequently displayed read-only descriptive fields (such as `facilityName`, `medicineName`, and `genericName`) are denormalized into `inventory_batches`, `shortage_tickets`, and `transfers`. This eliminates expensive multi-collection joins during high-frequency dashboard queries.
3. **Application-Level Relationship Validation:**
   - Because MongoDB does not enforce relational foreign keys, relationship integrity (such as verifying that a batch belongs to the sender facility, or that a medicine code exists in the catalog) is strictly validated within Flask service layers before database persistence.
4. **Historical Record Preservation:**
   - Operational entities (such as cancelled transfers or resolved shortages) are never hard-deleted. They transition to terminal statuses (`CANCELLED`, `RESOLVED`, `DEPLETED`) with full audit histories intact.

---

## 2. Collection Schemas & Data Structures

---

### 2.1 Collection: `facilities`
**Purpose:** Stores registered hospitals, community pharmacies, primary health centres, and logistics hubs.

#### Document Structure (BSON / JSON)
```json
{
  "_id": { "$oid": "65e0a1b2c3d4e5f6a7b8c9d0" },
  "id": "FAC-001",
  "name": "Apex Central Hospital",
  "type": "Hospital Pharmacy",
  "typeBadge": "hospital",
  "address": "14 Healthcare Boulevard, Central District",
  "coordinates": [12.971600, 77.594600],
  "location": {
    "type": "Point",
    "coordinates": [77.594600, 12.971600]
  },
  "coldChainCertified": true,
  "licenseNumber": "KA-BLR-HOSP-2024-0891",
  "bedCapacity": 450,
  "contactPerson": "Dr. Sunita Nair",
  "phone": "+91 80 2234 5671",
  "status": "ACTIVE",
  "createdAt": { "$date": "2026-01-15T08:00:00Z" },
  "updatedAt": { "$date": "2026-01-15T08:00:00Z" }
}
```

#### Fields & BSON Types
| Field | BSON Type | Required | Description & Validation |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | MongoDB primary key identifier |
| `id` | `string` | Yes | Stable synthetic facility code (e.g., `FAC-001`) |
| `name` | `string` | Yes | Institutional name |
| `type` | `string` | Yes | Facility type (`Hospital Pharmacy`, `Community Pharmacy`, etc.) |
| `typeBadge` | `string` | Yes | UI visual badge selector (`hospital`, `community`, `clinic`, `hub`) |
| `address` | `string` | Yes | Physical street address |
| `coordinates` | `array<double>` | Yes | Latitude and longitude `[lat, lng]` |
| `location` | `object` | No | GeoJSON Point `[lng, lat]` for 2dsphere spatial indexing |
| `coldChainCertified` | `bool` | Yes | Continuous cold chain capability flag |
| `licenseNumber` | `string` | Yes | Regulatory pharmacy license number |
| `bedCapacity` | `int` | Yes | Inpatient bed count (0 for retail pharmacies) |
| `contactPerson` | `string` | Yes | Responsible pharmacist / administrator |
| `phone` | `string` | Yes | Contact telephone number |
| `status` | `string` | Yes | Operational state (`ACTIVE`, `MAINTENANCE`, `INACTIVE`) |
| `createdAt` | `date` | Yes | Timestamp of initial registration |
| `updatedAt` | `date` | Yes | Timestamp of last modification |

#### Indexes
- `{"id": 1}` — Unique index.
- `{"licenseNumber": 1}` — Unique index.
- `{"type": 1}` — Query index for type filtering.
- `{"status": 1}` — Query index for active facility lookups.
- `{"location": "2dsphere"}` — Geospatial index for proximity searches.

---

### 2.2 Collection: `medicines`
**Purpose:** Formulary monographs, chemical compositions, and storage criteria.

#### Document Structure (BSON / JSON)
```json
{
  "_id": { "$oid": "65e0a1b2c3d4e5f6a7b8c9d1" },
  "id": "MED-003",
  "name": "Insulin Glargine",
  "genericName": "Insulin Glargine recombinant",
  "strength": "100 IU/ml (3ml Cartridge)",
  "dosageForm": "Injectable",
  "category": "Endocrinology",
  "coldChainRequired": true,
  "storageTempMin": 2.0,
  "storageTempMax": 8.0,
  "standardUnit": "Cartridge",
  "minShelfLifeDays": 45,
  "createdAt": { "$date": "2026-01-15T08:00:00Z" },
  "updatedAt": { "$date": "2026-01-15T08:00:00Z" }
}
```

#### Indexes
- `{"id": 1}` — Unique index.
- `{"category": 1}` — Filter index for category lookups.
- `{"name": "text", "genericName": "text"}` — Text search index.

---

### 2.3 Collection: `inventory_batches`
**Purpose:** Physical inventory batches with dynamic remaining shelf-life, demand-aware safety reserves, and atomic allocation locks.

#### Document Structure (BSON / JSON)
```json
{
  "_id": { "$oid": "65e0a1b2c3d4e5f6a7b8c9d2" },
  "id": "BAT-001",
  "batchNumber": "CTX-2025-A1",
  "facilityId": "FAC-001",
  "facilityName": "Apex Central Hospital",
  "medicineId": "MED-001",
  "medicineName": "Ceftriaxone Injection",
  "genericName": "Ceftriaxone Sodium",
  "strength": "1g Vial",
  "dosageForm": "Injectable",
  "category": "Antibiotics",
  "totalQuantity": 450,
  "reservedQuantity": 50,
  "availableQuantity": 400,
  "eligibleSurplusQuantity": 310,
  "expectedMonthlyDemand": 70,
  "safetyStockThreshold": 20,
  "expiryDate": "2026-11-30",
  "unitPrice": 12.50,
  "coldChainRequired": false,
  "status": "ADEQUATE",
  "createdAt": { "$date": "2026-01-15T08:00:00Z" },
  "updatedAt": { "$date": "2026-01-15T08:00:00Z" }
}
```

#### Quantity Invariants
- `totalQuantity` = Physical stock on premises.
- `reservedQuantity` = Stock locked for approved or in-transit transfers.
- `availableQuantity` = `totalQuantity - reservedQuantity` (Must always be $\ge 0$).
- `eligibleSurplusQuantity` = $\max(0, \text{availableQuantity} - (\text{expectedMonthlyDemand} + \text{safetyStockThreshold}))$.

#### Indexes
- `{"id": 1}` — Unique index.
- `{"facilityId": 1, "medicineId": 1, "expiryDate": 1}` — Compound index for facility stock triage.
- `{"batchNumber": 1}` — Search index.
- `{"expiryDate": 1}` — Triage index for expiring stock identification.
- `{"status": 1}` — Status index.

---

### 2.4 Collection: `shortage_tickets`
**Purpose:** Clinical stock shortage declarations logged by facilities experiencing deficits.

#### Document Structure (BSON / JSON)
```json
{
  "_id": { "$oid": "65e0a1b2c3d4e5f6a7b8c9d3" },
  "id": "SHT-001",
  "facilityId": "FAC-003",
  "facilityName": "Green Valley Health Centre",
  "medicineId": "MED-001",
  "medicineName": "Ceftriaxone Injection",
  "genericName": "Ceftriaxone Sodium",
  "strength": "1g Vial",
  "dosageForm": "Injectable",
  "requiredQuantity": 100,
  "fulfilledQuantity": 0,
  "unmetQuantity": 100,
  "urgency": "HIGH",
  "requestedDate": "2026-02-10",
  "requiredByDate": "2026-02-18",
  "reason": "Sudden influx of pediatric respiratory cases; regional depot delayed",
  "status": "OPEN",
  "potentialMatchesCount": 2,
  "createdAt": { "$date": "2026-02-10T09:30:00Z" },
  "updatedAt": { "$date": "2026-02-10T09:30:00Z" }
}
```

#### Indexes
- `{"id": 1}` — Unique index.
- `{"facilityId": 1, "status": 1}` — Compound index for facility ticket history.
- `{"status": 1, "urgency": 1}` — Compound index for priority triage matching.

---

### 2.5 Collection: `transfers`
**Purpose:** Chain-of-custody transfer manifests governing inter-facility medicine shipments.

#### Document Structure (BSON / JSON)
```json
{
  "_id": { "$oid": "65e0a1b2c3d4e5f6a7b8c9d4" },
  "id": "TRN-001",
  "senderFacilityId": "FAC-001",
  "senderFacilityName": "Apex Central Hospital",
  "recipientFacilityId": "FAC-003",
  "recipientFacilityName": "Green Valley Health Centre",
  "batchId": "BAT-001",
  "batchNumber": "CTX-2025-A1",
  "medicineName": "Ceftriaxone Injection",
  "quantity": 50,
  "status": "DISPATCHED",
  "urgency": "HIGH",
  "distanceKm": 6.4,
  "coldChainVerified": true,
  "requiresColdChain": false,
  "shortageTicketId": "SHT-001",
  "dispatchedAt": { "$date": "2026-02-12T11:00:00Z" },
  "statusHistory": [
    {
      "status": "PROPOSED",
      "timestamp": { "$date": "2026-02-11T14:20:00Z" },
      "note": "Automated donor match generated",
      "updatedBy": "System"
    },
    {
      "status": "REQUESTED",
      "timestamp": { "$date": "2026-02-11T15:00:00Z" },
      "note": "Recipient facility confirmed requirement",
      "updatedBy": "Dr. Joseph Kurian"
    },
    {
      "status": "APPROVED",
      "timestamp": { "$date": "2026-02-11T16:30:00Z" },
      "note": "Donor pharmacy approved release of 50 vials",
      "updatedBy": "Dr. Sunita Nair"
    },
    {
      "status": "DISPATCHED",
      "timestamp": { "$date": "2026-02-12T11:00:00Z" },
      "note": "Handed over to cold-chain medical courier",
      "updatedBy": "R. Sharma"
    }
  ],
  "createdAt": { "$date": "2026-02-11T14:20:00Z" },
  "updatedAt": { "$date": "2026-02-12T11:00:00Z" }
}
```

#### Indexes
- `{"id": 1}` — Unique index.
- `{"senderFacilityId": 1, "status": 1}` — Compound index for donor outbound shipments.
- `{"recipientFacilityId": 1, "status": 1}` — Compound index for recipient inbound shipments.
- `{"batchId": 1}` — Index for tracking reservations per batch.

---

### 2.6 Ancillary Collections
- **`users`**: Clinical personnel profiles and role keys (`pharmacy_admin`, `community_pharmacist`, etc.).
- **`demand_estimates`**: Expected consumption rates and safety stock thresholds.
- **`allocations`**: Multi-clinic FairShare proportional allocation runs.
- **`audit_events`**: Regulatory tamper-evident audit logs.
- **`simulation_runs`**: Sandboxed Digital Twin discrete-event simulation records (isolated from active inventory).
- **`optimization_runs`**: Multi-objective Pareto strategy optimization records.

---

## 3. Data Deletion & Audit Policy

- **No Destructive Cascading Deletes:** Deleting a facility, batch, or medicine is prohibited if active transfer records reference it.
- **Terminal Status Lifecycle:** Expired batches remain in `inventory_batches` with `status: 'EXPIRED'` to preserve traceability for clinical audits and regulatory inspections.
