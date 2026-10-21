/**
 * PharmaSync CARE — What If? Analysis Page
 * Sensitivity testing, parameter perturbation, and explainable decision pivots.
 */

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-400)" stroke-width="2.2">
            <line x1="4" y1="21" x2="4" y2="14"/>
            <line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/>
            <line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/>
            <line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
          What If? Analysis
        </h1>
        <p class="page-description">
          See how changing stock counts, local demand, remaining shelf life, or transport distance alters redistribution recommendations.
        </p>
      </div>
    </div>

    <!-- Active Case Overview -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">Subject Case: Order #TRF-2026-001 (Ceftriaxone 1g Injection)</div>
          <div class="card-subtitle">Simulating transfer of 120 units from Apex Central Hospital to Green Valley Health Centre</div>
        </div>
        <span class="badge badge-rec-transfer">Original Status: Approved</span>
      </div>

      <!-- Directional Flow Card -->
      <div class="direction-flow-card" style="margin: 6px 0 16px 0;">
        <div class="facility-endpoint-box">
          <span class="endpoint-role">Donor Facility</span>
          <div class="endpoint-name">Apex Central Hospital</div>
          <div class="endpoint-type">Hospital Pharmacy</div>
        </div>

        <div class="flow-arrow-indicator">
          <span class="flow-arrow-icon">&rarr;</span>
          <span class="flow-distance-text">120 Units (13.5 km)</span>
        </div>

        <div class="facility-endpoint-box">
          <span class="endpoint-role">Recipient Facility</span>
          <div class="endpoint-name">Green Valley Health Centre</div>
          <div class="endpoint-type">Rural Health Centre</div>
        </div>
      </div>

      <!-- Sensitivity Perturbation Controls -->
      <div style="background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px;">
        <div class="slider-control-group">
          <div class="slider-header">
            <span>Donor Stock Level:</span>
            <strong id="de-label-stock" style="color: var(--teal-400);">550 Units</strong>
          </div>
          <input type="range" id="de-slider-stock" class="slider-input" min="100" max="800" step="25" value="550" />
          <span class="form-help">Current stock at donor hospital</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Donor Local Demand:</span>
            <strong id="de-label-demand" style="color: var(--teal-400);">200 Units/mo</strong>
          </div>
          <input type="range" id="de-slider-demand" class="slider-input" min="100" max="600" step="25" value="200" />
          <span class="form-help">Expected inpatient monthly consumption</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Remaining Shelf Life:</span>
            <strong id="de-label-expiry" style="color: var(--teal-400);">40 Days</strong>
          </div>
          <input type="range" id="de-slider-expiry" class="slider-input" min="5" max="90" step="1" value="40" />
          <span class="form-help">Minimum safety threshold: 15 days</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Road Transport Distance:</span>
            <strong id="de-label-dist" style="color: var(--teal-400);">14 km</strong>
          </div>
          <input type="range" id="de-slider-dist" class="slider-input" min="5" max="120" step="5" value="14" />
          <span class="form-help">Distance to receiving clinic</span>
        </div>
      </div>
    </div>

    <!-- Side-by-Side: Original Decision vs What-If Recalculated -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;" id="de-comparison-grid">
      <!-- Baseline Panel -->
      <div class="card">
        <div class="card-header">
          <div class="card-title" style="font-size: 14.5px;">1. Original Baseline Decision</div>
          <span class="badge badge-rec-transfer">Transfer Viable</span>
        </div>
        <div style="font-size: 12.5px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Stock Available to Share:</span>
            <strong style="color: var(--emerald-400);">+280 Units</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Donor Safety Cushion:</span>
            <span style="color: var(--emerald-400); font-weight: var(--font-medium);">&#10003; 70 Units Retained Locally</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Remaining Shelf Life:</span>
            <span style="color: var(--emerald-400); font-weight: var(--font-medium);">&#10003; 40d &ge; 15d Threshold</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Transfer Priority Score:</span>
            <strong style="color: var(--teal-400); font-size: 15px;">88 / 100</strong>
          </div>
          <div class="explain-card" style="margin: 0; padding: 10px; font-size: 11.5px; border-left-color: var(--teal-500);">
            <strong>Original Result:</strong> Recommended for immediate transfer. Surplus covers recipient request without threatening donor reserve.
          </div>
        </div>
      </div>

      <!-- Recalculated Sensitivity Panel -->
      <div class="card" id="de-adjusted-card" style="border-width: 2px;">
        <div class="card-header">
          <div class="card-title" style="font-size: 14.5px;">2. What If? Recalculated Result</div>
          <span class="badge" id="de-adjusted-badge">Evaluating</span>
        </div>
        <div style="font-size: 12.5px; display: flex; flex-direction: column; gap: 10px;" id="de-adjusted-details">
          <!-- Dynamic metrics -->
        </div>
      </div>
    </div>

    <!-- Explanatory Pivot Narrative -->
    <div class="explain-card" id="de-narrative-card">
      <!-- Dynamic narrative text -->
    </div>
  `;

  setupExplorerEvents();
  evaluateSensitivity();
}

function evaluateSensitivity() {
  const stock = Number(document.getElementById('de-slider-stock')?.value || 550);
  const demand = Number(document.getElementById('de-slider-demand')?.value || 200);
  const expiryDays = Number(document.getElementById('de-slider-expiry')?.value || 40);
  const distance = Number(document.getElementById('de-slider-dist')?.value || 14);

  const safetyBuffer = Math.round(demand * 0.25);
  const localNeeds = demand + safetyBuffer;
  const recalculatedSurplus = Math.max(0, stock - localNeeds);

  let verdict = 'TRANSFER VIABLE';
  let badgeClass = 'badge-rec-transfer';
  let cardBorder = 'var(--teal-500)';
  let score = 0;
  let pivotReasons = [];

  if (expiryDays < 15) {
    verdict = 'BLOCKED (SAFETY)';
    badgeClass = 'badge-rec-block';
    cardBorder = 'var(--rose-500)';
    score = 12;
    pivotReasons.push(`Remaining shelf life (${expiryDays}d) is below the 15-day safety minimum. Medicine cannot be dispatched.`);
  } else if (recalculatedSurplus <= 0) {
    verdict = 'RETAIN FOR LOCAL USE';
    badgeClass = 'badge-rec-retain';
    cardBorder = 'var(--sky-500)';
    score = 22;
    pivotReasons.push(`Donor stock (${stock} units) is completely needed internally to cover local consumption (${demand}) + safety cushion (${safetyBuffer}). Transferring would cause a local stockout.`);
  } else if (recalculatedSurplus < 120) {
    verdict = 'PARTIAL TRANSFER ONLY';
    badgeClass = 'badge-rec-monitor';
    cardBorder = 'var(--amber-500)';
    score = 58;
    pivotReasons.push(`Stock available to share (${recalculatedSurplus} units) is less than the requested 120 units. Recommend a partial transfer of ${recalculatedSurplus} units.`);
  } else if (distance > 60) {
    verdict = 'MONITOR / DISTANT ROUTE';
    badgeClass = 'badge-rec-monitor';
    cardBorder = 'var(--amber-500)';
    score = 64;
    pivotReasons.push(`Distance (${distance} km) exceeds the standard 60 km local zone. Requires dedicated transport arrangement.`);
  } else {
    verdict = 'TRANSFER VIABLE';
    badgeClass = 'badge-rec-transfer';
    cardBorder = 'var(--emerald-500)';
    score = Math.min(100, Math.round(75 + (recalculatedSurplus / 400) * 20));
    pivotReasons.push(`Stock available to share (+${recalculatedSurplus} units) comfortably covers the request while keeping full local cushion (${safetyBuffer} units).`);
  }

  // Update UI Elements
  const adjCard = document.getElementById('de-adjusted-card');
  const adjBadge = document.getElementById('de-adjusted-badge');
  const adjDetails = document.getElementById('de-adjusted-details');
  const narrCard = document.getElementById('de-narrative-card');

  if (adjCard) adjCard.style.borderColor = cardBorder;
  if (adjBadge) {
    adjBadge.className = `badge ${badgeClass}`;
    adjBadge.textContent = verdict;
  }

  if (adjDetails) {
    adjDetails.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">Stock Available to Share:</span>
        <strong style="font-size: 14px; color: ${recalculatedSurplus > 0 ? 'var(--emerald-400)' : 'var(--rose-400)'};">
          ${recalculatedSurplus > 0 ? `+${recalculatedSurplus} Units` : '0 Units (Deficit)'}
        </strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">Donor Local Needs:</span>
        <span>Requires ${localNeeds} Units (${demand} demand + ${safetyBuffer} cushion)</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">Adjusted Shelf Life:</span>
        <span>${expiryDays} Days remaining</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">Adjusted Priority Score:</span>
        <strong style="font-size: 16px; color: var(--text-heading);">${score} / 100</strong>
      </div>
      <div class="explain-card" style="margin: 0; padding: 10px; font-size: 11.5px; border-left-color: ${cardBorder};">
        <strong>Why this verdict was reached:</strong>
        <ul class="explain-reasons-list" style="margin-top: 4px;">
          ${pivotReasons.map(r => `<li><span class="bullet-icon">&bull;</span><span>${r}</span></li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (narrCard) {
    narrCard.innerHTML = `
      <div class="explain-header">
        <span style="font-weight: var(--font-bold); color: var(--text-heading);">Why Did The Decision Change?</span>
        <span class="badge ${badgeClass}">Explainable Audit Trace</span>
      </div>
      <p style="margin: 0; color: var(--text-main); font-size: 12.5px; line-height: 1.5;">
        ${pivotReasons.join(' ')} <em>Notice that changing real-world conditions immediately updates the recommendation. Strict patient safety rules are never bypassed by high priority scores.</em>
      </p>
    `;
  }
}

function setupExplorerEvents() {
  const sStock = document.getElementById('de-slider-stock');
  const sDemand = document.getElementById('de-slider-demand');
  const sExpiry = document.getElementById('de-slider-expiry');
  const sDist = document.getElementById('de-slider-dist');

  sStock?.addEventListener('input', (e) => {
    document.getElementById('de-label-stock').textContent = `${e.target.value} Units`;
    evaluateSensitivity();
  });
  sDemand?.addEventListener('input', (e) => {
    document.getElementById('de-label-demand').textContent = `${e.target.value} Units/mo`;
    evaluateSensitivity();
  });
  sExpiry?.addEventListener('input', (e) => {
    document.getElementById('de-label-expiry').textContent = `${e.target.value} Days`;
    evaluateSensitivity();
  });
  sDist?.addEventListener('input', (e) => {
    document.getElementById('de-label-dist').textContent = `${e.target.value} km`;
    evaluateSensitivity();
  });
}
