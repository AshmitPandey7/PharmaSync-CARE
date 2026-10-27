/**
 * PharmaSync CARE — Topbar Navigation Component
 * Supports seamless Demo Mode / Live Mode switching, Guided Demo launch,
 * Demo Data Info modal, and Active Facility Persona switching.
 */

import { config } from '../config.js';
import { api } from '../api.js';
import { auth } from '../auth.js';
import { sidebar } from './sidebar.js';
import { toast } from './toast.js';
import { guidedDemo } from './guided-demo.js';
import { demoInfoModal } from './demo-info-modal.js';

export const topbar = {
  render(currentTitle = 'Dashboard') {
    const el = document.getElementById('topbar');
    if (!el) return;

    const isDemo = config.DEMO_MODE;

    el.innerHTML = `
      <div class="topbar-left">
        <button class="mobile-menu-toggle" id="mobile-menu-btn" aria-label="Toggle navigation menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        <!-- Guided Demo Quick Button (Available in Demo Mode) -->
        ${isDemo ? `
          <button class="btn btn-secondary btn-sm guided-demo-pill" id="btn-topbar-guided-demo" title="Start Step-by-Step Guided Demo for Professor Presentation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>Start Guided Demo</span>
          </button>
        ` : ''}

        <!-- Demo / Live Mode Toggle Control -->
        <div class="mode-toggle-control" id="mode-toggle-pill" title="Toggle between synthetic Demo Mode and Live Flask Database Mode">
          <span class="mode-status-dot ${isDemo ? 'demo' : 'live'}" id="mode-status-dot"></span>
          <span class="mode-label" id="mode-status-label">${isDemo ? 'Demo Mode' : 'Live Mode'}</span>
          <button class="mode-switch-btn" id="mode-switch-btn">${isDemo ? 'Switch Live' : 'Switch Demo'}</button>
        </div>

        <!-- Demo Data Info Button (Viva Technical Details) -->
        <button class="btn btn-outline btn-sm btn-icon-text" id="btn-demo-info" title="View Demo Data Architecture & DBMS Viva Defense Details">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span style="font-size: 11px;">Data Info</span>
        </button>

        <!-- Reset Demo Data (Visible strictly in Demo Mode) -->
        ${isDemo ? `
          <button class="btn btn-outline btn-sm btn-icon-text" id="btn-quick-reset" title="Reset Demo Data to Initial Indian Healthcare Scenario">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            <span style="font-size: 11px;">Reset Demo</span>
          </button>
        ` : ''}

        <!-- Active Facility Context Selector -->
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

        <!-- Sign Out Button -->
        <button class="btn btn-outline btn-sm btn-icon-text" id="btn-topbar-logout" title="Sign out of current facility session">
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
    // 1. Mobile toggle
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

    // 2. Guided Demo Button
    document.getElementById('btn-topbar-guided-demo')?.addEventListener('click', () => {
      guidedDemo.start();
    });

    // 3. Demo Data Info Button
    document.getElementById('btn-demo-info')?.addEventListener('click', () => {
      demoInfoModal.open();
    });

    // 4. Facility Context Change
    const facilitySelect = document.getElementById('topbar-facility-select');
    if (facilitySelect) {
      facilitySelect.addEventListener('change', (e) => {
        config.setActiveFacility(e.target.value);
        const profile = config.getActiveFacilityProfile();
        sidebar.render();
        toast.info('Facility Context Switched', `Now operating as ${profile.name} at ${profile.facilityName}`);
        window.dispatchEvent(new CustomEvent('pharmasync:facility-changed', { detail: { facilityId: e.target.value } }));
      });
    }

    // 5. Mode Switch (Demo vs Live)
    const modeSwitchBtn = document.getElementById('mode-switch-btn');
    if (modeSwitchBtn) {
      modeSwitchBtn.addEventListener('click', async () => {
        if (config.DEMO_MODE) {
          // Attempting switch to Live API Mode
          toast.info('Connecting to Database...', `Checking Flask backend at ${config.API_BASE_URL}`);
          const health = await api.getHealth();

          if (!health.success) {
            toast.error('Cannot Connect to Database', `Flask backend on port 5000 is unreachable. Ensure 'python backend/run.py' is running before entering Live Mode.`);
            return;
          }

          config.setDemoMode(false);
          toast.success('Live Mode Activated', `Connected to database with ${health.data?.database || 'MongoDB'}. Real records loaded.`);
        } else {
          // Switch to Demo Mode
          config.setDemoMode(true);
          toast.info('Demo Mode Activated', 'Now using synthetic demonstration scenario for presentation.');
        }

        topbar.render(currentTitle);
        sidebar.render();
        window.dispatchEvent(new CustomEvent('pharmasync:mode-changed', { detail: { demoMode: config.DEMO_MODE } }));
      });
    }

    // 6. Reset Demo Data
    const resetBtn = document.getElementById('btn-quick-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (!config.DEMO_MODE) {
          toast.error('Restricted', 'Reset operation is only permitted in Demo Mode to protect real database records.');
          return;
        }

        if (confirm('Reset demonstration data back to original state?\n\nThis will restore the initial Indian healthcare dataset (Paracetamol surplus at Apex Central, shortage at Green Valley, and active transfer manifests). Real database records will NOT be touched.')) {
          api.resetDemoData();
          toast.success('Demo Data Reset', 'Demonstration dataset restored to clean baseline state.');
          window.dispatchEvent(new CustomEvent('pharmasync:data-reset'));
          // Re-render current page
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });
    }

    // 7. Sign Out
    document.getElementById('btn-topbar-logout')?.addEventListener('click', () => {
      auth.logout();
      window.location.hash = '#/landing';
    });

    // 8. Health Check in Live Mode
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
            label.textContent = 'Live Mode';
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
