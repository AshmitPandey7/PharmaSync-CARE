/**
 * PharmaSync CARE — Demo Data Info & Academic Viva Architecture Panel
 * Accurate, verified technical details for professor evaluation and viva defense.
 */

import { config } from '../config.js';
import { modal } from './modal.js';

export const demoInfoModal = {
  open() {
    const isDemo = config.DEMO_MODE;
    const storageLocation = isDemo
      ? 'Client Browser localStorage ("pharmasync_demo_state_v4") with deterministic in-memory session sync'
      : 'Python Flask REST API (http://127.0.0.1:5000/api) connected to MongoDB / in-memory mongomock database ("pharmasync_care")';

    const content = `
      <div class="demo-info-container">
        <!-- Live Status Matrix -->
        <div class="demo-status-grid">
          <div class="demo-status-card">
            <span class="demo-status-label">Active Mode</span>
            <strong class="demo-status-val ${isDemo ? 'text-amber' : 'text-emerald'}">
              ${isDemo ? 'DEMO MODE (Presentation Mode)' : 'LIVE MODE (Database Mode)'}
            </strong>
          </div>

          <div class="demo-status-card">
            <span class="demo-status-label">Data Persistence</span>
            <strong class="demo-status-val text-emerald">
              YES &bull; Persists Across Refreshes
            </strong>
          </div>

          <div class="demo-status-card">
            <span class="demo-status-label">Data Nature</span>
            <strong class="demo-status-val text-muted">
              ${isDemo ? '100% Synthetic (Indian Healthcare Network)' : 'Live Operational Records'}
            </strong>
          </div>

          <div class="demo-status-card">
            <span class="demo-status-label">Backend Connection</span>
            <strong class="demo-status-val">
              Python Flask 3.x &bull; Port 5000
            </strong>
          </div>
        </div>

        <!-- Technical Viva Defense Section -->
        <div class="viva-qa-section">
          <div class="viva-qa-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>DBMS Viva Questions &amp; Technical Answers</span>
          </div>

          <div class="viva-qa-list">
            <div class="viva-qa-item">
              <div class="viva-q">1. Where is the demo data actually stored?</div>
              <div class="viva-a">
                In <strong>Demo Mode</strong>, the demonstration dataset is stored in browser <code>localStorage</code> under the key <code>pharmasync_demo_state_v4</code>. When switching to <strong>Live Mode</strong>, data reads and writes connect directly through the Python Flask backend to the <code>pharmasync_care</code> database (using PyMongo / mongomock).
              </div>
            </div>

            <div class="viva-qa-item">
              <div class="viva-q">2. What are the database entities, tables, and foreign keys?</div>
              <div class="viva-a">
                The schema consists of 6 core entities with referential integrity:
                <ul class="viva-bullets">
                  <li><strong>facilities</strong> (Primary Key: <code>id</code>) &mdash; Healthcare facilities, bed capacity, license numbers, geocoordinates.</li>
                  <li><strong>medicines</strong> (Primary Key: <code>id</code>) &mdash; Generic name, dosage formulation, category, minimum shelf-life policy.</li>
                  <li><strong>inventory_batches</strong> (Primary Key: <code>id</code>, Foreign Keys: <code>facilityId</code> &rarr; facilities, <code>medicineId</code> &rarr; medicines) &mdash; Batch numbers, expiry dates, total/reserved/available quantities.</li>
                  <li><strong>shortage_requests</strong> (Primary Key: <code>id</code>, Foreign Key: <code>facilityId</code> &rarr; facilities) &mdash; Requisitions, unmet quantity, clinical urgency level.</li>
                  <li><strong>transfers</strong> (Primary Key: <code>id</code>, Foreign Keys: <code>senderFacilityId</code>, <code>recipientFacilityId</code>, <code>batchId</code>) &mdash; Custody manifests and lifecycle status.</li>
                  <li><strong>audit_logs</strong> (Primary Key: <code>id</code>) &mdash; Regulatory audit trail of transitions with timestamps and user roles.</li>
                </ul>
              </div>
            </div>

            <div class="viva-qa-item">
              <div class="viva-q">3. How is Demo Mode separated from Live Mode?</div>
              <div class="viva-a">
                <strong>Strict Data Isolation:</strong> Demo Mode routes all operations through the client-side state store and never writes to or modifies the live database. Live Mode issues HTTP requests to <code>/api/*</code> endpoints. Switching modes never overwrites, deletes, or cross-contaminates records between environments.
              </div>
            </div>

            <div class="viva-qa-item">
              <div class="viva-q">4. How does the Reset Demo Data operation work?</div>
              <div class="viva-a">
                Resetting Demo Mode executes an atomic state restoration: it clears the modified state in <code>localStorage</code> and reinstantiates the pristine baseline Indian healthcare dataset. Live database tables are completely untouched.
              </div>
            </div>

            <div class="viva-qa-item">
              <div class="viva-q">5. Do changes persist after refreshing the browser?</div>
              <div class="viva-a">
                <strong>Yes.</strong> Newly added medicine batches, newly created transfers, and status updates to "RECEIVED" are serialized and saved immediately. Refreshing the browser (<code>F5</code>) reloads the updated state.
              </div>
            </div>

            <div class="viva-qa-item">
              <div class="viva-q">6. How does the supplier-matching algorithm work in DBMS terms?</div>
              <div class="viva-a">
                The matching query performs a multi-attribute filter evaluating 4 criteria:
                <strong>(1) Formulation compatibility:</strong> Exact generic match.
                <strong>(2) Shelf-life constraint:</strong> <code>(expiry_date - current_date) &ge; 45 days</code>.
                <strong>(3) Proximity:</strong> Haversine distance formula using latitude/longitude.
                <strong>(4) Safety stock reserve:</strong> Ensures available surplus exceeds the 20% local safety buffer.
              </div>
            </div>

            <div class="viva-qa-item">
              <div class="viva-q">7. What are the current architectural limitations?</div>
              <div class="viva-a">
                While Live Mode supports distributed MongoDB Atlas clusters, offline development utilizes mongomock/in-memory fallback when an external Atlas cluster URI is not configured in <code>.env</code>. Multi-region cold-chain IoT telemetry is simulated using timestamped manifest events rather than physical hardware sensors.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span class="text-muted" style="font-size: 11px;">PharmaSync CARE &bull; Academic Demonstration Architecture</span>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-close-demo-info">Close</button>
      </div>
    `;

    const { close } = modal.open({
      title: 'Demo Data Architecture & DBMS Viva Defense',
      content,
      footer
    });

    document.getElementById('btn-close-demo-info')?.addEventListener('click', close);
  }
};
