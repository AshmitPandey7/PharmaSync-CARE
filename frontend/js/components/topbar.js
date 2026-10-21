/**
 * PharmaSync CARE — Topbar Navigation Component
 */

import { config } from '../config.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { sidebar } from './sidebar.js';
import { toast } from './toast.js';

export const topbar = {
  render(currentTitle = 'Dashboard') {
    const el = document.getElementById('topbar');
    if (!el) return;

    el.innerHTML = `
      <div class="topbar-left">
        <button class="mobile-menu-toggle" id="mobile-menu-btn" aria-label="Toggle navigation menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div class="breadcrumb-trail">
          <span class="text-muted">PharmaSync CARE</span>
          <span class="text-muted">/</span>
          <span class="breadcrumb-current" id="topbar-page-title">${currentTitle}</span>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Active Facility Selector -->
        <div class="facility-select-wrapper" title="Switch your active healthcare facility context">
          <label for="topbar-facility-select">Facility:</label>
          <select id="topbar-facility-select" class="facility-select">
            <option value="FAC-001" ${config.ACTIVE_FACILITY_ID === 'FAC-001' ? 'selected' : ''}>Apex Central Hospital</option>
            <option value="FAC-002" ${config.ACTIVE_FACILITY_ID === 'FAC-002' ? 'selected' : ''}>City Care Community Pharmacy</option>
            <option value="FAC-003" ${config.ACTIVE_FACILITY_ID === 'FAC-003' ? 'selected' : ''}>Green Valley Health Centre</option>
            <option value="FAC-004" ${config.ACTIVE_FACILITY_ID === 'FAC-004' ? 'selected' : ''}>Metro Health Medical Center</option>
            <option value="FAC-005" ${config.ACTIVE_FACILITY_ID === 'FAC-005' ? 'selected' : ''}>St. Jude Charitable Dispensary</option>
            <option value="FAC-006" ${config.ACTIVE_FACILITY_ID === 'FAC-006' ? 'selected' : ''}>District Medical Logistics Hub</option>
          </select>
        </div>

        <!-- Mode Toggle Pill (Demo vs Live API Mode) -->
        <div class="mode-toggle-control" id="mode-toggle-pill" title="Toggle between synthetic Demo Mode and Live Flask Backend">
          <span class="mode-status-dot ${config.DEMO_MODE ? 'demo' : 'live'}" id="mode-status-dot"></span>
          <span class="mode-label" id="mode-status-label">${config.DEMO_MODE ? 'Demo Mode' : 'Flask API'}</span>
          <button class="mode-switch-btn" id="mode-switch-btn">${config.DEMO_MODE ? 'Switch Live' : 'Switch Demo'}</button>
        </div>

        <!-- System Reset / Quick Action -->
        <button class="btn btn-outline btn-sm" id="btn-quick-reset" title="Reset Demo Data to Initial State">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span style="font-size: 11px;">Reset Data</span>
        </button>

        <!-- Topbar Sign Out Button -->
        <button class="btn btn-outline btn-sm" id="btn-topbar-logout" title="Sign out of current facility session" style="gap: 5px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span style="font-size: 11px;">Sign Out</span>
        </button>
      </div>
    `;

    // Event Bindings
    // Mobile toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebarEl = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (mobileBtn && sidebarEl && overlay) {
      mobileBtn.addEventListener('click', () => {
        sidebarEl.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
      });
      overlay.addEventListener('click', () => {
        sidebarEl.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
    }

    // Facility change
    const facilitySelect = document.getElementById('topbar-facility-select');
    if (facilitySelect) {
      facilitySelect.addEventListener('change', (e) => {
        config.setActiveFacility(e.target.value);
        const profile = config.getActiveFacilityProfile();
        sidebar.render();
        toast.info('Facility Switched', `Now operating as ${profile.name} (${profile.facilityName})`);
        window.dispatchEvent(new CustomEvent('pharmasync:facility-changed', { detail: { facilityId: e.target.value } }));
      });
    }

    // Demo / Live Mode Switch
    const modeSwitchBtn = document.getElementById('mode-switch-btn');
    if (modeSwitchBtn) {
      modeSwitchBtn.addEventListener('click', async () => {
        if (config.DEMO_MODE) {
          // Attempting switch to Live API Mode
          toast.info('Connecting...', `Testing connection to Flask backend at ${config.API_BASE_URL}`);
          config.setDemoMode(false);
          const health = await api.getHealth();

          if (!health.success) {
            config.setDemoMode(true);
            toast.error('Flask API Offline', 'Could not reach Flask server on port 5000. Reverted to Demo Mode.');
            return;
          }

          toast.success('Connected to Live Backend', `Connected to Flask API with ${health.data?.engine || 'MongoDB'}`);
        } else {
          // Switch to Demo Mode
          config.setDemoMode(true);
          toast.info('Demo Mode Activated', 'Now using synthetic demonstration state.');
        }

        window.dispatchEvent(new CustomEvent('pharmasync:mode-changed', { detail: { demoMode: config.DEMO_MODE } }));
      });
    }

    // Reset Data Handler
    const resetBtn = document.getElementById('btn-quick-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('Reset all demonstration data (inventory, requests, transfers) back to original state?')) {
          await api.resetAllData();
          toast.success('Data Reset', 'Demo database restored to default initial state.');
          window.dispatchEvent(new CustomEvent('pharmasync:data-reset'));
        }
      });
    }

    // Topbar Sign Out Handler
    const topbarLogoutBtn = document.getElementById('btn-topbar-logout');
    if (topbarLogoutBtn) {
      topbarLogoutBtn.addEventListener('click', () => {
        auth.logout();
        window.location.hash = '#/landing';
      });
    }

    // Initial Live API Health Check
    if (!config.DEMO_MODE) {
      api.getHealth().then(res => {
        const dot = document.getElementById('mode-status-dot');
        const label = document.getElementById('mode-status-label');
        if (dot && label) {
          if (!res.success) {
            dot.className = 'mode-status-dot error';
            label.textContent = 'Live (Offline)';
          } else {
            dot.className = 'mode-status-dot live';
            label.textContent = 'Flask API';
          }
        }
      }).catch(() => {});
    }
  },

  updateTitle(title) {
    const titleEl = document.getElementById('topbar-page-title');
    if (titleEl) titleEl.textContent = title;
    const facilitySelect = document.getElementById('topbar-facility-select');
    if (facilitySelect && facilitySelect.value !== config.ACTIVE_FACILITY_ID) {
      facilitySelect.value = config.ACTIVE_FACILITY_ID;
    }
  }
};
