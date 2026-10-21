/**
 * PharmaSync CARE — Stock Available to Share Page (Redesigned)
 * Clear plain-English explanations, dark theme, and progressive disclosure for formula details.
 */

import { api } from '../api.js';
import { toast } from '../components/toast.js';
import { modal } from '../components/modal.js';
import { exportToCSV } from '../components/export-csv.js';

let rescueCandidates = [];
let facilitiesMap = {};
let facilitiesList = [];

export async function render(container) {
  const [rescueRes, facRes] = await Promise.all([
    api.getRescueCandidates(),
    api.getFacilities()
  ]);

  rescueCandidates = rescueRes.data || [];
  facilitiesList = facRes.data || [];
  facilitiesMap = facilitiesList.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});

  // Compute breakdown counts
  const transferCount = rescueCandidates.filter(c => c.recommendation === 'TRANSFER').length;
  const monitorCount = rescueCandidates.filter(c => c.recommendation === 'MONITOR').length;
  const retainCount = rescueCandidates.filter(c => c.recommendation === 'RETAIN').length;
  const blockCount = rescueCandidates.filter(c => c.recommendation === 'BLOCK').length;

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-300)" stroke-width="2.2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          Stock Available to Share
        </h1>
        <p class="page-description">Identifies medicines that exceed local facility needs and can be shared with other hospitals or pharmacies before expiry.</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-outline btn-sm" id="btn-export-rescue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Sharing Log
        </button>
      </div>
    </div>

    <!-- Plain-English Safety Guidance -->
    <div class="explain-card" style="margin-bottom: 16px;">
      <div class="explain-header">
        <span>How Medicine Sharing is Decided:</span>
        <span class="badge badge-exp-safe">Patient Safety First</span>
      </div>
      <p style="margin: 0; font-size: 12.5px; color: var(--text-main); line-height: 1.5;">
        A medicine is only marked <strong>Ready to Share</strong> if your facility has enough stock to cover expected patient demand plus an emergency safety reserve. Batches with less than 15 days before expiry are automatically blocked to prevent medicines from expiring en route.
      </p>

      <!-- Progressive Disclosure: Technical details for academic demo -->
      <details class="tech-details-drawer">
        <summary>View Technical Calculation & Scoring Rules (DBMS Evaluation)</summary>
        <div style="margin-top: 8px; color: var(--slate-300); line-height: 1.6;">
          <div>&bull; <strong>Sharing Formula:</strong> <code>Stock Available to Share = Available Stock - (Expected Demand Before Expiry + Safety Reserve Cushion)</code></div>
          <div>&bull; <strong>Transfer Priority Score (0-100):</strong> Combines days to expiry (up to 45 pts), surplus volume ratio (up to 35 pts), and critical treatment value (up to 20 pts).</div>
          <div>&bull; <strong>Mandatory Safety Inviolability:</strong> Algorithmic scores never override clinical safety thresholds (15-day transit floor & refrigerated route verification).</div>
        </div>
      </details>
    </div>

    <!-- Friendly Filter Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap;">
      <button class="btn btn-sm btn-outline filter-tab-btn active" data-filter="ALL">
        All Batches (${rescueCandidates.length})
      </button>
      <button class="btn btn-sm btn-outline filter-tab-btn" data-filter="TRANSFER">
        <span class="badge badge-rec-transfer">Ready to Share (${transferCount})</span>
      </button>
      <button class="btn btn-sm btn-outline filter-tab-btn" data-filter="MONITOR">
        <span class="badge badge-rec-monitor">Monitor (${monitorCount})</span>
      </button>
      <button class="btn btn-sm btn-outline filter-tab-btn" data-filter="RETAIN">
        <span class="badge badge-rec-retain">Keep for Local Care (${retainCount})</span>
      </button>
      <button class="btn btn-sm btn-outline filter-tab-btn" data-filter="BLOCK">
        <span class="badge badge-rec-block">Safety Hold (${blockCount})</span>
      </button>
    </div>

    <!-- Table of Stock to Share -->
    <div class="table-container">
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Holding Facility (Donor)</th>
              <th>Total Available</th>
              <th>Expected Local Need</th>
              <th>Local Reserve</th>
              <th>Available to Share</th>
              <th>Expiry</th>
              <th title="Relative priority for sharing before expiration">Transfer Priority</th>
              <th>Recommendation</th>
              <th style="min-width: 220px;">Why This Can or Cannot Be Shared</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="rescue-table-body">
            <!-- Dynamic rows -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderRescueRows('ALL');
  setupFilterEvents();
}

function renderRescueRows(filter = 'ALL') {
  const tbody = document.getElementById('rescue-table-body');
  if (!tbody) return;

  const filtered = filter === 'ALL'
    ? rescueCandidates
    : rescueCandidates.filter(c => c.recommendation === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11">
          <div class="empty-state">
            <div class="empty-state-title">No medicines in this category</div>
            <div class="empty-state-desc">Select a different filter above to review other stock.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const recLabels = {
    TRANSFER: 'Ready to Share',
    MONITOR: 'Monitor Expiry',
    RETAIN: 'Keep Locally',
    BLOCK: 'Safety Hold'
  };

  const recBadgeMap = {
    TRANSFER: 'badge-rec-transfer',
    MONITOR: 'badge-rec-monitor',
    RETAIN: 'badge-rec-retain',
    BLOCK: 'badge-rec-block'
  };

  tbody.innerHTML = filtered.map(item => {
    let scoreClass = 'score-low';
    if (item.recommendation === 'BLOCK') scoreClass = 'score-blocked';
    else if (item.priorityScore >= 70) scoreClass = 'score-high';
    else if (item.priorityScore >= 40) scoreClass = 'score-med';

    const fac = facilitiesMap[item.facilityId] || { name: item.facilityId, type: 'Facility' };

    return `
      <tr>
        <td>
          <div style="font-weight: var(--font-semibold); color: var(--text-heading);">${item.medicineName}</div>
          <div class="text-muted" style="font-size: 11px;">
            ${item.strength} &bull; <code style="color: var(--slate-300);">${item.batchNumber}</code>
          </div>
        </td>
        <td style="font-size: 12px;">
          <div>${fac.name}</div>
          <span class="badge badge-fac-hospital" style="font-size: 9.5px; padding: 1px 5px;">${fac.type}</span>
        </td>
        <td><strong>${item.availableQuantity.toLocaleString()}</strong></td>
        <td><span class="text-muted">${item.expectedMonthlyDemand || 100}</span></td>
        <td><span class="text-muted">${item.safetyStockThreshold || 30}</span></td>
        <td>
          ${item.potentialSurplus > 0
            ? `<strong style="color: var(--emerald-400); font-size: 13.5px;">+${item.potentialSurplus} Units</strong>`
            : `<span class="text-muted" style="font-size: 11px;">0 (Needed locally)</span>`
          }
        </td>
        <td>
          <div style="font-family: var(--font-mono); font-weight: var(--font-semibold); ${item.daysToExpiry <= 45 ? 'color: var(--rose-400);' : ''}">
            ${item.daysToExpiry}d left
          </div>
          <div class="text-muted" style="font-size: 10px;">${item.expiryDate}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div class="rescue-score-badge ${scoreClass}">
              ${item.priorityScore}
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${recBadgeMap[item.recommendation]}">${recLabels[item.recommendation]}</span>
        </td>
        <td style="font-size: 11.5px; color: var(--text-main); line-height: 1.4;">
          ${item.reasons.join(' ')}
        </td>
        <td>
          ${item.recommendation === 'TRANSFER' ? `
            <button class="btn btn-primary btn-sm btn-propose-rescue" data-id="${item.id}">
              Propose Transfer
            </button>
          ` : item.recommendation === 'BLOCK' ? `
            <button class="btn btn-outline btn-sm" disabled style="opacity: 0.4;">
              Safety Hold
            </button>
          ` : `
            <button class="btn btn-outline btn-sm btn-view-rescue" data-id="${item.id}">
              Details
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-propose-rescue').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = rescueCandidates.find(c => c.id === e.target.dataset.id);
      if (item) openProposeRescueTransferModal(item);
    });
  });

  tbody.querySelectorAll('.btn-view-rescue').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = rescueCandidates.find(c => c.id === e.target.dataset.id);
      if (item) openInspectRescueModal(item);
    });
  });
}

function setupFilterEvents() {
  document.querySelectorAll('.filter-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
      const targetBtn = e.target.closest('.filter-tab-btn');
      targetBtn.classList.add('active');
      renderRescueRows(targetBtn.dataset.filter);
    });
  });

  document.getElementById('btn-export-rescue')?.addEventListener('click', () => {
    exportToCSV('PharmaSync_Stock_Available_To_Share', rescueCandidates.map(c => ({
      BatchNumber: c.batchNumber,
      Medicine: c.medicineName,
      HoldingFacility: facilitiesMap[c.facilityId]?.name || c.facilityId,
      TotalAvailable: c.availableQuantity,
      ExpectedLocalDemand: c.expectedMonthlyDemand,
      LocalSafetyReserve: c.safetyStockThreshold,
      StockAvailableToShare: c.potentialSurplus,
      DaysToExpiry: c.daysToExpiry,
      TransferPriority: c.priorityScore,
      Recommendation: c.recommendation,
      Reason: c.reasons[0] || ''
    })));
    toast.success('Export Complete', 'Medicine sharing records downloaded in CSV format.');
  });
}

function openProposeRescueTransferModal(item) {
  const donorFac = facilitiesMap[item.facilityId] || { name: item.facilityId, type: 'Facility' };

  const content = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <!-- Directional Transfer Summary Box -->
      <div class="direction-flow-card">
        <div class="facility-endpoint-box donor">
          <span class="text-muted" style="font-size: 10px; text-transform: uppercase;">Supplying Facility (Donor)</span>
          <strong style="color: var(--text-heading); font-size: 13px;">${donorFac.name}</strong>
          <span class="badge badge-fac-hospital" style="font-size: 9.5px; padding: 1px 5px; align-self: flex-start;">${donorFac.type}</span>
          <div style="font-size: 11px; margin-top: 4px; color: var(--emerald-400);">Available to Share: <strong>${item.potentialSurplus} units</strong></div>
        </div>

        <div class="direction-arrow-badge">
          <span>Transfer</span>
          <span style="font-size: 18px;">&rarr;</span>
        </div>

        <div class="facility-endpoint-box recipient">
          <span class="text-muted" style="font-size: 10px; text-transform: uppercase;">Receiving Facility (Requester)</span>
          <select id="rescue-recipient-select" class="form-select" style="font-size: 12px; padding: 4px 6px;">
            ${facilitiesList.filter(f => f.id !== item.facilityId).map(f => `
              <option value="${f.id}">${f.name} (${f.type})</option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Medicine Being Transferred:</label>
        <div style="background: var(--navy-850); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 13px;">
          <strong>${item.medicineName}</strong> (${item.strength}) &bull; Batch: <code>${item.batchNumber}</code>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Quantity to Transfer (Max: ${item.potentialSurplus} units): <span class="required">*</span></label>
        <input type="number" id="rescue-units-input" class="form-input" min="1" max="${item.potentialSurplus}" value="${Math.min(item.potentialSurplus, 100)}" />
      </div>

      <div class="form-group">
        <label class="form-label">Transfer Urgency:</label>
        <select id="rescue-urgency-select" class="form-select">
          <option value="HIGH">High Priority (Protect Pre-Expiry Medicine)</option>
          <option value="ROUTINE" selected>Routine Scheduled Redistribution</option>
          <option value="EMERGENCY">Emergency Need</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Verification Note (Optional):</label>
        <textarea id="rescue-note-input" class="form-textarea" rows="2" placeholder="e.g. Verified cold chain integrity; batch packaging intact."></textarea>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-outline btn-sm" id="btn-rescue-cancel">Cancel</button>
    <button class="btn btn-primary btn-sm" id="btn-rescue-create">Submit Transfer Order</button>
  `;

  const { close } = modal.open({ title: 'Propose Medicine Transfer', content, footer, size: 'lg' });

  document.getElementById('btn-rescue-cancel')?.addEventListener('click', close);
  document.getElementById('btn-rescue-create')?.addEventListener('click', async () => {
    const qty = Number(document.getElementById('rescue-units-input')?.value);
    const recipientId = document.getElementById('rescue-recipient-select')?.value;
    const recipientFac = facilitiesMap[recipientId] || { name: recipientId };
    const urgency = document.getElementById('rescue-urgency-select')?.value;
    const note = document.getElementById('rescue-note-input')?.value;

    if (!qty || qty <= 0 || qty > item.potentialSurplus) {
      toast.error('Invalid Quantity', `Quantity must be between 1 and ${item.potentialSurplus} units.`);
      return;
    }

    const res = await api.createTransfer({
      senderFacilityId: item.facilityId,
      senderFacilityName: donorFac.name,
      recipientFacilityId: recipientId,
      recipientFacilityName: recipientFac.name,
      batchId: item.id,
      medicineName: item.medicineName,
      strength: item.strength,
      quantity: qty,
      urgency,
      notes: note || 'Drafted from stock available to share.'
    });

    if (res.success) {
      toast.success('Transfer Order Created', `Order ${res.data.transferCode} proposed from ${donorFac.name} to ${recipientFac.name}.`);
      close();
    }
  });
}

function openInspectRescueModal(item) {
  const fac = facilitiesMap[item.facilityId] || { name: item.facilityId, type: 'Facility' };

  const content = `
    <div style="font-size: 13px; display: flex; flex-direction: column; gap: 10px;">
      <div><strong>Medicine:</strong> ${item.medicineName} (${item.strength})</div>
      <div><strong>Holding Facility:</strong> ${fac.name} (${fac.type})</div>
      <div><strong>Batch:</strong> <code>${item.batchNumber}</code></div>
      <div><strong>Expiry Date:</strong> ${item.expiryDate} (${item.daysToExpiry} days remaining)</div>
      <div style="background: var(--navy-850); border: 1px solid var(--border-subtle); padding: 10px; border-radius: var(--radius-sm); display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>Available Stock: <strong>${item.availableQuantity} units</strong></div>
        <div>Expected Demand: <strong>${item.expectedMonthlyDemand || 100} units</strong></div>
        <div>Local Reserve: <strong>${item.safetyStockThreshold || 30} units</strong></div>
        <div>Stock to Share: <strong style="color: var(--emerald-400);">${item.potentialSurplus} units</strong></div>
      </div>
      <div style="background: var(--navy-850); padding: 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--teal-300);">
        <strong>Why this recommendation:</strong>
        <div style="margin-top: 4px; color: var(--text-main); font-size: 12px;">${item.reasons.join(' ')}</div>
      </div>
    </div>
  `;

  modal.open({
    title: `Medicine Stock Details — ${item.batchNumber}`,
    content,
    footer: `<button class="btn btn-outline btn-sm" onclick="document.querySelector('.modal-close-btn').click()">Dismiss</button>`
  });
}
