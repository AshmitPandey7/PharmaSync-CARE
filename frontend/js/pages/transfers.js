/**
 * PharmaSync CARE — Multi-Facility Transfers Page
 * Two-party inter-facility transfer lifecycle:
 * Sender / Donor (Reviews & Dispatches) -> Receiver / Requester (Inspects & Marks Received).
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { renderErrorState } from '../components/error-state.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { exportToCSV } from '../components/export-csv.js';

let transfersList = [];
let activeTab = 'all'; // 'outgoing' | 'incoming' | 'all'

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
    } else if (incomingList.some(t => t.status === 'DISPATCHED')) {
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
          Transfers
        </h1>
        <p class="page-description">
          Track medicine shipments between facilities and advance transfer status from approval to receipt.
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
          <span class="badge badge-fac-hospital" style="font-size: 10px; font-weight: 700; text-transform: uppercase;">Active Facility Persona</span>
          <strong style="font-size: 15.5px; color: #FFFFFF;">${activeProfile.facilityName}</strong>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Operator: <strong style="color: var(--text-main);">${activeProfile.name}</strong> (${activeProfile.role}) &bull; 
          Switch facility in topbar to test multi-party approval and receipt workflow.
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
            <option value="DISPATCHED">Dispatched (In Transit)</option>
            <option value="RECEIVED">Received (Completed)</option>
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
              <th>Details</th>
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
    return `<strong>Outgoing Shipments:</strong> Partner healthcare facilities have requested medicines from <strong>${profile.facilityName}</strong>. As the supplying pharmacist, you hold authority to <strong>Approve</strong> the allocation and <strong>Dispatch</strong> the shipment.`;
  }
  if (tab === 'incoming') {
    return `<strong>Incoming Orders:</strong> Medicines ordered for <strong>${profile.facilityName}</strong> to resolve stockouts. When a shipment is dispatched, your clinic personnel verify physical arrival and click <strong>Mark Received</strong>.`;
  }
  return `<strong>All Network Transfers:</strong> Complete ledger of all inter-facility medicine transfers across the regional healthcare network.`;
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

    const matchS = statusFilter === 'ALL' || t.status === statusFilter;
    return matchQ && matchS;
  });

  if (filtered.length === 0) {
    const emptyMsg = activeTab === 'outgoing'
      ? `No outgoing transfers from this facility. Other clinics have not requested stock from you yet.`
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

    return `
      <tr>
        <td>
          <code style="font-weight: bold; color: var(--text-heading); font-family: var(--font-mono);">${t.transferCode}</code>
        </td>
        <td>
          <strong style="color: var(--text-heading); font-size: 13.5px;">${t.medicineName}</strong>
          <div class="text-muted" style="font-size: 11px;">${t.strength}</div>
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
          <span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span>
        </td>
        <td>
          ${getRoleAwareActionButton(t, isSender, isRecipient)}
        </td>
        <td>
          <button class="btn btn-outline btn-sm btn-inspect-transfer" data-id="${t.id}" style="padding: 4px 8px; font-size: 11px;">
            Inspect
          </button>
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

  tbody.querySelectorAll('.btn-inspect-transfer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const trf = transfersList.find(t => t.id === e.currentTarget.dataset.id);
      if (trf) openInspectModal(trf);
    });
  });
}

function getRoleAwareActionButton(t, isSender, isRecipient) {
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
    if (t.status === 'DISPATCHED') {
      return `<span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #38BDF8; border: 1px solid rgba(14, 165, 233, 0.35); font-size: 10.5px;">En Route &bull; Awaiting Receipt</span>`;
    }
    if (t.status === 'RECEIVED') {
      return `<span class="badge badge-exp-safe">&#10003; Delivered</span>`;
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
    if (t.status === 'DISPATCHED') {
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
  if (t.status === 'DISPATCHED') {
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
  if (nextStatus === 'APPROVED') defaultNote = `Approved for dispatch by ${profile.name} at ${trf.senderFacilityName}`;
  if (nextStatus === 'DISPATCHED') defaultNote = `Packed and dispatched via transit vehicle by ${profile.name}`;
  if (nextStatus === 'RECEIVED') defaultNote = `Received in good condition and stock credited by ${profile.name} at ${trf.recipientFacilityName}`;

  const content = `
    <form id="form-advance-status" onsubmit="return false;">
      <div class="modal-info-card">
        <div class="modal-info-title">
          <span>Transfer: ${trf.transferCode}</span>
          <span class="badge badge-status-${nextStatus.toLowerCase()}">${nextStatus}</span>
        </div>
        <div class="modal-info-meta">
          <span><strong>Medicine:</strong> ${trf.medicineName} (${trf.strength})</span>
          <span>&bull;</span>
          <span><strong>Quantity:</strong> ${trf.quantity} units</span>
        </div>
        <div class="modal-info-meta" style="margin-top: 4px;">
          <span><strong>Supplier (Sender):</strong> ${trf.senderFacilityName}</span>
          <span>&rarr;</span>
          <span><strong>Requester (Receiver):</strong> ${trf.recipientFacilityName}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="status-note-input">Pharmacist Verification Note / Sign-off:</label>
        <input type="text" id="status-note-input" class="form-input" value="${defaultNote}" />
        <span class="form-help">Signed by ${profile.name} (${profile.role}). This action is logged into the audit trail.</span>
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

      const res = await api.updateTransferStatus(trf.id, nextStatus, note);
      if (res && res.success) {
        toast.success('Status Updated', `Transfer ${trf.transferCode} is now ${nextStatus}.`);
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

function openInspectModal(trf) {
  const content = `
    <div style="font-size: 13px; display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
        <span style="font-size: 15px; font-weight: bold; color: var(--text-heading);">${trf.transferCode}</span>
        <span class="badge badge-status-${t_status(trf.status)}">${trf.status}</span>
      </div>

      <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
        <div>
          <span class="text-muted">Sender (Supplier):</span>
          <div style="font-weight: bold;">${trf.senderFacilityName}</div>
        </div>
        <div>
          <span class="text-muted">Receiver (Requester):</span>
          <div style="font-weight: bold;">${trf.recipientFacilityName}</div>
        </div>
        <div>
          <span class="text-muted">Medicine:</span>
          <div>${trf.medicineName} (${trf.strength})</div>
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

  modal.open({
    title: `Transfer Details — ${trf.transferCode}`,
    content,
    footer: `<button class="btn btn-outline btn-sm" onclick="document.querySelector('.modal-close-btn').click()">Close</button>`
  });
}

function t_status(s) {
  return (s || 'requested').toLowerCase();
}

function setupEvents() {
  document.getElementById('trf-search')?.addEventListener('input', renderTableRows);
  document.getElementById('trf-filter-status')?.addEventListener('change', renderTableRows);

  // Tab switching
  document.getElementById('tab-trf-outgoing')?.addEventListener('click', (e) => {
    activeTab = 'outgoing';
    updateTabUI();
    renderTableRows();
  });

  document.getElementById('tab-trf-incoming')?.addEventListener('click', (e) => {
    activeTab = 'incoming';
    updateTabUI();
    renderTableRows();
  });

  document.getElementById('tab-trf-all')?.addEventListener('click', (e) => {
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
