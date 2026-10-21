-- ============================================================================
-- [ARCHIVED / RETIRED SPECIFICATION]
-- PharmaSync CARE has migrated from MySQL to MongoDB Atlas.
-- Active Document Schema: docs/MONGODB_SCHEMA.md
-- Database Initialization: backend/scripts/init_db.py
-- Synthetic Data Seed: backend/scripts/seed_data.py
-- ============================================================================
-- PharmaSync CARE — Legacy Relational Database Schema (MySQL 8.0+)
-- An Intelligent, Predictive, and Explainable Medicine Redistribution Network
-- ============================================================================
-- Engine: InnoDB
-- Character Set: utf8mb4 / Collation: utf8mb4_unicode_ci
-- Invariants enforced via Primary Keys, Foreign Keys, Unique Keys, Check Constraints,
-- and documented Transactional Application Logic.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS pharmasync_care
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pharmasync_care;

-- ----------------------------------------------------------------------------
-- Table 1: facilities
-- Registered healthcare institutions, community pharmacies, and distribution hubs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facilities (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(60) NOT NULL,
  type_badge VARCHAR(30) NOT NULL DEFAULT 'hospital',
  address VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  cold_chain_certified BOOLEAN NOT NULL DEFAULT FALSE,
  license_number VARCHAR(100) NOT NULL,
  bed_capacity INT NOT NULL DEFAULT 0,
  contact_person VARCHAR(100) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_facilities_license (license_number),
  INDEX idx_facilities_type (type),
  INDEX idx_facilities_status (status),
  INDEX idx_facilities_coords (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 2: users
-- Authorized healthcare facility personnel, pharmacists, and administrators
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) NOT NULL,
  username VARCHAR(60) NOT NULL,
  email VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(80) NOT NULL,
  role_key VARCHAR(40) NOT NULL DEFAULT 'pharmacy_admin',
  facility_id VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_facility (facility_id),
  CONSTRAINT fk_users_facility FOREIGN KEY (facility_id)
    REFERENCES facilities (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 3: medicines
-- Standardized formulary items, formulation attributes, and storage constraints
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicines (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(150) NOT NULL,
  generic_name VARCHAR(150) NOT NULL,
  strength VARCHAR(80) NOT NULL,
  dosage_form VARCHAR(50) NOT NULL,
  category VARCHAR(80) NOT NULL,
  cold_chain_required BOOLEAN NOT NULL DEFAULT FALSE,
  storage_temp_min DECIMAL(4, 1) DEFAULT 15.0,
  storage_temp_max DECIMAL(4, 1) DEFAULT 25.0,
  standard_unit VARCHAR(40) DEFAULT 'Unit',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_medicines_name (name),
  INDEX idx_medicines_generic (generic_name),
  INDEX idx_medicines_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 4: inventory_batches
-- Specific medicine batches physically held by facilities with quantity states
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_batches (
  id VARCHAR(32) NOT NULL,
  batch_number VARCHAR(60) NOT NULL,
  medicine_id VARCHAR(32) NULL,
  medicine_name VARCHAR(150) NOT NULL,
  generic_name VARCHAR(150) NOT NULL,
  strength VARCHAR(80) NOT NULL,
  dosage_form VARCHAR(50) NOT NULL,
  category VARCHAR(80) NOT NULL,
  facility_id VARCHAR(32) NOT NULL,
  total_quantity INT NOT NULL,
  reserved_quantity INT NOT NULL DEFAULT 0,
  available_quantity INT NOT NULL,
  eligible_surplus_quantity INT NOT NULL DEFAULT 0,
  expected_monthly_demand INT NOT NULL DEFAULT 50,
  safety_stock_threshold INT NOT NULL DEFAULT 20,
  expiry_date DATE NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  cold_chain_required BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'ADEQUATE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_batch_facility (batch_number, facility_id),
  INDEX idx_inv_fac (facility_id),
  INDEX idx_inv_expiry (expiry_date),
  INDEX idx_inv_status (status),
  INDEX idx_inv_medicine (medicine_name),
  CONSTRAINT fk_inv_facility FOREIGN KEY (facility_id)
    REFERENCES facilities (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inv_medicine FOREIGN KEY (medicine_id)
    REFERENCES medicines (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_total_qty CHECK (total_quantity >= 0),
  CONSTRAINT chk_res_qty CHECK (reserved_quantity >= 0),
  CONSTRAINT chk_avail_qty CHECK (available_quantity >= 0),
  CONSTRAINT chk_res_le_total CHECK (reserved_quantity <= total_quantity),
  CONSTRAINT chk_demand_pos CHECK (expected_monthly_demand >= 0),
  CONSTRAINT chk_safety_pos CHECK (safety_stock_threshold >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 5: shortage_tickets
-- Clinical medicine deficit requests submitted by healthcare facilities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shortage_tickets (
  id VARCHAR(32) NOT NULL,
  facility_id VARCHAR(32) NOT NULL,
  medicine_id VARCHAR(32) NULL,
  medicine_name VARCHAR(150) NOT NULL,
  generic_name VARCHAR(150) NULL,
  strength VARCHAR(80) NOT NULL,
  dosage_form VARCHAR(50) NOT NULL,
  required_quantity INT NOT NULL,
  fulfilled_quantity INT NOT NULL DEFAULT 0,
  unmet_quantity INT NOT NULL,
  urgency VARCHAR(30) NOT NULL DEFAULT 'ROUTINE',
  requested_date DATE NOT NULL,
  required_by_date DATE NOT NULL,
  reason TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_shortage_fac (facility_id),
  INDEX idx_shortage_status (status),
  INDEX idx_shortage_urgency (urgency),
  INDEX idx_shortage_med (medicine_name),
  CONSTRAINT fk_shortage_facility FOREIGN KEY (facility_id)
    REFERENCES facilities (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_shortage_medicine FOREIGN KEY (medicine_id)
    REFERENCES medicines (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_shortage_req CHECK (required_quantity > 0),
  CONSTRAINT chk_shortage_ful CHECK (fulfilled_quantity >= 0),
  CONSTRAINT chk_shortage_unmet CHECK (unmet_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 6: shortage_status_history
-- Immutable audit log of status progressions for clinical shortage tickets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shortage_status_history (
  id INT AUTO_INCREMENT NOT NULL,
  shortage_id VARCHAR(32) NOT NULL,
  status VARCHAR(30) NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  note TEXT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ssh_shortage (shortage_id),
  CONSTRAINT fk_ssh_shortage FOREIGN KEY (shortage_id)
    REFERENCES shortage_tickets (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 7: donor_recommendations
-- Explainable algorithmic candidate evaluations linking shortages to surplus batches
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donor_recommendations (
  id VARCHAR(32) NOT NULL,
  shortage_id VARCHAR(32) NOT NULL,
  batch_id VARCHAR(32) NOT NULL,
  donor_facility_id VARCHAR(32) NOT NULL,
  match_score INT NOT NULL DEFAULT 0,
  is_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  distance_km DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  days_to_expiry INT NOT NULL DEFAULT 0,
  reasons_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_dr_shortage (shortage_id),
  INDEX idx_dr_batch (batch_id),
  INDEX idx_dr_donor (donor_facility_id),
  CONSTRAINT fk_dr_shortage FOREIGN KEY (shortage_id)
    REFERENCES shortage_tickets (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dr_batch FOREIGN KEY (batch_id)
    REFERENCES inventory_batches (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dr_donor FOREIGN KEY (donor_facility_id)
    REFERENCES facilities (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 8: transfers
-- Medicine redistribution custody manifests progressing through lifecycle states
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfers (
  id VARCHAR(32) NOT NULL,
  transfer_code VARCHAR(50) NOT NULL,
  shortage_id VARCHAR(32) NULL,
  sender_facility_id VARCHAR(32) NOT NULL,
  recipient_facility_id VARCHAR(32) NOT NULL,
  batch_id VARCHAR(32) NOT NULL,
  medicine_name VARCHAR(150) NOT NULL,
  strength VARCHAR(80) NOT NULL,
  quantity INT NOT NULL,
  urgency VARCHAR(30) NOT NULL DEFAULT 'ROUTINE',
  status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
  lifecycle_index INT NOT NULL DEFAULT 1,
  carrier_name VARCHAR(100) NULL DEFAULT 'Pending Assignment',
  temperature_log VARCHAR(100) NULL DEFAULT 'Ambient / Standard Cold',
  notes TEXT NULL,
  requested_date DATETIME NULL,
  approved_date DATETIME NULL,
  dispatched_date DATETIME NULL,
  received_date DATETIME NULL,
  cancelled_date DATETIME NULL,
  created_by_user_id VARCHAR(32) NULL,
  approved_by_user_id VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transfers_code (transfer_code),
  INDEX idx_trf_sender (sender_facility_id),
  INDEX idx_trf_recipient (recipient_facility_id),
  INDEX idx_trf_status (status),
  INDEX idx_trf_batch (batch_id),
  CONSTRAINT fk_trf_sender FOREIGN KEY (sender_facility_id)
    REFERENCES facilities (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_trf_recipient FOREIGN KEY (recipient_facility_id)
    REFERENCES facilities (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_trf_batch FOREIGN KEY (batch_id)
    REFERENCES inventory_batches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_trf_shortage FOREIGN KEY (shortage_id)
    REFERENCES shortage_tickets (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_trf_qty CHECK (quantity > 0),
  CONSTRAINT chk_trf_diff_fac CHECK (sender_facility_id <> recipient_facility_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 9: transfer_items
-- Individual line items associated with a transfer manifest
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfer_items (
  id VARCHAR(32) NOT NULL,
  transfer_id VARCHAR(32) NOT NULL,
  batch_id VARCHAR(32) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ti_transfer (transfer_id),
  INDEX idx_ti_batch (batch_id),
  CONSTRAINT fk_ti_transfer FOREIGN KEY (transfer_id)
    REFERENCES transfers (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ti_batch FOREIGN KEY (batch_id)
    REFERENCES inventory_batches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_ti_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 10: transfer_status_history
-- Immutable audit log for each state advancement of a transfer manifest
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transfer_status_history (
  id INT AUTO_INCREMENT NOT NULL,
  transfer_id VARCHAR(32) NOT NULL,
  status VARCHAR(30) NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  note TEXT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tsh_transfer (transfer_id),
  CONSTRAINT fk_tsh_transfer FOREIGN KEY (transfer_id)
    REFERENCES transfers (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 11: allocation_runs
-- Header records for FairShare or Multi-donor allocation simulations/commits
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocation_runs (
  id VARCHAR(32) NOT NULL,
  total_available_supply INT NOT NULL,
  total_demand INT NOT NULL,
  deficit INT NOT NULL DEFAULT 0,
  allocation_method VARCHAR(50) NOT NULL DEFAULT 'FAIRSHARE',
  urgency_weight DECIMAL(4, 2) NOT NULL DEFAULT 0.45,
  vulnerability_weight DECIMAL(4, 2) NOT NULL DEFAULT 0.35,
  demand_weight DECIMAL(4, 2) NOT NULL DEFAULT 0.20,
  explanation TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PREVIEW',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ar_status (status),
  INDEX idx_ar_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 12: allocation_items
-- Itemized recipient allocation distributions generated by an allocation run
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocation_items (
  id VARCHAR(32) NOT NULL,
  run_id VARCHAR(32) NOT NULL,
  shortage_id VARCHAR(32) NULL,
  recipient_facility_id VARCHAR(32) NOT NULL,
  donor_batch_id VARCHAR(32) NOT NULL,
  requested_quantity INT NOT NULL,
  allocated_quantity INT NOT NULL,
  fulfillment_pct INT NOT NULL DEFAULT 0,
  criteria_score INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ai_run (run_id),
  INDEX idx_ai_recipient (recipient_facility_id),
  INDEX idx_ai_batch (donor_batch_id),
  CONSTRAINT fk_ai_run FOREIGN KEY (run_id)
    REFERENCES allocation_runs (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ai_recipient FOREIGN KEY (recipient_facility_id)
    REFERENCES facilities (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_ai_batch FOREIGN KEY (donor_batch_id)
    REFERENCES inventory_batches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_ai_alloc CHECK (allocated_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 13: allocations (Compatibility View / Table)
-- Direct multi-facility allocation commitments mapping directly to API endpoints
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocations (
  id VARCHAR(32) NOT NULL,
  shortage_id VARCHAR(32) NULL,
  donor_batch_id VARCHAR(32) NOT NULL,
  recipient_facility_id VARCHAR(32) NOT NULL,
  allocated_quantity INT NOT NULL,
  allocation_method VARCHAR(50) NOT NULL DEFAULT 'FAIRSHARE',
  status VARCHAR(30) NOT NULL DEFAULT 'PREVIEW',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_alloc_shortage (shortage_id),
  INDEX idx_alloc_batch (donor_batch_id),
  INDEX idx_alloc_recipient (recipient_facility_id),
  CONSTRAINT fk_alloc_batch FOREIGN KEY (donor_batch_id)
    REFERENCES inventory_batches (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_alloc_recipient FOREIGN KEY (recipient_facility_id)
    REFERENCES facilities (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_alloc_qty CHECK (allocated_quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 14: audit_logs
-- Immutable tamper-evident audit ledger for regulatory and compliance tracking
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(32) NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_name VARCHAR(100) NOT NULL,
  role VARCHAR(80) NOT NULL,
  action VARCHAR(60) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  PRIMARY KEY (id),
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 15: simulation_runs
-- Isolated Digital Twin scenario results and resilience projections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulation_runs (
  id VARCHAR(32) NOT NULL,
  scenario_name VARCHAR(120) NOT NULL,
  demand_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
  delay_hours INT NOT NULL DEFAULT 0,
  safety_margin_pct INT NOT NULL DEFAULT 15,
  expiry_cluster_days INT NOT NULL DEFAULT 30,
  simulated_demand INT NOT NULL,
  unmanaged_stockouts INT NOT NULL,
  supplied_via_network INT NOT NULL,
  resilience_fulfillment_pct INT NOT NULL,
  isolated_service_level_pct INT NOT NULL,
  metrics_json JSON NULL,
  time_series_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_sim_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 16: optimization_runs
-- Multi-objective Pareto trade-off runs (waste prevention, distance, speed)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS optimization_runs (
  id VARCHAR(32) NOT NULL,
  weight_waste_prevention DECIMAL(4, 2) NOT NULL,
  weight_distance_min DECIMAL(4, 2) NOT NULL,
  weight_speed DECIMAL(4, 2) NOT NULL,
  waste_score INT NOT NULL,
  transport_score INT NOT NULL,
  speed_score INT NOT NULL,
  allocations_json JSON NULL,
  summary_text TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_opt_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 17: counterfactual_scenarios
-- What-If parameter perturbation sensitivity analysis records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counterfactual_scenarios (
  id VARCHAR(32) NOT NULL,
  subject_transfer_id VARCHAR(32) NULL,
  transfer_code VARCHAR(50) NOT NULL,
  donor_stock INT NOT NULL,
  donor_monthly_demand INT NOT NULL,
  days_to_expiry INT NOT NULL,
  distance_km DECIMAL(6, 2) NOT NULL,
  baseline_recommendation VARCHAR(30) NOT NULL,
  counterfactual_recommendation VARCHAR(30) NOT NULL,
  is_feasible BOOLEAN NOT NULL DEFAULT TRUE,
  explanation TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cfs_transfer (subject_transfer_id),
  CONSTRAINT fk_cfs_transfer FOREIGN KEY (subject_transfer_id)
    REFERENCES transfers (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
