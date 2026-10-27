"""
PharmaSync CARE — Deterministic MongoDB Synthetic Seed Data Script
Safe to rerun repeatedly (idempotent upserts).
Populates realistic synthetic healthcare facilities, medicines, batches,
shortages, and transfers for clinical redistribution demonstrations.
"""

import os
import sys
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import Config


def get_synthetic_dataset():
    """Generates the full deterministic synthetic dataset."""
    now = datetime.now(timezone.utc)
    today = date.today()

    facilities = [
        {
            "id": "FAC-001",
            "name": "Apex Central Hospital",
            "type": "Hospital Pharmacy",
            "typeBadge": "hospital",
            "address": "14 Healthcare Boulevard, Central District",
            "coordinates": [12.971600, 77.594600],
            "location": {"type": "Point", "coordinates": [77.594600, 12.971600]},
            "coldChainCertified": True,
            "licenseNumber": "KA-BLR-HOSP-2024-0891",
            "bedCapacity": 450,
            "contactPerson": "Dr. Sunita Nair",
            "phone": "+91 80 2234 5671",
            "status": "ACTIVE"
        },
        {
            "id": "FAC-002",
            "name": "City Care Community Pharmacy",
            "type": "Community Pharmacy",
            "typeBadge": "community",
            "address": "88 Market Road, Sector 4",
            "coordinates": [12.982200, 77.608000],
            "location": {"type": "Point", "coordinates": [77.608000, 12.982200]},
            "coldChainCertified": True,
            "licenseNumber": "KA-BLR-RET-2023-4412",
            "bedCapacity": 0,
            "contactPerson": "P. Venkat, B.Pharm",
            "phone": "+91 80 2345 8890",
            "status": "ACTIVE"
        },
        {
            "id": "FAC-003",
            "name": "Green Valley Health Centre",
            "type": "Rural Health Centre",
            "typeBadge": "clinic",
            "address": "Post Office Road, South Outskirts",
            "coordinates": [12.915000, 77.582000],
            "location": {"type": "Point", "coordinates": [77.582000, 12.915000]},
            "coldChainCertified": False,
            "licenseNumber": "KA-BLR-RHC-2022-1190",
            "bedCapacity": 30,
            "contactPerson": "Dr. Joseph Kurian",
            "phone": "+91 80 2678 1234",
            "status": "ACTIVE"
        },
        {
            "id": "FAC-004",
            "name": "Metro Health Medical Center",
            "type": "Hospital Pharmacy",
            "typeBadge": "hospital",
            "address": "102 Ring Road Junction, Tech Zone",
            "coordinates": [12.935200, 77.624500],
            "location": {"type": "Point", "coordinates": [77.624500, 12.935200]},
            "coldChainCertified": True,
            "licenseNumber": "KA-BLR-HOSP-2024-9981",
            "bedCapacity": 320,
            "contactPerson": "K. Meenakshi, Lead Pharmacist",
            "phone": "+91 80 2555 4321",
            "status": "ACTIVE"
        },
        {
            "id": "FAC-005",
            "name": "St. Jude Charitable Dispensary",
            "type": "Charitable Clinic",
            "typeBadge": "clinic",
            "address": "42 Mission Cross, Old Town",
            "coordinates": [12.964000, 77.571000],
            "location": {"type": "Point", "coordinates": [77.571000, 12.964000]},
            "coldChainCertified": False,
            "licenseNumber": "KA-BLR-NGO-2021-0044",
            "bedCapacity": 15,
            "contactPerson": "Sister Philomena",
            "phone": "+91 80 2212 9087",
            "status": "ACTIVE"
        },
        {
            "id": "FAC-006",
            "name": "District Medical Logistics Hub",
            "type": "Distribution Hub",
            "typeBadge": "hub",
            "address": "Plot 7 Warehouse Complex, Industrial Area",
            "coordinates": [13.010000, 77.550000],
            "location": {"type": "Point", "coordinates": [77.550000, 13.010000]},
            "coldChainCertified": True,
            "licenseNumber": "KA-BLR-WHS-2025-0012",
            "bedCapacity": 0,
            "contactPerson": "R. Sharma, Depot Manager",
            "phone": "+91 80 2890 1100",
            "status": "ACTIVE"
        }
    ]

    users = [
        {
            "id": "USR-801",
            "username": "admin",
            "email": "s.nair@apexcentral.health",
            "name": "Dr. Sunita Nair",
            "role": "Chief Pharmacist / Admin",
            "roleKey": "pharmacy_admin",
            "facilityId": "FAC-001"
        },
        {
            "id": "USR-802",
            "username": "dr.nair",
            "email": "dr.nair@apexcentral.health",
            "name": "Dr. Sunita Nair",
            "role": "Chief Pharmacist / Admin",
            "roleKey": "pharmacy_admin",
            "facilityId": "FAC-001"
        },
        {
            "id": "USR-803",
            "username": "venkat",
            "email": "venkat@citycarepharmacy.org",
            "name": "P. Venkat, B.Pharm",
            "role": "Community Pharmacist",
            "roleKey": "community_pharmacist",
            "facilityId": "FAC-002"
        },
        {
            "id": "USR-804",
            "username": "joseph",
            "email": "j.kurian@greenvalley.org",
            "name": "Dr. Joseph Kurian",
            "role": "Clinical Officer",
            "roleKey": "clinical_officer",
            "facilityId": "FAC-003"
        }
    ]

    medicines = [
        {
            "id": "MED-001",
            "name": "Ceftriaxone Injection",
            "genericName": "Ceftriaxone Sodium",
            "strength": "1g Vial",
            "dosageForm": "Injectable",
            "category": "Antibiotics",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Vial",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-002",
            "name": "Amoxicillin + Clavulanate",
            "genericName": "Amoxicillin / Clavulanic Acid",
            "strength": "625mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Antibiotics",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Tablet",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-003",
            "name": "Insulin Glargine",
            "genericName": "Insulin Glargine recombinant",
            "strength": "100 IU/ml (3ml Cartridge)",
            "dosageForm": "Injectable",
            "category": "Endocrinology",
            "coldChainRequired": True,
            "storageTempMin": 2.0,
            "storageTempMax": 8.0,
            "standardUnit": "Cartridge",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-004",
            "name": "Remdesivir Lyophilized Powder",
            "genericName": "Remdesivir",
            "strength": "100mg Vial",
            "dosageForm": "Injectable",
            "category": "Antivirals",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Vial",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-005",
            "name": "Azithromycin Tablets",
            "genericName": "Azithromycin",
            "strength": "500mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Antibiotics",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Tablet",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-006",
            "name": "Meropenem Trihydrate",
            "genericName": "Meropenem",
            "strength": "1g IV Vial",
            "dosageForm": "Injectable",
            "category": "Critical Care",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Vial",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-007",
            "name": "Enoxaparin Sodium Prefilled Syringe",
            "genericName": "Enoxaparin Sodium",
            "strength": "40mg / 0.4ml",
            "dosageForm": "Injectable",
            "category": "Cardiovascular",
            "coldChainRequired": True,
            "storageTempMin": 2.0,
            "storageTempMax": 8.0,
            "standardUnit": "PFS",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-008",
            "name": "Atorvastatin Tablets",
            "genericName": "Atorvastatin Calcium",
            "strength": "20mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Cardiovascular",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Tablet",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-009",
            "name": "Amlodipine Besylate",
            "genericName": "Amlodipine",
            "strength": "5mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Cardiovascular",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Tablet",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-010",
            "name": "Trastuzumab Concentrate",
            "genericName": "Trastuzumab",
            "strength": "440mg Lyophilized",
            "dosageForm": "Injectable",
            "category": "Oncology",
            "coldChainRequired": True,
            "storageTempMin": 2.0,
            "storageTempMax": 8.0,
            "standardUnit": "Vial",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-011",
            "name": "Normal Saline 0.9%",
            "genericName": "Sodium Chloride 0.9% w/v",
            "strength": "500ml Infusion Bottle",
            "dosageForm": "Injectable",
            "category": "Infusions",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Bottle",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-012",
            "name": "Paracetamol IV Infusion",
            "genericName": "Paracetamol",
            "strength": "1000mg / 100ml",
            "dosageForm": "Injectable",
            "category": "Analgesics",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Bottle",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-013",
            "name": "Paracetamol Tablets",
            "genericName": "Paracetamol IP",
            "strength": "650mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Analgesics",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Tablet",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-014",
            "name": "Cetirizine Tablets",
            "genericName": "Cetirizine Hydrochloride IP",
            "strength": "10mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Antihistamines",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Tablet",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-015",
            "name": "ORS Sachets",
            "genericName": "Oral Rehydration Salts IP",
            "strength": "21.8g Sachet",
            "dosageForm": "Oral Powder",
            "category": "Electrolytes",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Sachet",
            "minShelfLifeDays": 45
        },
        {
            "id": "MED-016",
            "name": "Pantoprazole Tablets",
            "genericName": "Pantoprazole Gastro-resistant IP",
            "strength": "40mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Gastrointestinal",
            "coldChainRequired": False,
            "storageTempMin": 15.0,
            "storageTempMax": 25.0,
            "standardUnit": "Tablet",
            "minShelfLifeDays": 45
        }
    ]

    # Inventory batches aligned with test expectations
    batches = [
        {
            "id": "BAT-101",
            "batchNumber": "CTX-2026-B1",
            "facilityId": "FAC-001",
            "facilityName": "Apex Central Hospital",
            "medicineId": "MED-001",
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
            "expiryDate": (today + timedelta(days=280)).isoformat(),
            "unitPrice": 145.00,
            "coldChainRequired": False,
            "status": "SURPLUS_RISK"
        },
        {
            "id": "BAT-102",
            "batchNumber": "AMX-2026-90",
            "facilityId": "FAC-001",
            "facilityName": "Apex Central Hospital",
            "medicineId": "MED-002",
            "medicineName": "Amoxicillin + Clavulanate",
            "genericName": "Amoxicillin / Clavulanic Acid",
            "strength": "625mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Antibiotics",
            "totalQuantity": 1200,
            "reservedQuantity": 50,
            "availableQuantity": 1150,
            "eligibleSurplusQuantity": 500,
            "expectedMonthlyDemand": 450,
            "safetyStockThreshold": 200,
            "expiryDate": (today + timedelta(days=220)).isoformat(),
            "unitPrice": 22.50,
            "coldChainRequired": False,
            "status": "SURPLUS_STABLE"
        },
        {
            "id": "BAT-103",
            "batchNumber": "INS-2026-GL",
            "facilityId": "FAC-004",
            "facilityName": "Metro Health Medical Center",
            "medicineId": "MED-003",
            "medicineName": "Insulin Glargine",
            "genericName": "Insulin Glargine recombinant",
            "strength": "100 IU/ml (3ml Cartridge)",
            "dosageForm": "Injectable",
            "category": "Endocrinology",
            "totalQuantity": 340,
            "reservedQuantity": 60,
            "availableQuantity": 280,
            "eligibleSurplusQuantity": 110,
            "expectedMonthlyDemand": 120,
            "safetyStockThreshold": 50,
            "expiryDate": (today + timedelta(days=190)).isoformat(),
            "unitPrice": 580.00,
            "coldChainRequired": True,
            "status": "SURPLUS_RISK"
        },
        {
            "id": "BAT-104",
            "batchNumber": "REM-2026-V8",
            "facilityId": "FAC-006",
            "facilityName": "District Medical Logistics Hub",
            "medicineId": "MED-004",
            "medicineName": "Remdesivir Lyophilized Powder",
            "genericName": "Remdesivir",
            "strength": "100mg Vial",
            "dosageForm": "Injectable",
            "category": "Antivirals",
            "totalQuantity": 420,
            "reservedQuantity": 40,
            "availableQuantity": 380,
            "eligibleSurplusQuantity": 200,
            "expectedMonthlyDemand": 120,
            "safetyStockThreshold": 60,
            "expiryDate": (today + timedelta(days=150)).isoformat(),
            "unitPrice": 1850.00,
            "coldChainRequired": False,
            "status": "SURPLUS_STABLE"
        },
        {
            "id": "BAT-105",
            "batchNumber": "AZT-2026-A2",
            "facilityId": "FAC-002",
            "facilityName": "City Care Community Pharmacy",
            "medicineId": "MED-005",
            "medicineName": "Azithromycin Tablets",
            "genericName": "Azithromycin",
            "strength": "500mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Antibiotics",
            "totalQuantity": 800,
            "reservedQuantity": 0,
            "availableQuantity": 800,
            "eligibleSurplusQuantity": 350,
            "expectedMonthlyDemand": 300,
            "safetyStockThreshold": 150,
            "expiryDate": (today + timedelta(days=320)).isoformat(),
            "unitPrice": 18.00,
            "coldChainRequired": False,
            "status": "ADEQUATE"
        },
        {
            "id": "BAT-106",
            "batchNumber": "MER-2026-M4",
            "facilityId": "FAC-004",
            "facilityName": "Metro Health Medical Center",
            "medicineId": "MED-006",
            "medicineName": "Meropenem Trihydrate",
            "genericName": "Meropenem",
            "strength": "1g IV Vial",
            "dosageForm": "Injectable",
            "category": "Critical Care",
            "totalQuantity": 180,
            "reservedQuantity": 50,
            "availableQuantity": 130,
            "eligibleSurplusQuantity": 40,
            "expectedMonthlyDemand": 70,
            "safetyStockThreshold": 20,
            "expiryDate": (today + timedelta(days=95)).isoformat(),
            "unitPrice": 940.00,
            "coldChainRequired": False,
            "status": "SURPLUS_CRITICAL"
        },
        {
            "id": "BAT-107",
            "batchNumber": "ENO-2026-E1",
            "facilityId": "FAC-001",
            "facilityName": "Apex Central Hospital",
            "medicineId": "MED-007",
            "medicineName": "Enoxaparin Sodium Prefilled Syringe",
            "genericName": "Enoxaparin Sodium",
            "strength": "40mg / 0.4ml",
            "dosageForm": "Injectable",
            "category": "Cardiovascular",
            "totalQuantity": 260,
            "reservedQuantity": 30,
            "availableQuantity": 230,
            "eligibleSurplusQuantity": 0,
            "expectedMonthlyDemand": 220,
            "safetyStockThreshold": 60,
            "expiryDate": (today + timedelta(days=175)).isoformat(),
            "unitPrice": 420.00,
            "coldChainRequired": True,
            "status": "ADEQUATE"
        },
        {
            "id": "BAT-108",
            "batchNumber": "ATV-2026-77",
            "facilityId": "FAC-006",
            "facilityName": "District Medical Logistics Hub",
            "medicineId": "MED-008",
            "medicineName": "Atorvastatin Tablets",
            "genericName": "Atorvastatin Calcium",
            "strength": "20mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Cardiovascular",
            "totalQuantity": 3200,
            "reservedQuantity": 100,
            "availableQuantity": 3100,
            "eligibleSurplusQuantity": 1400,
            "expectedMonthlyDemand": 1200,
            "safetyStockThreshold": 500,
            "expiryDate": (today + timedelta(days=400)).isoformat(),
            "unitPrice": 8.50,
            "coldChainRequired": False,
            "status": "SURPLUS_STABLE"
        },
        {
            "id": "BAT-109",
            "batchNumber": "AML-2026-44",
            "facilityId": "FAC-002",
            "facilityName": "City Care Community Pharmacy",
            "medicineId": "MED-009",
            "medicineName": "Amlodipine Besylate",
            "genericName": "Amlodipine",
            "strength": "5mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Cardiovascular",
            "totalQuantity": 2400,
            "reservedQuantity": 0,
            "availableQuantity": 2400,
            "eligibleSurplusQuantity": 900,
            "expectedMonthlyDemand": 1100,
            "safetyStockThreshold": 400,
            "expiryDate": (today + timedelta(days=60)).isoformat(),
            "unitPrice": 4.20,
            "coldChainRequired": False,
            "status": "ADEQUATE"
        },
        {
            "id": "BAT-110",
            "batchNumber": "TRA-2026-TX",
            "facilityId": "FAC-004",
            "facilityName": "Metro Health Medical Center",
            "medicineId": "MED-010",
            "medicineName": "Trastuzumab Concentrate",
            "genericName": "Trastuzumab",
            "strength": "440mg Lyophilized",
            "dosageForm": "Injectable",
            "category": "Oncology",
            "totalQuantity": 35,
            "reservedQuantity": 5,
            "availableQuantity": 30,
            "eligibleSurplusQuantity": 12,
            "expectedMonthlyDemand": 12,
            "safetyStockThreshold": 6,
            "expiryDate": (today + timedelta(days=120)).isoformat(),
            "unitPrice": 28500.00,
            "coldChainRequired": True,
            "status": "SURPLUS_RISK"
        },
        {
            "id": "BAT-111",
            "batchNumber": "NS-2026-05",
            "facilityId": "FAC-001",
            "facilityName": "Apex Central Hospital",
            "medicineId": "MED-011",
            "medicineName": "Normal Saline 0.9%",
            "genericName": "Sodium Chloride 0.9% w/v",
            "strength": "500ml Infusion Bottle",
            "dosageForm": "Injectable",
            "category": "Infusions",
            "totalQuantity": 1850,
            "reservedQuantity": 200,
            "availableQuantity": 1650,
            "eligibleSurplusQuantity": 600,
            "expectedMonthlyDemand": 800,
            "safetyStockThreshold": 250,
            "expiryDate": (today + timedelta(days=365)).isoformat(),
            "unitPrice": 35.00,
            "coldChainRequired": False,
            "status": "ADEQUATE"
        },
        {
            "id": "BAT-112",
            "batchNumber": "PAR-2026-09",
            "facilityId": "FAC-001",
            "facilityName": "Apex Central Hospital",
            "medicineId": "MED-012",
            "medicineName": "Paracetamol IV Infusion",
            "genericName": "Paracetamol",
            "strength": "1000mg / 100ml",
            "dosageForm": "Injectable",
            "category": "Analgesics",
            "totalQuantity": 720,
            "reservedQuantity": 60,
            "availableQuantity": 660,
            "eligibleSurplusQuantity": 220,
            "expectedMonthlyDemand": 320,
            "safetyStockThreshold": 120,
            "expiryDate": (today + timedelta(days=210)).isoformat(),
            "unitPrice": 65.00,
            "coldChainRequired": False,
            "status": "SURPLUS_RISK"
        },
        {
            "id": "BAT-113",
            "batchNumber": "CTX-2026-X0",
            "facilityId": "FAC-002",
            "facilityName": "City Care Community Pharmacy",
            "medicineId": "MED-001",
            "medicineName": "Ceftriaxone Injection",
            "genericName": "Ceftriaxone Sodium",
            "strength": "1g Vial",
            "dosageForm": "Injectable",
            "category": "Antibiotics",
            "totalQuantity": 80,
            "reservedQuantity": 0,
            "availableQuantity": 80,
            "eligibleSurplusQuantity": 0,
            "expectedMonthlyDemand": 40,
            "safetyStockThreshold": 20,
            "expiryDate": (today + timedelta(days=10)).isoformat(),  # Blocked from transit (<15 days)
            "unitPrice": 145.00,
            "coldChainRequired": False,
            "status": "BLOCK_TRANSIT"
        },
        {
            "id": "BAT-114",
            "batchNumber": "AMX-2025-E9",
            "facilityId": "FAC-005",
            "facilityName": "St. Jude Charitable Dispensary",
            "medicineId": "MED-002",
            "medicineName": "Amoxicillin + Clavulanate",
            "genericName": "Amoxicillin / Clavulanic Acid",
            "strength": "625mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Antibiotics",
            "totalQuantity": 150,
            "reservedQuantity": 0,
            "availableQuantity": 0,
            "eligibleSurplusQuantity": 0,
            "expectedMonthlyDemand": 50,
            "safetyStockThreshold": 20,
            "expiryDate": (today - timedelta(days=60)).isoformat(),  # Expired
            "unitPrice": 22.50,
            "coldChainRequired": False,
            "status": "EXPIRED"
        },
        {
            "id": "BAT-201",
            "batchNumber": "PCM-2026-A1",
            "facilityId": "FAC-001",
            "facilityName": "Apex Central Hospital",
            "medicineId": "MED-013",
            "medicineName": "Paracetamol Tablets",
            "genericName": "Paracetamol IP",
            "strength": "650mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Analgesics",
            "totalQuantity": 300,
            "reservedQuantity": 0,
            "availableQuantity": 250,
            "eligibleSurplusQuantity": 200,
            "expectedMonthlyDemand": 80,
            "safetyStockThreshold": 50,
            "expiryDate": (today + timedelta(days=240)).isoformat(),
            "unitPrice": 2.50,
            "coldChainRequired": False,
            "status": "SURPLUS_STABLE"
        },
        {
            "id": "BAT-202",
            "batchNumber": "CTZ-2026-C3",
            "facilityId": "FAC-002",
            "facilityName": "City Care Community Pharmacy",
            "medicineId": "MED-014",
            "medicineName": "Cetirizine Tablets",
            "genericName": "Cetirizine Hydrochloride IP",
            "strength": "10mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Antihistamines",
            "totalQuantity": 400,
            "reservedQuantity": 0,
            "availableQuantity": 350,
            "eligibleSurplusQuantity": 250,
            "expectedMonthlyDemand": 100,
            "safetyStockThreshold": 50,
            "expiryDate": (today + timedelta(days=300)).isoformat(),
            "unitPrice": 3.20,
            "coldChainRequired": False,
            "status": "SURPLUS_STABLE"
        },
        {
            "id": "BAT-203",
            "batchNumber": "ORS-2026-S1",
            "facilityId": "FAC-006",
            "facilityName": "District Medical Logistics Hub",
            "medicineId": "MED-015",
            "medicineName": "ORS Sachets",
            "genericName": "Oral Rehydration Salts IP",
            "strength": "21.8g Sachet",
            "dosageForm": "Oral Powder",
            "category": "Electrolytes",
            "totalQuantity": 1000,
            "reservedQuantity": 0,
            "availableQuantity": 800,
            "eligibleSurplusQuantity": 600,
            "expectedMonthlyDemand": 250,
            "safetyStockThreshold": 150,
            "expiryDate": (today + timedelta(days=360)).isoformat(),
            "unitPrice": 18.00,
            "coldChainRequired": False,
            "status": "SURPLUS_STABLE"
        },
        {
            "id": "BAT-204",
            "batchNumber": "PAN-2026-P8",
            "facilityId": "FAC-001",
            "facilityName": "Apex Central Hospital",
            "medicineId": "MED-016",
            "medicineName": "Pantoprazole Tablets",
            "genericName": "Pantoprazole Gastro-resistant IP",
            "strength": "40mg Tablets",
            "dosageForm": "Oral Solid",
            "category": "Gastrointestinal",
            "totalQuantity": 500,
            "reservedQuantity": 80,
            "availableQuantity": 420,
            "eligibleSurplusQuantity": 300,
            "expectedMonthlyDemand": 120,
            "safetyStockThreshold": 80,
            "expiryDate": (today + timedelta(days=260)).isoformat(),
            "unitPrice": 9.50,
            "coldChainRequired": False,
            "status": "SURPLUS_STABLE"
        }
    ]

    shortages = [
        {
            "id": "SHT-201",
            "facilityId": "FAC-003",
            "facilityName": "Green Valley Health Centre",
            "medicineId": "MED-001",
            "medicineName": "Ceftriaxone Injection",
            "genericName": "Ceftriaxone Sodium",
            "strength": "1g Vial",
            "dosageForm": "Injectable",
            "requiredQuantity": 120,
            "fulfilledQuantity": 0,
            "unmetQuantity": 120,
            "urgency": "HIGH",
            "requestedDate": (today - timedelta(days=2)).isoformat(),
            "requiredByDate": (today + timedelta(days=5)).isoformat(),
            "reason": "Sudden influx of pediatric enteric fever cases",
            "status": "OPEN",
            "potentialMatchesCount": 2
        },
        {
            "id": "SHT-202",
            "facilityId": "FAC-005",
            "facilityName": "St. Jude Charitable Dispensary",
            "medicineId": "MED-003",
            "medicineName": "Insulin Glargine",
            "genericName": "Insulin Glargine recombinant",
            "strength": "100 IU/ml (3ml Cartridge)",
            "dosageForm": "Injectable",
            "requiredQuantity": 60,
            "fulfilledQuantity": 0,
            "unmetQuantity": 60,
            "urgency": "EMERGENCY",
            "requestedDate": (today - timedelta(days=1)).isoformat(),
            "requiredByDate": (today + timedelta(days=2)).isoformat(),
            "reason": "Cold chain refrigerator malfunction depleted baseline buffer",
            "status": "OPEN",
            "potentialMatchesCount": 1
        },
        {
            "id": "SHT-203",
            "facilityId": "FAC-002",
            "facilityName": "City Care Community Pharmacy",
            "medicineId": "MED-006",
            "medicineName": "Meropenem Trihydrate",
            "genericName": "Meropenem",
            "strength": "1g IV Vial",
            "dosageForm": "Injectable",
            "requiredQuantity": 40,
            "fulfilledQuantity": 0,
            "unmetQuantity": 40,
            "urgency": "MEDIUM",
            "requestedDate": (today - timedelta(days=3)).isoformat(),
            "requiredByDate": (today + timedelta(days=10)).isoformat(),
            "reason": "Post-surgical patient discharge prescriptions surging",
            "status": "OPEN",
            "potentialMatchesCount": 1
        },
        {
            "id": "SHT-2026-001",
            "facilityId": "FAC-003",
            "facilityName": "Green Valley Health Centre",
            "medicineId": "MED-013",
            "medicineName": "Paracetamol Tablets",
            "genericName": "Paracetamol IP",
            "strength": "650mg Tablets",
            "dosageForm": "Oral Solid",
            "requiredQuantity": 100,
            "fulfilledQuantity": 0,
            "unmetQuantity": 100,
            "urgency": "HIGH",
            "requestedDate": (today - timedelta(days=1)).isoformat(),
            "requiredByDate": (today + timedelta(days=6)).isoformat(),
            "reason": "Outpatient viral fever and dengue triage surge; local clinic dispensary completely stock-out.",
            "status": "OPEN",
            "potentialMatchesCount": 1
        },
        {
            "id": "SHT-2026-002",
            "facilityId": "FAC-005",
            "facilityName": "St. Jude Charitable Dispensary",
            "medicineId": "MED-002",
            "medicineName": "Amoxicillin + Clavulanate",
            "genericName": "Amoxicillin / Clavulanic Acid IP",
            "strength": "625mg Tablets",
            "dosageForm": "Oral Solid",
            "requiredQuantity": 50,
            "fulfilledQuantity": 0,
            "unmetQuantity": 50,
            "urgency": "EMERGENCY",
            "requestedDate": (today - timedelta(days=1)).isoformat(),
            "requiredByDate": (today + timedelta(days=4)).isoformat(),
            "reason": "Pediatric acute respiratory tract infections; charitable emergency replenishment needed.",
            "status": "OPEN",
            "potentialMatchesCount": 1
        }
    ]

    transfers = [
        {
            "id": "TRF-501",
            "transferCode": "TRF-2026-001",
            "senderFacilityId": "FAC-001",
            "senderFacilityName": "Apex Central Hospital",
            "recipientFacilityId": "FAC-003",
            "recipientFacilityName": "Green Valley Health Centre",
            "batchId": "BAT-101",
            "batchNumber": "CTX-2026-B1",
            "medicineName": "Ceftriaxone Injection",
            "strength": "1g Vial",
            "quantity": 120,
            "status": "APPROVED",
            "urgency": "HIGH",
            "distanceKm": 6.4,
            "coldChainVerified": True,
            "requiresColdChain": False,
            "shortageTicketId": "SHT-201",
            "statusHistory": [
                {
                    "status": "PROPOSED",
                    "timestamp": now - timedelta(hours=20),
                    "note": "Automated donor match generated",
                    "updatedBy": "System"
                },
                {
                    "status": "REQUESTED",
                    "timestamp": now - timedelta(hours=18),
                    "note": "Recipient confirmed requirement",
                    "updatedBy": "Dr. Joseph Kurian"
                },
                {
                    "status": "APPROVED",
                    "timestamp": now - timedelta(hours=14),
                    "note": "Donor pharmacy approved release of 120 vials",
                    "updatedBy": "Dr. Sunita Nair"
                }
            ]
        },
        {
            "id": "TRF-502",
            "transferCode": "TRF-2026-002",
            "senderFacilityId": "FAC-004",
            "senderFacilityName": "Metro Health Medical Center",
            "recipientFacilityId": "FAC-005",
            "recipientFacilityName": "St. Jude Charitable Dispensary",
            "batchId": "BAT-103",
            "batchNumber": "INS-2026-GL",
            "medicineName": "Insulin Glargine",
            "strength": "100 IU/ml (3ml Cartridge)",
            "quantity": 60,
            "status": "DISPATCHED",
            "urgency": "EMERGENCY",
            "distanceKm": 2.7,
            "coldChainVerified": True,
            "requiresColdChain": True,
            "shortageTicketId": "SHT-202",
            "statusHistory": [
                {
                    "status": "PROPOSED",
                    "timestamp": now - timedelta(hours=8),
                    "note": "Direct match from Metro Health",
                    "updatedBy": "System"
                },
                {
                    "status": "APPROVED",
                    "timestamp": now - timedelta(hours=4),
                    "note": "Emergency transfer authorized",
                    "updatedBy": "K. Meenakshi"
                },
                {
                    "status": "DISPATCHED",
                    "timestamp": now - timedelta(hours=2),
                    "note": "Handed over to cold-chain courier",
                    "updatedBy": "K. Meenakshi"
                }
            ]
        },
        {
            "id": "TRF-503",
            "transferCode": "TRF-2026-003",
            "senderFacilityId": "FAC-006",
            "senderFacilityName": "District Medical Logistics Hub",
            "recipientFacilityId": "FAC-002",
            "recipientFacilityName": "City Care Community Pharmacy",
            "batchId": "BAT-104",
            "batchNumber": "REM-2026-V8",
            "medicineName": "Remdesivir Lyophilized Powder",
            "strength": "100mg Vial",
            "quantity": 40,
            "status": "RECEIVED",
            "urgency": "ROUTINE",
            "distanceKm": 9.5,
            "coldChainVerified": True,
            "requiresColdChain": False,
            "statusHistory": [
                {
                    "status": "PROPOSED",
                    "timestamp": now - timedelta(days=2),
                    "note": "Central rebalance",
                    "updatedBy": "System"
                },
                {
                    "status": "APPROVED",
                    "timestamp": now - timedelta(days=2, hours=-2),
                    "note": "Approved by depot lead",
                    "updatedBy": "R. Sharma"
                },
                {
                    "status": "DISPATCHED",
                    "timestamp": now - timedelta(days=1),
                    "note": "Dispatched via van",
                    "updatedBy": "R. Sharma"
                },
                {
                    "status": "RECEIVED",
                    "timestamp": now - timedelta(hours=12),
                    "note": "Received and checked into pharmacy",
                    "updatedBy": "P. Venkat"
                }
            ]
        },
        {
            "id": "TRF-504",
            "transferCode": "TRF-2026-004",
            "senderFacilityId": "FAC-001",
            "senderFacilityName": "Apex Central Hospital",
            "recipientFacilityId": "FAC-002",
            "recipientFacilityName": "City Care Community Pharmacy",
            "batchId": "BAT-112",
            "batchNumber": "PAR-2026-09",
            "medicineName": "Paracetamol IV Infusion",
            "strength": "1000mg / 100ml",
            "quantity": 60,
            "status": "REQUESTED",
            "urgency": "ROUTINE",
            "distanceKm": 1.9,
            "coldChainVerified": True,
            "requiresColdChain": False,
            "statusHistory": [
                {
                    "status": "PROPOSED",
                    "timestamp": now - timedelta(hours=5),
                    "note": "Match generated",
                    "updatedBy": "System"
                },
                {
                    "status": "REQUESTED",
                    "timestamp": now - timedelta(hours=3),
                    "note": "Requested by community pharmacy",
                    "updatedBy": "P. Venkat"
                }
            ]
        }
    ]

    return {
        "facilities": facilities,
        "users": users,
        "medicines": medicines,
        "inventory_batches": batches,
        "shortage_tickets": shortages,
        "transfers": transfers
    }


def seed_database(db):
    """
    Seeds a MongoDB database instance with deterministic synthetic data.
    Uses idempotent upserts on unique synthetic 'id' codes.
    """
    dataset = get_synthetic_dataset()
    now = datetime.now(timezone.utc)
    summary = {}

    for collection_name, records in dataset.items():
        col = db[collection_name]
        inserted = 0
        updated = 0

        for record in records:
            item = dict(record)
            item_id = item.get("id")
            if not item_id:
                continue

            item["updatedAt"] = now

            result = col.update_one(
                {"id": item_id},
                {
                    "$set": item,
                    "$setOnInsert": {"createdAt": now}
                },
                upsert=True
            )
            if result.upserted_id:
                inserted += 1
            elif result.matched_count:
                updated += 1

        summary[collection_name] = {"inserted": inserted, "updated": updated, "total": len(records)}

    return summary


def main():
    print("=" * 70)
    print("PharmaSync CARE — MongoDB Atlas Synthetic Seed Utility")
    print("=" * 70)

    from app.database import get_db

    db_manager = get_db()
    if db_manager.is_mock:
        print("[Notice] Real MongoDB Atlas URI not configured or unavailable.")
        print("[Notice] Seeding in-memory test database (mongomock)...")
    else:
        print(f"[Atlas] Connected to MongoDB Atlas: {db_manager.db_name}")
        print("[Atlas] Executing idempotent upserts...")

    summary = seed_database(db_manager.db)

    print("\n[Seed Summary]")
    for col, counts in summary.items():
        print(f"  * {col:20s}: {counts['total']:2d} records processed ({counts['inserted']} inserted, {counts['updated']} updated)")

    print("\n[Success] Synthetic seed completed deterministically.")


if __name__ == '__main__':
    main()
