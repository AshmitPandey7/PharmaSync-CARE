/**
 * PharmaSync CARE — Multi-Facility Transfers Page
 * Two-party inter-facility transfer lifecycle:
 * Sender / Donor (Reviews & Dispatches) -> Receiver / Requester (Inspects & Marks Received).
 * Includes High-Fidelity Simulated Route Tracking with Leaflet maps and atomic inventory receipt.
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { renderErrorState } from '../components/error-state.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { exportToCSV } from '../components/export-csv.js';

let transfersList = [];
let activeTab = 'all'; // 'outgoing' | 'incoming' | 'all'

// Tracking modal state
let trackingInterval = null;
let trackingMapInstance = null;
let trackingVehicleMarker = null;
let trackingRouteLine = null;
let currentTrackingData = null;

export async function render(container) {
  const trfRes = await api.getTransfers();

  if (!trfRes.success && trfRes.isNetworkError) {
    renderErrorState(container, {
      title: 'Flask API Offline',
      message: trfRes.error,
      onRetry: () => render(container)
    });
    return;
  }

  transfersList = trfRes.data || [];
  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const activeProfile = config.getActiveFacilityProfile();

  const outgoingList = transfersList.filter(t => t.senderFacilityId === activeFacilityId);
  const incomingList = transfersList.filter(t => t.recipientFacilityId === activeFacilityId);

  // Auto-select smart tab if user has active items
  if (activeTab === 'all' && (outgoingList.length > 0 || incomingList.length > 0)) {
    if (outgoingList.some(t => ['REQUESTED', 'APPROVED'].includes(t.status))) {
      activeTab = 'outgoing';
    } else if (incomingList.some(t => ['DISPATCHED', 'IN_TRANSIT', 'TRANSIT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(t.status))) {
      activeTab = 'incoming';
    }
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          Transfers &amp; Shipment Tracking
        </h1>
        <p class="page-description">
          Track inter-facility medicine consignments, monitor corridor transit checkpoints, and advance transfer custody from approval to stock receipt.
        </p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" id="btn-export-transfers">
          Export CSV
        </button>
      </div>
    </div>

    <!-- Active Facility Perspective Header -->
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span class="badge badge-fac-hospital" style="font-size: 10px; font-weight: 700; text-transform: uppercase;">Active Facility Context</span>
          <strong style="font-size: 15.5px; color: #FFFFFF;">${activeProfile.facilityName}</strong>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Operator: <strong style="color: var(--text-main);">${activeProfile.name}</strong> (${activeProfile.role}) &bull; 
          Switch facility in topbar to test multi-party approval, dispatch, tracking, and receipt workflows.
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.35);">
          ${outgoingList.length} Outgoing (Supplier)
        </span>
        <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.35);">
          ${incomingList.length} Incoming (Recipient)
        </span>
      </div>
    </div>

    <!-- Perspective Navigation Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <button class="btn btn-sm ${activeTab === 'outgoing' ? 'btn-primary' : 'btn-outline'}" id="tab-trf-outgoing" style="font-size: 12px;">
        Outgoing Transfers (We are Supplier: ${outgoingList.length})
      </button>
      <button class="btn btn-sm ${activeTab === 'incoming' ? 'btn-primary' : 'btn-outline'}" id="tab-trf-incoming" style="font-size: 12px;">
        Incoming Orders (We are Recipient: ${incomingList.length})
      </button>
      <button class="btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}" id="tab-trf-all" style="font-size: 12px;">
        All Network Transfers (${transfersList.length})
      </button>
    </div>

    <!-- Tab Explanatory Notice -->
    <div id="tab-notice" style="background: #171717; border: 1px solid #303030; border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: var(--text-main);">
      ${getTabNoticeText(activeTab, activeProfile)}
    </div>

    <!-- Search & Filter Toolbar -->
    <div class="table-container">
      <div class="table-toolbar">
        <div class="table-toolbar-left" style="flex: 1; display: flex; flex-wrap: wrap; gap: 10px;">
          <div class="search-input-wrapper" style="min-width: 240px; flex: 1;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="trf-search" placeholder="Search by transfer code, medicine, sender, or receiver..." />
          </div>

          <select id="trf-filter-status" class="filter-select">
            <option value="ALL">All Statuses</option>
            <option value="REQUESTED">Requested (Pending Approval)</option>
            <option value="APPROVED">Approved (Ready to Dispatch)</option>
            <option value="DISPATCHED">Dispatched / En Route</option>
            <option value="DELIVERED">Delivered (Awaiting Receipt)</option>
            <option value="RECEIVED">Received (Stock Credited)</option>
          </select>
        </div>
      </div>

      <!-- Transfers Data Table -->
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order Code</th>
              <th>Medicine</th>
              <th>Quantity</th>
              <th>Sender (Supplier)</th>
              <th>Receiver (Requester)</th>
              <th>Status</th>
              <th>Action Needed</th>
              <th>Tracking &amp; Details</th>
            </tr>
          </thead>
          <tbody id="transfers-table-body">
            <!-- Dynamic rows -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderTableRows();
  setupEvents();
}

function getTabNoticeText(tab, profile) {
  if (tab === 'outgoing') {
    return `<strong>Outgoing Consignments:</strong> Partner facilities have requested stock from <strong>${profile.facilityName}</strong>. As the supplying facility, you have the authority to <strong>Approve</strong> allocations and <strong>Dispatch</strong> transit consignments.`;
  }
  if (tab === 'incoming') {
    return `<strong>Incoming Deliveries:</strong> Medicines ordered for <strong>${profile.facilityName}</strong> to alleviate clinical shortages. Monitor transit checkpoints on the map, and once arrived, click <strong>Mark Received</strong> to credit physical stock into local inventory.`;
  }
  return `<strong>Network Transfer Ledger:</strong> Comprehensive multi-facility registry tracking transit shipments across the regional healthcare network.`;
}

function renderTableRows() {
  const tbody = document.getElementById('transfers-table-body');
  if (!tbody) return;

  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const q = (document.getElementById('trf-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('trf-filter-status')?.value || 'ALL';

  let list = [...transfersList];

  // Filter by perspective tab
  if (activeTab === 'outgoing') {
    list = list.filter(t => t.senderFacilityId === activeFacilityId);
  } else if (activeTab === 'incoming') {
    list = list.filter(t => t.recipientFacilityId === activeFacilityId);
  }

  const filtered = list.filter(t => {
    const matchQ = !q ||
      t.transferCode.toLowerCase().includes(q) ||
      t.medicineName.toLowerCase().includes(q) ||
      t.senderFacilityName.toLowerCase().includes(q) ||
      t.recipientFacilityName.toLowerCase().includes(q);

    let matchS = true;
    if (statusFilter === 'DISPATCHED') {
      matchS = ['DISPATCHED', 'IN_TRANSIT', 'TRANSIT_HUB', 'OUT_FOR_DELIVERY'].includes(t.status);
    } else if (statusFilter !== 'ALL') {
      matchS = t.status === statusFilter;
    }
    return matchQ && matchS;
  });

  if (filtered.length === 0) {
    const emptyMsg = activeTab === 'outgoing'
      ? `No outgoing transfers from this facility. Other facilities have not requested stock from you yet.`
      : (activeTab === 'incoming' 
        ? `No incoming orders for this facility. Go to "Find Medicines" to request stock from other facilities.`
        : `No orders match your filter criteria.`);

    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-state-title">No transfer orders found</div>
            <div class="empty-state-desc">${emptyMsg}</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
    const isSender = t.senderFacilityId === activeFacilityId;
    const isRecipient = t.recipientFacilityId === activeFacilityId;
    const canTrack = true; // All transfers can view route and simulation

    return `
      <tr>
        <td>
          <code style="font-weight: bold; color: var(--text-heading); font-family: var(--font-mono);">${t.transferCode}</code>
        </td>
        <td>
          <strong style="color: var(--text-heading); font-size: 13.5px;">${t.medicineName}</strong>
          <div class="text-muted" style="font-size: 11px;">${t.strength || ''} &bull; ${t.dosageForm || ''}</div>
        </td>
        <td>
          <strong style="color: #FFFFFF; font-size: 14.5px; font-family: var(--font-mono);">${t.quantity}</strong>
          <span class="text-muted" style="font-size: 11px;"> units</span>
        </td>
        <td style="font-size: 12.5px;">
          <strong style="${isSender ? 'color: #FBBF24;' : ''}">${t.senderFacilityName}</strong>
          ${isSender ? '<div class="text-muted" style="font-size: 10.5px;">(Your Facility &bull; Supplier)</div>' : ''}
        </td>
        <td style="font-size: 12.5px;">
          <strong style="${isRecipient ? 'color: #34D399;' : ''}">${t.recipientFacilityName}</strong>
          ${isRecipient ? '<div class="text-muted" style="font-size: 10.5px;">(Your Facility &bull; Recipient)</div>' : ''}
        </td>
        <td>
          <span class="badge badge-status-${(t.status || 'requested').toLowerCase()}">${t.status}</span>
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            ${getRoleAwareActionButton(t, isSender, isRecipient)}
            ${(t.status === 'PROPOSED' || t.status === 'REQUESTED') ? `
              <button class="btn btn-outline btn-sm btn-cancel-transfer" data-id="${t.id}" data-code="${t.transferCode}" title="Cancel transfer order and release reserved stock" style="font-size: 11px; padding: 4px 8px; color: var(--rose-400); border-color: rgba(244,63,94,0.35);">
                ✕ Cancel
              </button>
            ` : ''}
          </div>
        </td>
        <td>
          <div style="display: flex; gap: 5px; align-items: center;">
            <button class="btn btn-outline btn-sm btn-track-shipment" data-id="${t.id}" title="View Route &amp; Transit Tracking Simulation" style="padding: 4px 8px; font-size: 11px; color: #38BDF8; border-color: rgba(56, 189, 248, 0.4); display: flex; align-items: center; gap: 4px;">
              🚚 Track
            </button>
            <button class="btn btn-outline btn-sm btn-inspect-transfer" data-id="${t.id}" style="padding: 4px 8px; font-size: 11px;">
              Details
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-advance-status').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const { id, nextStatus } = e.currentTarget.dataset;
      handleAdvanceStatus(id, nextStatus);
    });
  });

  tbody.querySelectorAll('.btn-track-shipment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const trf = transfersList.find(t => t.id === e.currentTarget.dataset.id);
      if (trf) openShipmentTrackingModal(trf);
    });
  });

  tbody.querySelectorAll('.btn-inspect-transfer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const trf = transfersList.find(t => t.id === e.currentTarget.dataset.id);
      if (trf) openInspectModal(trf);
    });
  });

  tbody.querySelectorAll('.btn-cancel-transfer').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const { id, code } = e.currentTarget.dataset;
      if (!confirm(`Are you sure you want to cancel Transfer Order ${code}? Any reserved medicine batches will be immediately restored to available stock.`)) {
        return;
      }
      try {
        btn.disabled = true;
        btn.textContent = '...';
        const res = await api.cancelTransfer(id, 'Cancelled by operator');
        if (res && res.success) {
          toast.success('Transfer Cancelled', `Order ${code} cancelled. Reserved stock released.`);
          const updated = await api.getTransfers();
          transfersList = updated.data || [];
          renderTableRows();
        } else {
          toast.error('Cancel Failed', res?.error || 'Could not cancel transfer.');
          btn.disabled = false;
          btn.textContent = '✕ Cancel';
        }
      } catch (err) {
        toast.error('Error', err.message || 'Error cancelling transfer.');
        btn.disabled = false;
        btn.textContent = '✕ Cancel';
      }
    });
  });
}

function getRoleAwareActionButton(t, isSender, isRecipient) {
  const inTransitStatuses = ['DISPATCHED', 'IN_TRANSIT', 'TRANSIT_HUB', 'OUT_FOR_DELIVERY'];

  // If user is Sender (Supplier)
  if (isSender) {
    if (t.status === 'PROPOSED' || t.status === 'REQUESTED') {
      return `
        <button class="btn btn-primary btn-sm btn-advance-status" data-id="${t.id}" data-next-status="APPROVED" style="padding: 4px 10px; font-size: 11.5px; white-space: nowrap; background: #FFFFFF; color: #000000; font-weight: 700;">
          Approve Request &rarr;
        </button>
      `;
    }
    if (t.status === 'APPROVED') {
      return `
        <button class="btn btn-primary btn-sm btn-advance-status" data-id="${t.id}" data-next-status="DISPATCHED" style="padding: 4px 10px; font-size: 11.5px; white-space: nowrap; background: #38BDF8; border-color: #38BDF8; color: #000000; font-weight: 700;">
          Dispatch Shipment &rarr;
        </button>
      `;
    }
    if (inTransitStatuses.includes(t.status)) {
      return `<span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #38BDF8; border: 1px solid rgba(14, 165, 233, 0.35); font-size: 10.5px;">En Route &bull; In Transit</span>`;
    }
    if (t.status === 'DELIVERED') {
      return `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.35); font-size: 10.5px;">Delivered &bull; Awaiting Receipt</span>`;
    }
    if (t.status === 'RECEIVED') {
      return `<span class="badge badge-exp-safe">&#10003; Received</span>`;
    }
  }

  // If user is Recipient (Requester)
  if (isRecipient) {
    if (t.status === 'PROPOSED' || t.status === 'REQUESTED') {
      return `<span class="badge badge-exp-warning" style="font-size: 10.5px;">&#9203; Awaiting Supplier Approval</span>`;
    }
    if (t.status === 'APPROVED') {
      return `<span class="badge badge-fac-hospital" style="font-size: 10.5px;">&#9203; Approved &bull; In Prep</span>`;
    }
    if (inTransitStatuses.includes(t.status)) {
      return `
        <button class="btn btn-outline btn-sm btn-track-shipment" data-id="${t.id}" style="padding: 4px 8px; font-size: 11px; color: #38BDF8; border-color: rgba(56, 189, 248, 0.4);">
          🚚 Track Carrier
        </button>
      `;
    }
    if (t.status === 'DELIVERED') {
      return `
        <button class="btn btn-primary btn-sm btn-advance-status" data-id="${t.id}" data-next-status="RECEIVED" style="padding: 4px 10px; font-size: 11.5px; white-space: nowrap; background: #10B981; border-color: #10B981; color: #000000; font-weight: 700;">
          Mark Received &#10003;
        </button>
      `;
    }
    if (t.status === 'RECEIVED') {
      return `<span class="badge badge-exp-safe">&#10003; Stock Credited</span>`;
    }
  }

  // Global / Administrator view (Neither sender nor recipient)
  if (t.status === 'PROPOSED' || t.status === 'REQUESTED') {
    return `
      <button class="btn btn-outline btn-sm btn-advance-status" data-id="${t.id}" data-next-status="APPROVED" style="padding: 3px 8px; font-size: 11px;">
        Approve (Supplier) &rarr;
      </button>
    `;
  }
  if (t.status === 'APPROVED') {
    return `
      <button class="btn btn-outline btn-sm btn-advance-status" data-id="${t.id}" data-next-status="DISPATCHED" style="padding: 3px 8px; font-size: 11px;">
        Dispatch (Supplier) &rarr;
      </button>
    `;
  }
  if (t.status === 'DELIVERED' || inTransitStatuses.includes(t.status)) {
    return `
      <button class="btn btn-outline btn-sm btn-advance-status" data-id="${t.id}" data-next-status="RECEIVED" style="padding: 3px 8px; font-size: 11px;">
        Mark Received (Clinic) &#10003;
      </button>
    `;
  }
  return `<span class="badge badge-exp-safe">&#10003; Completed</span>`;
}

function handleAdvanceStatus(transferId, nextStatus) {
  const trf = transfersList.find(t => t.id === transferId);
  if (!trf) return;

  const profile = config.getActiveFacilityProfile();
  let defaultNote = `Verified by ${profile.name} (${profile.facilityName})`;
  if (nextStatus === 'APPROVED') defaultNote = `Approved for allocation by ${profile.name} at ${trf.senderFacilityName}`;
  if (nextStatus === 'DISPATCHED') defaultNote = `Packed and dispatched via transit vehicle by ${profile.name}`;
  if (nextStatus === 'RECEIVED') defaultNote = `Consignment physically inspected and stock credited to inventory by ${profile.name} at ${trf.recipientFacilityName}`;

  const content = `
    <form id="form-advance-status" onsubmit="return false;">
      <div class="modal-info-card">
        <div class="modal-info-title">
          <span>Transfer Order: ${trf.transferCode}</span>
          <span class="badge badge-status-${nextStatus.toLowerCase()}">${nextStatus}</span>
        </div>
        <div class="modal-info-meta">
          <span><strong>Medicine:</strong> ${trf.medicineName} (${trf.strength || 'Standard'})</span>
          <span>&bull;</span>
          <span><strong>Quantity:</strong> ${trf.quantity} units</span>
        </div>
        <div class="modal-info-meta" style="margin-top: 4px;">
          <span><strong>Supplier (Donor):</strong> ${trf.senderFacilityName}</span>
          <span>&rarr;</span>
          <span><strong>Requester (Receiver):</strong> ${trf.recipientFacilityName}</span>
        </div>
      </div>

      <div class="form-group" style="margin-top: 14px;">
        <label class="form-label" for="status-note-input">Verification Sign-off Note:</label>
        <input type="text" id="status-note-input" class="form-input" value="${defaultNote}" />
        <span class="form-help">Signed by ${profile.name} (${profile.role}). This action is recorded in the permanent audit trail.</span>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" id="btn-adv-cancel">Cancel</button>
    <button type="button" class="btn btn-primary" id="btn-adv-confirm">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Confirm ${nextStatus}
    </button>
  `;

  const { close } = modal.open({ title: `Advance Transfer to ${nextStatus}`, content, footer });

  document.getElementById('btn-adv-cancel')?.addEventListener('click', close);
  
  const confirmBtn = document.getElementById('btn-adv-confirm');
  confirmBtn?.addEventListener('click', async () => {
    const note = document.getElementById('status-note-input')?.value.trim();

    try {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = 'Updating...';

      let res;
      if (nextStatus === 'APPROVED') res = await api.approveTransfer(trf.id, note);
      else if (nextStatus === 'DISPATCHED') res = await api.dispatchTransfer(trf.id, note);
      else if (nextStatus === 'RECEIVED') res = await api.receiveTransfer(trf.id, note);
      else res = await api.updateTransferStatus(trf.id, nextStatus, note);

      if (res && res.success) {
        toast.success('Status Updated', `Transfer ${trf.transferCode} advanced to ${nextStatus}.`);
        close();
        const updated = await api.getTransfers();
        transfersList = updated.data || [];
        renderTableRows();
      } else {
        toast.error('Update Failed', res?.error || 'Could not update transfer status.');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `Confirm ${nextStatus}`;
      }
    } catch (err) {
      console.error('Error advancing transfer status:', err);
      toast.error('Error', err.message || 'An error occurred while updating status.');
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `Confirm ${nextStatus}`;
    }
  });
}

/**
 * High-Fidelity Simulated Shipment Tracking Modal
 * Shows Leaflet map, animated vehicle checkpoint navigation, controls, and atomic receipt confirmation.
 */
async function openShipmentTrackingModal(trf) {
  cleanupTrackingState();

  const res = await api.getTransferTracking(trf.id);
  if (!res || !res.success) {
    toast.error('Tracking Error', res?.error || 'Unable to retrieve tracking data for this transfer.');
    return;
  }

  currentTrackingData = res.data;
  const t = currentTrackingData.transfer;
  const checkpoints = currentTrackingData.routeCheckpoints || [];
  const currentIdx = currentTrackingData.currentCheckpointIndex || 0;
  const activeCp = checkpoints[currentIdx] || checkpoints[0];
  const isDelivered = currentTrackingData.isDelivered;
  const isReceived = currentTrackingData.isReceived;

  const content = `
    <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
      <!-- Consignment Metadata Bar -->
      <div style="background: #141414; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <code style="font-weight: 700; color: #FFFFFF; font-size: 14px;">${t.transferCode}</code>
            <span class="badge badge-status-${(t.status || '').toLowerCase()}" id="trk-status-badge">${t.status}</span>
            <span class="badge" style="background: #1A1A1A; color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 10px; font-weight: 600;">Simulated Corridor Tracking</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px;">
            <strong>${t.medicineName}</strong> (${t.strength || ''}) &bull; <strong style="color: #FFFFFF;">${t.quantity} units</strong> &bull; Carrier: <strong>${t.carrierName || 'Express Transit Unit'}</strong>
          </div>
        </div>
        <div style="font-size: 11.5px; text-align: right; color: var(--text-muted);">
          <div>From: <strong style="color: #FFFFFF;">${currentTrackingData.senderFacility?.name || t.senderFacilityName}</strong></div>
          <div>To: <strong style="color: #FFFFFF;">${currentTrackingData.recipientFacility?.name || t.recipientFacilityName}</strong></div>
        </div>
      </div>

      <!-- Interactive Leaflet Transit Map -->
      <div style="position: relative;">
        <div id="tracking-leaflet-map" style="height: 280px; width: 100%; border-radius: var(--radius-sm); border: 1px solid #303030; background: #0E0E0E;"></div>
        <div style="position: absolute; bottom: 8px; left: 8px; z-index: 500; background: rgba(9, 9, 9, 0.85); backdrop-filter: blur(4px); border: 1px solid #303030; border-radius: 4px; padding: 4px 10px; font-size: 10.5px; color: var(--text-muted); font-family: var(--font-mono);">
          Bengaluru Healthcare Transit Sector &bull; Corridors active
        </div>
      </div>

      <!-- Checkpoint Progress Stepper -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 12px; color: var(--text-heading); text-transform: uppercase; letter-spacing: 0.5px;">Transit Corridor Checkpoints</strong>
          <span style="font-size: 11.5px; color: var(--text-muted);" id="trk-step-counter">Checkpoint ${currentIdx + 1} of ${checkpoints.length}</span>
        </div>
        
        <div id="trk-stepper-container" style="display: grid; grid-template-columns: repeat(${checkpoints.length}, 1fr); gap: 6px;">
          ${renderStepperItems(checkpoints, currentIdx)}
        </div>
      </div>

      <!-- Active Checkpoint Details Box -->
      <div id="trk-active-checkpoint-card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px;">
        ${renderActiveCheckpointCard(activeCp, currentIdx, checkpoints.length)}
      </div>

      <!-- Simulation Controls & Final Action -->
      <div style="background: #171717; border: 1px solid #303030; border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-secondary btn-sm" id="btn-trk-advance" ${isDelivered || isReceived ? 'disabled' : ''} style="font-size: 11.5px; font-weight: 600;">
            ⏩ Next Checkpoint
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-trk-auto" ${isDelivered || isReceived ? 'disabled' : ''} style="font-size: 11.5px;">
            ▶ Auto-Advance (3s)
          </button>
          <button class="btn btn-outline btn-sm" id="btn-trk-reset" style="font-size: 11.5px; color: var(--text-muted);">
            ↺ Reset Route
          </button>
        </div>

        <div id="trk-receipt-action-slot">
          ${isReceived ? `
            <span class="badge badge-exp-safe" style="font-size: 12px; padding: 6px 12px;">&#10003; Consignment Received &amp; Stock Credited</span>
          ` : (isDelivered ? `
            <button class="btn btn-primary btn-sm" id="btn-trk-confirm-receipt" style="background: #10B981; border-color: #10B981; color: #000; font-weight: 700; padding: 6px 14px; font-size: 12px;">
              &#10003; Confirm Arrival &amp; Credit Inventory
            </button>
          ` : `
            <span class="text-muted" style="font-size: 11px;">Advance carrier to final checkpoint to confirm receipt</span>
          `)}
        </div>
      </div>

      <!-- Persistent Audit & Tracking Events Log -->
      <div>
        <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px; color: var(--text-heading);">
          Persistent Transit Audit Trail (${currentTrackingData.events?.length || 0} Events Logged):
        </div>
        <div id="trk-events-log-container" style="max-height: 120px; overflow-y: auto; background: #0E0E0E; border: 1px solid #282828; border-radius: var(--radius-sm); padding: 8px 12px; font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
          ${renderEventsLog(currentTrackingData.events || [])}
        </div>
      </div>
    </div>
  `;

  const modalInstance = modal.open({
    title: `Shipment Tracking — ${t.transferCode}`,
    content,
    size: 'lg',
    footer: `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <span class="text-muted" style="font-size: 11.5px;">Simulated telemetry linked to MongoDB transactions</span>
        <button class="btn btn-outline btn-sm" id="btn-close-trk-modal">Close</button>
      </div>
    `,
    onClose: cleanupTrackingState
  });

  document.getElementById('btn-close-trk-modal')?.addEventListener('click', () => {
    modalInstance.close();
  });

  // Setup Leaflet map
  setTimeout(() => {
    initTrackingMap(currentTrackingData);
  }, 120);

  // Bind simulation controls
  setupTrackingControls(trf.id);
}

function renderStepperItems(checkpoints, currentIdx) {
  return checkpoints.map((cp, idx) => {
    const isPassed = idx < currentIdx;
    const isCurrent = idx === currentIdx;
    let borderCol = '#2E2E2E';
    let bgCol = '#141414';
    let textCol = 'var(--text-muted)';
    let statusText = 'Pending';

    if (isPassed) {
      borderCol = 'rgba(16, 185, 129, 0.4)';
      bgCol = 'rgba(16, 185, 129, 0.08)';
      textCol = '#34D399';
      statusText = '✓ Passed';
    } else if (isCurrent) {
      borderCol = '#38BDF8';
      bgCol = 'rgba(56, 189, 248, 0.15)';
      textCol = '#FFFFFF';
      statusText = '🚚 Active';
    }

    return `
      <div style="background: ${bgCol}; border: 1px solid ${borderCol}; border-radius: 4px; padding: 6px 8px; text-align: center; transition: all 0.2s;">
        <div style="font-size: 10px; font-weight: 700; color: ${textCol};">${statusText}</div>
        <div style="font-size: 11px; font-weight: 600; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;" title="${cp.name}">
          ${idx + 1}. ${cp.stage.replace('_', ' ')}
        </div>
      </div>
    `;
  }).join('');
}

function renderActiveCheckpointCard(cp, currentIdx, totalCount) {
  if (!cp) return '';
  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge badge-status-${(cp.stage || '').toLowerCase()}" style="font-size: 10.5px;">${cp.stage}</span>
          <strong style="color: #FFFFFF; font-size: 13.5px;">${cp.name}</strong>
        </div>
        <div style="color: var(--text-muted); font-size: 12px; margin-top: 4px; line-height: 1.4;">
          ${cp.description || 'Consignment checkpoint in transit.'}
        </div>
      </div>
      <div style="text-align: right; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); white-space: nowrap;">
        <div>GPS: ${cp.coordinates ? `${cp.coordinates[0].toFixed(4)}, ${cp.coordinates[1].toFixed(4)}` : 'N/A'}</div>
        <div style="color: #38BDF8; margin-top: 2px;">Telemetry Active</div>
      </div>
    </div>
  `;
}

function renderEventsLog(events) {
  if (!events || events.length === 0) {
    return `<div style="color: var(--text-muted); text-align: center; padding: 10px;">No transit events recorded yet.</div>`;
  }

  return [...events].reverse().map(ev => `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1E1E1E; padding-bottom: 4px;">
      <div>
        <strong style="color: #38BDF8;">[${ev.stage || 'STAGE'}]</strong>
        <span style="color: #FFFFFF; margin-left: 4px;">${ev.checkpointName || 'Checkpoint reached'}</span>
        ${ev.notes ? `<span class="text-muted" style="margin-left: 6px;">&bull; ${ev.notes}</span>` : ''}
      </div>
      <div style="font-family: var(--font-mono); color: var(--text-muted); font-size: 10.5px; white-space: nowrap;">
        ${ev.timestamp || 'Just now'}
      </div>
    </div>
  `).join('');
}

function initTrackingMap(trackingData) {
  if (trackingMapInstance) {
    trackingMapInstance.remove();
    trackingMapInstance = null;
  }

  const mapEl = document.getElementById('tracking-leaflet-map');
  if (!mapEl || !window.L) return;

  const sender = trackingData.senderFacility;
  const recipient = trackingData.recipientFacility;
  const checkpoints = trackingData.routeCheckpoints || [];
  const currentIdx = trackingData.currentCheckpointIndex || 0;
  const activeCp = checkpoints[currentIdx] || checkpoints[0];

  trackingMapInstance = window.L.map('tracking-leaflet-map', {
    zoomControl: true,
    scrollWheelZoom: false
  });

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(trackingMapInstance);

  const coords = checkpoints.map(cp => cp.coordinates);

  // Polyline for transit route
  trackingRouteLine = window.L.polyline(coords, {
    color: '#38BDF8',
    weight: 3.5,
    dashArray: '5, 8',
    opacity: 0.85
  }).addTo(trackingMapInstance);

  // Origin Marker (Green)
  if (sender?.coordinates) {
    window.L.circleMarker(sender.coordinates, {
      radius: 7,
      color: '#10B981',
      fillColor: '#10B981',
      fillOpacity: 0.9,
      weight: 2
    }).addTo(trackingMapInstance).bindPopup(`<strong>Origin:</strong> ${sender.name}`);
  }

  // Destination Marker (Rose/Red)
  if (recipient?.coordinates) {
    window.L.circleMarker(recipient.coordinates, {
      radius: 7,
      color: '#F43F5E',
      fillColor: '#F43F5E',
      fillOpacity: 0.9,
      weight: 2
    }).addTo(trackingMapInstance).bindPopup(`<strong>Destination:</strong> ${recipient.name}`);
  }

  // Intermediate Checkpoint Dots
  checkpoints.forEach((cp, idx) => {
    if (idx !== 0 && idx !== checkpoints.length - 1) {
      window.L.circleMarker(cp.coordinates, {
        radius: 4,
        color: '#A3A3A3',
        fillColor: '#FFFFFF',
        fillOpacity: 0.8,
        weight: 1.5
      }).addTo(trackingMapInstance).bindPopup(`<strong>CP ${idx + 1}:</strong> ${cp.name}`);
    }
  });

  // Courier Vehicle Marker
  const vehicleIcon = window.L.divIcon({
    className: 'trk-vehicle-marker',
    html: `
      <div style="background: #090909; border: 2px solid #38BDF8; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 17px; box-shadow: 0 0 14px rgba(56, 189, 248, 0.7); cursor: pointer;">
        🚚
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });

  trackingVehicleMarker = window.L.marker(activeCp.coordinates, { icon: vehicleIcon }).addTo(trackingMapInstance);
  trackingVehicleMarker.bindPopup(`<strong>Transit Carrier</strong><br/>Location: ${activeCp.name}`);

  // Fit bounds around route
  if (coords.length > 0) {
    trackingMapInstance.fitBounds(trackingRouteLine.getBounds(), { padding: [35, 35] });
  }

  setTimeout(() => {
    if (trackingMapInstance) trackingMapInstance.invalidateSize();
  }, 200);
}

function setupTrackingControls(transferId) {
  const btnAdvance = document.getElementById('btn-trk-advance');
  const btnAuto = document.getElementById('btn-trk-auto');
  const btnReset = document.getElementById('btn-trk-reset');
  const btnReceipt = document.getElementById('btn-trk-confirm-receipt');

  btnAdvance?.addEventListener('click', async () => {
    btnAdvance.disabled = true;
    await advanceTrackingStep(transferId);
    btnAdvance.disabled = false;
  });

  btnAuto?.addEventListener('click', () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
      btnAuto.textContent = '▶ Auto-Advance (3s)';
      btnAuto.classList.remove('btn-primary');
      btnAuto.classList.add('btn-secondary');
    } else {
      btnAuto.textContent = '⏸ Pause';
      btnAuto.classList.remove('btn-secondary');
      btnAuto.classList.add('btn-primary');

      trackingInterval = setInterval(async () => {
        const hasMore = await advanceTrackingStep(transferId);
        if (!hasMore) {
          clearInterval(trackingInterval);
          trackingInterval = null;
          btnAuto.textContent = '▶ Auto-Advance (3s)';
          btnAuto.classList.remove('btn-primary');
          btnAuto.classList.add('btn-secondary');
        }
      }, 3000);
    }
  });

  btnReset?.addEventListener('click', async () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
      if (btnAuto) btnAuto.textContent = '▶ Auto-Advance (3s)';
    }

    const resetRes = await api.resetTransferTracking(transferId);
    if (resetRes && resetRes.success) {
      currentTrackingData = resetRes.data;
      updateTrackingModalUI(currentTrackingData);
      toast.info('Route Reset', 'Tracking simulation restarted from dispatch dock.');
      refreshUnderlyingTable();
    }
  });

  btnReceipt?.addEventListener('click', async () => {
    await confirmPhysicalReceipt(transferId);
  });
}

async function advanceTrackingStep(transferId) {
  const advRes = await api.advanceTransferTracking(transferId);
  if (!advRes || !advRes.success) {
    toast.error('Simulation Notice', advRes?.error || 'Could not advance tracking.');
    return false;
  }

  currentTrackingData = advRes.data;
  updateTrackingModalUI(currentTrackingData);
  refreshUnderlyingTable();

  const isDelivered = currentTrackingData.isDelivered;
  if (isDelivered) {
    toast.success('Carrier Delivered', 'Shipment has arrived at destination clinic receiving dock.');
    return false; // Stop auto-advance
  }
  return true;
}

function updateTrackingModalUI(data) {
  const checkpoints = data.routeCheckpoints || [];
  const currentIdx = data.currentCheckpointIndex || 0;
  const activeCp = checkpoints[currentIdx] || checkpoints[0];
  const isDelivered = data.isDelivered;
  const isReceived = data.isReceived;
  const t = data.transfer;

  // 1. Update vehicle marker position smoothly
  if (trackingVehicleMarker && activeCp?.coordinates) {
    trackingVehicleMarker.setLatLng(activeCp.coordinates);
    trackingVehicleMarker.setPopupContent(`<strong>Transit Carrier</strong><br/>Location: ${activeCp.name}`);
  }

  // 2. Update status badge
  const statusBadge = document.getElementById('trk-status-badge');
  if (statusBadge) {
    statusBadge.textContent = t.status;
    statusBadge.className = `badge badge-status-${(t.status || '').toLowerCase()}`;
  }

  // 3. Update step counter
  const stepCounter = document.getElementById('trk-step-counter');
  if (stepCounter) {
    stepCounter.textContent = `Checkpoint ${currentIdx + 1} of ${checkpoints.length}`;
  }

  // 4. Update stepper items
  const stepperContainer = document.getElementById('trk-stepper-container');
  if (stepperContainer) {
    stepperContainer.innerHTML = renderStepperItems(checkpoints, currentIdx);
  }

  // 5. Update active checkpoint card
  const activeCard = document.getElementById('trk-active-checkpoint-card');
  if (activeCard) {
    activeCard.innerHTML = renderActiveCheckpointCard(activeCp, currentIdx, checkpoints.length);
  }

  // 6. Update receipt action slot & buttons
  const btnAdvance = document.getElementById('btn-trk-advance');
  const btnAuto = document.getElementById('btn-trk-auto');
  const receiptSlot = document.getElementById('trk-receipt-action-slot');

  if (isDelivered || isReceived) {
    if (btnAdvance) btnAdvance.disabled = true;
    if (btnAuto) btnAuto.disabled = true;
  }

  if (receiptSlot) {
    if (isReceived) {
      receiptSlot.innerHTML = `<span class="badge badge-exp-safe" style="font-size: 12px; padding: 6px 12px;">&#10003; Consignment Received &amp; Stock Credited</span>`;
    } else if (isDelivered) {
      receiptSlot.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btn-trk-confirm-receipt" style="background: #10B981; border-color: #10B981; color: #000; font-weight: 700; padding: 6px 14px; font-size: 12px;">
          &#10003; Confirm Arrival &amp; Credit Inventory
        </button>
      `;
      document.getElementById('btn-trk-confirm-receipt')?.addEventListener('click', async () => {
        await confirmPhysicalReceipt(t.id);
      });
    } else {
      receiptSlot.innerHTML = `<span class="text-muted" style="font-size: 11px;">Advance carrier to final checkpoint to confirm receipt</span>`;
    }
  }

  // 7. Update events log
  const eventsLog = document.getElementById('trk-events-log-container');
  if (eventsLog) {
    eventsLog.innerHTML = renderEventsLog(data.events || []);
  }
}

async function confirmPhysicalReceipt(transferId) {
  const profile = config.getActiveFacilityProfile();
  const note = `Physical delivery verified, inspected, and stock received by ${profile.name} at destination clinic`;

  const btn = document.getElementById('btn-trk-confirm-receipt');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Crediting Inventory...';
  }

  try {
    const res = await api.receiveTransfer(transferId, note);
    if (res && res.success) {
      toast.success('Stock Received & Credited', 'Consignment accepted. Recipient inventory increased and donor reservation finalized.');
      const updatedTracking = await api.getTransferTracking(transferId);
      if (updatedTracking && updatedTracking.success) {
        currentTrackingData = updatedTracking.data;
        updateTrackingModalUI(currentTrackingData);
      }
      refreshUnderlyingTable();
    } else {
      toast.error('Receipt Failed', res?.error || 'Could not mark transfer as received.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✓ Confirm Arrival & Credit Inventory';
      }
    }
  } catch (err) {
    toast.error('Error', err.message || 'Error marking transfer received.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✓ Confirm Arrival & Credit Inventory';
    }
  }
}

async function refreshUnderlyingTable() {
  const updated = await api.getTransfers();
  transfersList = updated.data || [];
  renderTableRows();
}

function cleanupTrackingState() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  if (trackingMapInstance) {
    trackingMapInstance.remove();
    trackingMapInstance = null;
  }
  trackingVehicleMarker = null;
  trackingRouteLine = null;
  currentTrackingData = null;
}

function openInspectModal(trf) {
  const content = `
    <div style="font-size: 13px; display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
        <span style="font-size: 15px; font-weight: bold; color: var(--text-heading);">${trf.transferCode}</span>
        <span class="badge badge-status-${(trf.status || '').toLowerCase()}">${trf.status}</span>
      </div>

      <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
        <div>
          <span class="text-muted">Sender (Donor Facility):</span>
          <div style="font-weight: bold;">${trf.senderFacilityName}</div>
        </div>
        <div>
          <span class="text-muted">Receiver (Requester Facility):</span>
          <div style="font-weight: bold;">${trf.recipientFacilityName}</div>
        </div>
        <div>
          <span class="text-muted">Medicine:</span>
          <div>${trf.medicineName} (${trf.strength || ''})</div>
        </div>
        <div>
          <span class="text-muted">Quantity:</span>
          <div style="color: #FFFFFF; font-weight: bold; font-family: var(--font-mono);">${trf.quantity} Units</div>
        </div>
      </div>

      <div>
        <div style="font-weight: bold; margin-bottom: 8px; color: var(--text-heading);">Transfer History Log:</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(trf.statusHistory || []).map(h => `
            <div style="border-left: 2px solid #FFFFFF; padding-left: 10px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between;">
                <strong style="color: var(--text-heading);">${h.status}</strong>
                <span class="text-muted" style="font-family: var(--font-mono); font-size: 11px;">${h.timestamp}</span>
              </div>
              <div class="text-muted" style="font-size: 11px;">By: ${h.by || h.user || 'Pharmacist'} ${h.note ? `&bull; ${h.note}` : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  const modalInstance = modal.open({
    title: `Transfer Details — ${trf.transferCode}`,
    content,
    footer: `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <button class="btn btn-outline btn-sm" id="btn-modal-open-tracking" style="color: #38BDF8; border-color: rgba(56, 189, 248, 0.4);">
          🚚 Open Route &amp; Tracking
        </button>
        <div style="display: flex; gap: 8px;">
          ${(trf.status === 'PROPOSED' || trf.status === 'REQUESTED') ? `
            <button class="btn btn-sm" id="btn-modal-cancel-trf" style="color: var(--rose-400); border: 1px solid rgba(244,63,94,0.4); background: rgba(244,63,94,0.1); font-weight: 600;">
              ✕ Cancel This Order
            </button>
          ` : ''}
          <button class="btn btn-outline btn-sm" onclick="document.querySelector('.modal-close-btn').click()">Close</button>
        </div>
      </div>
    `
  });

  document.getElementById('btn-modal-open-tracking')?.addEventListener('click', () => {
    modalInstance.close();
    openShipmentTrackingModal(trf);
  });

  document.getElementById('btn-modal-cancel-trf')?.addEventListener('click', async () => {
    if (!confirm(`Are you sure you want to cancel Transfer Order ${trf.transferCode}? Any reserved medicine batches will be immediately restored to available stock.`)) {
      return;
    }
    try {
      const res = await api.cancelTransfer(trf.id, 'Cancelled from inspection view');
      if (res && res.success) {
        toast.success('Transfer Cancelled', `Order ${trf.transferCode} cancelled. Reserved stock released.`);
        modalInstance.close();
        const updated = await api.getTransfers();
        transfersList = updated.data || [];
        renderTableRows();
      } else {
        toast.error('Cancel Failed', res?.error || 'Could not cancel transfer.');
      }
    } catch (err) {
      toast.error('Error', err.message || 'Error cancelling transfer.');
    }
  });
}

function setupEvents() {
  document.getElementById('trf-search')?.addEventListener('input', renderTableRows);
  document.getElementById('trf-filter-status')?.addEventListener('change', renderTableRows);

  // Tab switching
  document.getElementById('tab-trf-outgoing')?.addEventListener('click', () => {
    activeTab = 'outgoing';
    updateTabUI();
    renderTableRows();
  });

  document.getElementById('tab-trf-incoming')?.addEventListener('click', () => {
    activeTab = 'incoming';
    updateTabUI();
    renderTableRows();
  });

  document.getElementById('tab-trf-all')?.addEventListener('click', () => {
    activeTab = 'all';
    updateTabUI();
    renderTableRows();
  });

  document.getElementById('btn-export-transfers')?.addEventListener('click', () => {
    exportToCSV('PharmaSync_Transfers', transfersList.map(t => ({
      OrderCode: t.transferCode,
      Medicine: t.medicineName,
      Strength: t.strength,
      Quantity: t.quantity,
      SenderFacility: t.senderFacilityName,
      ReceiverFacility: t.recipientFacilityName,
      Status: t.status
    })));
    toast.success('Export Complete', 'Transfers exported in CSV format.');
  });
}

function updateTabUI() {
  const profile = config.getActiveFacilityProfile();
  const noticeEl = document.getElementById('tab-notice');
  if (noticeEl) {
    noticeEl.innerHTML = getTabNoticeText(activeTab, profile);
  }

  ['outgoing', 'incoming', 'all'].forEach(t => {
    const btn = document.getElementById(`tab-trf-${t}`);
    if (btn) {
      if (activeTab === t) {
        btn.className = 'btn btn-sm btn-primary';
      } else {
        btn.className = 'btn btn-sm btn-outline';
      }
    }
  });
}
