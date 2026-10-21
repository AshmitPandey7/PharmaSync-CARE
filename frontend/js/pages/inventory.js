/**
 * PharmaSync CARE — Medicine Stock Page
 * Straightforward medicine batch management: view, search, add, and edit stock.
 */

import { api } from '../api.js';
import { modal } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { exportToCSV } from '../components/export-csv.js';

let inventoryList = [];
let facilitiesList = [];
let facilitiesMap = {};

export async function render(container) {
  const [invRes, facRes] = await Promise.all([
    api.getInventory(),
    api.getFacilities()
  ]);

  inventoryList = invRes.data || [];
  facilitiesList = facRes.data || [];
  facilitiesMap = facilitiesList.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
          </svg>
          Medicine Stock
        </h1>
        <p class="page-description">
          View, add, and update medicine batches held in stock across network facilities.
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

    <!-- Search & Filter Bar -->
    <div class="table-container">
      <div class="table-toolbar">
        <div class="table-toolbar-left" style="flex: 1; display: flex; flex-wrap: wrap; gap: 10px;">
          <div class="search-input-wrapper" style="min-width: 240px; flex: 1;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="inv-search" placeholder="Search by medicine name, batch number, or generic name..." />
          </div>

          <select id="inv-filter-facility" class="filter-select">
            <option value="ALL">All Facilities</option>
            ${facilitiesList.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
          </select>

          <select id="inv-filter-expiry" class="filter-select">
            <option value="ALL">All Expiry Dates</option>
            <option value="SOON">Near Expiry (&le; 45 Days)</option>
            <option value="SAFE">Adequate Shelf Life (&gt; 45 Days)</option>
          </select>
        </div>
      </div>

      <!-- Straightforward Table -->
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Medicine Name</th>
              <th>Batch Number</th>
              <th>Holding Facility</th>
              <th>Available Stock</th>
              <th>Expiry Date</th>
              <th>Shelf Life</th>
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

  const q = (document.getElementById('inv-search')?.value || '').toLowerCase().trim();
  const facVal = document.getElementById('inv-filter-facility')?.value || 'ALL';
  const expVal = document.getElementById('inv-filter-expiry')?.value || 'ALL';

  const today = new Date();

  const filtered = inventoryList.filter(item => {
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
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-state-title">No medicine batches match your search</div>
            <div class="empty-state-desc">Try clearing the search query or changing filters.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const fac = facilitiesMap[item.facilityId];
    const expiryDate = new Date(item.expiryDate);
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    let expiryBadge = `<span class="badge badge-exp-safe">${diffDays} Days</span>`;
    if (diffDays <= 30) {
      expiryBadge = `<span class="badge badge-exp-critical">${diffDays} Days left</span>`;
    } else if (diffDays <= 60) {
      expiryBadge = `<span class="badge badge-exp-warning">${diffDays} Days left</span>`;
    }

    const availableQty = item.availableQuantity != null ? item.availableQuantity : item.totalQuantity;

    return `
      <tr>
        <td>
          <strong style="color: var(--text-heading); font-size: 13.5px;">${item.medicineName}</strong>
          <div class="text-muted" style="font-size: 11.5px;">${item.strength} &bull; ${item.dosageForm}</div>
        </td>
        <td>
          <code style="font-family: var(--font-mono); font-weight: bold; color: var(--text-heading);">${item.batchNumber}</code>
        </td>
        <td>
          <div style="font-weight: 500;">${fac?.name || item.facilityId}</div>
          <div class="text-muted" style="font-size: 11px;">${fac?.type || 'Hospital Pharmacy'}</div>
        </td>
        <td>
          <strong style="font-size: 14.5px; color: #FFFFFF; font-family: var(--font-mono);">${availableQty}</strong>
          <span class="text-muted" style="font-size: 11px;"> units</span>
        </td>
        <td style="font-family: var(--font-mono); font-size: 12px;">
          ${item.expiryDate}
        </td>
        <td>
          ${expiryBadge}
        </td>
        <td>
          <button class="btn btn-outline btn-sm btn-edit-batch" data-id="${item.id}" title="Edit batch stock quantity or expiry date">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Edit Stock</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-edit-batch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const batch = inventoryList.find(b => b.id === id);
      if (batch) openEditBatchModal(batch);
    });
  });
}

function setupEvents() {
  document.getElementById('inv-search')?.addEventListener('input', renderTableRows);
  document.getElementById('inv-filter-facility')?.addEventListener('change', renderTableRows);
  document.getElementById('inv-filter-expiry')?.addEventListener('change', renderTableRows);

  document.getElementById('btn-add-batch')?.addEventListener('click', openAddBatchModal);

  document.getElementById('btn-export-inventory')?.addEventListener('click', () => {
    exportToCSV('PharmaSync_Medicine_Stock', inventoryList.map(b => ({
      BatchID: b.id,
      BatchNumber: b.batchNumber,
      MedicineName: b.medicineName,
      Strength: b.strength,
      DosageForm: b.dosageForm,
      AvailableQuantity: b.availableQuantity || b.totalQuantity,
      ExpiryDate: b.expiryDate,
      Facility: facilitiesMap[b.facilityId]?.name || b.facilityId
    })));
    toast.success('Export Complete', 'Medicine stock exported in CSV format.');
  });
}

function openAddBatchModal() {
  const content = `
    <form id="form-add-batch" onsubmit="return false;">
      <div class="form-group">
        <label class="form-label" for="modal-batch-fac">Healthcare Facility <span class="required-pill">Required</span></label>
        <select id="modal-batch-fac" class="form-select">
          ${facilitiesList.map(f => `<option value="${f.id}">${f.name} (${f.type})</option>`).join('')}
        </select>
        <span class="form-help">Select the pharmacy or hospital location holding this medicine</span>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="modal-batch-name">Medicine Brand Name <span class="required-pill">Required</span></label>
          <input type="text" id="modal-batch-name" class="form-input" placeholder="e.g. Ceftriaxone Injection" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-generic">Generic Name / Composition</label>
          <input type="text" id="modal-batch-generic" class="form-input" placeholder="e.g. Ceftriaxone Sodium" />
        </div>
      </div>

      <div class="form-grid-3">
        <div class="form-group">
          <label class="form-label" for="modal-batch-num">Batch Number <span class="required-pill">Required</span></label>
          <input type="text" id="modal-batch-num" class="form-input" placeholder="e.g. CTX-2026-B9" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-strength">Strength / Spec <span class="required-pill">Required</span></label>
          <input type="text" id="modal-batch-strength" class="form-input" placeholder="e.g. 1g Vial" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-dosage">Dosage Form</label>
          <select id="modal-batch-dosage" class="form-select">
            <option value="Injectable">Injectable</option>
            <option value="Oral Solid">Oral Solid</option>
            <option value="IV Fluid">IV Fluid</option>
            <option value="Oral Liquid">Oral Liquid</option>
          </select>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="modal-batch-qty">Available Quantity (Units) <span class="required-pill">Required</span></label>
          <input type="number" id="modal-batch-qty" class="form-input" min="1" placeholder="500" required />
          <span class="form-help">Number of sealed units ready in stock</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-batch-expiry">Expiry Date <span class="required-pill">Required</span></label>
          <input type="date" id="modal-batch-expiry" class="form-input" required />
          <span class="form-help">Expiration date printed on package</span>
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

  const { close } = modal.open({ title: 'Add Medicine Batch to Stock', content, footer });

  // Default expiry date: 60 days from now
  const defExpiry = new Date();
  defExpiry.setDate(defExpiry.getDate() + 60);
  const expiryInput = document.getElementById('modal-batch-expiry');
  if (expiryInput) expiryInput.value = defExpiry.toISOString().split('T')[0];

  document.getElementById('btn-modal-cancel')?.addEventListener('click', close);
  
  const submitBtn = document.getElementById('btn-modal-submit');
  submitBtn?.addEventListener('click', async () => {
    const medName = document.getElementById('modal-batch-name')?.value.trim();
    const batchNum = document.getElementById('modal-batch-num')?.value.trim();
    const strength = document.getElementById('modal-batch-strength')?.value.trim();
    const qty = Number(document.getElementById('modal-batch-qty')?.value);
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
      expiryDate: expiry
    };

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Adding...';

      const res = await (api.addBatch ? api.addBatch(payload) : api.addInventoryBatch(payload));
      if (res && res.success) {
        toast.success('Batch Added', `Batch ${batchNum} (${medName}) successfully recorded in stock.`);
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
  const currentQty = batch.availableQuantity != null ? batch.availableQuantity : batch.totalQuantity;

  const content = `
    <form id="form-edit-batch" onsubmit="return false;">
      <div class="modal-info-card">
        <div class="modal-info-title">
          <span>${batch.medicineName}</span>
          <span style="font-weight: normal; color: var(--text-muted);">(${batch.strength})</span>
        </div>
        <div class="modal-info-meta">
          <span><strong>Batch:</strong> <code style="color: #ffffff; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 4px;">${batch.batchNumber}</code></span>
          <span>&bull;</span>
          <span><strong>Facility:</strong> ${facName}</span>
          <span>&bull;</span>
          <span><strong>Form:</strong> ${batch.dosageForm || 'Standard'}</span>
        </div>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label" for="modal-edit-qty">
            <span>Available Quantity (Units)</span>
            <span class="required-pill">Required</span>
          </label>
          <input type="number" id="modal-edit-qty" class="form-input" min="0" value="${currentQty}" required />
          <span class="form-help">Current stock count ready for dispensing or sharing</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-edit-expiry">
            <span>Expiry Date</span>
            <span class="required-pill">Required</span>
          </label>
          <input type="date" id="modal-edit-expiry" class="form-input" value="${batch.expiryDate}" required />
          <span class="form-help">Manufacturer expiration date (YYYY-MM-DD)</span>
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

  const { close } = modal.open({ title: 'Edit Medicine Stock', content, footer });

  document.getElementById('btn-edit-cancel')?.addEventListener('click', close);

  const submitBtn = document.getElementById('btn-edit-submit');
  submitBtn?.addEventListener('click', async () => {
    const qtyInput = document.getElementById('modal-edit-qty');
    const expiryInput = document.getElementById('modal-edit-expiry');
    const newQty = Number(qtyInput?.value);
    const newExpiry = expiryInput?.value?.trim();

    if (isNaN(newQty) || newQty < 0 || !newExpiry) {
      toast.error('Validation Error', 'Please specify a valid quantity (0 or greater) and expiry date.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Saving...';

      const payload = {
        availableQuantity: newQty,
        totalQuantity: newQty + (batch.reservedQuantity || 0),
        expiryDate: newExpiry
      };

      const res = await (api.updateBatch ? api.updateBatch(batch.id, payload) : api.updateInventoryBatch(batch.id, payload));

      if (res && res.success) {
        toast.success('Stock Updated', `Batch ${batch.batchNumber} updated to ${newQty} units (expires ${newExpiry}).`);
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
