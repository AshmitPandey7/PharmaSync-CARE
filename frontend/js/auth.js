/**
 * PharmaSync CARE — Authentication Service
 * Secure session-based authentication flow for healthcare facility personnel.
 */

import { config } from './config.js';
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
    facilityId: 'FAC-001',
    facilityName: 'Apex Central Hospital'
  },
  {
    username: 'dr.nair',
    email: 's.nair@apexcentral.health',
    password: 'pharmasync2026',
    name: 'Dr. Sunita Nair',
    role: 'Chief Pharmacist / Admin',
    facilityId: 'FAC-001',
    facilityName: 'Apex Central Hospital'
  },
  {
    username: 'venkat',
    email: 'venkat@citycarepharmacy.org',
    password: 'pharmasync2026',
    name: 'P. Venkat, B.Pharm',
    role: 'Community Pharmacist',
    facilityId: 'FAC-002',
    facilityName: 'City Care Pharmacy'
  },
  {
    username: 'joseph',
    email: 'j.kurian@greenvalley.org',
    password: 'pharmasync2026',
    name: 'Dr. Joseph Kurian',
    role: 'Clinical Officer',
    facilityId: 'FAC-003',
    facilityName: 'Green Valley Health Centre'
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
      return raw ? JSON.parse(raw) : null;
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
    const identifier = (usernameOrEmail || '').trim().toLowerCase();
    const pass = (password || '').trim();

    if (!identifier || !pass) {
      return {
        success: false,
        error: 'Please enter both username/email and password.'
      };
    }

    // Match against demo accounts
    const account = DEMO_ACCOUNTS.find(acc => 
      (acc.username.toLowerCase() === identifier || acc.email.toLowerCase() === identifier) &&
      acc.password === pass
    );

    if (!account) {
      return {
        success: false,
        error: 'Invalid credentials. Please verify your username or use the demo credentials below.'
      };
    }

    // Create session token (synthetic cryptographic session id)
    const token = 'ps_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const sessionData = {
      token,
      timestamp: Date.now(),
      user: {
        id: account.username === 'admin' ? 'USR-801' : 'USR-802',
        username: account.username,
        name: account.name,
        role: account.role,
        email: account.email,
        facilityId: account.facilityId,
        facilityName: account.facilityName
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

    // Update active config facility & user
    config.setActiveFacility(account.facilityId);
    config.CURRENT_USER = {
      ...config.CURRENT_USER,
      ...sessionData.user
    };

    window.dispatchEvent(new CustomEvent('pharmasync:auth-changed', {
      detail: { authenticated: true, user: sessionData.user }
    }));

    return {
      success: true,
      user: sessionData.user
    };
  },

  /**
   * End current session and log out
   */
  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);

    window.dispatchEvent(new CustomEvent('pharmasync:auth-changed', {
      detail: { authenticated: false, user: null }
    }));

    return true;
  },

  /**
   * Returns list of available demo credentials for evaluator reference
   */
  getDemoCredentials() {
    return [
      {
        label: 'Hospital Pharmacist (Admin)',
        username: 'admin',
        password: 'pharmasync2026',
        facility: 'Apex Central Hospital'
      },
      {
        label: 'Community Pharmacist',
        username: 'venkat',
        password: 'pharmasync2026',
        facility: 'City Care Pharmacy'
      },
      {
        label: 'Rural Health Officer',
        username: 'joseph',
        password: 'pharmasync2026',
        facility: 'Green Valley Health Centre'
      }
    ];
  }
};
