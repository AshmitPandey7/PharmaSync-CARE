-- ============================================================================
-- [ARCHIVED / RETIRED SPECIFICATION]
-- PharmaSync CARE has migrated from MySQL to MongoDB Atlas.
-- Active Synthetic Seed Script: backend/scripts/seed_data.py
-- ============================================================================
-- PharmaSync CARE — Synthetic Demonstration Dataset Seed (MySQL 8.0+)
-- An Intelligent, Predictive, and Explainable Medicine Redistribution Network
-- ============================================================================
-- Safe to re-run: Uses INSERT ... ON DUPLICATE KEY UPDATE / INSERT IGNORE
-- All data is entirely fictional and synthetic for demonstration purposes.
-- ============================================================================

USE pharmasync_care;

-- ----------------------------------------------------------------------------
-- 1. Healthcare Facilities Seed
-- ----------------------------------------------------------------------------
INSERT INTO facilities (
  id, name, type, type_badge, address, latitude, longitude,
  cold_chain_certified, license_number, bed_capacity, contact_person, phone, status
) VALUES
('FAC-001', 'Apex Central Hospital', 'Hospital Pharmacy', 'hospital', '14 Healthcare Boulevard, Central District', 12.971600, 77.594600, TRUE, 'KA-BLR-HOSP-2024-0891', 450, 'Dr. Sunita Nair', '+91 80 2234 5671', 'ACTIVE'),
('FAC-002', 'City Care Community Pharmacy', 'Community Pharmacy', 'community', '88 Market Road, Sector 4', 12.982200, 77.608000, TRUE, 'KA-BLR-RET-2023-4412', 0, 'P. Venkat, B.Pharm', '+91 80 2345 8890', 'ACTIVE'),
('FAC-003', 'Green Valley Health Centre', 'Rural Health Centre', 'clinic', 'Post Office Road, South Outskirts', 12.915000, 77.582000, FALSE, 'KA-BLR-RHC-2022-1190', 30, 'Dr. Joseph Kurian', '+91 80 2678 1234', 'ACTIVE'),
('FAC-004', 'Metro Health Medical Center', 'Hospital Pharmacy', 'hospital', '102 Ring Road Junction, Tech Zone', 12.935200, 77.624500, TRUE, 'KA-BLR-HOSP-2024-9981', 320, 'K. Meenakshi, Lead Pharmacist', '+91 80 2555 4321', 'ACTIVE'),
('FAC-005', 'St. Jude Charitable Dispensary', 'Charitable Clinic', 'clinic', '42 Mission Cross, Old Town', 12.964000, 77.571000, FALSE, 'KA-BLR-NGO-2021-0044', 15, 'Sister Philomena', '+91 80 2212 9087', 'ACTIVE'),
('FAC-006', 'District Medical Logistics Hub', 'Distribution Hub', 'hub', 'Plot 7 Warehouse Complex, Industrial Area', 13.010000, 77.550000, TRUE, 'KA-BLR-WHS-2025-0012', 0, 'R. Sharma, Depot Manager', '+91 80 2890 1100', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  address = VALUES(address),
  contact_person = VALUES(contact_person),
  phone = VALUES(phone);

-- ----------------------------------------------------------------------------
-- 2. Users Seed (Password: 'pharmasync2026', pre-hashed with pbkdf2:sha256)
-- ----------------------------------------------------------------------------
INSERT INTO users (
  id, username, email, password_hash, name, role, role_key, facility_id
) VALUES
('USR-801', 'admin', 's.nair@apexcentral.health', 'scrypt:32768:8:1$vT0cK9fL1mQx$6a4e32688b1f5dd69ef4f895c28e9389e900996fa155990e1dbf8faaa14e4b2d56d43e5a31a9fe28d71626f21c1f7a07ea90b9b47e27e909a3c035ea6f3e0c05', 'Dr. Sunita Nair', 'Chief Pharmacist / Admin', 'pharmacy_admin', 'FAC-001'),
('USR-802', 'dr.nair', 'dr.nair@apexcentral.health', 'scrypt:32768:8:1$vT0cK9fL1mQx$6a4e32688b1f5dd69ef4f895c28e9389e900996fa155990e1dbf8faaa14e4b2d56d43e5a31a9fe28d71626f21c1f7a07ea90b9b47e27e909a3c035ea6f3e0c05', 'Dr. Sunita Nair', 'Chief Pharmacist / Admin', 'pharmacy_admin', 'FAC-001'),
('USR-803', 'venkat', 'venkat@citycarepharmacy.org', 'scrypt:32768:8:1$vT0cK9fL1mQx$6a4e32688b1f5dd69ef4f895c28e9389e900996fa155990e1dbf8faaa14e4b2d56d43e5a31a9fe28d71626f21c1f7a07ea90b9b47e27e909a3c035ea6f3e0c05', 'P. Venkat, B.Pharm', 'Community Pharmacist', 'community_pharmacist', 'FAC-002'),
('USR-804', 'joseph', 'j.kurian@greenvalley.org', 'scrypt:32768:8:1$vT0cK9fL1mQx$6a4e32688b1f5dd69ef4f895c28e9389e900996fa155990e1dbf8faaa14e4b2d56d43e5a31a9fe28d71626f21c1f7a07ea90b9b47e27e909a3c035ea6f3e0c05', 'Dr. Joseph Kurian', 'Clinical Officer', 'clinical_officer', 'FAC-003')
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  name = VALUES(name),
  role = VALUES(role);

-- ----------------------------------------------------------------------------
-- 3. Formulary Medicines Seed
-- ----------------------------------------------------------------------------
INSERT INTO medicines (
  id, name, generic_name, strength, dosage_form, category,
  cold_chain_required, storage_temp_min, storage_temp_max, standard_unit
) VALUES
('MED-001', 'Ceftriaxone Injection', 'Ceftriaxone Sodium', '1g Vial', 'Injectable', 'Antibiotics', FALSE, 15.0, 25.0, 'Vial'),
('MED-002', 'Amoxicillin + Clavulanate', 'Amoxicillin / Clavulanic Acid', '625mg Tablets', 'Oral Solid', 'Antibiotics', FALSE, 15.0, 25.0, 'Tablet'),
('MED-003', 'Insulin Glargine', 'Insulin Glargine recombinant', '100 IU/ml (3ml Cartridge)', 'Injectable', 'Endocrinology', TRUE, 2.0, 8.0, 'Cartridge'),
('MED-004', 'Remdesivir Lyophilized Powder', 'Remdesivir', '100mg Vial', 'Injectable', 'Antivirals', FALSE, 15.0, 25.0, 'Vial'),
('MED-005', 'Azithromycin Tablets', 'Azithromycin', '500mg Tablets', 'Oral Solid', 'Antibiotics', FALSE, 15.0, 25.0, 'Tablet'),
('MED-006', 'Meropenem Trihydrate', 'Meropenem', '1g IV Vial', 'Injectable', 'Critical Care', FALSE, 15.0, 25.0, 'Vial'),
('MED-007', 'Enoxaparin Sodium Prefilled Syringe', 'Enoxaparin Sodium', '40mg / 0.4ml', 'Injectable', 'Cardiovascular', TRUE, 2.0, 8.0, 'PFS'),
('MED-008', 'Atorvastatin Tablets', 'Atorvastatin Calcium', '20mg Tablets', 'Oral Solid', 'Cardiovascular', FALSE, 15.0, 25.0, 'Tablet'),
('MED-009', 'Amlodipine Besylate', 'Amlodipine', '5mg Tablets', 'Oral Solid', 'Cardiovascular', FALSE, 15.0, 25.0, 'Tablet'),
('MED-010', 'Trastuzumab Concentrate', 'Trastuzumab', '440mg Lyophilized', 'Injectable', 'Oncology', TRUE, 2.0, 8.0, 'Vial'),
('MED-011', 'Normal Saline 0.9%', 'Sodium Chloride 0.9% w/v', '500ml Infusion Bottle', 'IV Fluid', 'Infusions', FALSE, 15.0, 30.0, 'Bottle'),
('MED-012', 'Paracetamol IV Infusion', 'Paracetamol', '1000mg / 100ml', 'IV Fluid', 'Analgesics', FALSE, 15.0, 25.0, 'Bottle')
ON DUPLICATE KEY UPDATE
  generic_name = VALUES(generic_name),
  strength = VALUES(strength);

-- ----------------------------------------------------------------------------
-- 4. Inventory Batches Seed (Safe, Near-Expiry, and Expired Scenarios)
-- Invariant: total_quantity = available_quantity + reserved_quantity (except EXPIRED)
-- ----------------------------------------------------------------------------
INSERT INTO inventory_batches (
  id, batch_number, medicine_id, medicine_name, generic_name, strength, dosage_form,
  category, facility_id, total_quantity, reserved_quantity, available_quantity,
  eligible_surplus_quantity, expected_monthly_demand, safety_stock_threshold,
  expiry_date, unit_price, cold_chain_required, status
) VALUES
-- Batch 1: Near expiry (expires 2026-12-20), surplus available, partial reservation
('BAT-101', 'CTX-2026-B1', 'MED-001', 'Ceftriaxone Injection', 'Ceftriaxone Sodium', '1g Vial', 'Injectable', 'Antibiotics', 'FAC-001', 650, 100, 550, 280, 200, 70, '2026-12-20', 145.00, FALSE, 'SURPLUS_RISK'),

-- Batch 2: Moderate surplus, stable shelf-life
('BAT-102', 'AMX-2026-90', 'MED-002', 'Amoxicillin + Clavulanate', 'Amoxicillin / Clavulanic Acid', '625mg Tablets', 'Oral Solid', 'Antibiotics', 'FAC-001', 1200, 50, 1150, 500, 450, 200, '2026-12-15', 22.50, FALSE, 'SURPLUS_STABLE'),

-- Batch 3: Cold-chain insulin nearing expiry (2026-11-10), surplus available
('BAT-103', 'INS-2026-GL', 'MED-003', 'Insulin Glargine', 'Insulin Glargine recombinant', '100 IU/ml (3ml Cartridge)', 'Injectable', 'Endocrinology', 'FAC-004', 340, 60, 280, 110, 120, 50, '2026-11-10', 580.00, TRUE, 'SURPLUS_RISK'),

-- Batch 4: Antiviral stock at regional logistics depot
('BAT-104', 'REM-2026-V8', 'MED-004', 'Remdesivir Lyophilized Powder', 'Remdesivir', '100mg Vial', 'Injectable', 'Antivirals', 'FAC-006', 420, 40, 380, 200, 120, 60, '2026-11-30', 1850.00, FALSE, 'SURPLUS_STABLE'),

-- Batch 5: Safe long shelf-life stock (expires 2027-02-28)
('BAT-105', 'AZT-2026-A2', 'MED-005', 'Azithromycin Tablets', 'Azithromycin', '500mg Tablets', 'Oral Solid', 'Antibiotics', 'FAC-002', 800, 0, 800, 350, 300, 150, '2027-02-28', 18.00, FALSE, 'ADEQUATE'),

-- Batch 6: Critical shelf-life (expires 2026-11-05), low volume
('BAT-106', 'MER-2026-M4', 'MED-006', 'Meropenem Trihydrate', 'Meropenem', '1g IV Vial', 'Injectable', 'Critical Care', 'FAC-004', 180, 50, 130, 40, 70, 20, '2026-11-05', 940.00, FALSE, 'SURPLUS_CRITICAL'),

-- Batch 7: Cold-chain cardiovascular PFS, zero surplus (needed locally)
('BAT-107', 'ENO-2026-E1', 'MED-007', 'Enoxaparin Sodium Prefilled Syringe', 'Enoxaparin Sodium', '40mg / 0.4ml', 'Injectable', 'Cardiovascular', 'FAC-001', 260, 30, 230, 0, 220, 60, '2027-04-15', 420.00, TRUE, 'ADEQUATE'),

-- Batch 8: High volume chronic care stock at distribution depot
('BAT-108', 'ATV-2026-77', 'MED-008', 'Atorvastatin Tablets', 'Atorvastatin Calcium', '20mg Tablets', 'Oral Solid', 'Cardiovascular', 'FAC-006', 3200, 100, 3100, 1400, 1200, 500, '2026-12-31', 8.50, FALSE, 'SURPLUS_STABLE'),

-- Batch 9: Community pharmacy maintenance inventory
('BAT-109', 'AML-2026-44', 'MED-009', 'Amlodipine Besylate', 'Amlodipine', '5mg Tablets', 'Oral Solid', 'Cardiovascular', 'FAC-002', 2400, 0, 2400, 900, 1100, 400, '2027-01-20', 4.20, FALSE, 'ADEQUATE'),

-- Batch 10: Oncology biologic, high unit cost (INR 28,500), strict cold chain
('BAT-110', 'TRA-2026-TX', 'MED-010', 'Trastuzumab Concentrate', 'Trastuzumab', '440mg Lyophilized', 'Injectable', 'Oncology', 'FAC-004', 35, 5, 30, 12, 12, 6, '2026-12-05', 28500.00, TRUE, 'SURPLUS_RISK'),

-- Batch 11: Bulk IV infusion safe stock (expires 2027-06-30)
('BAT-111', 'NS-2026-05', 'MED-011', 'Normal Saline 0.9%', 'Sodium Chloride 0.9% w/v', '500ml Infusion Bottle', 'IV Fluid', 'Infusions', 'FAC-001', 1850, 200, 1650, 600, 800, 250, '2027-06-30', 35.00, FALSE, 'ADEQUATE'),

-- Batch 12: Analgesic IV infusion approaching expiry (2026-11-18)
('BAT-112', 'PAR-2026-09', 'MED-012', 'Paracetamol IV Infusion', 'Paracetamol', '1000mg / 100ml', 'IV Fluid', 'Analgesics', 'FAC-001', 720, 60, 660, 220, 320, 120, '2026-11-18', 65.00, FALSE, 'SURPLUS_RISK'),

-- Batch 13: Imminent expiry risk (< 15 days), triggers BLOCK safety hold
('BAT-113', 'CTX-2026-X0', 'MED-001', 'Ceftriaxone Injection', 'Ceftriaxone Sodium', '1g Vial', 'Injectable', 'Antibiotics', 'FAC-002', 80, 0, 80, 0, 40, 20, '2026-10-25', 145.00, FALSE, 'BLOCK_TRANSIT'),

-- Batch 14: Expired batch scenario (expired 2026-08-15, zero usable stock)
('BAT-114', 'AMX-2025-E9', 'MED-002', 'Amoxicillin + Clavulanate', 'Amoxicillin / Clavulanic Acid', '625mg Tablets', 'Oral Solid', 'Antibiotics', 'FAC-005', 150, 0, 0, 0, 50, 20, '2026-08-15', 22.50, FALSE, 'EXPIRED')
ON DUPLICATE KEY UPDATE
  total_quantity = VALUES(total_quantity),
  reserved_quantity = VALUES(reserved_quantity),
  available_quantity = VALUES(available_quantity),
  eligible_surplus_quantity = VALUES(eligible_surplus_quantity),
  status = VALUES(status);

-- ----------------------------------------------------------------------------
-- 5. Shortage Tickets Seed
-- ----------------------------------------------------------------------------
INSERT INTO shortage_tickets (
  id, facility_id, medicine_id, medicine_name, generic_name, strength, dosage_form,
  required_quantity, fulfilled_quantity, unmet_quantity, urgency,
  requested_date, required_by_date, reason, status
) VALUES
('SHT-201', 'FAC-003', 'MED-001', 'Ceftriaxone Injection', 'Ceftriaxone Sodium', '1g Vial', 'Injectable', 150, 0, 150, 'EMERGENCY', '2026-10-09', '2026-10-28', 'Post-monsoon enteric fever surge in community ward.', 'OPEN'),
('SHT-202', 'FAC-005', 'MED-003', 'Insulin Glargine', 'Insulin Glargine recombinant', '100 IU/ml (3ml Cartridge)', 'Injectable', 80, 0, 80, 'HIGH', '2026-10-10', '2026-10-25', 'Diabetic patient outreach camp scheduled for coming week.', 'OPEN'),
('SHT-203', 'FAC-002', 'MED-006', 'Meropenem Trihydrate', 'Meropenem', '1g IV Vial', 'Injectable', 100, 0, 100, 'ROUTINE', '2026-10-11', '2026-11-02', 'Safety buffer restock for scheduled pediatric intensive care procedures.', 'OPEN')
ON DUPLICATE KEY UPDATE
  required_quantity = VALUES(required_quantity),
  unmet_quantity = VALUES(unmet_quantity),
  status = VALUES(status);

-- ----------------------------------------------------------------------------
-- 6. Shortage Status History Seed
-- ----------------------------------------------------------------------------
INSERT INTO shortage_status_history (shortage_id, status, changed_by, note, timestamp) VALUES
('SHT-201', 'OPEN', 'Dr. Joseph Kurian', 'Declared EMERGENCY clinical shortage for pediatric & adult enteric cases.', '2026-10-09 09:30:00'),
('SHT-202', 'OPEN', 'Sister Philomena', 'Submitted restock requisition ahead of community screening camp.', '2026-10-10 08:15:00'),
('SHT-203', 'OPEN', 'P. Venkat, B.Pharm', 'Periodic replenishment requisition entered.', '2026-10-11 11:00:00');

-- ----------------------------------------------------------------------------
-- 7. Donor Recommendations (Explainable Matching Seed)
-- ----------------------------------------------------------------------------
INSERT INTO donor_recommendations (
  id, shortage_id, batch_id, donor_facility_id, match_score, is_eligible, distance_km, days_to_expiry, reasons_json
) VALUES
('REC-101', 'SHT-201', 'BAT-101', 'FAC-001', 88, TRUE, 13.50, 40, JSON_ARRAY(
  'Shelf life verified: 40 days remaining (buffer satisfied).',
  'Available surplus: 280 units (can fulfill 100% of 150 units needed).',
  'Transit zone: Local tier (13.5 km, transit under 2h).'
)),
('REC-102', 'SHT-201', 'BAT-113', 'FAC-002', 0, FALSE, 7.80, 4, JSON_ARRAY(
  'Ineligible: Remaining shelf life (4d) is below the minimum 15-day safety transit threshold.'
)),
('REC-103', 'SHT-202', 'BAT-103', 'FAC-004', 92, TRUE, 9.20, 20, JSON_ARRAY(
  'Cold chain logistics certified at both ends (2-8°C).',
  'Available surplus: 110 units (can fulfill 100% of 80 units needed).'
))
ON DUPLICATE KEY UPDATE
  match_score = VALUES(match_score),
  is_eligible = VALUES(is_eligible);

-- ----------------------------------------------------------------------------
-- 8. Transfers Seed (Consistent with Reservations)
-- ----------------------------------------------------------------------------
INSERT INTO transfers (
  id, transfer_code, shortage_id, sender_facility_id, recipient_facility_id,
  batch_id, medicine_name, strength, quantity, urgency, status, lifecycle_index,
  carrier_name, temperature_log, notes, requested_date, approved_date, dispatched_date, received_date
) VALUES
('TRF-501', 'TRF-2026-001', 'SHT-201', 'FAC-001', 'FAC-003', 'BAT-101', 'Ceftriaxone Injection', '1g Vial', 120, 'HIGH', 'APPROVED', 2, 'Express Logistics Medical Courier', 'Ambient 18-22°C (OK)', 'Emergency redistribution for enteric fever surge', '2026-10-10 10:30:00', '2026-10-10 14:15:00', NULL, NULL),
('TRF-502', 'TRF-2026-002', 'SHT-202', 'FAC-004', 'FAC-005', 'BAT-103', 'Insulin Glargine', '100 IU/ml (3ml Cartridge)', 60, 'EMERGENCY', 'DISPATCHED', 3, 'Cold-Link Pharma Fleet #4', 'Cold Chain 3.8°C (Verified)', 'Verified cold-chain temperature logs prior to dispatch', '2026-10-10 11:00:00', '2026-10-10 12:30:00', '2026-10-10 15:45:00', NULL),
('TRF-503', 'TRF-2026-003', NULL, 'FAC-006', 'FAC-002', 'BAT-104', 'Remdesivir Lyophilized Powder', '100mg Vial', 40, 'ROUTINE', 'RECEIVED', 4, 'District Medical Logistics Hub Internal Fleet', 'Ambient 20°C (OK)', 'Central warehouse routine rebalance', '2026-10-08 09:15:00', '2026-10-08 10:00:00', '2026-10-08 11:30:00', '2026-10-08 16:40:00'),
('TRF-504', 'TRF-2026-004', NULL, 'FAC-001', 'FAC-002', 'BAT-112', 'Paracetamol IV Infusion', '1000mg / 100ml', 60, 'ROUTINE', 'REQUESTED', 1, 'Pending Assignment', 'Ambient', 'Stock rebalance request', '2026-10-11 08:30:00', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  lifecycle_index = VALUES(lifecycle_index);

-- ----------------------------------------------------------------------------
-- 9. Transfer Line Items Seed
-- ----------------------------------------------------------------------------
INSERT INTO transfer_items (
  id, transfer_id, batch_id, quantity, unit_price, subtotal
) VALUES
('TI-001', 'TRF-501', 'BAT-101', 120, 145.00, 17400.00),
('TI-002', 'TRF-502', 'BAT-103', 60, 580.00, 34800.00),
('TI-003', 'TRF-503', 'BAT-104', 40, 1850.00, 74000.00),
('TI-004', 'TRF-504', 'BAT-112', 60, 65.00, 3900.00)
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  subtotal = VALUES(subtotal);

-- ----------------------------------------------------------------------------
-- 10. Transfer Status History Seed
-- ----------------------------------------------------------------------------
INSERT INTO transfer_status_history (transfer_id, status, changed_by, note, timestamp) VALUES
('TRF-501', 'PROPOSED', 'Dr. Sunita Nair', 'Generated candidate transfer proposal via smart matching.', '2026-10-10 10:30:00'),
('TRF-501', 'REQUESTED', 'Dr. Joseph Kurian', 'Confirmed clinical need and submitted formal transfer requisition.', '2026-10-10 11:15:00'),
('TRF-501', 'APPROVED', 'Dr. Sunita Nair', 'Verified donor surplus buffer; reserved 120 units from Batch CTX-2026-B1.', '2026-10-10 14:15:00'),
('TRF-502', 'PROPOSED', 'K. Meenakshi', 'Identified candidate match for emergency insulin ticket.', '2026-10-10 11:00:00'),
('TRF-502', 'REQUESTED', 'Sister Philomena', 'Requisition confirmed by receiving facility.', '2026-10-10 11:45:00'),
('TRF-502', 'APPROVED', 'K. Meenakshi', 'Approved transfer and reserved 60 units.', '2026-10-10 12:30:00'),
('TRF-502', 'DISPATCHED', 'K. Meenakshi', 'Loaded into Cold-Link refrigerated van; carrier seal #CL-8891.', '2026-10-10 15:45:00'),
('TRF-503', 'RECEIVED', 'P. Venkat, B.Pharm', 'Received, inspected and logged into community pharmacy inventory.', '2026-10-08 16:40:00'),
('TRF-504', 'REQUESTED', 'P. Venkat, B.Pharm', 'Requested stock rebalance from Apex Central Hospital.', '2026-10-11 08:30:00');

-- ----------------------------------------------------------------------------
-- 11. Allocation Runs & Line Items Seed
-- ----------------------------------------------------------------------------
INSERT INTO allocation_runs (
  id, total_available_supply, total_demand, deficit, allocation_method,
  urgency_weight, vulnerability_weight, demand_weight, explanation, status
) VALUES
('AR-701', 200, 290, 90, 'FAIRSHARE', 0.45, 0.35, 0.20,
 'Supply (200 units) meets 69% of total demand (290 units). Proportional model prioritized urgent clinics.', 'COMMITTED')
ON DUPLICATE KEY UPDATE
  deficit = VALUES(deficit),
  status = VALUES(status);

INSERT INTO allocation_items (
  id, run_id, shortage_id, recipient_facility_id, donor_batch_id,
  requested_quantity, allocated_quantity, fulfillment_pct, criteria_score
) VALUES
('AI-001', 'AR-701', 'SHT-201', 'FAC-001', 'BAT-101', 120, 82, 68, 41),
('AI-002', 'AR-701', 'SHT-201', 'FAC-003', 'BAT-101', 90, 68, 76, 34),
('AI-003', 'AR-701', 'SHT-202', 'FAC-005', 'BAT-101', 80, 50, 63, 25)
ON DUPLICATE KEY UPDATE
  allocated_quantity = VALUES(allocated_quantity),
  fulfillment_pct = VALUES(fulfillment_pct);

-- Backward-compatible allocations table
INSERT INTO allocations (
  id, shortage_id, donor_batch_id, recipient_facility_id, allocated_quantity, allocation_method, status
) VALUES
('ALC-001', 'SHT-201', 'BAT-101', 'FAC-003', 68, 'FAIRSHARE', 'COMMITTED'),
('ALC-002', 'SHT-202', 'BAT-103', 'FAC-005', 50, 'FAIRSHARE', 'COMMITTED')
ON DUPLICATE KEY UPDATE
  allocated_quantity = VALUES(allocated_quantity),
  status = VALUES(status);

-- ----------------------------------------------------------------------------
-- 12. Audit Logs Seed
-- ----------------------------------------------------------------------------
INSERT INTO audit_logs (id, timestamp, user_name, role, action, entity, details, ip_address) VALUES
('LOG-901', '2026-10-10 14:15:00', 'Dr. Sunita Nair', 'Chief Pharmacist', 'TRANSFER_APPROVED', 'TRF-2026-001', 'Verified surplus and authorized reservation of 120 units Ceftriaxone for Green Valley Health Centre.', '192.168.1.105'),
('LOG-902', '2026-10-10 15:45:00', 'K. Meenakshi', 'Lead Pharmacist', 'TRANSFER_DISPATCHED', 'TRF-2026-002', 'Dispatched 60 units Insulin Glargine via Cold-Link logistics. Temperature sensor #SN-4412 active.', '192.168.1.112'),
('LOG-903', '2026-10-09 11:30:00', 'Dr. Joseph Kurian', 'Clinical Officer', 'SHORTAGE_CREATED', 'SHT-201', 'Declared EMERGENCY shortage of Ceftriaxone Injection (150 units needed).', '192.168.2.45'),
('LOG-904', '2026-10-08 16:40:00', 'P. Venkat, B.Pharm', 'Community Pharmacist', 'TRANSFER_RECEIVED', 'TRF-2026-003', 'Inspected seal integrity and accepted delivery of 40 units Remdesivir into local pharmacy stock.', '192.168.1.88'),
('LOG-905', '2026-10-07 09:15:00', 'Dr. Sunita Nair', 'Chief Pharmacist', 'INVENTORY_ADD', 'BAT-112', 'Added new batch of Paracetamol IV Infusion (720 units) to hospital pharmacy stock.', '192.168.1.105')
ON DUPLICATE KEY UPDATE
  action = VALUES(action),
  details = VALUES(details);

-- ----------------------------------------------------------------------------
-- 13. Digital Twin Simulation Runs Seed
-- ----------------------------------------------------------------------------
INSERT INTO simulation_runs (
  id, scenario_name, demand_multiplier, delay_hours, safety_margin_pct,
  expiry_cluster_days, simulated_demand, unmanaged_stockouts, supplied_via_network,
  resilience_fulfillment_pct, isolated_service_level_pct, metrics_json, time_series_json
) VALUES
('SIM-8801', 'Epidemic Demand Surge (+150%)', 2.50, 4, 15, 30, 8500, 3077, 2215, 92, 65,
 JSON_OBJECT(
   'totalSurplusEvaluated', 3840,
   'leadTimeAvgHours', 3.8,
   'coldChainIncidents', 0
 ),
 JSON_ARRAY(
   JSON_OBJECT('day', 1, 'fulfillmentPct', 94),
   JSON_OBJECT('day', 5, 'fulfillmentPct', 91),
   JSON_OBJECT('day', 10, 'fulfillmentPct', 88),
   JSON_OBJECT('day', 15, 'fulfillmentPct', 90),
   JSON_OBJECT('day', 20, 'fulfillmentPct', 92),
   JSON_OBJECT('day', 25, 'fulfillmentPct', 93),
   JSON_OBJECT('day', 30, 'fulfillmentPct', 94)
 )),
('SIM-8802', 'Transit Disruption (+48h Delay)', 1.10, 48, 25, 45, 3740, 1420, 1020, 84, 52,
 JSON_OBJECT(
   'totalSurplusEvaluated', 2900,
   'leadTimeAvgHours', 51.2,
   'coldChainIncidents', 1
 ),
 JSON_ARRAY(
   JSON_OBJECT('day', 1, 'fulfillmentPct', 92),
   JSON_OBJECT('day', 5, 'fulfillmentPct', 82),
   JSON_OBJECT('day', 10, 'fulfillmentPct', 76),
   JSON_OBJECT('day', 15, 'fulfillmentPct', 79),
   JSON_OBJECT('day', 20, 'fulfillmentPct', 84)
 ))
ON DUPLICATE KEY UPDATE
  simulated_demand = VALUES(simulated_demand),
  resilience_fulfillment_pct = VALUES(resilience_fulfillment_pct);

-- ----------------------------------------------------------------------------
-- 14. Optimization Runs Seed
-- ----------------------------------------------------------------------------
INSERT INTO optimization_runs (
  id, weight_waste_prevention, weight_distance_min, weight_speed,
  waste_score, transport_score, speed_score, allocations_json, summary_text
) VALUES
('OPT-4401', 0.80, 0.50, 0.65, 94, 82, 88,
 JSON_ARRAY(
   JSON_OBJECT('donor', 'FAC-001', 'recipient', 'FAC-003', 'units', 120, 'medicine', 'Ceftriaxone Injection'),
   JSON_OBJECT('donor', 'FAC-004', 'recipient', 'FAC-005', 'units', 60, 'medicine', 'Insulin Glargine')
 ),
 'Prioritizing waste prevention rescued 94% of at-risk stock with only a 12% increase in average transit distance.')
ON DUPLICATE KEY UPDATE
  waste_score = VALUES(waste_score),
  summary_text = VALUES(summary_text);

-- ----------------------------------------------------------------------------
-- 15. Counterfactual Scenarios Seed
-- ----------------------------------------------------------------------------
INSERT INTO counterfactual_scenarios (
  id, subject_transfer_id, transfer_code, donor_stock, donor_monthly_demand,
  days_to_expiry, distance_km, baseline_recommendation, counterfactual_recommendation,
  is_feasible, explanation
) VALUES
('CFS-301', 'TRF-501', 'TRF-2026-001', 550, 200, 40, 13.50, 'APPROVE', 'APPROVE', TRUE,
 'Baseline scenario: Donor stock (550) easily covers monthly demand (200) + safety cushion (70). Transfer is safe and feasible.'),
('CFS-302', 'TRF-501', 'TRF-2026-001', 250, 200, 40, 13.50, 'APPROVE', 'REDUCE_QUANTITY', FALSE,
 'Counterfactual scenario: If donor stock drops to 250, transfer of 120 would encroach on safety reserve. Max safe transfer is 50 units.'),
('CFS-303', 'TRF-501', 'TRF-2026-001', 550, 200, 12, 13.50, 'APPROVE', 'BLOCK_SAFETY_HOLD', FALSE,
 'Counterfactual scenario: If shelf life drops to 12 days, transfer is blocked because transit and inspection buffer requires 15 days.')
ON DUPLICATE KEY UPDATE
  counterfactual_recommendation = VALUES(counterfactual_recommendation),
  explanation = VALUES(explanation);
