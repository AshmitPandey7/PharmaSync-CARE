# PharmaSync CARE — MongoDB Collection Relationship Diagram

> **System:** PharmaSync CARE — Intelligent Medicine Redistribution Network  
> **Architecture:** Non-relational Document Model on MongoDB Atlas  
> **Schema Version:** 3.0.0  
> **Reference Specifications:** [`docs/MONGODB_SCHEMA.md`](MONGODB_SCHEMA.md) & [`docs/COLLECTION_RELATIONSHIPS.md`](COLLECTION_RELATIONSHIPS.md)

---

## 1. Architectural Overview

PharmaSync CARE uses **MongoDB Atlas** organized into three decoupled architectural tiers. Strategic embedding is used for high-cohesion sub-documents (such as transfer status audit logs, contact information, and geographic coordinates), while cross-document relationships are modeled via stable synthetic identifiers (`FAC-XXX`, `MED-XXX`, `BAT-XXX`, `SHT-XXX`, `TRN-XXX`) and enforced in application business logic.

```mermaid
erDiagram
    FACILITIES ||--o{ INVENTORY_BATCHES : "holds stock"
    FACILITIES ||--o{ SHORTAGE_TICKETS : "declares deficit"
    FACILITIES ||--o{ TRANSFERS : "sends / receives"
    FACILITIES ||--o{ USERS : "employs"
    MEDICINES ||--o{ INVENTORY_BATCHES : "catalog definition"
    MEDICINES ||--o{ SHORTAGE_TICKETS : "demanded formulation"
    INVENTORY_BATCHES ||--o{ TRANSFERS : "redistributes stock"
    SHORTAGE_TICKETS ||--o{ TRANSFERS : "fulfills deficit"
    TRANSFERS ||--|{ STATUS_HISTORY : "embeds audit trail"

    FACILITIES {
        string id PK "FAC-001"
        string name
        string type
        array coordinates "[lat, lng]"
        bool coldChainCertified
        string licenseNumber UK
    }

    MEDICINES {
        string id PK "MED-001"
        string name
        string genericName
        string strength
        bool coldChainRequired
        double storageTempMin
        double storageTempMax
    }

    INVENTORY_BATCHES {
        string id PK "BAT-001"
        string facilityId FK
        string medicineId FK
        string batchNumber
        int totalQuantity
        int reservedQuantity
        int availableQuantity
        string expiryDate
    }

    SHORTAGE_TICKETS {
        string id PK "SHT-001"
        string facilityId FK
        string medicineId FK
        int requiredQuantity
        int fulfilledQuantity
        string urgency
        string status
    }

    TRANSFERS {
        string id PK "TRN-001"
        string senderFacilityId FK
        string recipientFacilityId FK
        string batchId FK
        int quantity
        string status
        array statusHistory "embedded"
    }

    STATUS_HISTORY {
        string status
        date timestamp
        string note
        string updatedBy
    }
```

---

## 2. Decoupled Simulation & Optimization Tier

The analytical and simulation collections operate in complete sandbox isolation from the operational inventory collections:

```mermaid
flowchart LR
    subgraph OperationalCollections ["Operational Collections"]
        FAC["facilities"]
        MED["medicines"]
        BAT["inventory_batches"]
        SHT["shortage_tickets"]
        TRN["transfers"]
    end

    subgraph AnalyticalCollections ["Analytical Collections"]
        DMD["demand_estimates"]
        ALC["allocations"]
        AUD["audit_events"]
    end

    subgraph SandboxedSimulation ["Decoupled Simulation Tier"]
        SIM["simulation_runs"]
        OPT["optimization_runs"]
    end

    OperationalCollections -.->|Read Baseline State| SandboxedSimulation
    SandboxedSimulation -.->|NEVER Writes to Operational Inventory| OperationalCollections
    OperationalCollections -->|Logs Operational Audits| AUD
```
