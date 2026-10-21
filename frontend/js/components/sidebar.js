/**
 * PharmaSync CARE — Simplified Sidebar Navigation
 * Clear 5-step workflow navigation:
 * Dashboard -> Medicine Stock -> Medicine Needed -> Find Medicines -> Transfers
 */

import { config } from '../config.js';
import { auth } from '../auth.js';

export const sidebar = {
  render(currentRoute = 'dashboard') {
    const el = document.getElementById('sidebar');
    if (!el) return;

    // Normalize route key
    const activeKey = currentRoute === '' ? 'dashboard' : currentRoute;
    const currentUser = auth.getCurrentUser() || {
      name: 'Dr. Sunita Nair',
      role: 'Hospital Pharmacist',
      initials: 'SN'
    };

    // Derive 2-letter initials
    let initials = currentUser.initials;
    if (!initials && currentUser.name) {
      const parts = currentUser.name.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim().split(' ');
      initials = parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
    }

    el.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 2v20M2 12h20"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
        </div>
        <div class="sidebar-brand-text">
          <div class="sidebar-brand-title">PharmaSync <span>CARE</span></div>
          <div class="sidebar-brand-subtitle">Medicine Sharing Network</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <!-- Main Workflow -->
        <div>
          <div class="nav-group-title">Main Workflow</div>
          <ul class="nav-list">
            <li>
              <a href="#/dashboard" class="nav-link ${activeKey === 'dashboard' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span>Dashboard</span>
              </a>
            </li>

            <li>
              <a href="#/inventory" class="nav-link ${activeKey === 'inventory' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                  <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
                </svg>
                <span>Medicine Stock</span>
              </a>
            </li>

            <li>
              <a href="#/shortages" class="nav-link ${activeKey === 'shortages' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Medicine Needed</span>
              </a>
            </li>

            <li>
              <a href="#/matching" class="nav-link ${activeKey === 'matching' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="6" cy="6" r="3"/>
                  <circle cx="6" cy="18" r="3"/>
                  <line x1="20" y1="4" x2="8.12" y2="15.88"/>
                  <line x1="14.47" y1="14.48" x2="20" y2="20"/>
                  <line x1="8.12" y1="8.12" x2="12" y2="12"/>
                </svg>
                <span>Find Medicines</span>
              </a>
            </li>

            <li>
              <a href="#/transfers" class="nav-link ${activeKey === 'transfers' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <span>Transfers</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- Analytics & Simulation -->
        <div>
          <div class="nav-group-title">Analytics & Simulation</div>
          <ul class="nav-list">
            <li>
              <a href="#/analytics" class="nav-link ${activeKey === 'analytics' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span>Reports & Analytics</span>
              </a>
            </li>

            <li>
              <a href="#/fairshare" class="nav-link ${activeKey === 'fairshare' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17V9"/>
                  <path d="M13 17V5"/>
                  <path d="M8 17v-3"/>
                </svg>
                <span>Fair Allocation</span>
              </a>
            </li>

            <li>
              <a href="#/digital-twin" class="nav-link ${['digital-twin', 'simulations'].includes(activeKey) ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <span>Scenario Simulator</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- Directory & Settings -->
        <div>
          <div class="nav-group-title">Directory & System</div>
          <ul class="nav-list">
            <li>
              <a href="#/network" class="nav-link ${activeKey === 'network' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Healthcare Facilities</span>
              </a>
            </li>

            <li>
              <a href="#/admin" class="nav-link ${activeKey === 'admin' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span>System & API Settings</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${initials || 'PS'}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name" title="${currentUser.name || 'User'}">${currentUser.name || 'Dr. Sunita Nair'}</div>
            <div class="sidebar-user-role" title="${currentUser.role || 'Staff'}">${currentUser.role || 'Hospital Pharmacist'}</div>
          </div>
        </div>
        <button type="button" class="sidebar-logout-btn" id="btn-sidebar-logout" title="Sign out of facility session" aria-label="Sign out">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    `;

    // Logout handler
    const logoutBtn = document.getElementById('btn-sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        auth.logout();
        window.location.hash = '#/landing';
      });
    }

    // Close mobile drawer when a link is clicked
    el.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        el.classList.remove('mobile-open');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.classList.remove('active');
      });
    });
  }
};
