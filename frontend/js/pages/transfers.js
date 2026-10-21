/**
 * PharmaSync CARE — Transfers Page
 * Straightforward transfer tracker: sender, receiver, medicine, quantity,
 * and clear status updates (Requested -> Approved -> Dispatched -> Received).
 */

import { api } from '../api.js';
import { renderErrorState } from '../components/error-state.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { exportToCSV } from '../components/export-csv.js';

let transfersList = [];

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

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
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

      <!-- Straightforward Table -->
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order Code</th>
              <th>Medicine</th>
              <th>Quantity</th>
              <th>Sender (Supplier)</th>
              <th>Receiver (Requester)</th>
              <th>Current Status</th>
              <th>Update Status</th>
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

function renderTableRows() {
  const tbody = document.getElementById('transfers-table-body');
  if (!tbody) return;

  const q = (document.getElementById('trf-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('trf-filter-status')?.value || 'ALL';

  const filtered = transfersList.filter(t => {
    const matchQ = !q ||
      t.transferCode.toLowerCase().includes(q) ||
      t.medicineName.toLowerCase().includes(q) ||
      t.senderFacilityName.toLowerCase().includes(q) ||
      t.recipientFacilityName.toLowerCase().includes(q);

    const matchS = statusFilter === 'ALL' || t.status === statusFilter;

    return matchQ && matchS;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-state-title">No transfer orders found</div>
            <div class="empty-state-desc">No orders match your search criteria.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(t => {
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
          <strong>${t.senderFacilityName}</strong>
        </td>
        <td style="font-size: 12.5px;">
          <strong>${t.recipientFacilityName}</strong>
        </td>
        <td>
          <span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span>
        </td>
        <td>
          ${getNextActionButton(t)}
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

function getNextActionButton(t) {
  if (t.status === 'PROPOSED' || t.status === 'REQUESTED') {
    return `
      <button class="btn btn-primary btn-sm btn-advance-status" data-id="${t.id}" data-next-status="APPROVED" style="padding: 4px 10px; font-size: 11.5px; white-space: nowrap;">
        Approve &rarr;
      </button>
    `;
  }
  if (t.status === 'APPROVED') {
    return `
      <button class="btn btn-primary btn-sm btn-advance-status" data-id="${t.id}" data-next-status="DISPATCHED" style="padding: 4px 10px; font-size: 11.5px; white-space: nowrap; background: var(--teal-600);">
        Dispatch &rarr;
      </button>
    `;
  }
  if (t.status === 'DISPATCHED') {
    return `
      <button class="btn btn-primary btn-sm btn-advance-status" data-id="${t.id}" data-next-status="RECEIVED" style="padding: 4px 10px; font-size: 11.5px; white-space: nowrap; background: var(--emerald-600);">
        Mark Received &#10003;
      </button>
    `;
  }
  if (t.status === 'RECEIVED') {
    return `<span class="badge badge-exp-safe">&#10003; Received</span>`;
  }
  return `<span class="badge badge-exp-warning">${t.status}</span>`;
}

function handleAdvanceStatus(transferId, nextStatus) {
  const trf = transfersList.find(t => t.id === transferId);
  if (!trf) return;

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
          <span><strong>From:</strong> ${trf.senderFacilityName}</span>
          <span>&rarr;</span>
          <span><strong>To:</strong> ${trf.recipientFacilityName}</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="status-note-input">Pharmacist Verification Note / Sign-off:</label>
        <input type="text" id="status-note-input" class="form-input" placeholder="e.g. Stock verified and marked as ${nextStatus.toLowerCase()}" value="Verified and marked ${nextStatus}" />
        <span class="form-help">This action will be logged in the immutable audit trail with your pharmacist signature</span>
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
              <div class="text-muted" style="font-size: 11px;">By: ${h.by} ${h.note ? `&bull; ${h.note}` : ''}</div>
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
