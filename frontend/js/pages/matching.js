/**
 * PharmaSync CARE — Intelligent Supplier Matching & Route Preview
 * Multi-criteria ranking engine with Leaflet geographic corridor route visualization.
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { renderErrorState } from '../components/error-state.js';
import { toast } from '../components/toast.js';
import { modal } from '../components/modal.js';

let allShortages = [];
let facilitiesList = [];
let facilitiesMap = {};
let selectedShortageId = null;
let currentMatchData = null;
let matchingMapInstance = null;
let matchingRouteLine = null;
let candidateMarkers = [];
let selectedCandidateIndex = 0;

export async function render(container) {
  if (matchingMapInstance) {
    try { matchingMapInstance.remove(); } catch (e) {}
    matchingMapInstance = null;
  }

  const [shortagesRes, facRes] = await Promise.all([
    api.getShortages(),
    api.getFacilities()
  ]);

  if ((!shortagesRes.success && shortagesRes.isNetworkError) || (!facRes.success && facRes.isNetworkError)) {
    renderErrorState(container, {
      title: 'Backend API Offline',
      message: shortagesRes.error || facRes.error,
      onRetry: () => render(container)
    });
    return;
  }

  allShortages = (shortagesRes.data || []).filter(s => s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED');
  facilitiesList = facRes.data || [];
  facilitiesMap = facilitiesList.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});

  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const activeProfile = config.getActiveFacilityProfile();
  const myShortage = allShortages.find(s => s.facilityId === activeFacilityId);

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
          Algorithmic multi-criteria supplier matching with interactive geographic route visualization.
        </p>
      </div>
    </div>

    <!-- Active Facility Context Notice -->
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; font-size: 12.5px; color: var(--text-main); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
      <div>
        Operating Facility: <strong style="color: #FFFFFF;">${activeProfile.facilityName}</strong> &bull;
        Role: <strong style="color: var(--text-heading);">${activeProfile.name}</strong> (${activeProfile.role})
      </div>
      <div class="text-muted" style="font-size: 11.5px;">
        Select an open requisition below to rank compatible surplus stock and inspect courier route.
      </div>
    </div>

    ${allShortages.length === 0 ? `
      <div class="card" style="padding: 32px; text-align: center;">
        <div style="font-size: 16px; font-weight: bold; color: var(--text-heading); margin-bottom: 8px;">
          No Open Medicine Shortages
        </div>
        <p class="text-muted" style="margin-bottom: 16px; font-size: 13px;">
          All declared requisitions across the healthcare network are currently fulfilled.
        </p>
        <a href="#/shortages" class="btn btn-primary btn-sm">+ Declare Medicine Request</a>
      </div>
    ` : `
      <!-- Step 1: Select Requisition to Fulfill -->
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <div>
            <div class="card-title">1. Select Target Medicine Requisition</div>
            <div class="card-subtitle">Choose an open deficit ticket to evaluate matching donor inventory</div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 14px;">
          <select id="matching-shortage-select" class="form-select">
            ${allShortages.map(s => {
              const isMine = s.facilityId === activeFacilityId;
              return `
                <option value="${s.id}" ${s.id === selectedShortageId ? 'selected' : ''}>
                  ${isMine ? '★ [Our Facility] ' : ''}${s.id}: ${s.medicineName} (${s.unmetQuantity} units required) &mdash; ${s.facilityName}
                </option>
              `;
            }).join('')}
          </select>
        </div>

        <div id="target-request-details"></div>
      </div>

      <!-- Step 2: Integrated Matching Layout (Candidates + Route Map) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; align-items: start;">
        <!-- Left Column: Ranked Candidates -->
        <div>
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">2. Ranked Eligible Supplier Facilities</div>
                <div class="card-subtitle">Evaluated on formulation, surplus reserve buffer, shelf-life, and proximity</div>
              </div>
            </div>

            <div id="candidates-container"></div>
          </div>
        </div>

        <!-- Right Column: Interactive Map & Route Preview -->
        <div>
          <div class="card" style="position: sticky; top: 80px;">
            <div class="card-header" style="margin-bottom: 10px;">
              <div>
                <div class="card-title">Geographic Route &amp; Proximity Preview</div>
                <div class="card-subtitle" id="matching-map-subtitle">Bengaluru Urban Healthcare Cluster</div>
              </div>
              <span class="badge badge-fac-hospital" id="route-distance-badge">Route Estimate</span>
            </div>

            <div id="matching-leaflet-map" style="height: 440px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); overflow: hidden; background: #0b1120;"></div>

            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 10px;">
              <div style="display: flex; gap: 12px;">
                <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #F43F5E; margin-right: 4px;"></span>Requester</span>
                <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10B981; margin-right: 4px;"></span>Supplier</span>
              </div>
              <span>Straight-line Geodesic Estimate</span>
            </div>
          </div>
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
  selectedCandidateIndex = 0;
  renderTargetRequest();
  renderCandidates();
  initMatchingMap();
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
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">${shortage.id}</span>
          <button class="btn btn-outline btn-sm btn-delete-active-shortage" title="Cancel this request" style="padding: 2px 8px; font-size: 11px; color: var(--rose-400); border-color: rgba(244,63,94,0.35);">
            ✕ Cancel Request
          </button>
        </div>
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
          <span class="text-muted">Strength &amp; Form:</span>
          <div>${shortage.strength} &bull; ${shortage.dosageForm}</div>
        </div>
        <div>
          <span class="text-muted">Required Deadline:</span>
          <div style="font-family: var(--font-mono);">${shortage.requiredByDate}</div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('.btn-delete-active-shortage')?.addEventListener('click', () => handleDeleteShortage(shortage));
}

function renderCandidates() {
  const container = document.getElementById('candidates-container');
  if (!container) return;

  const candidates = currentMatchData?.candidates || [];

  if (candidates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No matching suppliers found</div>
        <div class="empty-state-desc">No network facilities currently hold surplus unreserved stock matching this formulation.</div>
        <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
          <a href="#/shortages" class="btn btn-outline btn-sm">&larr; Back to Requests</a>
          <button class="btn btn-sm btn-delete-empty-shortage" style="background: rgba(244,63,94,0.15); border: 1px solid rgba(244,63,94,0.4); color: var(--rose-400); font-weight: 600; padding: 6px 14px;">
            ✕ Cancel This Request
          </button>
        </div>
      </div>
    `;
    container.querySelector('.btn-delete-empty-shortage')?.addEventListener('click', () => handleDeleteShortage(currentMatchData?.shortage));
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${candidates.map((cand, idx) => {
        const isSelected = idx === selectedCandidateIndex;
        const reasons = cand.reasons || [
          `Formulation compatible with request parameters.`,
          `Transferable surplus of ${cand.availableSurplus} units verified above local reserve.`,
          `Remaining shelf life: ${cand.daysToExpiry} days (satisfies &ge; 45d policy).`
        ];

        return `
          <div class="candidate-card-item ${isSelected ? 'selected-card' : ''}" data-idx="${idx}" style="background: ${isSelected ? '#171717' : 'var(--bg-surface)'}; border: 1px solid ${isSelected ? '#FFFFFF' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 16px; cursor: pointer; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="font-size: 15px; color: var(--text-heading);">${cand.donorFacilityName}</strong>
                  <span class="badge badge-fac-hospital" style="font-size: 10px;">${cand.donorType || 'Healthcare Facility'}</span>
                </div>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                  Batch: <code style="color: #FFFFFF; font-family: var(--font-mono);">${cand.batchNumber}</code> &bull;
                  Available: <strong style="color: #FFFFFF;">${cand.availableSurplus} Units</strong> &bull;
                  Distance: <strong style="color: #FFFFFF;">${Math.round(cand.distanceKm * 10) / 10} km</strong>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge ${cand.isEligible ? 'badge-exp-safe' : 'badge-exp-critical'}" style="font-family: var(--font-mono); font-size: 11.5px;">
                  Score: ${Math.round(cand.matchScore || 90)}%
                </span>
                <button class="btn btn-primary btn-sm btn-create-direct-transfer" data-batch="${cand.batchId}" style="padding: 4px 12px; font-size: 11.5px; white-space: nowrap;">
                  Initiate Transfer &rarr;
                </button>
              </div>
            </div>

            <!-- Qualification Metrics Grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 11px; margin-bottom: 8px; background: #111111; padding: 8px 10px; border-radius: 4px; border: 1px solid #222222;">
              <div><span class="text-muted">Surplus:</span> <strong style="color: #FFFFFF;">${cand.availableSurplus} units</strong></div>
              <div><span class="text-muted">Shelf Life:</span> <strong style="color: #34D399;">${cand.daysToExpiry}d remaining</strong></div>
              <div><span class="text-muted">Transit:</span> <strong style="color: #FFFFFF;">${Math.round(cand.distanceKm * 10) / 10} km</strong></div>
              <div><span class="text-muted">Cold Chain:</span> <strong>${cand.coldChainRequired ? 'Required (2-8°C)' : 'Ambient'}</strong></div>
            </div>

            <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4;">
              <strong style="color: var(--text-main);">Qualification:</strong>
              ${reasons[0] || 'Meets criteria.'}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Attach card click to focus map
  container.querySelectorAll('.candidate-card-item').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-create-direct-transfer')) return;
      const idx = Number(card.dataset.idx);
      selectedCandidateIndex = idx;
      renderCandidates();
      updateMapRoute();
    });
  });

  // Attach initiate transfer modal
  container.querySelectorAll('.btn-create-direct-transfer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const batchId = e.currentTarget.dataset.batch;
      const cand = candidates.find(c => c.batchId === batchId);
      if (cand) openCreateTransferModal(cand);
    });
  });
}

function initMatchingMap() {
  const mapEl = document.getElementById('matching-leaflet-map');
  if (!mapEl || !window.L) return;

  if (matchingMapInstance) {
    try { matchingMapInstance.remove(); } catch (e) {}
    matchingMapInstance = null;
  }

  const shortage = currentMatchData?.shortage;
  const reqFac = facilitiesMap[shortage?.facilityId] || { coordinates: [12.9150, 77.5820] };
  const reqCoords = reqFac.coordinates || [12.9150, 77.5820];

  matchingMapInstance = window.L.map('matching-leaflet-map').setView(reqCoords, 12);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(matchingMapInstance);

  updateMapRoute();
}

function updateMapRoute() {
  if (!matchingMapInstance || !window.L || !currentMatchData) return;

  const shortage = currentMatchData.shortage;
  const candidates = currentMatchData.candidates || [];
  const reqFac = facilitiesMap[shortage.facilityId] || { name: shortage.facilityName, coordinates: [12.9150, 77.5820], type: 'Rural Health Centre' };
  const reqCoords = reqFac.coordinates || [12.9150, 77.5820];

  // Clear existing layers
  candidateMarkers.forEach(m => matchingMapInstance.removeLayer(m));
  candidateMarkers = [];
  if (matchingRouteLine) {
    matchingMapInstance.removeLayer(matchingRouteLine);
    matchingRouteLine = null;
  }

  // Add Requester marker
  const reqIcon = window.L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background: #F43F5E; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 0 12px rgba(244,63,94,0.7); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: bold; font-size: 11px;">REQ</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const reqMarker = window.L.marker(reqCoords, { icon: reqIcon }).addTo(matchingMapInstance);
  reqMarker.bindPopup(`<strong>Requester: ${reqFac.name}</strong><br/>Needed: ${shortage.unmetQuantity} units of ${shortage.medicineName}`);
  candidateMarkers.push(reqMarker);

  const bounds = [reqCoords];

  if (candidates.length > 0) {
    const activeCand = candidates[selectedCandidateIndex] || candidates[0];
    const donorFac = facilitiesMap[activeCand.donorFacilityId] || { coordinates: [12.9716, 77.5946] };
    const donorCoords = donorFac.coordinates || [12.9716, 77.5946];

    // Update distance badge
    const badgeEl = document.getElementById('route-distance-badge');
    const subtitleEl = document.getElementById('matching-map-subtitle');
    if (badgeEl) badgeEl.textContent = `${Math.round(activeCand.distanceKm * 10) / 10} km Transit`;
    if (subtitleEl) subtitleEl.textContent = `${donorFac.name || activeCand.donorFacilityName} ➔ ${reqFac.name}`;

    // Add Donor marker
    const donorIcon = window.L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background: #10B981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 0 12px rgba(16,185,129,0.7); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: bold; font-size: 11px;">DON</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const donorMarker = window.L.marker(donorCoords, { icon: donorIcon }).addTo(matchingMapInstance);
    donorMarker.bindPopup(`<strong>Supplier: ${donorFac.name}</strong><br/>Surplus: ${activeCand.availableSurplus} units<br/>Match: ${Math.round(activeCand.matchScore)}%`);
    candidateMarkers.push(donorMarker);
    bounds.push(donorCoords);

    // Draw route line
    matchingRouteLine = window.L.polyline([donorCoords, reqCoords], {
      color: '#38BDF8',
      weight: 3.5,
      dashArray: '6, 8',
      opacity: 0.9
    }).addTo(matchingMapInstance);
  }

  // Fit bounds nicely
  try {
    matchingMapInstance.fitBounds(bounds, { padding: [50, 50] });
    setTimeout(() => {
      if (matchingMapInstance) matchingMapInstance.invalidateSize();
    }, 200);
  } catch (e) {}
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
        <span class="form-help">Recipient requested ${shortage.unmetQuantity} units. Max donor surplus: ${candidate.availableSurplus} units.</span>
      </div>

      <div class="form-group">
        <label class="form-label" for="transfer-modal-notes">Order Notes / Transit Instructions</label>
        <input type="text" id="transfer-modal-notes" class="form-input" placeholder="e.g. Expedited courier dispatch" value="Direct matched transfer fulfilling ${shortage.id}" />
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

  const { close } = modal.open({ title: 'Create Medicine Transfer Manifest', content, footer });

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
      shortageId: shortage.id,
      senderFacilityId: candidate.donorFacilityId,
      senderFacilityName: candidate.donorFacilityName,
      recipientFacilityId: shortage.facilityId,
      recipientFacilityName: shortage.facilityName,
      batchId: candidate.batchId,
      batchNumber: candidate.batchNumber,
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

async function handleDeleteShortage(shortage) {
  if (!shortage) return;
  if (!confirm(`Are you sure you want to cancel and delete request ${shortage.id} for ${shortage.medicineName}?`)) {
    return;
  }
  try {
    const res = await api.deleteShortage(shortage.id);
    if (res && res.success) {
      toast.success('Request Cancelled', `Medicine request ${shortage.id} has been deleted.`);
      window.location.hash = '#/shortages';
    } else {
      toast.error('Delete Failed', res?.error || 'Could not delete request.');
    }
  } catch (err) {
    toast.error('Error', err.message || 'Error deleting request.');
  }
}
