/**
 * PharmaSync CARE — Central Configuration
 * Multi-Facility Healthcare Inventory Redistribution Network
 */

const STORAGE_KEY_DEMO_MODE = 'pharmasync_demo_mode';
const STORAGE_KEY_API_URL = 'pharmasync_api_url';
const STORAGE_KEY_ACTIVE_FACILITY = 'pharmasync_active_facility';

// Facility Profiles Matrix for Multi-Facility Persona Switching
export const FACILITY_PROFILES = {
  'FAC-001': {
    id: 'USR-801',
    facilityId: 'FAC-001',
    facilityName: 'Apex Central Hospital',
    facilityType: 'Hospital Pharmacy',
    username: 'admin',
    name: 'Dr. Sunita Nair',
    role: 'Chief Pharmacist / Admin',
    roleKey: 'pharmacy_admin',
    initials: 'SN',
    email: 's.nair@apexcentral.health'
  },
  'FAC-002': {
    id: 'USR-803',
    facilityId: 'FAC-002',
    facilityName: 'City Care Community Pharmacy',
    facilityType: 'Community Pharmacy',
    username: 'venkat',
    name: 'P. Venkat, B.Pharm',
    role: 'Community Pharmacist',
    roleKey: 'community_pharmacist',
    initials: 'PV',
    email: 'venkat@citycarepharmacy.org'
  },
  'FAC-003': {
    id: 'USR-804',
    facilityId: 'FAC-003',
    facilityName: 'Green Valley Health Centre',
    facilityType: 'Rural Health Centre',
    username: 'joseph',
    name: 'Dr. Joseph Kurian',
    role: 'Clinical Officer',
    roleKey: 'clinical_officer',
    initials: 'JK',
    email: 'j.kurian@greenvalley.org'
  },
  'FAC-004': {
    id: 'USR-805',
    facilityId: 'FAC-004',
    facilityName: 'Metro Health Medical Center',
    facilityType: 'Hospital Pharmacy',
    username: 'anita',
    name: 'Dr. Anita Desai, MD',
    role: 'Senior Hospital Pharmacist',
    roleKey: 'pharmacy_admin',
    initials: 'AD',
    email: 'a.desai@metrohealth.org'
  },
  'FAC-005': {
    id: 'USR-806',
    facilityId: 'FAC-005',
    facilityName: 'St. Jude Charitable Dispensary',
    facilityType: 'Charitable Clinic',
    username: 'mary',
    name: 'Sister Mary Thomas',
    role: 'Dispensary In-Charge',
    roleKey: 'clinical_officer',
    initials: 'MT',
    email: 'm.thomas@stjude.org'
  },
  'FAC-006': {
    id: 'USR-807',
    facilityId: 'FAC-006',
    facilityName: 'District Medical Logistics Hub',
    facilityType: 'Distribution Hub',
    username: 'logistics',
    name: 'Rajesh Sharma',
    role: 'Logistics Director',
    roleKey: 'pharmacy_admin',
    initials: 'RS',
    email: 'r.sharma@districthub.org'
  }
};

// Read persisted settings or fallback to defaults
const hasStorage = typeof localStorage !== 'undefined';
const savedDemoMode = hasStorage ? localStorage.getItem(STORAGE_KEY_DEMO_MODE) : null;
const isDemoMode = savedDemoMode !== null ? savedDemoMode === 'true' : false;

const savedApiUrl = hasStorage ? localStorage.getItem(STORAGE_KEY_API_URL) : null;
const apiUrl = savedApiUrl || 'http://127.0.0.1:5000/api';

const savedFacilityId = (hasStorage ? localStorage.getItem(STORAGE_KEY_ACTIVE_FACILITY) : null) || 'FAC-001';
const initialProfile = FACILITY_PROFILES[savedFacilityId] || FACILITY_PROFILES['FAC-001'];

export const config = {
  APP_NAME: 'PharmaSync CARE',
  VERSION: '2.5.0',
  TAGLINE: 'Multi-Facility Medicine Redistribution Network',
  IS_STANDALONE: true,

  // Backend Integration settings
  API_BASE_URL: apiUrl,
  DEMO_MODE: isDemoMode,

  // Active Context
  ACTIVE_FACILITY_ID: savedFacilityId,

  // Current Logged-in User Profile
  CURRENT_USER: {
    id: initialProfile.id,
    name: initialProfile.name,
    role: initialProfile.role,
    roleKey: initialProfile.roleKey,
    facilityId: initialProfile.facilityId,
    facilityName: initialProfile.facilityName,
    email: initialProfile.email,
    initials: initialProfile.initials
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
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_DEMO_MODE, String(this.DEMO_MODE));
  },

  setApiBaseUrl(url) {
    this.API_BASE_URL = url.trim().replace(/\/$/, '');
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_API_URL, this.API_BASE_URL);
  },

  getActiveFacilityProfile() {
    return FACILITY_PROFILES[this.ACTIVE_FACILITY_ID] || FACILITY_PROFILES['FAC-001'];
  },

  setActiveFacility(facilityId) {
    this.ACTIVE_FACILITY_ID = facilityId;
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY_ACTIVE_FACILITY, facilityId);
    
    const profile = FACILITY_PROFILES[facilityId] || FACILITY_PROFILES['FAC-001'];
    this.CURRENT_USER = {
      ...this.CURRENT_USER,
      id: profile.id,
      name: profile.name,
      role: profile.role,
      roleKey: profile.roleKey,
      facilityId: profile.facilityId,
      facilityName: profile.facilityName,
      email: profile.email,
      initials: profile.initials
    };

    // Keep session storage synchronized so auth.getCurrentUser() matches active facility
    try {
      const sessionRaw = sessionStorage.getItem('pharmasync_auth_session') || localStorage.getItem('pharmasync_auth_session');
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        session.user = { ...session.user, ...this.CURRENT_USER };
        if (sessionStorage.getItem('pharmasync_auth_session')) {
          sessionStorage.setItem('pharmasync_auth_session', JSON.stringify(session));
        }
        if (localStorage.getItem('pharmasync_auth_session')) {
          localStorage.setItem('pharmasync_auth_session', JSON.stringify(session));
        }
      }
    } catch (e) {}
  }
};
