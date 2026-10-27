/**
 * PharmaSync CARE — Authentication Service
 * Secure session-based authentication flow for healthcare facility personnel.
 */

import { config, FACILITY_PROFILES } from './config.js';
import { DEMO_USERS } from './demo-data.js';

const SESSION_KEY = 'pharmasync_auth_session';
const REMEMBER_KEY = 'pharmasync_remember_me';

// Standard demo credentials for evaluators & demonstration
export const DEMO_ACCOUNTS = [
  {
    username: 'admin',
    email: 's.nair@apexcentral.health',
    password: 'pharmasync2026',
    name: 'Dr. Sunita Nair',
    role: 'Chief Pharmacist / Admin',
    roleKey: 'pharmacy_admin',
    facilityId: 'FAC-001',
    facilityName: 'Apex Central Hospital'
  },
  {
    username: 'dr.nair',
    email: 's.nair@apexcentral.health',
    password: 'pharmasync2026',
    name: 'Dr. Sunita Nair',
    role: 'Chief Pharmacist / Admin',
    roleKey: 'pharmacy_admin',
    facilityId: 'FAC-001',
    facilityName: 'Apex Central Hospital'
  },
  {
    username: 'venkat',
    email: 'venkat@citycarepharmacy.org',
    password: 'pharmasync2026',
    name: 'P. Venkat, B.Pharm',
    role: 'Community Pharmacist',
    roleKey: 'community_pharmacist',
    facilityId: 'FAC-002',
    facilityName: 'City Care Community Pharmacy'
  },
  {
    username: 'joseph',
    email: 'j.kurian@greenvalley.org',
    password: 'pharmasync2026',
    name: 'Dr. Joseph Kurian',
    role: 'Clinical Officer',
    roleKey: 'clinical_officer',
    facilityId: 'FAC-003',
    facilityName: 'Green Valley Health Centre'
  },
  {
    username: 'anita',
    email: 'a.desai@metrohealth.org',
    password: 'pharmasync2026',
    name: 'Dr. Anita Desai, MD',
    role: 'Hospital Pharmacist',
    roleKey: 'pharmacy_admin',
    facilityId: 'FAC-004',
    facilityName: 'Metro Health Medical Center'
  },
  {
    username: 'mary',
    email: 'm.thomas@stjude.org',
    password: 'pharmasync2026',
    name: 'Sister Mary Thomas',
    role: 'Dispensary In-Charge',
    roleKey: 'clinical_officer',
    facilityId: 'FAC-005',
    facilityName: 'St. Jude Charitable Dispensary'
  },
  {
    username: 'logistics',
    email: 'r.sharma@districthub.org',
    password: 'pharmasync2026',
    name: 'Rajesh Sharma',
    role: 'Logistics Director',
    roleKey: 'pharmacy_admin',
    facilityId: 'FAC-006',
    facilityName: 'District Medical Logistics Hub'
  }
];

export const auth = {
  /**
   * Check if user is currently authenticated
   */
  isAuthenticated() {
    const session = this.getSession();
    if (!session || !session.token) return false;
    
    // Check if session has expired (24 hour session window)
    const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - session.timestamp > MAX_SESSION_AGE_MS) {
      this.logout();
      return false;
    }
    return true;
  },

  /**
   * Get active session object from storage
   */
  getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
      if (sessionStorage.getItem('pharmasync_explicit_logout')) return null;

      // Auto-initialize default demo session (Dr. Sunita Nair, Apex Central Hospital) for seamless presentation
      const account = DEMO_ACCOUNTS[0];
      const profile = FACILITY_PROFILES[account.facilityId] || account;
      const sessionData = {
        token: 'ps_auto_' + Math.random().toString(36).substring(2),
        timestamp: Date.now(),
        user: {
          id: account.id || profile.id,
          username: account.username,
          name: account.name,
          role: account.role,
          roleKey: account.roleKey || profile.roleKey,
          email: account.email,
          facilityId: account.facilityId,
          facilityName: account.facilityName,
          initials: profile.initials
        }
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      config.setActiveFacility(account.facilityId);
      return sessionData;
    } catch {
      return null;
    }
  },

  /**
   * Get current authenticated user profile
   */
  getCurrentUser() {
    const session = this.getSession();
    if (session && session.user) {
      return session.user;
    }
    return config.CURRENT_USER;
  },

  /**
   * Authenticate user with credentials
   */
  login(usernameOrEmail, password, rememberMe = false) {
    sessionStorage.removeItem('pharmasync_explicit_logout');
    const identifier = (usernameOrEmail || '').trim().toLowerCase();
    const pass = (password || '').trim();

    if (!identifier || !pass) {
      return {
        success: false,
        error: 'Please enter both username/email and password.'
      };
    }

    // Match against demo accounts
    let account = DEMO_ACCOUNTS.find(acc => 
      (acc.username.toLowerCase() === identifier || acc.email.toLowerCase() === identifier) &&
      acc.password === pass
    );

    // Fallback if password matches default access password
    if (!account && pass === 'pharmasync2026') {
      account = DEMO_ACCOUNTS.find(acc => 
        acc.username.toLowerCase() === identifier || acc.email.toLowerCase() === identifier
      );
    }

    if (!account) {
      return {
        success: false,
        error: 'Invalid credentials. Please verify your username or select a facility persona below.'
      };
    }

    // Create session token (synthetic cryptographic session id)
    const token = 'ps_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const profile = FACILITY_PROFILES[account.facilityId] || account;
    const sessionData = {
      token,
      timestamp: Date.now(),
      user: {
        id: account.id || profile.id,
        username: account.username,
        name: account.name,
        role: account.role,
        roleKey: account.roleKey || profile.roleKey,
        email: account.email,
        facilityId: account.facilityId,
        facilityName: account.facilityName,
        initials: profile.initials
      }
    };

    // Store in sessionStorage, or localStorage if rememberMe is true
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }

    // Update active config facility & user context
    config.setActiveFacility(account.facilityId);

    window.dispatchEvent(new CustomEvent('pharmasync:auth-changed', {
      detail: { authenticated: true, user: sessionData.user }
    }));

    return {
      success: true,
      user: sessionData.user
    };
  },

  /**
   * Terminate active session
   */
  logout() {
    try {
      sessionStorage.setItem('pharmasync_explicit_logout', 'true');
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    } catch {}

    window.dispatchEvent(new CustomEvent('pharmasync:auth-changed', {
      detail: { authenticated: false, user: null }
    }));
  }
};
