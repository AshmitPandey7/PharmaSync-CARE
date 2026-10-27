/**
 * PharmaSync CARE — System Architecture & Data Specifications
 * Technical documentation on schema design, data isolation, and algorithmic matching.
 */

import { config } from '../config.js';
import { modal } from './modal.js';

export const demoInfoModal = {
  open() {
    const isDemo = config.DEMO_MODE;

    const content = `
      <div class="demo-info-container">
        <!-- Operational Environment Matrix -->
        <div class="demo-status-grid">
          <div class="demo-status-card">
            <span class="demo-status-label">Active Environment</span>
            <strong class="demo-status-val ${isDemo ? 'text-amber' : 'text-emerald'}">
              ${isDemo ? 'Demonstration Sandbox' : 'Live Production Cluster'}
            </strong>
          </div>

          <div class="demo-status-card">
            <span class="demo-status-label">Data Persistence</span>
            <strong class="demo-status-val text-emerald">
              Active &bull; Fully Persistent
            </strong>
          </div>

          <div class="demo-status-card">
            <span class="demo-status-label">Dataset Scope</span>
            <strong class="demo-status-val text-muted">
              ${isDemo ? 'Regional Healthcare Network (Karnataka Cluster)' : 'Connected Production Database'}
            </strong>
          </div>

          <div class="demo-status-card">
            <span class="demo-status-label">Core API Gateway</span>
            <strong class="demo-status-val">
              Python Flask 3.x &bull; RESTful HTTPS
            </strong>
          </div>
        </div>

        <!-- Technical Architecture Sections -->
        <div class="arch-spec-section">
          <div class="arch-spec-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
            <span>Core Entities &amp; Relational Schema Architecture</span>
          </div>

          <div class="arch-spec-grid">
            <div class="arch-spec-card">
              <div class="arch-spec-card-title">1. Facilities Registry (<code>facilities</code>)</div>
              <p class="arch-spec-card-desc">
                Defines participant hospitals, clinics, and community pharmacies. Fields include unique identifier (<code>id</code>), facility type classification, registered bed capacity, cold-chain refrigeration certification, and geodesic latitude/longitude coordinates.
              </p>
            </div>

            <div class="arch-spec-card">
              <div class="arch-spec-card-title">2. Master Formulary (<code>medicines</code>)</div>
              <p class="arch-spec-card-desc">
                Standardized pharmaceutical registry establishing generic drug name, formulation category, dosage form, strength, storage temperature guidelines, and mandatory minimum shelf-life policy constraints.
              </p>
            </div>

            <div class="arch-spec-card">
              <div class="arch-spec-card-title">3. Batch Inventory (<code>inventory_batches</code>)</div>
              <p class="arch-spec-card-desc">
                Granular lot-level tracking. Foreign keys: <code>facilityId</code> &rarr; facilities, <code>medicineId</code> &rarr; medicines. Tracks manufacturer batch numbers, expiry dates, total quantity, active reservations, and algorithmically calculated transferable surplus.
              </p>
            </div>

            <div class="arch-spec-card">
              <div class="arch-spec-card-title">4. Shortage Requisitions (<code>shortage_requests</code>)</div>
              <p class="arch-spec-card-desc">
                Formal clinical demand tickets. Foreign key: <code>facilityId</code> &rarr; facilities. Captures exact required quantity, fulfilled quantity, unmet balance, required-by deadline, and severity triage level (ROUTINE, HIGH, EMERGENCY).
              </p>
            </div>

            <div class="arch-spec-card">
              <div class="arch-spec-card-title">5. Custody Transfers (<code>transfers</code>)</div>
              <p class="arch-spec-card-desc">
                Inter-facility chain-of-custody manifests. Foreign keys: <code>senderFacilityId</code>, <code>recipientFacilityId</code>, <code>batchId</code>. Governed by a finite-state machine (PROPOSED &rarr; APPROVED &rarr; DISPATCHED &rarr; RECEIVED) with transit logs and courier assignments.
              </p>
            </div>

            <div class="arch-spec-card">
              <div class="arch-spec-card-title">6. Audit &amp; Compliance Ledger (<code>audit_logs</code>)</div>
              <p class="arch-spec-card-desc">
                Immutable chronological event trail. Records every stock reservation, requisition update, dispatch, and receipt with verified user ID, operational timestamp, and pharmacist sign-off notes for regulatory traceability.
              </p>
            </div>
          </div>
        </div>

        <!-- Matching & Optimization Engine -->
        <div class="arch-spec-section" style="margin-top: 14px;">
          <div class="arch-spec-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
            <span>Multi-Criteria Matching &amp; Allocation Pipeline</span>
          </div>

          <div class="arch-spec-card" style="margin-top: 8px;">
            <ul class="arch-spec-bullets">
              <li><strong>Pharmaceutical Equivalency:</strong> Ensures 100% active generic compound, formulation, and strength compatibility between requested and donor lots.</li>
              <li><strong>Shelf-Life Safety Boundary:</strong> Enforces a strict &ge; 45-day remaining shelf-life threshold (batches expiring in &lt; 15 days are automatically blocked from transfer).</li>
              <li><strong>Emergency Reserve Protection:</strong> Deducts local projected demand plus a 20% safety threshold before calculating redistributable surplus, ensuring donor facilities never run short.</li>
              <li><strong>Geospatial Proximity Clustering:</strong> Computes transit distance using the Haversine geodesic formula to prioritize local regional transfers and minimize courier transit time.</li>
              <li><strong>Atomic Reservation Locking:</strong> When a transfer order is proposed, the platform transactionally reserves units from the donor batch, preventing concurrent double-allocation race conditions.</li>
            </ul>
          </div>
        </div>

        <!-- Environment Isolation Architecture -->
        <div class="arch-spec-section" style="margin-top: 14px;">
          <div class="arch-spec-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Environment Isolation &amp; Data Integrity</span>
          </div>

          <div class="arch-spec-card" style="margin-top: 8px;">
            <p class="arch-spec-card-desc" style="margin: 0;">
              <strong>Strict Boundary Separation:</strong> The demonstration sandbox operates in an isolated client storage partition, enabling full scenario exploration without modifying operational database records. Switching to Live Mode activates real-time REST API endpoints backed by the primary database cluster. State reset operations strictly refresh the local sandbox baseline, leaving production tables untouched.
            </p>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span class="text-muted" style="font-size: 11px;">PharmaSync CARE &bull; Healthcare Inventory Redistribution Network</span>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-close-demo-info">Close</button>
      </div>
    `;

    const { close } = modal.open({
      title: 'System Architecture & Data Specifications',
      content,
      footer
    });

    document.getElementById('btn-close-demo-info')?.addEventListener('click', close);
  }
};
