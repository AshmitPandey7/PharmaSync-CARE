/**
 * PharmaSync CARE — Medicine Needed (Requests) Page
 * View open facility shortages and create new medicine requests.
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { renderErrorState } from '../components/error-state.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { exportToCSV } from '../components/export-csv.js';

let shortagesList = [];
let facilitiesList = [];
let facilitiesMap = {};
let shortagesTab = 'all'; // 'mine' | 'others' | 'all'

export async function render(container) {
  const [shortagesRes, facRes] = await Promise.all([
    api.getShortages(),
    api.getFacilities()
  ]);

  if ((!shortagesRes.success && shortagesRes.isNetworkError) || (!facRes.success && facRes.isNetworkError)) {
    renderErrorState(container, {
      title: 'Flask API Offline',
      message: shortagesRes.error || facRes.error,
      onRetry: () => render(container)
    });
    return;
  }

  shortagesList = shortagesRes.data || [];
  facilitiesList = facRes.data || [];
  facilitiesMap = facilitiesList.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});

  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const activeProfile = config.getActiveFacilityProfile();
  const myShortages = shortagesList.filter(s => s.facilityId === activeFacilityId);
  const otherShortages = shortagesList.filter(s => s.facilityId !== activeFacilityId);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rose-400)" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Medicine Needed
        </h1>
        <p class="page-description">
          Open requests submitted by healthcare facilities experiencing medicine stock shortages.
        </p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" id="btn-export-shortages">
          Export CSV
        </button>
        <button class="btn btn-primary btn-sm" id="btn-create-request">
          + Create Medicine Request
        </button>
      </div>
    </div>

    <!-- Active Facility Filter Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <button class="btn btn-sm ${shortagesTab === 'mine' ? 'btn-primary' : 'btn-outline'}" id="tab-sht-mine">
        Requests by ${activeProfile.facilityName.split(' ')[0]} (Our Shortages: ${myShortages.length})
      </button>
      <button class="btn btn-sm ${shortagesTab === 'others' ? 'btn-primary' : 'btn-outline'}" id="tab-sht-others">
        Requests from Other Clinics (${otherShortages.length})
      </button>
      <button class="btn btn-sm ${shortagesTab === 'all' ? 'btn-primary' : 'btn-outline'}" id="tab-sht-all">
        All Network Requests (${shortagesList.length})
      </button>
    </div>

    <!-- Search & Filter Bar -->
    <div class="table-container">
      <div class="table-toolbar">
        <div class="table-toolbar-left" style="flex: 1; display: flex; flex-wrap: wrap; gap: 10px;">
          <div class="search-input-wrapper" style="min-width: 240px; flex: 1;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="sht-search" placeholder="Search by medicine, facility, or request ID..." />
          </div>

          <select id="sht-filter-urgency" class="filter-select">
            <option value="ALL">All Urgencies</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="HIGH">High</option>
            <option value="ROUTINE">Routine</option>
          </select>

          <select id="sht-filter-status" class="filter-select">
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open (Unmet)</option>
            <option value="PARTIALLY_MATCHED">Partially Matched</option>
            <option value="FULFILLED">Fulfilled</option>
          </select>
        </div>
      </div>

      <!-- Straightforward Table -->
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Requesting Facility</th>
              <th>Medicine Needed</th>
              <th>Quantity Needed</th>
              <th>Urgency</th>
              <th>Needed By Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="shortages-table-body">
            <!-- Dynamic rows -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderTableRows();
  setupEvents();
}

function renderTableRows() {
  const tbody = document.getElementById('shortages-table-body');
  if (!tbody) return;

  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const q = (document.getElementById('sht-search')?.value || '').toLowerCase().trim();
  const urgencyVal = document.getElementById('sht-filter-urgency')?.value || 'ALL';
  const statusVal = document.getElementById('sht-filter-status')?.value || 'ALL';

  let list = [...shortagesList];
  if (shortagesTab === 'mine') {
    list = list.filter(s => s.facilityId === activeFacilityId);
  } else if (shortagesTab === 'others') {
    list = list.filter(s => s.facilityId !== activeFacilityId);
  }

  const filtered = list.filter(s => {
    const matchQ = !q ||
      s.id.toLowerCase().includes(q) ||
      s.medicineName.toLowerCase().includes(q) ||
      (s.facilityName && s.facilityName.toLowerCase().includes(q));

    const matchU = urgencyVal === 'ALL' || s.urgency === urgencyVal;
    const matchS = statusVal === 'ALL' || s.status === statusVal;

    return matchQ && matchU && matchS;
  });

  if (filtered.length === 0) {
    const emptyMsg = shortagesTab === 'mine'
      ? `Our facility has no open medicine requests logged at this time.`
      : `No medicine requests match your criteria.`;

    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-state-title">No medicine requests found</div>
            <div class="empty-state-desc">${emptyMsg}</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const isMyFacility = s.facilityId === activeFacilityId;
    const fac = facilitiesMap[s.facilityId];
    const facType = fac?.type || 'Healthcare Facility';

    const statusBadgeClass = {
      OPEN: 'badge-exp-critical',
      PARTIALLY_MATCHED: 'badge-exp-warning',
      FULFILLED: 'badge-exp-safe'
    }[s.status] || 'badge-exp-warning';

    const statusLabel = {
      OPEN: 'Open',
      PARTIALLY_MATCHED: 'Partially Matched',
      FULFILLED: 'Fulfilled'
    }[s.status] || s.status;

    return `
      <tr>
        <td>
          <code style="font-weight: bold; color: var(--text-heading); font-family: var(--font-mono);">${s.id}</code>
        </td>
        <td>
          <strong style="${isMyFacility ? 'color: #FFFFFF;' : ''}">${s.facilityName}</strong>
          ${isMyFacility ? '<span class="badge badge-exp-safe" style="margin-left: 6px; font-size: 10px;">Our Facility</span>' : ''}
          <div class="text-muted" style="font-size: 11px;">${facType}</div>
        </td>
        <td>
          <strong style="color: var(--text-heading); font-size: 13.5px;">${s.medicineName}</strong>
          <div class="text-muted" style="font-size: 11px;">${s.strength} &bull; ${s.dosageForm}</div>
        </td>
        <td>
          <strong style="color: var(--rose-400); font-size: 14.5px; font-family: var(--font-mono);">${s.unmetQuantity}</strong>
          <span class="text-muted" style="font-size: 11px;"> / ${s.requiredQuantity} units</span>
        </td>
        <td>
          <span class="badge badge-urgency-${s.urgency.toLowerCase()}">${s.urgency}</span>
        </td>
        <td style="font-family: var(--font-mono); font-size: 12px;">${s.requiredByDate}</td>
        <td>
          <span class="badge ${statusBadgeClass}">${statusLabel}</span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <a href="#/matching?shortage=${s.id}" class="btn btn-primary btn-sm" style="font-size: 11px; padding: 4px 10px; white-space: nowrap;">
              ${isMyFacility ? 'Find Supplier &rarr;' : 'Match & Fulfill &rarr;'}
            </a>
            ${(s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED') ? `
            <button class="btn btn-outline btn-sm btn-delete-shortage" data-id="${s.id}" data-name="${s.medicineName}" title="Cancel and delete this medicine request" style="font-size: 11px; padding: 4px 8px; color: var(--rose-400); border-color: rgba(244,63,94,0.35);">
              ✕
            </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function setupEvents() {
  document.getElementById('sht-search')?.addEventListener('input', renderTableRows);
  document.getElementById('sht-filter-urgency')?.addEventListener('change', renderTableRows);
  document.getElementById('sht-filter-status')?.addEventListener('change', renderTableRows);

  document.getElementById('tab-sht-mine')?.addEventListener('click', () => {
    shortagesTab = 'mine';
    updateShtTabs();
    renderTableRows();
  });

  document.getElementById('tab-sht-others')?.addEventListener('click', () => {
    shortagesTab = 'others';
    updateShtTabs();
    renderTableRows();
  });

  document.getElementById('tab-sht-all')?.addEventListener('click', () => {
    shortagesTab = 'all';
    updateShtTabs();
    renderTableRows();
  });

  document.getElementById('btn-create-request')?.addEventListener('click', openCreateRequestModal);

  document.getElementById('shortages-table-body')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-shortage');
    if (!btn) return;
    const sId = btn.getAttribute('data-id');
    const sName = btn.getAttribute('data-name');
    if (!confirm(`Are you sure you want to cancel and delete request ${sId} for ${sName}?`)) {
      return;
    }
    try {
      btn.disabled = true;
      btn.textContent = '...';
      const res = await api.deleteShortage(sId);
      if (res && res.success) {
        toast.success('Request Deleted', `Medicine request ${sId} has been removed.`);
        const updated = await api.getShortages();
        shortagesList = updated.data || [];
        renderTableRows();
      } else {
        toast.error('Delete Failed', res?.error || 'Could not delete request.');
        btn.disabled = false;
        btn.textContent = '✕';
      }
    } catch (err) {
      toast.error('Delete Error', err.message || 'Error deleting request.');
      btn.disabled = false;
      btn.textContent = '✕';
    }
  });

  document.getElementById('btn-export-shortages')?.addEventListener('click', () => {
    exportToCSV('PharmaSync_Medicine_Requests', shortagesList.map(s => ({
      RequestID: s.id,
      FacilityName: s.facilityName,
      MedicineName: s.medicineName,
      Strength: s.strength,
      DosageForm: s.dosageForm,
      RequiredQuantity: s.requiredQuantity,
      UnmetQuantity: s.unmetQuantity,
      Urgency: s.urgency,
      RequiredByDate: s.requiredByDate,
      Status: s.status
    })));
    toast.success('Export Complete', 'Medicine requests exported in CSV format.');
  });
}

function updateShtTabs() {
  ['mine', 'others', 'all'].forEach(t => {
    const btn = document.getElementById(`tab-sht-${t}`);
    if (btn) {
      if (shortagesTab === t) {
        btn.className = 'btn btn-sm btn-primary';
      } else {
        btn.className = 'btn btn-sm btn-outline';
      }
    }
  });
}

function openCreateRequestModal() {
  const activeFacilityId = config.ACTIVE_FACILITY_ID;

  const content = `
    <form id="form-create-request" onsubmit="return false;">
      <div class="form-group">
        <label class="form-label" for="req-modal-facility">Which facility needs medicine? <span class="required-pill">Required</span></label>
        <select id="req-modal-facility" class="form-select">
          ${facilitiesList.map(f => `<option value="${f.id}" ${f.id === activeFacilityId ? 'selected' : ''}>${f.name} (${f.type})</option>`).join('')}
        </select>
        <span class="form-help">Select the hospital or clinic currently facing the shortage</span>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="req-modal-med">Medicine Needed <span class="required-pill">Required</span></label>
          <input type="text" id="req-modal-med" class="form-input" placeholder="e.g. Ceftriaxone Injection" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="req-modal-generic">Generic Composition</label>
          <input type="text" id="req-modal-generic" class="form-input" placeholder="e.g. Ceftriaxone Sodium" />
        </div>
      </div>

      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label" for="req-modal-strength">Strength / Spec <span class="required-pill">Required</span></label>
          <input type="text" id="req-modal-strength" class="form-input" placeholder="e.g. 1g Vial" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="req-modal-dosage">Dosage Form</label>
          <select id="req-modal-dosage" class="form-select">
            <option value="Injectable">Injectable</option>
            <option value="Oral Solid">Oral Solid</option>
            <option value="IV Fluid">IV Fluid</option>
            <option value="Oral Liquid">Oral Liquid</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="req-modal-qty">Quantity (Units) <span class="required-pill">Required</span></label>
          <input type="number" id="req-modal-qty" class="form-input" min="1" placeholder="100" required />
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="req-modal-urgency">Urgency Tier <span class="required-pill">Required</span></label>
          <select id="req-modal-urgency" class="form-select">
            <option value="EMERGENCY">Emergency (ICU / Critical Stockout)</option>
            <option value="HIGH" selected>High (Inpatient Ward Needed)</option>
            <option value="ROUTINE">Routine (Outpatient Replenishment)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="req-modal-deadline">Needed By Date <span class="required-pill">Required</span></label>
          <input type="date" id="req-modal-deadline" class="form-input" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="req-modal-reason">Reason / Clinical Context</label>
        <textarea id="req-modal-reason" class="form-textarea" rows="2" placeholder="e.g. Inpatient surge in pediatric ward due to seasonal outbreak."></textarea>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" id="btn-req-cancel">Cancel</button>
    <button type="button" class="btn btn-primary" id="btn-req-submit">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Publish Request
    </button>
  `;

  const { close } = modal.open({ title: 'Create Medicine Request', content, footer });

  // Default deadline: 5 days from today
  const defDate = new Date();
  defDate.setDate(defDate.getDate() + 5);
  const deadlineInput = document.getElementById('req-modal-deadline');
  if (deadlineInput) deadlineInput.value = defDate.toISOString().split('T')[0];

  document.getElementById('btn-req-cancel')?.addEventListener('click', close);
  
  const submitBtn = document.getElementById('btn-req-submit');
  submitBtn?.addEventListener('click', async () => {
    const medName = document.getElementById('req-modal-med')?.value.trim();
    const strength = document.getElementById('req-modal-strength')?.value.trim();
    const qty = Number(document.getElementById('req-modal-qty')?.value);
    const deadline = document.getElementById('req-modal-deadline')?.value;
    const facilityId = document.getElementById('req-modal-facility')?.value;

    if (!medName || !strength || isNaN(qty) || qty <= 0 || !deadline) {
      toast.error('Validation Error', 'Please complete all required fields with valid quantities.');
      return;
    }

    const payload = {
      facilityId,
      medicineName: medName,
      genericName: document.getElementById('req-modal-generic')?.value.trim() || medName,
      strength,
      dosageForm: document.getElementById('req-modal-dosage')?.value,
      requiredQuantity: qty,
      urgency: document.getElementById('req-modal-urgency')?.value,
      requiredByDate: deadline,
      reason: document.getElementById('req-modal-reason')?.value.trim()
    };

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Publishing...';

      const res = await api.createShortage(payload);
      if (res && res.success) {
        toast.success('Request Created', `Request ${res.data.id} published to network.`);
        close();
        const updated = await api.getShortages();
        shortagesList = updated.data || [];
        renderTableRows();
      } else {
        toast.error('Failed to Create', res?.error || 'Could not create request.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Publish Request';
      }
    } catch (err) {
      console.error('Error creating request:', err);
      toast.error('Error', err.message || 'An error occurred while publishing request.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Publish Request';
    }
  });
}
