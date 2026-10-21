/**
 * PharmaSync CARE — Central Configuration
 * Student DBMS Academic Prototype
 */

const STORAGE_KEY_DEMO_MODE = 'pharmasync_demo_mode';
const STORAGE_KEY_API_URL = 'pharmasync_api_url';
const STORAGE_KEY_ACTIVE_FACILITY = 'pharmasync_active_facility';

// Read persisted settings or fallback to defaults
const savedDemoMode = localStorage.getItem(STORAGE_KEY_DEMO_MODE);
const isDemoMode = savedDemoMode !== null ? savedDemoMode === 'true' : true;

const savedApiUrl = localStorage.getItem(STORAGE_KEY_API_URL);
const apiUrl = savedApiUrl || 'http://127.0.0.1:5000/api';

const savedFacilityId = localStorage.getItem(STORAGE_KEY_ACTIVE_FACILITY) || 'FAC-001';

export const config = {
  APP_NAME: 'PharmaSync CARE',
  VERSION: '1.0.0-PROTOTYPE',
  TAGLINE: 'Intelligent Explainable Medicine Redistribution Network',
  IS_ACADEMIC_PROTOTYPE: true,

  // Backend Integration settings
  API_BASE_URL: apiUrl,
  DEMO_MODE: isDemoMode,

  // Active Context
  ACTIVE_FACILITY_ID: savedFacilityId,

  // Current Logged-in Synthetic User Context
  CURRENT_USER: {
    id: 'USR-802',
    name: 'Dr. Sunita Nair',
    role: 'Chief Pharmacist',
    roleKey: 'pharmacy_admin',
    facilityId: savedFacilityId,
    email: 's.nair@apexcentral.health'
  },

  // Logistics & Safety Policy Constants
  POLICY: {
    MIN_SHELF_LIFE_DAYS: 45,        // Recipient minimum required remaining shelf-life upon delivery
    SAFETY_STOCK_BUFFER_PCT: 0.20,  // Minimum retained reserve (20% of expected demand)
    LOCAL_RADIUS_KM: 15,            // Local tier
    REGIONAL_RADIUS_KM: 60,         // Regional tier
    COLD_CHAIN_TEMP_MIN: 2,         // Celsius
    COLD_CHAIN_TEMP_MAX: 8          // Celsius
  },

  setDemoMode(val) {
    this.DEMO_MODE = Boolean(val);
    localStorage.setItem(STORAGE_KEY_DEMO_MODE, String(this.DEMO_MODE));
  },

  setApiBaseUrl(url) {
    this.API_BASE_URL = url.trim().replace(/\/$/, '');
    localStorage.setItem(STORAGE_KEY_API_URL, this.API_BASE_URL);
  },

  setActiveFacility(facilityId) {
    this.ACTIVE_FACILITY_ID = facilityId;
    this.CURRENT_USER.facilityId = facilityId;
    localStorage.setItem(STORAGE_KEY_ACTIVE_FACILITY, facilityId);
  }
};
