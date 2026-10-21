/**
 * PharmaSync CARE — Fair Allocation Page
 * Plain-English equity distribution, side-by-side FCFS vs FairShare comparison,
 * and progressive disclosure of technical formulas.
 */

import { api } from '../api.js';

let chartInstance = null;
let currentSimulationData = null;

export async function render(container) {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-400)" stroke-width="2.2">
            <path d="M3 3v18h18"/>
            <path d="M18 17V9"/>
            <path d="M13 17V5"/>
            <path d="M8 17v-3"/>
          </svg>
          Fair Allocation
        </h1>
        <p class="page-description">
          Ensure medicines are shared fairly across all healthcare facilities when demand exceeds available supply.
        </p>
      </div>
    </div>

    <!-- Operational Boundary Notice -->
    <div class="explain-card" style="border-left-color: var(--amber-500); margin-bottom: 20px;">
      <div class="explain-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber-400)" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style="font-weight: var(--font-bold); color: var(--text-heading);">Logistics Balancing Notice</span>
        </div>
        <span class="badge badge-exp-warning">Non-Clinical Algorithm</span>
      </div>
      <p style="font-size: 12px; color: var(--text-main); margin: 0; line-height: 1.5;">
        Fair Allocation is a supply-chain balancing method designed to prevent smaller or remote health centers from being completely starved of stock when large hospitals request medicines first. <strong>It does not make clinical triage or bedside decisions.</strong>
      </p>
    </div>

    <!-- Request & Supply Overview Numbers -->
    <div class="stat-card-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); margin-bottom: 20px;">
      <div class="stat-card stat-teal">
        <div class="stat-content">
          <span class="stat-label">Total Medicine Requested</span>
          <span class="stat-value">290 Units</span>
          <span class="stat-meta">Requested across 3 facilities</span>
        </div>
      </div>

      <div class="stat-card stat-emerald">
        <div class="stat-content">
          <span class="stat-label">Available from Donor</span>
          <span class="stat-value">200 Units</span>
          <span class="stat-meta">Surplus stock from 1 donor</span>
        </div>
      </div>

      <div class="stat-card stat-sky">
        <div class="stat-content">
          <span class="stat-label">Quantity That Can Be Supplied</span>
          <span class="stat-value">200 Units</span>
          <span class="stat-meta text-success">&#10003; 100% of donor surplus shared</span>
        </div>
      </div>

      <div class="stat-card stat-rose">
        <div class="stat-content">
          <span class="stat-label">Quantity Still Needed</span>
          <span class="stat-value">90 Units</span>
          <span class="stat-meta text-danger">Unmet deficit requiring additional donors</span>
        </div>
      </div>
    </div>

    <!-- Scenario Weights Card -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">Adjust Priority Weights</div>
          <div class="card-subtitle">Test how changing priority weights affects how stock is divided</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; background: var(--bg-surface); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div class="slider-control-group">
          <div class="slider-header">
            <span>Urgency Weight</span>
            <span id="label-weight-urgency" style="color: var(--teal-400); font-weight: bold;">45%</span>
          </div>
          <input type="range" id="slider-weight-urgency" class="slider-input" min="10" max="80" value="45" />
          <span class="form-help">Prioritizes emergency and trauma units</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Facility Vulnerability</span>
            <span id="label-weight-vuln" style="color: var(--teal-400); font-weight: bold;">35%</span>
          </div>
          <input type="range" id="slider-weight-vuln" class="slider-input" min="10" max="80" value="35" />
          <span class="form-help">Protects remote and charitable clinics</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Proportional Demand Share</span>
            <span id="label-weight-demand" style="color: var(--teal-400); font-weight: bold;">20%</span>
          </div>
          <input type="range" id="slider-weight-demand" class="slider-input" min="10" max="80" value="20" />
          <span class="form-help">Balances allocation by requested order size</span>
        </div>
      </div>

      <!-- Progressive Disclosure: Mathematical Formula Details -->
      <details style="margin-top: 14px; background: var(--navy-850); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 12px; color: var(--text-main);">
        <summary style="cursor: pointer; font-weight: var(--font-semibold); color: var(--teal-400);">
          View calculation details & formulas
        </summary>
        <div style="margin-top: 10px; line-height: 1.6; color: var(--text-main);">
          <p style="margin: 0 0 6px 0;">
            Fair allocation calculates a composite equity weight for each facility:
          </p>
          <code style="display: block; background: var(--navy-900); padding: 8px 12px; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 11.5px; color: var(--emerald-400); margin-bottom: 8px;">
            Score = (w_urgency &times; Urgency_Tier) + (w_vulnerability &times; Vulnerability_Index) + (w_demand &times; Order_Share)
          </code>
          <p style="margin: 0;">
            Available stock is then allocated proportionally to ensure no high-urgency clinic receives zero units.
          </p>
        </div>
      </details>
    </div>

    <!-- Comparison Chart Row -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">Allocation Outcome Comparison</div>
          <div class="card-subtitle">Comparing Standard First-Come-First-Served vs Fair Allocation</div>
        </div>
      </div>
      <div class="chart-wrapper">
        <canvas id="chart-fairshare-comparison"></canvas>
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin: 12px 0 0 0; text-align: center;">
        Under standard FCFS, the first large facility takes all stock, leaving smaller clinics with 0. Fair Allocation balances units so everyone gets supply.
      </p>
    </div>

    <!-- Detailed Split View -->
    <div class="fairshare-comparison-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
      <!-- FCFS Baseline Box -->
      <div class="comparison-box" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <h3 style="font-size: 15px; font-weight: var(--font-bold); color: var(--rose-400); margin: 0;">Standard Order (First-Come, First-Served)</h3>
            <div class="text-muted" style="font-size: 11.5px;">First request gets full stock; downstream facilities receive nothing</div>
          </div>
          <span class="badge badge-exp-critical">Baseline</span>
        </div>

        <div class="data-table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Requested</th>
                <th>Received</th>
                <th>Fulfillment</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody id="fcfs-table-body"></tbody>
          </table>
        </div>
      </div>

      <!-- FairShare Box -->
      <div class="comparison-box highlight" style="background: var(--bg-card); border: 1px solid var(--teal-500); border-radius: var(--radius-lg); padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <h3 style="font-size: 15px; font-weight: var(--font-bold); color: var(--teal-400); margin: 0;">Fair Allocation Model</h3>
            <div class="text-muted" style="font-size: 11.5px;">Balanced proportional distribution based on urgency and need</div>
          </div>
          <span class="badge badge-rec-transfer">Recommended</span>
        </div>

        <div class="data-table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Requested</th>
                <th>Received</th>
                <th>Fulfillment</th>
                <th>Equity Score</th>
              </tr>
            </thead>
            <tbody id="fairshare-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Analytical Takeaway Narrative -->
    <div class="explain-card" style="margin-top: 24px; border-left-color: var(--teal-500);" id="fairshare-narrative-box">
      <!-- Dynamic narrative -->
    </div>
  `;

  setupSliders();
  runSimulation();
}

async function runSimulation() {
  const urgencyWeight = Number(document.getElementById('slider-weight-urgency')?.value || 45) / 100;
  const vulnWeight = Number(document.getElementById('slider-weight-vuln')?.value || 35) / 100;

  const res = await api.simulateFairShare({
    totalAvailableUnits: 200,
    weights: { urgencyWeight, vulnWeight }
  });

  if (!res.success) return;
  currentSimulationData = res.data;

  renderTables();
  renderChart();
  renderNarrative();
}

function renderTables() {
  const fcfsTbody = document.getElementById('fcfs-table-body');
  const fairTbody = document.getElementById('fairshare-table-body');
  if (!fcfsTbody || !fairTbody || !currentSimulationData) return;

  const { fcfs, fairShare } = currentSimulationData.comparison;

  fcfsTbody.innerHTML = fcfs.map(r => `
    <tr>
      <td><strong style="color: var(--text-heading);">${r.facilityName}</strong></td>
      <td>${r.requested}</td>
      <td><strong>${r.allocated}</strong></td>
      <td>${r.fulfillmentPct}%</td>
      <td>
        ${r.allocated === 0 ? `<span class="badge badge-exp-critical">Starved (0%)</span>` :
          r.allocated < r.requested ? `<span class="badge badge-exp-warning">Partial</span>` :
          `<span class="badge badge-exp-safe">Full</span>`}
      </td>
    </tr>
  `).join('');

  fairTbody.innerHTML = fairShare.map(r => `
    <tr>
      <td><strong style="color: var(--text-heading);">${r.facilityName}</strong></td>
      <td>${r.requested}</td>
      <td><strong style="color: var(--teal-400); font-size: 14px;">${r.allocated}</strong></td>
      <td><strong>${r.fulfillmentPct}%</strong></td>
      <td><span class="badge badge-fac-hospital">${r.criteriaScore} pts</span></td>
    </tr>
  `).join('');
}

function renderChart() {
  const ctx = document.getElementById('chart-fairshare-comparison');
  if (!ctx || !window.Chart || !currentSimulationData) return;

  if (chartInstance) chartInstance.destroy();

  const labels = currentSimulationData.comparison.fcfs.map(r => r.facilityName.split(' ')[0]);
  const fcfsAlloc = currentSimulationData.comparison.fcfs.map(r => r.allocated);
  const fairAlloc = currentSimulationData.comparison.fairShare.map(r => r.allocated);
  const requested = currentSimulationData.comparison.fcfs.map(r => r.requested);

  chartInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Units Requested',
          data: requested,
          backgroundColor: '#334155',
          borderRadius: 4
        },
        {
          label: 'Standard FCFS Received',
          data: fcfsAlloc,
          backgroundColor: '#f43f5e',
          borderRadius: 4
        },
        {
          label: 'Fair Allocation Received',
          data: fairAlloc,
          backgroundColor: '#0d9488',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Medicine Units', color: '#94A3B8' },
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          ticks: { color: '#94A3B8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94A3B8' }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11 }, color: '#CBD5E1' }
        }
      }
    }
  });
}

function renderNarrative() {
  const box = document.getElementById('fairshare-narrative-box');
  if (!box || !currentSimulationData) return;

  box.innerHTML = `
    <div class="explain-header">
      <span style="font-weight: var(--font-bold); color: var(--text-heading);">Fair Distribution Summary</span>
      <span class="badge badge-exp-safe">Verified Allocation</span>
    </div>
    <p style="margin: 0; color: var(--text-main); font-size: 12.5px; line-height: 1.5;">
      Under standard first-come-first-served, <em>St. Jude Charitable Dispensary</em> would receive <strong>0 units</strong> purely because their request arrived later. Fair Allocation prevents this by guaranteeing that emergency and charitable clinics receive an equitable share of available stock.
    </p>
  `;
}

function setupSliders() {
  const sU = document.getElementById('slider-weight-urgency');
  const sV = document.getElementById('slider-weight-vuln');
  const sD = document.getElementById('slider-weight-demand');

  const lU = document.getElementById('label-weight-urgency');
  const lV = document.getElementById('label-weight-vuln');
  const lD = document.getElementById('label-weight-demand');

  const update = () => {
    if (lU && sU) lU.textContent = `${sU.value}%`;
    if (lV && sV) lV.textContent = `${sV.value}%`;
    if (lD && sD) lD.textContent = `${sD.value}%`;
    runSimulation();
  };

  sU?.addEventListener('input', update);
  sV?.addEventListener('input', update);
  sD?.addEventListener('input', update);
}
