# PharmaSync CARE — MongoDB Data Dictionary

> **System:** PharmaSync CARE — Intelligent Medicine Redistribution Network  
> **Database:** MongoDB Atlas / PyMongo Driver  
> **Data Dictionary Version:** 3.0.0  
> **Reference Specifications:** [`docs/API_CONTRACT.md`](API_CONTRACT.md) & [`docs/MONGODB_SCHEMA.md`](MONGODB_SCHEMA.md)

---

## 1. Collection Directory

The MongoDB database contains 10 document collections partitioned into three architectural tiers:

| Tier | Collection Name | Domain Purpose | Primary Key (`_id` / `id`) |
| :--- | :--- | :--- | :--- |
| **Operational Tier** | [`facilities`](#21-facilities) | Healthcare facilities, clinics, pharmacies, and hubs | `ObjectId` / `FAC-XXX` |
| | [`users`](#22-users) | Clinical personnel, pharmacists, and admins | `ObjectId` / `USR-XXX` |
| | [`medicines`](#23-medicines) | Formulary catalog, composition, and storage specs | `ObjectId` / `MED-XXX` |
| | [`inventory_batches`](#24-inventory_batches) | Multi-batch physical stocks and quantity states | `ObjectId` / `BAT-XXX` |
| | [`shortage_tickets`](#25-shortage_tickets) | Clinical stock deficit declarations | `ObjectId` / `SHT-XXX` |
| | [`transfers`](#26-transfers) | Medicine custody manifests with embedded audit history | `ObjectId` / `TRN-XXX` |
| | [`audit_events`](#27-audit_events) | Regulatory tamper-evident audit ledger | `ObjectId` |
| **Analytical Tier** | [`demand_estimates`](#28-demand_estimates) | Monthly consumption forecasts and safety thresholds | `ObjectId` |
| | [`allocations`](#29-allocations) | Multi-clinic FairShare equity run results | `ObjectId` / `ALC-XXX` |
| **Decoupled Simulation Tier**| [`simulation_runs`](#210-simulation_runs) | Sandboxed Digital Twin resilience projections | `ObjectId` / `SIM-XXX` |
| | [`optimization_runs`](#211-optimization_runs)| Multi-objective Pareto trade-off runs | `ObjectId` / `OPT-XXX` |

---

## 2. Collection-by-Collection Field Dictionary

---

### 2.1 `facilities`
Registered healthcare facilities, community pharmacies, clinics, and regional distribution depots.

| Field | BSON Type | Nullable | Key / Index | Description & Validation | API Mapping |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | No | PK | MongoDB auto-generated document identifier | `_id` |
| `id` | `string` | No | Unique Index | Stable facility code (e.g., `FAC-001`) | `id` |
| `name` | `string` | No | - | Facility name (e.g., Apex Central Hospital) | `name` |
| `type` | `string` | No | Index | Facility type (`Hospital Pharmacy`, `Community Pharmacy`, etc.) | `type` |
| `typeBadge` | `string` | No | - | UI styling badge (`hospital`, `community`, `clinic`, `hub`) | `typeBadge` |
| `address` | `string` | No | - | Physical street address | `address` |
| `coordinates` | `array<double>` | No | Index | GPS coordinates `[latitude, longitude]` | `coordinates` |
| `location` | `object` | Yes | 2dsphere | GeoJSON Point `[longitude, latitude]` for spatial queries | `location` |
| `coldChainCertified` | `bool` | No | - | Certified for 2–8°C refrigerated storage | `coldChainCertified` |
| `licenseNumber` | `string` | No | Unique Index | Pharmacy regulatory operating license | `licenseNumber` |
| `bedCapacity` | `int` | No | - | Inpatient bed count (0 for retail pharmacies) | `bedCapacity` |
| `contactPerson` | `string` | No | - | Chief Pharmacist or Medical Director name | `contactPerson` |
| `phone` | `string` | No | - | Contact phone number | `phone` |
| `status` | `string` | No | Index | Operational state (`ACTIVE`, `MAINTENANCE`, `INACTIVE`) | `status` |
| `createdAt` | `date` | No | - | UTC creation timestamp | `createdAt` |
| `updatedAt` | `date` | No | - | UTC last update timestamp | `updatedAt` |

---

### 2.2 `medicines`
Standardized formulary items, formulation attributes, and storage constraints.

| Field | BSON Type | Nullable | Key / Index | Description & Validation | API Mapping |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | No | PK | MongoDB primary identifier | `_id` |
| `id` | `string` | No | Unique Index | Stable medicine code (e.g., `MED-001`) | `id` |
| `name` | `string` | No | Text Index | Commercial brand name | `name` |
| `genericName` | `string` | No | Text Index | International Nonproprietary Name (INN) | `genericName` |
| `strength` | `string` | No | - | Dosage strength (e.g., `1g Vial`) | `strength` |
| `dosageForm` | `string` | No | - | Formulation (`Injectable`, `Oral Solid`, etc.) | `dosageForm` |
| `category` | `string` | No | Index | Therapeutic class (`Antibiotics`, `Cardiovascular`, etc.) | `category` |
| `coldChainRequired` | `bool` | No | - | Requires 2–8°C refrigerated storage | `coldChainRequired` |
| `storageTempMin` | `double` | No | - | Minimum permissible storage temperature (°C) | `storageTempMin` |
| `storageTempMax` | `double` | No | - | Maximum permissible storage temperature (°C) | `storageTempMax` |
| `standardUnit` | `string` | No | - | Packaging unit (`Vial`, `Tablet`, `Cartridge`) | `standardUnit` |
| `minShelfLifeDays` | `int` | No | - | Recipient minimum required shelf-life (default 45) | `minShelfLifeDays` |
| `createdAt` | `date` | No | - | UTC creation timestamp | `createdAt` |
| `updatedAt` | `date` | No | - | UTC last update timestamp | `updatedAt` |

---

### 2.3 `inventory_batches`
Physical inventory batches with remaining shelf-life and atomic allocation locks.

| Field | BSON Type | Nullable | Key / Index | Description & Validation | API Mapping |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | No | PK | MongoDB primary identifier | `_id` |
| `id` | `string` | No | Unique Index | Batch code (e.g., `BAT-001`) | `id` |
| `batchNumber` | `string` | No | Index | Manufacturer lot/batch number | `batchNumber` |
| `facilityId` | `string` | No | Compound Idx | Owning facility ID (`FAC-XXX`) | `facilityId` |
| `facilityName` | `string` | No | - | Denormalized facility name | `facilityName` |
| `medicineId` | `string` | No | Compound Idx | Formulary medicine code (`MED-XXX`) | `medicineId` |
| `medicineName` | `string` | No | - | Denormalized medicine name | `medicineName` |
| `genericName` | `string` | Yes | - | Active ingredient composition | `genericName` |
| `strength` | `string` | Yes | - | Formulation strength | `strength` |
| `dosageForm` | `string` | Yes | - | Dosage form | `dosageForm` |
| `category` | `string` | Yes | - | Therapeutic category | `category` |
| `totalQuantity` | `int` | No | - | Total on-hand physical units ($\ge 0$) | `totalQuantity` |
| `reservedQuantity` | `int` | No | - | Units committed to active transfers ($\ge 0$) | `reservedQuantity` |
| `availableQuantity` | `int` | No | - | Uncommitted stock ($\text{total} - \text{reserved} \ge 0$) | `availableQuantity` |
| `eligibleSurplusQuantity`| `int`| No | - | Uncommitted stock exceeding demand & safety buffers | `eligibleSurplusQuantity`|
| `expectedMonthlyDemand` | `int` | No | - | Monthly consumption estimate | `expectedMonthlyDemand` |
| `safetyStockThreshold` | `int` | No | - | Required retained buffer threshold | `safetyStockThreshold` |
| `expiryDate` | `string` | No | Compound Idx | Batch expiry date (`YYYY-MM-DD`) | `expiryDate` |
| `unitPrice` | `double` | No | - | Unit monetary valuation | `unitPrice` |
| `coldChainRequired` | `bool` | No | - | Requires cold-chain transport | `coldChainRequired` |
| `status` | `string` | No | Index | Stock status (`ADEQUATE`, `NEAR_EXPIRY`, `EXPIRED`) | `status` |
| `createdAt` | `date` | No | - | UTC creation timestamp | `createdAt` |
| `updatedAt` | `date` | No | - | UTC last update timestamp | `updatedAt` |

---

### 2.4 `shortage_tickets`
Clinical medicine shortage declarations.

| Field | BSON Type | Nullable | Key / Index | Description & Validation | API Mapping |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | No | PK | MongoDB primary identifier | `_id` |
| `id` | `string` | No | Unique Index | Shortage request code (e.g., `SHT-001`) | `id` |
| `facilityId` | `string` | No | Compound Idx | Requesting facility ID (`FAC-XXX`) | `facilityId` |
| `facilityName` | `string` | No | - | Denormalized facility name | `facilityName` |
| `medicineId` | `string` | Yes | - | Requested formulary code (`MED-XXX`) | `medicineId` |
| `medicineName` | `string` | No | - | Requested medication name | `medicineName` |
| `genericName` | `string` | Yes | - | Generic substance description | `genericName` |
| `strength` | `string` | Yes | - | Dosage strength | `strength` |
| `dosageForm` | `string` | Yes | - | Dosage form | `dosageForm` |
| `requiredQuantity` | `int` | No | - | Requested deficit quantity ($> 0$) | `requiredQuantity` |
| `fulfilledQuantity` | `int` | No | - | Quantity fulfilled via transfers | `fulfilledQuantity` |
| `unmetQuantity` | `int` | No | - | Outstanding deficit ($\text{required} - \text{fulfilled}$) | `unmetQuantity` |
| `urgency` | `string` | No | Compound Idx | Priority level (`EMERGENCY`, `HIGH`, `MEDIUM`, `LOW`) | `urgency` |
| `requestedDate` | `string` | No | - | Date request was lodged (`YYYY-MM-DD`) | `requestedDate` |
| `requiredByDate` | `string` | No | - | Deadline for delivery (`YYYY-MM-DD`) | `requiredByDate` |
| `reason` | `string` | Yes | - | Clinical justification for shortage declaration | `reason` |
| `status` | `string` | No | Compound Idx | Ticket state (`OPEN`, `MATCHED`, `RESOLVED`, `CANCELLED`)| `status` |
| `potentialMatchesCount`| `int` | No | - | Count of verified available donor candidates | `potentialMatchesCount`|
| `createdAt` | `date` | No | - | UTC creation timestamp | `createdAt` |
| `updatedAt` | `date` | No | - | UTC last update timestamp | `updatedAt` |

---

### 2.5 `transfers`
Redistribution custody manifests governing inter-facility medicine transfers.

| Field | BSON Type | Nullable | Key / Index | Description & Validation | API Mapping |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | No | PK | MongoDB primary identifier | `_id` |
| `id` | `string` | No | Unique Index | Transfer manifest code (e.g., `TRN-001`) | `id` |
| `senderFacilityId` | `string` | No | Compound Idx | Donor facility code (`FAC-XXX`) | `senderFacilityId` |
| `senderFacilityName` | `string` | No | - | Denormalized donor facility name | `senderFacilityName` |
| `recipientFacilityId`| `string` | No | Compound Idx | Recipient facility code (`FAC-XXX`) | `recipientFacilityId`|
| `recipientFacilityName`|`string`| No | - | Denormalized recipient facility name | `recipientFacilityName`|
| `batchId` | `string` | No | Index | Allocated batch code (`BAT-XXX`) | `batchId` |
| `batchNumber` | `string` | No | - | Manufacturer batch number | `batchNumber` |
| `medicineName` | `string` | No | - | Medication name | `medicineName` |
| `quantity` | `int` | No | - | Transfer quantity ($> 0$) | `quantity` |
| `status` | `string` | No | Index | Lifecycle stage (`PROPOSED`, `REQUESTED`, `APPROVED`, `DISPATCHED`, `RECEIVED`, `CANCELLED`) | `status` |
| `urgency` | `string` | Yes | - | Urgency level | `urgency` |
| `distanceKm` | `double` | No | - | Calculated Haversine transit distance | `distanceKm` |
| `coldChainVerified` | `bool` | No | - | Cold chain compliance verified | `coldChainVerified` |
| `requiresColdChain` | `bool` | No | - | Requires refrigerated vehicle | `requiresColdChain` |
| `shortageTicketId` | `string` | Yes | - | Associated shortage request ID | `shortageTicketId` |
| `statusHistory` | `array<object>`| No | - | Embedded array of timestamped status transitions | `statusHistory` |
| `createdAt` | `date` | No | - | UTC creation timestamp | `createdAt` |
| `updatedAt` | `date` | No | - | UTC last update timestamp | `updatedAt` |
