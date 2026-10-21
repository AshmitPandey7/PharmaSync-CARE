/**
 * PharmaSync CARE — Simplified Dashboard
 * Clean counts, obvious workflow steps, and direct action lists (no redundant charts).
 */

import { api } from '../api.js';

export async function render(container) {
  const [facilitiesRes, inventoryRes, shortagesRes, transfersRes] = await Promise.all([
    api.getFacilities(),
    api.getInventory(),
    api.getShortages(),
    api.getTransfers()
  ]);

  const facilities = facilitiesRes.data || [];
  const inventory = inventoryRes.data || [];
  const shortages = shortagesRes.data || [];
  const transfers = transfersRes.data || [];

  const facilitiesMap = facilities.reduce((acc, f) => ({ ...acc, [f.id]: f }), {});

  // Compute straightforward numbers
  const totalBatches = inventory.length;
  const totalAvailableUnits = inventory.reduce((sum, item) => sum + (item.availableQuantity || item.totalQuantity || 0), 0);

  const openShortages = shortages.filter(s => s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED');
  const totalUnmetUnits = openShortages.reduce((sum, s) => sum + (s.unmetQuantity || 0), 0);

  const ongoingTransfers = transfers.filter(t => ['REQUESTED', 'APPROVED', 'DISPATCHED'].includes(t.status));
  const completedTransfers = transfers.filter(t => t.status === 'RECEIVED');

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

    <!-- 3 Simple Counts -->
    <div class="stat-card-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px;">
      <div class="stat-card stat-teal">
        <div class="stat-content">
          <span class="stat-label">Available Medicine Stock</span>
          <span class="stat-value">${totalBatches} Batches</span>
          <span class="stat-meta">${totalAvailableUnits.toLocaleString()} total units across facilities</span>
        </div>
      </div>

      <div class="stat-card stat-rose">
        <div class="stat-content">
          <span class="stat-label">Open Medicine Requests</span>
          <span class="stat-value">${openShortages.length} Requests</span>
          <span class="stat-meta text-danger">${totalUnmetUnits.toLocaleString()} units needed by clinics</span>
        </div>
      </div>

      <div class="stat-card stat-emerald">
        <div class="stat-content">
          <span class="stat-label">Transfers in Progress</span>
          <span class="stat-value">${ongoingTransfers.length} Active</span>
          <span class="stat-meta text-success">&#10003; ${completedTransfers.length} completed & verified</span>
        </div>
      </div>
    </div>

    <!-- Action Section 1: Open Medicine Requests -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">Open Medicine Requests</div>
          <div class="card-subtitle">Clinics that currently need medicine from other facilities</div>
        </div>
        <a href="#/shortages" class="btn btn-outline btn-sm">View All Requests &rarr;</a>
      </div>

      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Requesting Facility</th>
              <th>Medicine Needed</th>
              <th>Quantity Needed</th>
              <th>Urgency</th>
              <th>Needed By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${openShortages.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
                  No open medicine requests. All facilities currently have sufficient supply.
                </td>
              </tr>
            ` : openShortages.slice(0, 5).map(s => {
              const fac = facilitiesMap[s.facilityId];
              return `
                <tr>
                  <td>
                    <strong style="color: var(--text-heading);">${s.facilityName}</strong>
                    <div class="text-muted" style="font-size: 11px;">${fac?.type || 'Healthcare Facility'}</div>
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
                      Find Supplier &rarr;
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
          <div class="card-title">Recent & Ongoing Transfers</div>
          <div class="card-subtitle">Medicine shipments between sender and receiver facilities</div>
        </div>
        <a href="#/transfers" class="btn btn-outline btn-sm">View All Transfers &rarr;</a>
      </div>

      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order Code</th>
              <th>Medicine</th>
              <th>Quantity</th>
              <th>From (Supplier) &rarr; To (Requester)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${transfers.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
                  No transfer orders found. Create a transfer from the "Find Medicines" page.
                </td>
              </tr>
            ` : transfers.slice(0, 5).map(t => `
              <tr>
                <td>
                  <code style="font-weight: bold; color: var(--text-heading);">${t.transferCode}</code>
                </td>
                <td>
                  <strong>${t.medicineName}</strong>
                  <div class="text-muted" style="font-size: 11px;">${t.strength}</div>
                </td>
                <td>
                  <strong style="color: #FFFFFF; font-size: 13.5px; font-family: var(--font-mono);">${t.quantity} Units</strong>
                </td>
                <td style="font-size: 12px;">
                  <span>${t.senderFacilityName}</span>
                  <span style="color: var(--text-muted); font-weight: bold; margin: 0 6px;">&rarr;</span>
                  <strong style="color: var(--text-heading);">${t.recipientFacilityName}</strong>
                </td>
                <td>
                  <span class="badge badge-status-${t.status.toLowerCase()}">${t.status}</span>
                </td>
                <td>
                  <a href="#/transfers" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 8px;">
                    View / Update
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Student Prototype Footer Note -->
    <div style="color: var(--text-muted); font-size: 11.5px; text-align: center; padding: 8px 0;">
      Academic DBMS Project Prototype &bull; Operating on synthetic demonstration records &bull; Reset data anytime from top right
    </div>
  `;
}
