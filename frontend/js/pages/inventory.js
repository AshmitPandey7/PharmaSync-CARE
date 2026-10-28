/**
 * PharmaSync CARE — Medicine Stock Management (FEFO-Aware)
 * Implements First-Expiry-First-Out (FEFO) batch tracking, atomic reservation locks,
 * safety buffer calculations, and multi-tier stock level segregation.
 */

import { api } from '../api.js';
import { config } from '../config.js';
import { renderErrorState } from '../components/error-state.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { exportToCSV } from '../components/export-csv.js';

let inventoryList = [];
let facilitiesList = [];
let facilitiesMap = {};
let inventoryTab = 'my-facility'; // 'my-facility' | 'all'

export async function render(container) {
  const [invRes, facRes] = await Promise.all([
    api.getInventory(),
    api.getFacilities()
  ]);

  if ((!invRes.success && invRes.isNetworkError) || (!facRes.success && facRes.isNetworkError)) {
    renderErrorState(container, {
      title: 'Flask API Offline',
      message: invRes.error || facRes.error,
      onRetry: () => render(container)
    });
    return;
  }

  inventoryList = invRes.data || [];
  facilitiesList = facRes.data || [];
  facilitiesMap = facilitiesList.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});

  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const activeProfile = config.getActiveFacilityProfile();
  const myBatches = inventoryList.filter(b => b.facilityId === activeFacilityId);

  // Compute aggregate stock levels
  const targetList = inventoryTab === 'my-facility' ? myBatches : inventoryList;
  const totalPhysical = targetList.reduce((acc, b) => acc + (b.totalQuantity || b.availableQuantity || 0), 0);
  const totalReserved = targetList.reduce((acc, b) => acc + (b.reservedQuantity || 0), 0);
  const totalSafetyBuffer = targetList.reduce((acc, b) => acc + (b.safetyStockThreshold || 20), 0);
  const totalTransferable = targetList.reduce((acc, b) => acc + (b.eligibleSurplusQuantity || 0), 0);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
          </svg>
          Medicine Stock &amp; FEFO Inventory
        </h1>
        <p class="page-description">
          First-Expiry-First-Out (FEFO) batch allocation, atomic transfer reservations, and safety buffer segregation.
        </p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" id="btn-export-inventory">
          Export CSV
        </button>
        <button class="btn btn-primary btn-sm" id="btn-add-batch">
          + Add Medicine Batch
        </button>
      </div>
    </div>

    <!-- Active Facility Filter Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <button class="btn btn-sm ${inventoryTab === 'my-facility' ? 'btn-primary' : 'btn-outline'}" id="tab-inv-mine">
        Stock at ${activeProfile.facilityName.split(' ')[0]} (${myBatches.length} Batches)
      </button>
      <button class="btn btn-sm ${inventoryTab === 'all' ? 'btn-primary' : 'btn-outline'}" id="tab-inv-all">
        All Network Facilities (${inventoryList.length} Batches)
      </button>
    </div>

    <!-- Inventory Segregation Summary Metrics -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 18px;">
      <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">1. Physical Stock</div>
        <div style="font-size: 22px; font-weight: 700; color: #FFFFFF; font-family: var(--font-mono); margin: 4px 0 2px 0;">
          ${totalPhysical.toLocaleString()} <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">units</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">Total sealed inventory on-site</div>
      </div>

      <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: #FBBF24; text-transform: uppercase;">2. Reserved Allocations</div>
        <div style="font-size: 22px; font-weight: 700; color: #FBBF24; font-family: var(--font-mono); margin: 4px 0 2px 0;">
          ${totalReserved.toLocaleString()} <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">units</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">Committed to active transfers (atomic lock)</div>
      </div>

      <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">3. Local Safety Buffer</div>
        <div style="font-size: 22px; font-weight: 700; color: #E2E8F0; font-family: var(--font-mono); margin: 4px 0 2px 0;">
          ${totalSafetyBuffer.toLocaleString()} <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">units</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">Protected clinical reserve for facility</div>
      </div>

      <div style="background: var(--bg-surface); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-sm); padding: 12px 16px;">
        <div style="font-size: 11px; font-weight: 700; color: #34D399; text-transform: uppercase;">4. Transferable Surplus</div>
        <div style="font-size: 22px; font-weight: 700; color: #34D399; font-family: var(--font-mono); margin: 4px 0 2px 0;">
          ${totalTransferable.toLocaleString()} <span style="font-size: 12px; font-weight: normal; color: var(--text-muted);">units</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">Redistributable surplus above buffer</div>
      </div>
    </div>

    <!-- FEFO Algorithmic Policy Banner -->
    <div style="background: #121212; border: 1px solid #2B2B2B; border-left: 3px solid #38BDF8; border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; font-size: 12px; line-height: 1.5; color: #E5E5E5;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 10px; font-weight: 700;">FEFO ALLOCATION PRINCIPLE</span>
        <strong style="color: #FFFFFF;">First-Expiry-First-Out Prioritization Active</strong>
      </div>
      <div>
        Unlike commercial warehouses that employ FIFO (First-In-First-Out), healthcare medicine logistics must prioritize batches approaching earlier manufacturer expiration dates (FEFO) to eliminate expiration wastage. Batches with shelf-life below 45 days or quantities within the local safety stock threshold are automatically protected against inter-facility redistribution.
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="table-container">
      <div class="table-toolbar">
        <div class="table-toolbar-left" style="flex: 1; display: flex; flex-wrap: wrap; gap: 10px;">
          <div class="search-input-wrapper" style="min-width: 240px; flex: 1;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="inv-search" placeholder="Search by medicine name, generic composition, or batch number..." />
          </div>

          <select id="inv-filter-facility" class="filter-select">
            <option value="ALL">All Network Facilities</option>
            ${facilitiesList.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
          </select>

          <select id="inv-filter-expiry" class="filter-select">
            <option value="ALL">All Shelf-Life Horizons</option>
            <option value="SOON">Near Expiry (&le; 45 Days)</option>
            <option value="SAFE">Adequate Shelf Life (&gt; 45 Days)</option>
          </select>
        </div>
      </div>

      <!-- Inventory Table -->
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Medicine &amp; Spec</th>
              <th>Batch &amp; FEFO Rank</th>
              <th>Holding Facility</th>
              <th>Physical / Reserved</th>
              <th>Safety Buffer</th>
              <th>Transferable Surplus</th>
              <th>Expiry &amp; Shelf-Life</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="inventory-table-body">
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
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  const activeFacilityId = config.ACTIVE_FACILITY_ID;
  const q = (document.getElementById('inv-search')?.value || '').toLowerCase().trim();
  const facVal = document.getElementById('inv-filter-facility')?.value || 'ALL';
  const expVal = document.getElementById('inv-filter-expiry')?.value || 'ALL';

  const today = new Date();

  let list = [...inventoryList];
  if (inventoryTab === 'my-facility') {
    list = list.filter(item => item.facilityId === activeFacilityId);
  }

  // Sort batches strictly by FEFO: earliest expiry date first
  list.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  const filtered = list.filter(item => {
    const matchQ = !q ||
      item.medicineName.toLowerCase().includes(q) ||
      (item.genericName && item.genericName.toLowerCase().includes(q)) ||
      item.batchNumber.toLowerCase().includes(q);

    const matchF = facVal === 'ALL' || item.facilityId === facVal;

    const expiryDate = new Date(item.expiryDate);
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    let matchE = true;
    if (expVal === 'SOON') matchE = diffDays <= 45;
    if (expVal === 'SAFE') matchE = diffDays > 45;

    return matchQ && matchF && matchE;
  });

  if (filtered.length === 0) {
    const emptyMsg = inventoryTab === 'my-facility'
      ? `No medicine batches registered for this facility. Click "+ Add Medicine Batch" to record stock.`
      : `No medicine batches match your search criteria.`;

    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-state-title">No medicine batches found</div>
            <div class="empty-state-desc">${emptyMsg}</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    const fac = facilitiesMap[item.facilityId];
    const expiryDate = new Date(item.expiryDate);
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    let expiryBadge = `<span class="badge badge-exp-safe">${diffDays} Days</span>`;
    if (diffDays <= 30) {
      expiryBadge = `<span class="badge badge-exp-critical">${diffDays} Days left</span>`;
    } else if (diffDays <= 60) {
      expiryBadge = `<span class="badge badge-exp-warning">${diffDays} Days left</span>`;
    }

    const physicalQty = item.totalQuantity || item.availableQuantity || 0;
    const reservedQty = item.reservedQuantity || 0;
    const safetyBuffer = item.safetyStockThreshold || 20;
    const surplusQty = item.eligibleSurplusQuantity || Math.max(0, physicalQty - reservedQty - safetyBuffer);

    const fefoRank = idx + 1;

    return `
      <tr>
        <td>
          <strong style="color: var(--text-heading); font-size: 13.5px;">${item.medicineName}</strong>
          <div class="text-muted" style="font-size: 11px;">
            ${item.strength || ''} &bull; ${item.dosageForm || 'Standard'}
            ${item.coldChainRequired ? '<span style="color: #38BDF8; margin-left: 4px;">❄ Cold-Chain (2-8°C)</span>' : ''}
          </div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <code style="font-family: var(--font-mono); font-weight: bold; color: var(--text-heading);">${item.batchNumber}</code>
            <span class="badge" style="background: rgba(56, 189, 248, 0.1); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 9.5px; padding: 1px 5px;" title="FEFO Dispatch Sequence Rank">
              FEFO #${fefoRank}
            </span>
          </div>
        </td>
        <td>
          <div style="font-weight: 500; font-size: 12.5px;">${fac?.name || item.facilityId}</div>
          <div class="text-muted" style="font-size: 10.5px;">${fac?.type || 'Healthcare Facility'}</div>
        </td>
        <td>
          <div>
            <strong style="font-size: 14px; color: #FFFFFF; font-family: var(--font-mono);">${physicalQty}</strong>
            <span class="text-muted" style="font-size: 11px;"> physical</span>
          </div>
          ${reservedQty > 0 ? `
            <div style="font-size: 10.5px; color: #FBBF24; font-family: var(--font-mono);">
              (${reservedQty} reserved)
            </div>
          ` : '<div style="font-size: 10.5px; color: var(--text-muted);">(0 reserved)</div>'}
        </td>
        <td>
          <div style="font-family: var(--font-mono); font-size: 13px; color: #94A3B8;">${safetyBuffer} units</div>
          <div class="text-muted" style="font-size: 10px;">Protected reserve</div>
        </td>
        <td>
          ${surplusQty > 0 ? `
            <strong style="color: #34D399; font-size: 14px; font-family: var(--font-mono);">+${surplusQty}</strong>
            <span class="text-muted" style="font-size: 11px;"> available</span>
          ` : `
            <span class="badge badge-expired" style="font-size: 10.5px;">0 Surplus (Buffer Locked)</span>
          `}
        </td>
        <td>
          <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-heading);">${item.expiryDate}</div>
          <div style="margin-top: 2px;">${expiryBadge}</div>
        </td>
        <td>
          <button class="btn btn-outline btn-sm btn-edit-batch" data-id="${item.id}" style="padding: 4px 8px; font-size: 11px;">
            Edit Stock
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-batch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const batch = inventoryList.find(b => b.id === e.currentTarget.dataset.id);
      if (batch) openEditBatchModal(batch);
    });
  });
}

function setupEvents() {
  document.getElementById('inv-search')?.addEventListener('input', renderTableRows);
  document.getElementById('inv-filter-facility')?.addEventListener('change', renderTableRows);
  document.getElementById('inv-filter-expiry')?.addEventListener('change', renderTableRows);

  document.getElementById('tab-inv-mine')?.addEventListener('click', () => {
    inventoryTab = 'my-facility';
    updateInvTabs();
    renderTableRows();
  });

  document.getElementById('tab-inv-all')?.addEventListener('click', () => {
    inventoryTab = 'all';
    updateInvTabs();
    renderTableRows();
  });

  document.getElementById('btn-add-batch')?.addEventListener('click', openAddBatchModal);

  document.getElementById('btn-export-inventory')?.addEventListener('click', () => {
    exportToCSV('PharmaSync_FEFO_Stock', inventoryList.map(b => ({
      BatchID: b.id,
      BatchNumber: b.batchNumber,
      MedicineName: b.medicineName,
      Strength: b.strength,
      DosageForm: b.dosageForm,
      PhysicalQuantity: b.totalQuantity || b.availableQuantity,
      ReservedQuantity: b.reservedQuantity || 0,
      SafetyStockThreshold: b.safetyStockThreshold || 20,
      EligibleSurplus: b.eligibleSurplusQuantity || 0,
      ExpiryDate: b.expiryDate,
      Facility: facilitiesMap[b.facilityId]?.name || b.facilityId
    })));
    toast.success('Export Complete', 'Medicine stock exported in CSV format.');
  });
}

function updateInvTabs() {
  const mineBtn = document.getElementById('tab-inv-mine');
  const allBtn = document.getElementById('tab-inv-all');
  if (mineBtn && allBtn) {
    if (inventoryTab === 'my-facility') {
      mineBtn.className = 'btn btn-sm btn-primary';
      allBtn.className = 'btn btn-sm btn-outline';
    } else {
      mineBtn.className = 'btn btn-sm btn-outline';
      allBtn.className = 'btn btn-sm btn-primary';
    }
  }
}

function openAddBatchModal() {
  const activeFacilityId = config.ACTIVE_FACILITY_ID;

  const content = `
    <form id="form-add-batch" onsubmit="return false;">
      <div class="form-group">
        <label class="form-label" for="modal-batch-fac">Holding Healthcare Facility <span class="required-pill">Required</span></label>
        <select id="modal-batch-fac" class="form-select">
          ${facilitiesList.map(f => `<option value="${f.id}" ${f.id === activeFacilityId ? 'selected' : ''}>${f.name} (${f.type})</option>`).join('')}
        </select>
        <span class="form-help">Select the pharmacy or hospital facility holding this batch</span>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="modal-batch-name">Medicine Name <span class="required-pill">Required</span></label>
          <input type="text" id="modal-batch-name" class="form-input" placeholder="e.g. Paracetamol Tablets" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-generic">Generic Name / Composition</label>
          <input type="text" id="modal-batch-generic" class="form-input" placeholder="e.g. Paracetamol IP" />
        </div>
      </div>

      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label" for="modal-batch-num">Batch Number <span class="required-pill">Required</span></label>
          <input type="text" id="modal-batch-num" class="form-input" placeholder="e.g. PCM-2026-X1" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-strength">Strength / Dosage <span class="required-pill">Required</span></label>
          <input type="text" id="modal-batch-strength" class="form-input" placeholder="e.g. 650mg Tablets" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-dosage">Dosage Form</label>
          <select id="modal-batch-dosage" class="form-select">
            <option value="Oral Solid">Oral Solid</option>
            <option value="Injectable">Injectable</option>
            <option value="IV Fluid">IV Fluid</option>
            <option value="Oral Liquid">Oral Liquid</option>
            <option value="Oral Rehydration">Oral Rehydration</option>
          </select>
        </div>
      </div>

      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label" for="modal-batch-qty">Physical Stock (Units) <span class="required-pill">Required</span></label>
          <input type="number" id="modal-batch-qty" class="form-input" min="1" placeholder="300" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-buffer">Safety Stock Buffer</label>
          <input type="number" id="modal-batch-buffer" class="form-input" min="0" value="50" />
          <span class="form-help">Locked local reserve</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-expiry">Expiry Date <span class="required-pill">Required</span></label>
          <input type="date" id="modal-batch-expiry" class="form-input" required />
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" id="btn-modal-cancel">Cancel</button>
    <button type="button" class="btn btn-primary" id="btn-modal-submit">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Add Medicine Batch
    </button>
  `;

  const { close } = modal.open({ title: 'Add Medicine Batch (FEFO Registered)', content, footer });

  // Default expiry date: 90 days from now
  const defExpiry = new Date();
  defExpiry.setDate(defExpiry.getDate() + 90);
  const expiryInput = document.getElementById('modal-batch-expiry');
  if (expiryInput) expiryInput.value = defExpiry.toISOString().split('T')[0];

  document.getElementById('btn-modal-cancel')?.addEventListener('click', close);
  
  const submitBtn = document.getElementById('btn-modal-submit');
  submitBtn?.addEventListener('click', async () => {
    const medName = document.getElementById('modal-batch-name')?.value.trim();
    const batchNum = document.getElementById('modal-batch-num')?.value.trim();
    const strength = document.getElementById('modal-batch-strength')?.value.trim();
    const qty = Number(document.getElementById('modal-batch-qty')?.value);
    const buffer = Number(document.getElementById('modal-batch-buffer')?.value || 20);
    const expiry = document.getElementById('modal-batch-expiry')?.value;
    const facId = document.getElementById('modal-batch-fac')?.value;

    if (!medName || !batchNum || !strength || isNaN(qty) || qty <= 0 || !expiry) {
      toast.error('Validation Error', 'Please complete all required fields with valid quantities.');
      return;
    }

    const payload = {
      facilityId: facId,
      medicineName: medName,
      genericName: document.getElementById('modal-batch-generic')?.value.trim() || medName,
      batchNumber: batchNum,
      strength,
      dosageForm: document.getElementById('modal-batch-dosage')?.value,
      totalQuantity: qty,
      availableQuantity: qty,
      reservedQuantity: 0,
      safetyStockThreshold: buffer,
      eligibleSurplusQuantity: Math.max(0, qty - buffer),
      expiryDate: expiry
    };

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Adding...';

      const res = await (api.addBatch ? api.addBatch(payload) : api.addInventoryBatch(payload));
      if (res && res.success) {
        toast.success('Batch Added', `Batch ${batchNum} (${medName}) recorded with FEFO priority.`);
        close();
        const updated = await api.getInventory();
        inventoryList = updated.data || [];
        renderTableRows();
      } else {
        toast.error('Failed to Add', res?.error || 'Could not save batch.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Add Medicine Batch';
      }
    } catch (err) {
      console.error('Error adding batch:', err);
      toast.error('Error', err.message || 'An error occurred while adding the batch.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Add Medicine Batch';
    }
  });
}

function openEditBatchModal(batch) {
  const facName = facilitiesMap[batch.facilityId]?.name || batch.facilityId;
  const currentTotal = batch.totalQuantity != null ? batch.totalQuantity : batch.availableQuantity;
  const currentBuffer = batch.safetyStockThreshold != null ? batch.safetyStockThreshold : 20;

  const content = `
    <form id="form-edit-batch" onsubmit="return false;">
      <div class="modal-info-card">
        <div class="modal-info-title">
          <span>${batch.medicineName}</span>
          <span style="font-weight: normal; color: var(--text-muted);">(${batch.strength || 'Standard'})</span>
        </div>
        <div class="modal-info-meta">
          <span><strong>Batch:</strong> <code style="color: #ffffff; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 4px;">${batch.batchNumber}</code></span>
          <span>&bull;</span>
          <span><strong>Facility:</strong> ${facName}</span>
          <span>&bull;</span>
          <span><strong>Reserved:</strong> ${batch.reservedQuantity || 0} units</span>
        </div>
      </div>

      <div class="form-grid-3" style="margin-top: 14px;">
        <div class="form-group">
          <label class="form-label" for="modal-edit-qty">Total Physical Stock <span class="required-pill">Required</span></label>
          <input type="number" id="modal-edit-qty" class="form-input" min="0" value="${currentTotal}" required />
          <span class="form-help">Current sealed units</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-edit-buffer">Safety Stock Buffer</label>
          <input type="number" id="modal-edit-buffer" class="form-input" min="0" value="${currentBuffer}" />
          <span class="form-help">Protected local stock</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-edit-expiry">Expiry Date <span class="required-pill">Required</span></label>
          <input type="date" id="modal-edit-expiry" class="form-input" value="${batch.expiryDate}" required />
          <span class="form-help">FEFO expiration date</span>
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-secondary" id="btn-edit-cancel">Cancel</button>
    <button type="button" class="btn btn-primary" id="btn-edit-submit">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Save Changes
    </button>
  `;

  const { close } = modal.open({ title: 'Edit Medicine Batch & Buffer', content, footer });

  document.getElementById('btn-edit-cancel')?.addEventListener('click', close);

  const submitBtn = document.getElementById('btn-edit-submit');
  submitBtn?.addEventListener('click', async () => {
    const qtyInput = document.getElementById('modal-edit-qty');
    const bufferInput = document.getElementById('modal-edit-buffer');
    const expiryInput = document.getElementById('modal-edit-expiry');
    const newQty = Number(qtyInput?.value);
    const newBuffer = Number(bufferInput?.value || 0);
    const newExpiry = expiryInput?.value?.trim();

    if (isNaN(newQty) || newQty < 0 || !newExpiry) {
      toast.error('Validation Error', 'Please specify a valid quantity (0 or greater) and expiry date.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Saving...';

      const reserved = batch.reservedQuantity || 0;
      const available = Math.max(0, newQty - reserved);
      const surplus = Math.max(0, available - newBuffer);

      const payload = {
        totalQuantity: newQty,
        availableQuantity: available,
        safetyStockThreshold: newBuffer,
        eligibleSurplusQuantity: surplus,
        expiryDate: newExpiry
      };

      const res = await (api.updateBatch ? api.updateBatch(batch.id, payload) : api.updateInventoryBatch(batch.id, payload));

      if (res && res.success) {
        toast.success('Stock Updated', `Batch ${batch.batchNumber} updated. Available: ${available}, Surplus: ${surplus}.`);
        close();
        const updated = await api.getInventory();
        inventoryList = updated.data || [];
        renderTableRows();
      } else {
        toast.error('Update Failed', res?.error || 'Could not update batch.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Changes';
      }
    } catch (err) {
      console.error('Error updating batch:', err);
      toast.error('Error', err.message || 'An unexpected error occurred while saving.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Save Changes';
    }
  });
}
