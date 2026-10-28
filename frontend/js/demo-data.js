/**
 * PharmaSync CARE — Synthetic Demonstration Dataset (India Healthcare Network)
 * Realistic, connected healthcare inventory, facilities, shortages, and transfer logs.
 * Standard multi-facility healthcare network dataset for clinical redistribution simulation.
 * All records are strictly synthetic and non-clinical.
 */

export const DEMO_FACILITIES = [
  {
    id: 'FAC-001',
    name: 'Apex Central Hospital',
    type: 'Hospital Pharmacy',
    typeBadge: 'hospital',
    address: '14 Healthcare Boulevard, Central District, Bengaluru',
    coordinates: [12.9716, 77.5946],
    distanceKm: 0,
    coldChainCertified: true,
    licenseNumber: 'KA-BLR-HOSP-2024-0891',
    bedCapacity: 450,
    contactPerson: 'Dr. Sunita Nair',
    phone: '+91 80 2234 5671',
    status: 'ACTIVE'
  },
  {
    id: 'FAC-002',
    name: 'City Care Community Pharmacy',
    type: 'Community Pharmacy',
    typeBadge: 'community',
    address: '88 Market Road, Sector 4, Bengaluru',
    coordinates: [12.9822, 77.6080],
    distanceKm: 4.8,
    coldChainCertified: true,
    licenseNumber: 'KA-BLR-RET-2023-4412',
    bedCapacity: 0,
    contactPerson: 'P. Venkat, B.Pharm',
    phone: '+91 80 2345 8890',
    status: 'ACTIVE'
  },
  {
    id: 'FAC-003',
    name: 'Green Valley Health Centre',
    type: 'Rural Health Centre',
    typeBadge: 'clinic',
    address: 'Post Office Road, South Outskirts, Anekal',
    coordinates: [12.9150, 77.5820],
    distanceKm: 13.5,
    coldChainCertified: false,
    licenseNumber: 'KA-BLR-RHC-2022-1190',
    bedCapacity: 30,
    contactPerson: 'Dr. Joseph Kurian',
    phone: '+91 80 2678 1234',
    status: 'ACTIVE'
  },
  {
    id: 'FAC-004',
    name: 'Metro Health Medical Center',
    type: 'Hospital Pharmacy',
    typeBadge: 'hospital',
    address: '102 Ring Road Junction, Tech Zone, Bengaluru',
    coordinates: [12.9352, 77.6245],
    distanceKm: 9.2,
    coldChainCertified: true,
    licenseNumber: 'KA-BLR-HOSP-2024-9981',
    bedCapacity: 320,
    contactPerson: 'Dr. Anita Desai, MD',
    phone: '+91 80 2555 4321',
    status: 'ACTIVE'
  },
  {
    id: 'FAC-005',
    name: 'St. Jude Charitable Dispensary',
    type: 'Charitable Clinic',
    typeBadge: 'clinic',
    address: '42 Mission Cross, Old Town, Bengaluru',
    coordinates: [12.9640, 77.5710],
    distanceKm: 6.1,
    coldChainCertified: false,
    licenseNumber: 'KA-BLR-NGO-2021-0044',
    bedCapacity: 15,
    contactPerson: 'Sister Mary Thomas',
    phone: '+91 80 2212 9087',
    status: 'ACTIVE'
  },
  {
    id: 'FAC-006',
    name: 'District Medical Logistics Hub',
    type: 'Distribution Hub',
    typeBadge: 'hub',
    address: 'Plot 7 Warehouse Complex, Peenya Industrial Area, Bengaluru',
    coordinates: [13.0100, 77.5500],
    distanceKm: 18.4,
    coldChainCertified: true,
    licenseNumber: 'KA-BLR-WHS-2025-0012',
    bedCapacity: 0,
    contactPerson: 'Rajesh Sharma',
    phone: '+91 80 2890 1100',
    status: 'ACTIVE'
  }
];

export const DEMO_INVENTORY = [
  {
    id: 'BAT-101',
    batchNumber: 'PCM-2026-A1',
    medicineName: 'Paracetamol Tablets',
    genericName: 'Paracetamol IP',
    strength: '650mg Tablets',
    dosageForm: 'Oral Solid',
    category: 'Analgesics & Antipyretics',
    totalQuantity: 300,
    reservedQuantity: 0,
    availableQuantity: 250,
    eligibleSurplusQuantity: 200,
    expectedMonthlyDemand: 80,
    safetyStockThreshold: 50,
    expiryDate: '2027-06-30', // ~8 months
    unitPrice: 2.50,
    facilityId: 'FAC-001',
    coldChainRequired: false,
    status: 'SURPLUS_STABLE'
  },
  {
    id: 'BAT-102',
    batchNumber: 'AMX-2026-B2',
    medicineName: 'Amoxicillin + Clavulanate',
    genericName: 'Amoxicillin / Clavulanic Acid IP',
    strength: '625mg Tablets',
    dosageForm: 'Oral Solid',
    category: 'Antibiotics',
    totalQuantity: 250,
    reservedQuantity: 0,
    availableQuantity: 200,
    eligibleSurplusQuantity: 150,
    expectedMonthlyDemand: 60,
    safetyStockThreshold: 30,
    expiryDate: '2027-05-15',
    unitPrice: 24.00,
    facilityId: 'FAC-002',
    coldChainRequired: false,
    status: 'SURPLUS_STABLE'
  },
  {
    id: 'BAT-103',
    batchNumber: 'CTZ-2026-C3',
    medicineName: 'Cetirizine Tablets',
    genericName: 'Cetirizine Hydrochloride IP',
    strength: '10mg Tablets',
    dosageForm: 'Oral Solid',
    category: 'Antihistamines',
    totalQuantity: 400,
    reservedQuantity: 0,
    availableQuantity: 350,
    eligibleSurplusQuantity: 250,
    expectedMonthlyDemand: 100,
    safetyStockThreshold: 50,
    expiryDate: '2027-08-31',
    unitPrice: 3.20,
    facilityId: 'FAC-002',
    coldChainRequired: false,
    status: 'SURPLUS_STABLE'
  },
  {
    id: 'BAT-104',
    batchNumber: 'ORS-2026-S1',
    medicineName: 'ORS Sachets',
    genericName: 'Oral Rehydration Salts IP (WHO Formula)',
    strength: '21.8g Sachet',
    dosageForm: 'Oral Powder',
    category: 'Electrolytes',
    totalQuantity: 1000,
    reservedQuantity: 0,
    availableQuantity: 800,
    eligibleSurplusQuantity: 600,
    expectedMonthlyDemand: 250,
    safetyStockThreshold: 150,
    expiryDate: '2027-10-31',
    unitPrice: 18.00,
    facilityId: 'FAC-006',
    coldChainRequired: false,
    status: 'SURPLUS_STABLE'
  },
  {
    id: 'BAT-105',
    batchNumber: 'PAN-2026-P8',
    medicineName: 'Pantoprazole Tablets',
    genericName: 'Pantoprazole Gastro-resistant IP',
    strength: '40mg Tablets',
    dosageForm: 'Oral Solid',
    category: 'Gastrointestinal',
    totalQuantity: 500,
    reservedQuantity: 80,
    availableQuantity: 420,
    eligibleSurplusQuantity: 300,
    expectedMonthlyDemand: 120,
    safetyStockThreshold: 80,
    expiryDate: '2027-07-20',
    unitPrice: 9.50,
    facilityId: 'FAC-001',
    coldChainRequired: false,
    status: 'SURPLUS_STABLE'
  },
  {
    id: 'BAT-106',
    batchNumber: 'SAL-2026-N9',
    medicineName: 'Normal Saline 0.9%',
    genericName: 'Sodium Chloride 0.9% w/v IV Infusion',
    strength: '500ml Bottle',
    dosageForm: 'IV Fluid',
    category: 'Infusions',
    totalQuantity: 800,
    reservedQuantity: 50,
    availableQuantity: 750,
    eligibleSurplusQuantity: 500,
    expectedMonthlyDemand: 200,
    safetyStockThreshold: 100,
    expiryDate: '2027-09-30',
    unitPrice: 42.00,
    facilityId: 'FAC-006',
    coldChainRequired: false,
    status: 'SURPLUS_STABLE'
  },
  {
    id: 'BAT-107',
    batchNumber: 'INS-2026-G1',
    medicineName: 'Insulin Glargine',
    genericName: 'Insulin Glargine Recombinant',
    strength: '100 IU/ml (3ml Cartridge)',
    dosageForm: 'Injectable',
    category: 'Endocrinology',
    totalQuantity: 150,
    reservedQuantity: 0,
    availableQuantity: 120,
    eligibleSurplusQuantity: 60,
    expectedMonthlyDemand: 45,
    safetyStockThreshold: 30,
    expiryDate: '2027-03-31',
    unitPrice: 560.00,
    facilityId: 'FAC-004',
    coldChainRequired: true,
    status: 'SURPLUS_RISK'
  },
  {
    id: 'BAT-108',
    batchNumber: 'CTX-2026-B1',
    medicineName: 'Ceftriaxone Injection',
    genericName: 'Ceftriaxone Sodium IP',
    strength: '1g Vial',
    dosageForm: 'Injectable',
    category: 'Antibiotics',
    totalQuantity: 300,
    reservedQuantity: 0,
    availableQuantity: 260,
    eligibleSurplusQuantity: 160,
    expectedMonthlyDemand: 80,
    safetyStockThreshold: 40,
    expiryDate: '2027-04-30',
    unitPrice: 125.00,
    facilityId: 'FAC-001',
    coldChainRequired: false,
    status: 'SURPLUS_STABLE'
  }
];

export const DEMO_SHORTAGES = [
  {
    id: 'SHT-2026-001',
    facilityId: 'FAC-003', // Green Valley Health Centre
    facilityName: 'Green Valley Health Centre',
    medicineName: 'Paracetamol Tablets',
    genericName: 'Paracetamol IP',
    strength: '650mg Tablets',
    dosageForm: 'Oral Solid',
    category: 'Analgesics & Antipyretics',
    requiredQuantity: 100,
    fulfilledQuantity: 0,
    unmetQuantity: 100,
    urgency: 'HIGH',
    requestedDate: '2026-10-25',
    requiredByDate: '2026-11-05',
    reason: 'Outpatient viral fever and dengue triage surge; local clinic dispensary completely stock-out.',
    status: 'OPEN',
    potentialMatchesCount: 1
  },
  {
    id: 'SHT-2026-002',
    facilityId: 'FAC-005', // St. Jude Charitable Dispensary
    facilityName: 'St. Jude Charitable Dispensary',
    medicineName: 'Amoxicillin + Clavulanate',
    genericName: 'Amoxicillin / Clavulanic Acid IP',
    strength: '625mg Tablets',
    dosageForm: 'Oral Solid',
    category: 'Antibiotics',
    requiredQuantity: 50,
    fulfilledQuantity: 0,
    unmetQuantity: 50,
    urgency: 'EMERGENCY',
    requestedDate: '2026-10-26',
    requiredByDate: '2026-11-02',
    reason: 'Charitable OPD acute pediatric respiratory tract infections; emergency community replenishment needed.',
    status: 'OPEN',
    potentialMatchesCount: 1
  },
  {
    id: 'SHT-2026-003',
    facilityId: 'FAC-003', // Green Valley Health Centre
    facilityName: 'Green Valley Health Centre',
    medicineName: 'ORS Sachets',
    genericName: 'Oral Rehydration Salts IP (WHO Formula)',
    strength: '21.8g Sachet',
    dosageForm: 'Oral Powder',
    category: 'Electrolytes',
    requiredQuantity: 120,
    fulfilledQuantity: 0,
    unmetQuantity: 120,
    urgency: 'ROUTINE',
    requestedDate: '2026-10-24',
    requiredByDate: '2026-11-10',
    reason: 'Community dehydrating gastroenteritis preventive drive.',
    status: 'OPEN',
    potentialMatchesCount: 1
  }
];

export const DEMO_TRANSFERS = [
  {
    id: 'TRF-501',
    transferCode: 'TRF-2026-003',
    senderFacilityId: 'FAC-006',
    senderFacilityName: 'District Medical Logistics Hub',
    recipientFacilityId: 'FAC-003',
    recipientFacilityName: 'Green Valley Health Centre',
    batchId: 'BAT-106',
    medicineName: 'Normal Saline 0.9%',
    strength: '500ml Bottle',
    quantity: 50,
    status: 'DISPATCHED',
    lifecycleIndex: 3, // 0: PROPOSED, 1: REQUESTED, 2: APPROVED, 3: DISPATCHED, 4: RECEIVED
    currentCheckpointIndex: 1,
    requestedDate: '2026-10-26 10:15',
    approvedDate: '2026-10-26 12:00',
    dispatchedDate: '2026-10-27 08:30',
    receivedDate: null,
    carrierName: 'District Health Logistics Van #KA-04-E-1192',
    temperatureLog: 'Ambient standard validated (22.4°C)',
    urgency: 'HIGH',
    isSimulated: true,
    statusHistory: [
      { status: 'REQUESTED', timestamp: '2026-10-26 10:15', by: 'Dr. Joseph Kurian', note: 'Emergency IV fluid shortage request' },
      { status: 'APPROVED', timestamp: '2026-10-26 12:00', by: 'Rajesh Sharma', note: 'Released 50 bottles from regional depot buffer' },
      { status: 'DISPATCHED', timestamp: '2026-10-27 08:30', by: 'Rajesh Sharma', note: 'Handed over to carrier for delivery to Green Valley' }
    ]
  },
  {
    id: 'TRF-502',
    transferCode: 'TRF-2026-004',
    senderFacilityId: 'FAC-001',
    senderFacilityName: 'Apex Central Hospital',
    recipientFacilityId: 'FAC-005',
    recipientFacilityName: 'St. Jude Charitable Dispensary',
    batchId: 'BAT-105',
    medicineName: 'Pantoprazole Tablets',
    strength: '40mg Tablets',
    quantity: 80,
    status: 'REQUESTED',
    lifecycleIndex: 1,
    currentCheckpointIndex: 0,
    requestedDate: '2026-10-27 09:40',
    approvedDate: null,
    dispatchedDate: null,
    receivedDate: null,
    carrierName: 'Pending Courier Assignment',
    temperatureLog: 'Controlled room temperature',
    urgency: 'ROUTINE',
    isSimulated: true,
    statusHistory: [
      { status: 'REQUESTED', timestamp: '2026-10-27 09:40', by: 'Sister Mary Thomas', note: 'Dispensing request for acid peptic disease clinic' }
    ]
  },
  {
    id: 'TRF-503',
    transferCode: 'TRF-2026-002',
    senderFacilityId: 'FAC-002',
    senderFacilityName: 'City Care Community Pharmacy',
    recipientFacilityId: 'FAC-005',
    recipientFacilityName: 'St. Jude Charitable Dispensary',
    batchId: 'BAT-103',
    medicineName: 'Cetirizine Tablets',
    strength: '10mg Tablets',
    quantity: 100,
    status: 'RECEIVED',
    lifecycleIndex: 4,
    currentCheckpointIndex: 4,
    requestedDate: '2026-10-23 11:00',
    approvedDate: '2026-10-23 13:20',
    dispatchedDate: '2026-10-24 09:00',
    receivedDate: '2026-10-24 15:45',
    carrierName: 'City Care Local Runner',
    temperatureLog: 'Verified sealed strip packaging',
    urgency: 'ROUTINE',
    isSimulated: true,
    statusHistory: [
      { status: 'REQUESTED', timestamp: '2026-10-23 11:00', by: 'Sister Mary Thomas', note: 'Allergy clinic replenishment' },
      { status: 'APPROVED', timestamp: '2026-10-23 13:20', by: 'P. Venkat, B.Pharm', note: 'Surplus donation approved' },
      { status: 'DISPATCHED', timestamp: '2026-10-24 09:00', by: 'P. Venkat, B.Pharm', note: 'Dispatched via local delivery' },
      { status: 'RECEIVED', timestamp: '2026-10-24 15:45', by: 'Sister Mary Thomas', note: 'Stock physically inspected and accepted into dispensary' }
    ]
  }
];

export const DEMO_AUDIT_LOGS = [
  {
    id: 'AUD-901',
    timestamp: '2026-10-27 08:30:14',
    action: 'TRANSFER_DISPATCHED',
    entity: 'TRF-2026-003',
    userName: 'Rajesh Sharma',
    role: 'Logistics Director',
    details: 'Dispatched 50 units Normal Saline 0.9% to Green Valley Health Centre'
  },
  {
    id: 'AUD-902',
    timestamp: '2026-10-26 12:00:22',
    action: 'TRANSFER_APPROVED',
    entity: 'TRF-2026-003',
    userName: 'Rajesh Sharma',
    role: 'Logistics Director',
    details: 'Approved requisition for 50 units Normal Saline 0.9%'
  },
  {
    id: 'AUD-903',
    timestamp: '2026-10-24 15:45:00',
    action: 'TRANSFER_RECEIVED',
    entity: 'TRF-2026-002',
    userName: 'Sister Mary Thomas',
    role: 'Dispensary In-Charge',
    details: 'Received & verified 100 units Cetirizine 10mg Tablets from City Care Pharmacy'
  }
];

export const DEMO_USERS = [
  {
    id: 'USR-801',
    username: 'admin',
    name: 'Dr. Sunita Nair',
    role: 'Chief Pharmacist / Admin',
    roleKey: 'pharmacy_admin',
    facilityId: 'FAC-001',
    email: 's.nair@apexcentral.health'
  },
  {
    id: 'USR-803',
    username: 'venkat',
    name: 'P. Venkat, B.Pharm',
    role: 'Community Pharmacist',
    roleKey: 'community_pharmacist',
    facilityId: 'FAC-002',
    email: 'venkat@citycarepharmacy.org'
  },
  {
    id: 'USR-804',
    username: 'joseph',
    name: 'Dr. Joseph Kurian',
    role: 'Clinical Officer',
    roleKey: 'clinical_officer',
    facilityId: 'FAC-003',
    email: 'j.kurian@greenvalley.org'
  },
  {
    id: 'USR-805',
    username: 'anita',
    name: 'Dr. Anita Desai, MD',
    role: 'Senior Hospital Pharmacist',
    roleKey: 'pharmacy_admin',
    facilityId: 'FAC-004',
    email: 'a.desai@metrohealth.org'
  },
  {
    id: 'USR-806',
    username: 'mary',
    name: 'Sister Mary Thomas',
    role: 'Dispensary In-Charge',
    roleKey: 'clinical_officer',
    facilityId: 'FAC-005',
    email: 'm.thomas@stjude.org'
  },
  {
    id: 'USR-807',
    username: 'logistics',
    name: 'Rajesh Sharma',
    role: 'Logistics Director',
    roleKey: 'pharmacy_admin',
    facilityId: 'FAC-006',
    email: 'r.sharma@districthub.org'
  }
];
