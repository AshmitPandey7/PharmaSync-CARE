/**
 * PharmaSync CARE — Find Medicines Page
 * Choose an open request, view facilities with matching eligible stock,
 * and create a transfer directly.
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { renderErrorState } from '../components/error-state.js';
import { toast } from '../components/toast.js';
import { modal } from '../components/modal.js';

let allShortages = [];
let selectedShortageId = null;
let currentMatchData = null;

export async function render(container) {
  const shortagesRes = await api.getShortages();

  if (!shortagesRes.success && shortagesRes.isNetworkError) {
    renderErrorState(container, {
      title: 'Flask API Offline',
      message: shortagesRes.error,
      onRetry: () => render(container)
    });
    return;
  }

  allShortages = (shortagesRes.data || []).filter(s => s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED');

  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const activeProfile = config.getActiveFacilityProfile();
  const myShortage = allShortages.find(s => s.facilityId === activeFacilityId);

  // Check URL query param for pre-selected shortage, or prioritize active facility's shortage
  const hash = window.location.hash;
  const matchParam = hash.match(/shortage=([^&]+)/);
  if (matchParam && matchParam[1] && allShortages.some(s => s.id === matchParam[1])) {
    selectedShortageId = matchParam[1];
  } else if (myShortage) {
    selectedShortageId = myShortage.id;
  } else if (allShortages.length > 0) {
    selectedShortageId = allShortages[0].id;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="6" cy="6" r="3"/>
            <circle cx="6" cy="18" r="3"/>
            <line x1="20" y1="4" x2="8.12" y2="15.88"/>
            <line x1="14.47" y1="14.48" x2="20" y2="20"/>
            <line x1="8.12" y1="8.12" x2="12" y2="12"/>
          </svg>
          Find Medicines
        </h1>
        <p class="page-description">
          Match an open medicine request with eligible facilities holding stock in the database and create a transfer.
        </p>
      </div>
    </div>

    <!-- Active Persona Context Notice -->
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; font-size: 12.5px; color: var(--text-main); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <div>
        Operating Facility: <strong style="color: #FFFFFF;">${activeProfile.facilityName}</strong> &bull;
        Logged in as: <strong style="color: var(--text-heading);">${activeProfile.name}</strong> (${activeProfile.role})
      </div>
      <div class="text-muted" style="font-size: 11.5px;">
        To request medicine for your facility, select your shortage below and initiate a transfer from any eligible donor.
      </div>
    </div>

    ${allShortages.length === 0 ? `
      <div class="card" style="padding: 32px; text-align: center;">
        <div style="font-size: 16px; font-weight: bold; color: var(--text-heading); margin-bottom: 8px;">
          No Open Medicine Requests
        </div>
        <p class="text-muted" style="margin-bottom: 16px; font-size: 13px;">
          All medicine requests are currently fulfilled. Create a new request to find matching suppliers.
        </p>
        <a href="#/shortages" class="btn btn-primary btn-sm">+ Create Medicine Request</a>
      </div>
    ` : `
      <!-- Step 1: Select Open Request -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div>
            <div class="card-title">1. Select Medicine Request to Fulfill</div>
            <div class="card-subtitle">Choose which open clinic request you want to match with suppliers</div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <select id="matching-shortage-select" class="form-select">
            ${allShortages.map(s => {
              const isMine = s.facilityId === activeFacilityId;
              return `
              <option value="${s.id}" ${s.id === selectedShortageId ? 'selected' : ''}>
                ${isMine ? '★ [Our Request] ' : ''}${s.id}: ${s.medicineName} (${s.unmetQuantity} units needed) &mdash; ${s.facilityName}
              </option>
            `;}).join('')}
          </select>
        </div>

        <!-- Selected Request Details Box -->
        <div id="target-request-details">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- Step 2: Available Suppliers with Matching Stock -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">2. Facilities Holding Matching Stock</div>
            <div class="card-subtitle">Facilities with unreserved, unexpired stock matching this exact medicine</div>
          </div>
        </div>

        <div id="candidates-container">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `}
  `;

  if (allShortages.length > 0) {
    setupMatcherEvents();
    loadMatchData();
  }
}

async function loadMatchData() {
  if (!selectedShortageId) return;

  const res = await api.findMatchCandidates(selectedShortageId);
  if (!res.success) {
    document.getElementById('candidates-container').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Unable to evaluate matches</div>
        <div class="empty-state-desc">${res.error}</div>
      </div>
    `;
    return;
  }

  currentMatchData = res.data;
  renderTargetRequest();
  renderCandidates();
}

function renderTargetRequest() {
  const container = document.getElementById('target-request-details');
  const shortage = currentMatchData?.shortage;
  if (!container || !shortage) return;

  container.innerHTML = `
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px; font-size: 13px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong style="color: var(--text-heading); font-size: 15px;">${shortage.medicineName}</strong>
          <span class="badge badge-urgency-${shortage.urgency.toLowerCase()}">${shortage.urgency}</span>
        </div>
        <span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">${shortage.id}</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; font-size: 12px; color: var(--text-main);">
        <div>
          <span class="text-muted">Requesting Facility:</span>
          <div><strong>${shortage.facilityName}</strong></div>
        </div>
        <div>
          <span class="text-muted">Quantity Needed:</span>
          <div><strong style="color: var(--rose-400); font-family: var(--font-mono); font-size: 13.5px;">${shortage.unmetQuantity} Units</strong></div>
        </div>
        <div>
          <span class="text-muted">Strength & Form:</span>
          <div>${shortage.strength} &bull; ${shortage.dosageForm}</div>
        </div>
        <div>
          <span class="text-muted">Needed By:</span>
          <div style="font-family: var(--font-mono);">${shortage.requiredByDate}</div>
        </div>
      </div>
    </div>
  `;
}

function renderCandidates() {
  const container = document.getElementById('candidates-container');
  if (!container) return;

  const candidates = currentMatchData?.candidates || [];

  if (candidates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No matching suppliers found</div>
        <div class="empty-state-desc">No network facilities currently hold surplus unreserved stock for this medicine.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${candidates.map(cand => {
        return `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div style="flex: 1; min-width: 260px;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <strong style="font-size: 15px; color: var(--text-heading);">${cand.donorFacilityName}</strong>
                <span class="badge badge-fac-hospital">${cand.donorFacilityType || 'Healthcare Facility'}</span>
                <span class="badge badge-exp-safe" style="font-family: var(--font-mono); font-size: 11px;">
                  Match Score: ${Math.round(cand.matchScore || 90)}%
                </span>
              </div>

              <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--text-muted);">
                <div>
                  <span>Batch:</span>
                  <code style="color: var(--text-main); font-family: var(--font-mono);">${cand.batchNumber}</code>
                </div>
                <div>
                  <span>Distance:</span>
                  <strong style="color: var(--text-main);">${Math.round(cand.distanceKm * 10) / 10} km</strong>
                </div>
                <div>
                  <span>Expires In:</span>
                  <strong style="color: var(--text-main);">${cand.daysToExpiry} Days</strong>
                </div>
                <div>
                  <span>Available Surplus:</span>
                  <strong style="color: #FFFFFF; font-family: var(--font-mono);">${cand.availableSurplus} Units</strong>
                </div>
              </div>
            </div>

            <div>
              <button class="btn btn-primary btn-sm btn-create-direct-transfer" data-batch="${cand.batchId}" style="white-space: nowrap; padding: 6px 14px;">
                Initiate Transfer &rarr;
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.btn-create-direct-transfer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const batchId = e.currentTarget.dataset.batch;
      const cand = candidates.find(c => c.batchId === batchId);
      if (cand) openCreateTransferModal(cand);
    });
  });
}

function openCreateTransferModal(candidate) {
  const shortage = currentMatchData.shortage;
  const suggestedQty = Math.min(candidate.availableSurplus, shortage.unmetQuantity);

  const content = `
    <form id="form-create-transfer" onsubmit="return false;">
      <div class="modal-info-card">
        <div class="modal-info-title">
          <span>${candidate.medicineName}</span>
          <span style="font-weight: normal; color: var(--text-muted);">(${candidate.strength})</span>
        </div>
        <div class="modal-info-meta">
          <span><strong>Supplier (Donor):</strong> ${candidate.donorFacilityName}</span>
          <span>&rarr;</span>
          <span><strong>Requester (Recipient):</strong> ${shortage.facilityName}</span>
        </div>
        <div class="modal-info-meta" style="margin-top: 4px;">
          <span><strong>Batch:</strong> <code style="color: #ffffff; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 4px;">${candidate.batchNumber}</code></span>
          <span>&bull;</span>
          <span><strong>Available Surplus:</strong> ${candidate.availableSurplus} units</span>
          <span>&bull;</span>
          <span><strong>Expires:</strong> In ${candidate.daysToExpiry} days</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="transfer-modal-qty">
          <span>Transfer Quantity (Units)</span>
          <span class="required-pill">Required</span>
        </label>
        <input type="number" id="transfer-modal-qty" class="form-input" min="1" max="${candidate.availableSurplus}" value="${suggestedQty}" required />
        <span class="form-help">Recipient requested ${shortage.unmetQuantity} units. Max supplier surplus: ${candidate.availableSurplus} units.</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="transfer-modal-notes">Order Notes / Clinical Instructions</label>
        <input type="text" id="transfer-modal-notes" class="form-input" placeholder="e.g. Expedited transfer for shortage ticket" value="Direct matched transfer fulfilling ${shortage.id}" />
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" id="btn-trf-modal-cancel">Cancel</button>
    <button type="button" class="btn btn-primary" id="btn-trf-modal-confirm">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Create Transfer Order
    </button>
  `;

  const { close } = modal.open({ title: 'Create Medicine Transfer', content, footer });

  document.getElementById('btn-trf-modal-cancel')?.addEventListener('click', close);
  
  const confirmBtn = document.getElementById('btn-trf-modal-confirm');
  confirmBtn?.addEventListener('click', async () => {
    const qty = Number(document.getElementById('transfer-modal-qty')?.value);
    const notes = document.getElementById('transfer-modal-notes')?.value.trim();

    if (!qty || qty <= 0 || qty > candidate.availableSurplus) {
      toast.error('Validation Error', `Please enter a quantity between 1 and ${candidate.availableSurplus} units.`);
      return;
    }

    const payload = {
      senderFacilityId: candidate.donorFacilityId,
      senderFacilityName: candidate.donorFacilityName,
      recipientFacilityId: shortage.facilityId,
      recipientFacilityName: shortage.facilityName,
      batchId: candidate.batchId,
      medicineName: candidate.medicineName,
      strength: candidate.strength,
      quantity: qty,
      urgency: shortage.urgency,
      notes: notes || `Direct matched transfer for shortage ${shortage.id}`
    };

    try {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = 'Creating...';

      const res = await api.createTransfer(payload);
      if (res && res.success) {
        toast.success(
          'Transfer Created', 
          `Order ${res.data.transferCode || 'TRF'} created! Switch to ${candidate.donorFacilityName} in the topbar to review & dispatch.`
        );
        close();
        window.location.hash = '#/transfers';
      } else {
        toast.error('Error', res?.error || 'Failed to create transfer order.');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Create Transfer Order';
      }
    } catch (err) {
      console.error('Error creating transfer:', err);
      toast.error('Error', err.message || 'An error occurred while creating transfer.');
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = 'Create Transfer Order';
    }
  });
}

function setupMatcherEvents() {
  document.getElementById('matching-shortage-select')?.addEventListener('change', (e) => {
    selectedShortageId = e.target.value;
    loadMatchData();
  });
}
