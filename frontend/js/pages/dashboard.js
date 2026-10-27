/**
 * PharmaSync CARE — Multi-Facility Dashboard
 * Answers 3 essential operational questions cleanly:
 * 1. What medicine stock is available?
 * 2. Which facilities need medicine?
 * 3. Which transfers require attention?
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { renderErrorState } from '../components/error-state.js';
import { demoInfoModal } from '../components/demo-info-modal.js';

let currentScope = 'facility'; // 'facility' | 'network'

export async function render(container) {
  const [facilitiesRes, inventoryRes, shortagesRes, transfersRes] = await Promise.all([
    api.getFacilities(),
    api.getInventory(),
    api.getShortages(),
    api.getTransfers()
  ]);

  if ((!facilitiesRes.success && facilitiesRes.isNetworkError) || (!inventoryRes.success && inventoryRes.isNetworkError)) {
    renderErrorState(container, {
      title: 'Flask Database Server Offline',
      message: facilitiesRes.error || inventoryRes.error,
      onRetry: () => render(container)
    });
    return;
  }

  const facilities = facilitiesRes.data || [];
  const inventory = inventoryRes.data || [];
  const shortages = shortagesRes.data || [];
  const transfers = transfersRes.data || [];

  const facilitiesMap = facilities.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});
  const activeProfile = config.getActiveFacilityProfile();
  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const isDemo = config.DEMO_MODE;

  // Active facility specifics
  const myStock = inventory.filter(i => i.facilityId === activeFacilityId);
  const myStockUnits = myStock.reduce((sum, item) => sum + (item.availableQuantity || item.totalQuantity || 0), 0);
  const mySurplusUnits = myStock.reduce((sum, item) => sum + (item.eligibleSurplusQuantity || 0), 0);

  const myShortages = shortages.filter(s => s.facilityId === activeFacilityId && (s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED'));
  const myShortagesUnits = myShortages.reduce((sum, s) => sum + (s.unmetQuantity || 0), 0);

  const otherShortages = shortages.filter(s => s.facilityId !== activeFacilityId && (s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED'));

  const myOutgoing = transfers.filter(t => t.senderFacilityId === activeFacilityId);
  const myIncoming = transfers.filter(t => t.recipientFacilityId === activeFacilityId);

  const outgoingPending = myOutgoing.filter(t => ['REQUESTED', 'APPROVED'].includes(t.status));
  const incomingPending = myIncoming.filter(t => t.status === 'DISPATCHED');

  // Network wide numbers
  const totalBatches = inventory.length;
  const totalAvailableUnits = inventory.reduce((sum, item) => sum + (item.availableQuantity || item.totalQuantity || 0), 0);
  const totalSurplusUnits = inventory.reduce((sum, item) => sum + (item.eligibleSurplusQuantity || 0), 0);
  const openShortages = shortages.filter(s => s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED');
  const totalUnmetUnits = openShortages.reduce((sum, s) => sum + (s.unmetQuantity || 0), 0);
  const ongoingTransfers = transfers.filter(t => ['REQUESTED', 'APPROVED', 'DISPATCHED'].includes(t.status));

  // Scope specific values
  const isFacilityScope = currentScope === 'facility';
  const displayBatches = isFacilityScope ? myStock.length : totalBatches;
  const displayUnits = isFacilityScope ? myStockUnits : totalAvailableUnits;
  const displaySurplus = isFacilityScope ? mySurplusUnits : totalSurplusUnits;
  const displayRequests = isFacilityScope ? myShortages.length : openShortages.length;
  const displayRequestUnits = isFacilityScope ? myShortagesUnits : totalUnmetUnits;
  const displayTransfersCount = isFacilityScope ? (outgoingPending.length + incomingPending.length) : ongoingTransfers.length;

  container.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </h1>
        <p class="page-description">
          Healthcare medicine redistribution overview: available stock, clinical shortages, and active transfers.
        </p>
      </div>

      <div class="page-header-actions">
        <a href="#/inventory" class="btn btn-secondary btn-sm">+ Add Stock</a>
        <a href="#/shortages" class="btn btn-secondary btn-sm">+ Request Medicine</a>
        <a href="#/matching" class="btn btn-primary btn-sm">Find Medicines &rarr;</a>
      </div>
    </div>



    <!-- Active Facility Context Bar & View Scope -->
    <div class="context-bar">
      <div class="context-bar-left">
        <div class="context-pill-row">
          <span class="badge badge-fac-hospital">Active Context</span>
          <strong class="context-fac-name">${activeProfile.facilityName}</strong>
        </div>
        <div class="context-fac-meta">
          <span>${activeProfile.facilityType}</span> &bull;
          <span>Logged in as: <strong style="color: var(--text-main);">${activeProfile.name}</strong> (${activeProfile.role})</span>
        </div>
      </div>

      <div class="context-bar-right">
        <span class="scope-label">Scope:</span>
        <div class="btn-group">
          <button id="btn-scope-fac" class="btn btn-sm ${isFacilityScope ? 'btn-primary' : 'btn-outline'}">
            ${activeProfile.facilityName.split(' ')[0]} Focus
          </button>
          <button id="btn-scope-net" class="btn btn-sm ${!isFacilityScope ? 'btn-primary' : 'btn-outline'}">
            Entire Network
          </button>
        </div>
      </div>
    </div>

    <!-- Action Required Alerts (If any pending action) -->
    ${outgoingPending.length > 0 ? `
      <div class="alert-banner alert-warning">
        <div class="alert-content">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Action Required:</strong> You have <strong>${outgoingPending.length} outgoing transfer order(s)</strong> awaiting your approval or dispatch.
          </div>
        </div>
        <a href="#/transfers" class="btn btn-secondary btn-sm">Review &amp; Dispatch &rarr;</a>
      </div>
    ` : ''}

    ${incomingPending.length > 0 ? `
      <div class="alert-banner alert-success">
        <div class="alert-content">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <div>
            <strong>Shipment En Route:</strong> <strong>${incomingPending.length} incoming shipment(s)</strong> are in transit to ${activeProfile.facilityName}.
          </div>
        </div>
        <a href="#/transfers" class="btn btn-primary btn-sm">Mark Received &#10003;</a>
      </div>
    ` : ''}

    <!-- 3 Core Questions Dashboard Grid -->
    <div class="dashboard-qa-grid">
      <!-- Question 1: What medicine stock is available? -->
      <div class="qa-stat-card">
        <div class="qa-stat-header">
          <span class="qa-stat-badge">QUESTION 1</span>
          <span class="qa-stat-subtitle">What medicine stock is available?</span>
        </div>
        <div class="qa-stat-body">
          <div class="qa-stat-primary">${displayBatches} Batches</div>
          <div class="qa-stat-meta">
            <strong>${displayUnits.toLocaleString()} total units</strong> in storage
          </div>
          <div class="qa-stat-detail">
            <span class="text-emerald">&#10003; ${displaySurplus.toLocaleString()} surplus units</span> eligible for redistribution above safety buffer
          </div>
        </div>
        <div class="qa-stat-footer">
          <a href="#/inventory" class="qa-link">Manage Inventory &rarr;</a>
        </div>
      </div>

      <!-- Question 2: Which facilities need medicine? -->
      <div class="qa-stat-card">
        <div class="qa-stat-header">
          <span class="qa-stat-badge">QUESTION 2</span>
          <span class="qa-stat-subtitle">Which facilities need medicine?</span>
        </div>
        <div class="qa-stat-body">
          <div class="qa-stat-primary text-danger">${displayRequests} Shortages</div>
          <div class="qa-stat-meta">
            <strong>${displayRequestUnits.toLocaleString()} units required</strong> by healthcare clinics
          </div>
          <div class="qa-stat-detail">
            ${openShortages.length > 0 ? `Top need: <strong>${openShortages[0].medicineName}</strong> (${openShortages[0].facilityName})` : 'All requests currently fulfilled'}
          </div>
        </div>
        <div class="qa-stat-footer">
          <a href="#/shortages" class="qa-link">View Needed Medicines &rarr;</a>
        </div>
      </div>

      <!-- Question 3: Which transfers require attention? -->
      <div class="qa-stat-card">
        <div class="qa-stat-header">
          <span class="qa-stat-badge">QUESTION 3</span>
          <span class="qa-stat-subtitle">Which transfers require attention?</span>
        </div>
        <div class="qa-stat-body">
          <div class="qa-stat-primary text-amber">${displayTransfersCount} Active Orders</div>
          <div class="qa-stat-meta">
            ${isFacilityScope 
              ? `<strong>${outgoingPending.length} outgoing</strong> awaiting action &bull; <strong>${incomingPending.length} incoming</strong>` 
              : `<strong>${ongoingTransfers.length} transfers</strong> across redistribution network`}
          </div>
          <div class="qa-stat-detail">
            Strict chain of custody with timestamped audit logs
          </div>
        </div>
        <div class="qa-stat-footer">
          <a href="#/transfers" class="qa-link">Track Transfers &rarr;</a>
        </div>
      </div>
    </div>

    <!-- Section: Open Medicine Requests & Shortages -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">
            ${isFacilityScope ? `Medicine Shortages (${activeProfile.facilityName.split(' ')[0]} Focus)` : 'Open Medicine Shortages Across Network'}
          </div>
          <div class="card-subtitle">
            Healthcare facilities facing stockouts that require surplus redistribution
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <a href="#/shortages" class="btn btn-outline btn-sm">View All &rarr;</a>
        </div>
      </div>

      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Requesting Facility</th>
              <th>Medicine Needed</th>
              <th>Required Qty</th>
              <th>Urgency</th>
              <th>Required By</th>
              <th>Reason</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${(isFacilityScope ? shortages : openShortages).length === 0 ? `
              <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
                  No open medicine requests. All facilities currently have sufficient supply.
                </td>
              </tr>
            ` : (isFacilityScope ? shortages.slice(0, 5) : openShortages.slice(0, 5)).map(s => {
              const isMyFacility = s.facilityId === activeFacilityId;
              const fac = facilitiesMap[s.facilityId];
              return `
                <tr>
                  <td>
                    <strong style="color: var(--text-heading);">${s.facilityName}</strong>
                    <div class="text-muted" style="font-size: 11px;">${fac?.type || 'Healthcare Facility'}</div>
                  </td>
                  <td>
                    <strong>${s.medicineName}</strong>
                    <div class="text-muted" style="font-size: 11px;">${s.strength || ''} &bull; ${s.dosageForm || ''}</div>
                  </td>
                  <td>
                    <strong style="color: var(--rose-400); font-size: 13.5px; font-family: var(--font-mono);">${s.unmetQuantity} Units</strong>
                  </td>
                  <td>
                    <span class="badge badge-urgency-${(s.urgency || 'HIGH').toLowerCase()}">${s.urgency || 'HIGH'}</span>
                  </td>
                  <td style="font-family: var(--font-mono); font-size: 12px;">${s.requiredByDate}</td>
                  <td style="font-size: 12px; color: var(--text-muted); max-width: 220px;" class="truncate" title="${s.reason || ''}">
                    ${s.reason || 'General clinic deficit'}
                  </td>
                  <td>
                    <a href="#/matching?shortage=${s.id}" class="btn btn-primary btn-sm" style="font-size: 11px; padding: 4px 10px; white-space: nowrap;">
                      ${isMyFacility ? 'Find Supplier &rarr;' : 'Match / Donate &rarr;'}
                    </a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section: Active & Recent Transfer Orders -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">
            ${isFacilityScope ? `Transfer Orders (${activeProfile.facilityName.split(' ')[0]} Involving)` : 'Active Medicine Transfers Across Network'}
          </div>
          <div class="card-subtitle">
            Custody manifests tracking medicine shipments from donor to recipient
          </div>
        </div>
        <a href="#/transfers" class="btn btn-outline btn-sm">View All Transfers &rarr;</a>
      </div>

      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order Code</th>
              <th>Your Role</th>
              <th>Medicine</th>
              <th>Quantity</th>
              <th>Route (Supplier &rarr; Requester)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${(isFacilityScope ? (myOutgoing.concat(myIncoming)) : transfers).length === 0 ? `
              <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
                  No transfer orders found. Select a shortage to find a supplier and create a transfer.
                </td>
              </tr>
            ` : (isFacilityScope ? (myOutgoing.concat(myIncoming)).slice(0, 5) : transfers.slice(0, 5)).map(t => {
              const isSender = t.senderFacilityId === activeFacilityId;
              const isRecipient = t.recipientFacilityId === activeFacilityId;
              return `
                <tr>
                  <td>
                    <code style="font-weight: bold; color: var(--text-heading); font-family: var(--font-mono);">${t.transferCode}</code>
                  </td>
                  <td>
                    ${isSender 
                      ? `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.35);">Supplier</span>` 
                      : (isRecipient 
                        ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.35);">Recipient</span>` 
                        : `<span class="badge badge-fac-hospital">Observer</span>`)}
                  </td>
                  <td>
                    <strong>${t.medicineName}</strong>
                    <div class="text-muted" style="font-size: 11px;">${t.strength || ''}</div>
                  </td>
                  <td>
                    <strong style="color: #FFFFFF; font-size: 13.5px; font-family: var(--font-mono);">${t.quantity} Units</strong>
                  </td>
                  <td style="font-size: 12px;">
                    <span style="${isSender ? 'color: #FFFFFF; font-weight: bold;' : ''}">${t.senderFacilityName}</span>
                    <span style="color: var(--text-muted); font-weight: bold; margin: 0 4px;">&rarr;</span>
                    <span style="${isRecipient ? 'color: #FFFFFF; font-weight: bold;' : ''}">${t.recipientFacilityName}</span>
                  </td>
                  <td>
                    <span class="badge badge-status-${(t.status || 'REQUESTED').toLowerCase()}">${t.status}</span>
                  </td>
                  <td>
                    <a href="#/transfers" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 8px; white-space: nowrap;">
                      ${(isSender && t.status === 'REQUESTED') ? 'Approve &rarr;' : ((isSender && t.status === 'APPROVED') ? 'Dispatch &rarr;' : ((isRecipient && t.status === 'DISPATCHED') ? 'Mark Received &#10003;' : 'View'))}
                    </a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind Scope Toggles
  document.getElementById('btn-scope-fac')?.addEventListener('click', () => {
    currentScope = 'facility';
    render(container);
  });

  document.getElementById('btn-scope-net')?.addEventListener('click', () => {
    currentScope = 'network';
    render(container);
  });


}
