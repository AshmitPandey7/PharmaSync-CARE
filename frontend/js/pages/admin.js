/**
 * PharmaSync CARE — System Settings & Administration Page
 * Clean dark theme, API connectivity testing, safety policies, and audit logs.
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { toast } from '../components/toast.js';

let auditLogs = [];
let usersList = [];

export async function render(container) {
  const [logsRes, usersRes] = await Promise.all([
    api.getAuditLogs(),
    api.getUsers()
  ]);

  auditLogs = logsRes.data || [];
  usersList = usersRes.data || [];

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          System Settings & Administration
        </h1>
        <p class="page-description">
          Manage system mode, backend API endpoints, user roles, safety policies, and audit logs.
        </p>
      </div>
    </div>

    <!-- Section 1: Backend Integration & Safety Configuration -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; margin-bottom: 24px;">
      <!-- Backend API Configuration Panel -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Backend API Connection</div>
            <div class="card-subtitle">Configure Flask REST endpoint target</div>
          </div>
          <span class="badge ${config.DEMO_MODE ? 'badge-exp-safe' : 'badge-fac-hospital'}" id="admin-mode-badge">
            ${config.DEMO_MODE ? 'Demo Mode Active' : 'Live Mode Active'}
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">Flask Base URL:</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="admin-api-url-input" class="form-input" value="${config.API_BASE_URL}" />
            <button class="btn btn-outline btn-sm" id="btn-save-api-url">Save</button>
          </div>
          <span class="form-help">Default: <code>http://127.0.0.1:5000/api</code></span>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" id="btn-test-backend-health">
            Test Backend Connection
          </button>
          <button class="btn btn-outline btn-sm" id="btn-toggle-demo-admin">
            ${config.DEMO_MODE ? 'Switch to Live Flask Mode' : 'Switch to Demo Mode'}
          </button>
        </div>

        <div id="admin-health-result" style="margin-top: 14px; font-size: 12px;"></div>
      </div>

      <!-- Regulatory Safety Thresholds Panel -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Medicine Safety Policies</div>
            <div class="card-subtitle">Safety rules and boundaries enforced by the system</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 12.5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
            <div>
              <strong style="color: var(--text-heading);">Minimum Remaining Shelf Life</strong>
              <div class="text-muted" style="font-size: 11px;">Batches expiring sooner are blocked from transfer</div>
            </div>
            <strong style="color: #FFFFFF; font-family: var(--font-mono);">45 Days</strong>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
            <div>
              <strong style="color: var(--text-heading);">Donor Safety Stock Cushion</strong>
              <div class="text-muted" style="font-size: 11px;">Percentage of monthly demand retained locally</div>
            </div>
            <strong style="color: #FFFFFF; font-family: var(--font-mono);">20% Cushion</strong>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
            <div>
              <strong style="color: var(--text-heading);">Local Transport Radius</strong>
              <div class="text-muted" style="font-size: 11px;">Sub-2 hour transport boundary</div>
            </div>
            <strong style="color: #FFFFFF; font-family: var(--font-mono);">15 km</strong>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: var(--text-heading);">Cold-Chain Standard</strong>
              <div class="text-muted" style="font-size: 11px;">Sensor temperature range for insulin & injectables</div>
            </div>
            <span class="badge badge-fac-hospital">2&deg;C &ndash; 8&deg;C</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Role-Based Access Control (RBAC) Matrix -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">User Roles & Access Permissions</div>
          <div class="card-subtitle">Active user credentials and role-based permissions</div>
        </div>
      </div>

      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>Assigned Facility</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${usersList.map(u => `
              <tr>
                <td><strong style="color: var(--text-heading);">${u.name}</strong></td>
                <td><code style="font-size: 11.5px; font-family: var(--font-mono);">${u.email}</code></td>
                <td>${u.facilityId}</td>
                <td><span class="badge badge-fac-hospital">${u.role}</span></td>
                <td>
                  <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${u.permissions.map(p => `
                      <span class="badge" style="background: var(--navy-800); color: var(--slate-300); font-size: 10px; font-family: var(--font-mono);">${p}</span>
                    `).join('')}
                  </div>
                </td>
                <td><span class="badge badge-exp-safe">${u.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 3: Immutable Audit Trail Log -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">System Audit Log</div>
          <div class="card-subtitle">Traceable record of stock changes, shortages declared, and transfers approved</div>
        </div>
        <div class="search-input-wrapper" style="max-width: 240px;">
          <input type="text" id="admin-search-logs" placeholder="Search audit logs..." />
        </div>
      </div>

      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action Event</th>
              <th>Target Entity</th>
              <th>Details & Notes</th>
              <th>Client IP</th>
            </tr>
          </thead>
          <tbody id="admin-audit-tbody">
            <!-- Dynamic rows -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderAuditLogs();
  setupAdminEvents();
}

function renderAuditLogs() {
  const tbody = document.getElementById('admin-audit-tbody');
  if (!tbody) return;

  const q = (document.getElementById('admin-search-logs')?.value || '').toLowerCase().trim();
  const filtered = auditLogs.filter(l =>
    !q || l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q) || l.details.toLowerCase().includes(q)
  );

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td style="font-family: var(--font-mono); font-size: 11.5px; white-space: nowrap; color: var(--text-muted);">${l.timestamp}</td>
      <td><strong style="color: var(--text-heading);">${l.user}</strong></td>
      <td style="font-size: 11.5px;" class="text-muted">${l.role}</td>
      <td><code class="audit-badge" style="color: #FFFFFF; font-weight: var(--font-semibold); background: #202020; border: 1px solid #303030; padding: 2px 6px; border-radius: 3px;">${l.action}</code></td>
      <td><span style="font-size: 12px; font-weight: var(--font-medium);">${l.entity}</span></td>
      <td style="font-size: 12px; color: var(--text-main);">${l.details}</td>
      <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${l.ipAddress}</td>
    </tr>
  `).join('');
}

function setupAdminEvents() {
  document.getElementById('admin-search-logs')?.addEventListener('input', renderAuditLogs);

  // Save API URL
  document.getElementById('btn-save-api-url')?.addEventListener('click', () => {
    const url = document.getElementById('admin-api-url-input')?.value.trim();
    if (url) {
      config.setApiBaseUrl(url);
      toast.success('Configuration Saved', `API Base URL updated to: ${config.API_BASE_URL}`);
    }
  });

  // Toggle Mode
  document.getElementById('btn-toggle-demo-admin')?.addEventListener('click', () => {
    const newMode = !config.DEMO_MODE;
    config.setDemoMode(newMode);
    toast.info('Mode Toggled', `Switched to ${newMode ? 'Demo Mode' : 'Live API Mode'}`);
    window.location.reload();
  });

  // Test Backend Health
  document.getElementById('btn-test-backend-health')?.addEventListener('click', async () => {
    const resultBox = document.getElementById('admin-health-result');
    resultBox.innerHTML = '<span class="text-muted">Pinging Flask API at ' + config.API_BASE_URL + '...</span>';

    const url = `${config.API_BASE_URL}/health`;
    try {
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (resp.ok) {
        const data = await resp.json();
        resultBox.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 10px; border-radius: var(--radius-sm); color: var(--emerald-400);">
            <strong>&#10003; Flask Server Online (HTTP 200)</strong><br/>
            Response: <code>${JSON.stringify(data)}</code>
          </div>
        `;
        toast.success('Connection Verified', 'Flask server responded successfully.');
      } else {
        resultBox.innerHTML = `
          <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); padding: 10px; border-radius: var(--radius-sm); color: var(--amber-400);">
            <strong>&#9888; Server returned HTTP ${resp.status}</strong>
          </div>
        `;
      }
    } catch (e) {
      resultBox.innerHTML = `
        <div style="background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.35); padding: 10px; border-radius: var(--radius-sm); color: var(--rose-400);">
          <strong>&#10007; Cannot Reach Flask Server</strong><br/>
          Error: ${e.message}<br/>
          <em>Make sure the Flask backend is running on ${config.API_BASE_URL} and Flask-CORS is enabled.</em>
        </div>
      `;
      toast.error('Connection Failed', 'Could not connect to Flask API.');
    }
  });
}
