/**
 * PharmaSync CARE — Multi-Facility Dashboard
 * Provides customized perspective for the active facility and seamless toggle to network-wide view.
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { renderErrorState } from '../components/error-state.js';

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
      title: 'Flask API Offline',
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

  // Active facility specifics
  const myStock = inventory.filter(i => i.facilityId === activeFacilityId);
  const myStockUnits = myStock.reduce((sum, item) => sum + (item.availableQuantity || item.totalQuantity || 0), 0);

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
  const openShortages = shortages.filter(s => s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED');
  const totalUnmetUnits = openShortages.reduce((sum, s) => sum + (s.unmetQuantity || 0), 0);
  const ongoingTransfers = transfers.filter(t => ['REQUESTED', 'APPROVED', 'DISPATCHED'].includes(t.status));
  const completedTransfers = transfers.filter(t => t.status === 'RECEIVED');

  // Scope specific values
  const isFacilityScope = currentScope === 'facility';
  const displayBatches = isFacilityScope ? myStock.length : totalBatches;
  const displayUnits = isFacilityScope ? myStockUnits : totalAvailableUnits;
  const displayRequests = isFacilityScope ? myShortages.length : openShortages.length;
  const displayRequestUnits = isFacilityScope ? myShortagesUnits : totalUnmetUnits;
  const displayTransfersCount = isFacilityScope ? (myOutgoing.length + myIncoming.length) : ongoingTransfers.length;

  container.innerHTML = `
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </h1>
        <p class="page-description">
          Overview of available medicine stock, open requests, and active facility transfers.
        </p>
      </div>
      <div class="page-header-actions">
        <a href="#/inventory" class="btn btn-secondary btn-sm">
          + Add Stock
        </a>
        <a href="#/shortages" class="btn btn-secondary btn-sm">
          + Request Medicine
        </a>
        <a href="#/matching" class="btn btn-primary btn-sm">
          Find Medicines &rarr;
        </a>
      </div>
    </div>

    <!-- Active Facility Context & Scope Bar -->
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
          <span class="badge badge-fac-hospital" style="font-size: 10px; font-weight: 700; text-transform: uppercase;">Active Facility Context</span>
          <strong style="font-size: 16px; color: #FFFFFF;">${activeProfile.facilityName}</strong>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          <span>${activeProfile.facilityType}</span> &bull; 
          <span>Logged in as: <strong style="color: var(--text-main);">${activeProfile.name}</strong> (${activeProfile.role})</span>
        </div>
      </div>

      <div style="display: flex; gap: 8px; align-items: center;">
        <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">View Scope:</span>
        <div class="btn-group" style="display: flex; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden;">
          <button id="btn-scope-fac" class="btn btn-sm ${isFacilityScope ? 'btn-primary' : 'btn-outline'}" style="border: none; border-radius: 0; padding: 5px 12px; font-size: 11.5px;">
            ${activeProfile.facilityName.split(' ')[0]} Focus
          </button>
          <button id="btn-scope-net" class="btn btn-sm ${!isFacilityScope ? 'btn-primary' : 'btn-outline'}" style="border: none; border-radius: 0; padding: 5px 12px; font-size: 11.5px;">
            Entire Network
          </button>
        </div>
      </div>
    </div>

    <!-- Action Notices / Clinical Alerts for Active Facility -->
    ${outgoingPending.length > 0 ? `
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--amber-400);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <strong>Action Required:</strong> You have <strong>${outgoingPending.length} outgoing transfer order(s)</strong> awaiting your approval or dispatch.
          </div>
        </div>
        <a href="#/transfers" class="btn btn-primary btn-sm" style="font-size: 11px; padding: 4px 10px; background: #F59E0B; border-color: #F59E0B; color: #000000; font-weight: bold;">
          Review & Dispatch &rarr;
        </a>
      </div>
    ` : ''}

    ${incomingPending.length > 0 ? `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--emerald-400);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <div>
            <strong>Shipment En Route:</strong> <strong>${incomingPending.length} incoming shipment(s)</strong> are currently in transit to ${activeProfile.facilityName}.
          </div>
        </div>
        <a href="#/transfers" class="btn btn-primary btn-sm" style="font-size: 11px; padding: 4px 10px; background: #10B981; border-color: #10B981; color: #000000; font-weight: bold;">
          Mark Received &#10003;
        </a>
      </div>
    ` : ''}

    <!-- 5-Step Workflow Guide -->
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 18px; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">
        Medicine Redistribution Workflow
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 13px;">
        <a href="#/inventory" style="color: var(--text-heading); text-decoration: none; display: flex; align-items: center; gap: 8px;">
          <span style="background: #202020; color: #FFFFFF; border: 1px solid #303030; width: 22px; height: 22px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; font-family: var(--font-mono);">1</span>
          <strong>Add Stock</strong>
        </a>
        <span style="color: var(--text-muted);">&rarr;</span>

        <a href="#/shortages" style="color: var(--text-heading); text-decoration: none; display: flex; align-items: center; gap: 8px;">
          <span style="background: #202020; color: #FFFFFF; border: 1px solid #303030; width: 22px; height: 22px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; font-family: var(--font-mono);">2</span>
          <strong>Create Request</strong>
        </a>
        <span style="color: var(--text-muted);">&rarr;</span>

        <a href="#/matching" style="color: var(--text-heading); text-decoration: none; display: flex; align-items: center; gap: 8px;">
          <span style="background: #202020; color: #FFFFFF; border: 1px solid #303030; width: 22px; height: 22px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; font-family: var(--font-mono);">3</span>
          <strong>Find Supplier</strong>
        </a>
        <span style="color: var(--text-muted);">&rarr;</span>

        <a href="#/transfers" style="color: var(--text-heading); text-decoration: none; display: flex; align-items: center; gap: 8px;">
          <span style="background: #202020; color: #FFFFFF; border: 1px solid #303030; width: 22px; height: 22px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; font-family: var(--font-mono);">4</span>
          <strong>Create Transfer</strong>
        </a>
        <span style="color: var(--text-muted);">&rarr;</span>

        <a href="#/transfers" style="color: var(--text-heading); text-decoration: none; display: flex; align-items: center; gap: 8px;">
          <span style="background: #202020; color: var(--status-success); border: 1px solid var(--status-success-border); width: 22px; height: 22px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; font-family: var(--font-mono);">5</span>
          <strong>Mark Received</strong>
        </a>
      </div>
    </div>

    <!-- 3 Simple Counts (Context-Aware) -->
    <div class="stat-card-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
      <div class="stat-card stat-teal">
        <div class="stat-content">
          <span class="stat-label">${isFacilityScope ? `Stock at ${activeProfile.facilityName.split(' ')[0]}` : 'Network Medicine Stock'}</span>
          <span class="stat-value">${displayBatches} Batches</span>
          <span class="stat-meta">${displayUnits.toLocaleString()} units ${isFacilityScope ? 'in our storage' : 'across all facilities'}</span>
        </div>
      </div>

      <div class="stat-card stat-rose">
        <div class="stat-content">
          <span class="stat-label">${isFacilityScope ? `Requests by ${activeProfile.facilityName.split(' ')[0]}` : 'Open Network Requests'}</span>
          <span class="stat-value">${displayRequests} Requests</span>
          <span class="stat-meta text-danger">${displayRequestUnits.toLocaleString()} units ${isFacilityScope ? 'needed by our facility' : 'needed by clinics'}</span>
        </div>
      </div>

      <div class="stat-card stat-emerald">
        <div class="stat-content">
          <span class="stat-label">${isFacilityScope ? `Transfers Involving Us` : 'Transfers in Progress'}</span>
          <span class="stat-value">${displayTransfersCount} Active</span>
          <span class="stat-meta text-success">
            ${isFacilityScope 
              ? `${myOutgoing.length} Outgoing (Donor) &bull; ${myIncoming.length} Incoming (Requester)`
              : `&#10003; ${completedTransfers.length} completed & verified`}
          </span>
        </div>
      </div>
    </div>

    <!-- Action Section 1: Open Medicine Requests -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">
            ${isFacilityScope ? `Medicine Shortages & Requests (${activeProfile.facilityName.split(' ')[0]} Focus)` : 'Open Medicine Requests Across Network'}
          </div>
          <div class="card-subtitle">
            ${isFacilityScope 
              ? 'Requests declared by our facility and requests from other clinics we can assist with' 
              : 'Clinics that currently need medicine from other facilities'}
          </div>
        </div>
        <a href="#/shortages" class="btn btn-outline btn-sm">View All Requests &rarr;</a>
      </div>

      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Requesting Facility</th>
              <th>Relationship</th>
              <th>Medicine Needed</th>
              <th>Quantity Needed</th>
              <th>Urgency</th>
              <th>Needed By</th>
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
            ` : (isFacilityScope ? shortages.slice(0, 6) : openShortages.slice(0, 5)).map(s => {
              const isMyFacility = s.facilityId === activeFacilityId;
              const fac = facilitiesMap[s.facilityId];
              return `
                <tr>
                  <td>
                    <strong style="color: var(--text-heading);">${s.facilityName}</strong>
                    <div class="text-muted" style="font-size: 11px;">${fac?.type || 'Healthcare Facility'}</div>
                  </td>
                  <td>
                    ${isMyFacility 
                      ? `<span class="badge badge-exp-safe" style="font-weight: 700;">Our Request</span>` 
                      : `<span class="badge badge-fac-hospital">Partner Clinic</span>`}
                  </td>
                  <td>
                    <strong>${s.medicineName}</strong>
                    <div class="text-muted" style="font-size: 11px;">${s.strength} &bull; ${s.dosageForm}</div>
                  </td>
                  <td>
                    <strong style="color: var(--rose-400); font-size: 14px;">${s.unmetQuantity} Units</strong>
                  </td>
                  <td>
                    <span class="badge badge-urgency-${s.urgency.toLowerCase()}">${s.urgency}</span>
                  </td>
                  <td style="font-family: var(--font-mono); font-size: 12px;">${s.requiredByDate}</td>
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

    <!-- Action Section 2: Ongoing Transfers -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">
            ${isFacilityScope ? `Transfers for ${activeProfile.facilityName}` : 'Recent & Ongoing Transfers'}
          </div>
          <div class="card-subtitle">
            ${isFacilityScope 
              ? 'Shipments where your facility is the supplier (sender) or recipient (requester)' 
              : 'Medicine shipments between sender and receiver facilities'}
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
                  No transfer orders found for ${isFacilityScope ? activeProfile.facilityName : 'the network'}. Create a transfer from the "Find Medicines" page.
                </td>
              </tr>
            ` : (isFacilityScope ? (myOutgoing.concat(myIncoming)).slice(0, 6) : transfers.slice(0, 6)).map(t => {
              const isSender = t.senderFacilityId === activeFacilityId;
              const isRecipient = t.recipientFacilityId === activeFacilityId;
              return `
              <tr>
                <td>
                  <code style="font-weight: bold; color: var(--text-heading); font-family: var(--font-mono);">${t.transferCode}</code>
                </td>
                <td>
                  ${isSender 
                    ? `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.35);">Supplier (You)</span>` 
                    : (isRecipient 
                      ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.35);">Recipient (You)</span>` 
                      : `<span class="badge badge-fac-hospital">Observer</span>`)}
                </td>
                <td>
                  <strong>${t.medicineName}</strong>
                  <div class="text-muted" style="font-size: 11px;">${t.strength}</div>
                </td>
                <td>
                  <strong style="color: #FFFFFF; font-size: 13.5px; font-family: var(--font-mono);">${t.quantity} Units</strong>
                </td>
                <td style="font-size: 12px;">
                  <span style="${isSender ? 'color: #FFFFFF; font-weight: bold;' : ''}">${t.senderFacilityName}</span>
                  <span style="color: var(--text-muted); font-weight: bold; margin: 0 6px;">&rarr;</span>
                  <span style="${isRecipient ? 'color: #FFFFFF; font-weight: bold;' : ''}">${t.recipientFacilityName}</span>
                </td>
                <td>
                  <span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span>
                </td>
                <td>
                  <a href="#/transfers" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 8px;">
                    ${(isSender && t.status === 'REQUESTED') ? 'Approve &rarr;' : ((isSender && t.status === 'APPROVED') ? 'Dispatch &rarr;' : ((isRecipient && t.status === 'DISPATCHED') ? 'Mark Received &#10003;' : 'View'))}
                  </a>
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Active Context Footer -->
    <div style="color: var(--text-muted); font-size: 11.5px; text-align: center; padding: 8px 0;">
      PharmaSync CARE &bull; Multi-Facility Distribution Network &bull; Active Context: <strong style="color: var(--text-main);">${activeProfile.facilityName}</strong> (${activeProfile.facilityType})
    </div>
  `;

  // Bind scope toggle buttons
  document.getElementById('btn-scope-fac')?.addEventListener('click', () => {
    currentScope = 'facility';
    render(container);
  });

  document.getElementById('btn-scope-net')?.addEventListener('click', () => {
    currentScope = 'network';
    render(container);
  });
}
