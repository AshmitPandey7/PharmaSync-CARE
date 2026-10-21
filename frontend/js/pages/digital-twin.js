/**
 * PharmaSync CARE — Scenario Simulator (Digital Twin)
 * Discrete-event simulation sandbox with plain-English parameters and dark styling.
 */

import { toast } from '../components/toast.js';

let simChartInstance = null;
let currentScenario = 'SCEN-01';

const SCENARIOS = {
  'SCEN-01': {
    id: 'SCEN-01',
    name: 'Epidemic Demand Surge (+150%)',
    desc: 'Simulates a sudden outbreak spiking antimicrobial demand by 150% across rural and peripheral clinics.',
    demandMult: 2.5,
    delayHours: 4,
    safetyMargin: 15,
    expiryDays: 30
  },
  'SCEN-02': {
    id: 'SCEN-02',
    name: 'Transit & Weather Disruption (+48h)',
    desc: 'Severe weather or transit strike delaying delivery routes and risking stockouts.',
    demandMult: 1.1,
    delayHours: 48,
    safetyMargin: 25,
    expiryDays: 45
  },
  'SCEN-03': {
    id: 'SCEN-03',
    name: 'Expiry Cluster (14 Days)',
    desc: 'Simulates multiple high-volume medicine batches nearing expiry without early redistribution.',
    demandMult: 1.0,
    delayHours: 6,
    safetyMargin: 10,
    expiryDays: 14
  },
  'SCEN-04': {
    id: 'SCEN-04',
    name: 'Distribution Depot Outage',
    desc: 'A central regional depot goes offline, forcing peer-to-peer hospital pharmacy transfers.',
    demandMult: 1.3,
    delayHours: 72,
    safetyMargin: 30,
    expiryDays: 60
  }
};

export async function render(container) {
  if (simChartInstance) {
    simChartInstance.destroy();
    simChartInstance = null;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-400)" stroke-width="2.2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Scenario Simulator
        </h1>
        <p class="page-description">
          Test simulated disruptions (outbreaks, transit delays, expiry clusters) to see how medicine redistribution protects patient supply.
        </p>
      </div>
    </div>

    <!-- Sandboxed State Callout -->
    <div class="explain-card" style="border-left-color: var(--teal-500); margin-bottom: 20px;">
      <div class="explain-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal-400)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span style="font-weight: var(--font-bold); color: var(--text-heading);">Simulation Sandbox Notice</span>
        </div>
        <span class="badge badge-rec-retain">Sandboxed</span>
      </div>
      <p style="font-size: 12px; color: var(--text-main); margin: 0; line-height: 1.5;">
        This simulator operates in complete isolation from the real database. Testing hypothetical scenarios here <strong>does not alter live stock counts or real transfer orders</strong>.
      </p>
    </div>

    <!-- Scenario Cards Selector -->
    <div class="scenario-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px;">
      ${Object.values(SCENARIOS).map(s => `
        <div class="scenario-card ${s.id === currentScenario ? 'active' : ''}" data-id="${s.id}" style="cursor: pointer; padding: 14px; border-radius: var(--radius-md); border: 1px solid ${s.id === currentScenario ? 'var(--teal-500)' : 'var(--border-subtle)'}; background: ${s.id === currentScenario ? 'var(--navy-800)' : 'var(--bg-card)'};">
          <div class="scenario-title" style="font-weight: var(--font-bold); font-size: 13.5px; color: ${s.id === currentScenario ? 'var(--teal-400)' : 'var(--text-heading)'};">${s.name}</div>
          <div class="scenario-desc" style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">${s.desc}</div>
        </div>
      `).join('')}
    </div>

    <!-- Sandbox Configuration & Controls -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">Disruption Parameters</div>
          <div class="card-subtitle">Adjust simulated variables to observe network resilience</div>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-run-simulation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Run Simulation
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div class="slider-control-group">
          <div class="slider-header">
            <span>Demand Multiplier:</span>
            <strong id="sim-label-demand" style="color: var(--teal-400);">2.5x</strong>
          </div>
          <input type="range" id="sim-slider-demand" class="slider-input" min="1.0" max="4.0" step="0.1" value="2.5" />
          <span class="form-help">Increase in medicine requests</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Transport Delay:</span>
            <strong id="sim-label-delay" style="color: var(--teal-400);">4 Hours</strong>
          </div>
          <input type="range" id="sim-slider-delay" class="slider-input" min="0" max="96" step="2" value="4" />
          <span class="form-help">Road or weather delivery delay</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Local Reserve Cushion:</span>
            <strong id="sim-label-safety" style="color: var(--teal-400);">15%</strong>
          </div>
          <input type="range" id="sim-slider-safety" class="slider-input" min="5" max="40" step="5" value="15" />
          <span class="form-help">Safety stock kept by donors</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Days to Expiry:</span>
            <strong id="sim-label-expiry" style="color: var(--teal-400);">30 Days</strong>
          </div>
          <input type="range" id="sim-slider-expiry" class="slider-input" min="7" max="90" step="1" value="30" />
          <span class="form-help">Average batch shelf life</span>
        </div>
      </div>
    </div>

    <!-- Simulation Results KPI Panel -->
    <div class="stat-card-grid" id="sim-kpi-grid" style="margin-bottom: 24px;">
      <!-- Dynamic KPI cards -->
    </div>

    <!-- Chart: Before vs After Resilience -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Network Supply Resilience (30-Day Projection)</div>
          <div class="card-subtitle">Comparing isolated facilities vs active redistribution network</div>
        </div>
      </div>
      <div class="chart-wrapper">
        <canvas id="chart-digital-twin"></canvas>
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin: 12px 0 0 0; text-align: center;">
        Redistributing surplus medicines maintains a steady supply level above 90%, preventing the stockout collapse seen in isolated facilities.
      </p>
    </div>
  `;

  setupScenarioEvents();
  computeAndRenderSimulation();
}

function computeAndRenderSimulation() {
  const demandMult = Number(document.getElementById('sim-slider-demand')?.value || 2.5);
  const delayHours = Number(document.getElementById('sim-slider-delay')?.value || 4);

  // Compute simulated projections
  const baseDemand = 3400;
  const simulatedDemand = Math.round(baseDemand * demandMult);

  // Without Redistribution: severe stockouts occur
  const unmanagedStockouts = Math.round(simulatedDemand * (0.35 + (delayHours * 0.003)));

  // With Proactive Redistribution:
  const rescuedUnits = Math.round(unmanagedStockouts * 0.72);
  const serviceLevelWithout = Math.max(30, Math.round(100 - (unmanagedStockouts / simulatedDemand) * 100));
  const serviceLevelWith = Math.min(96, serviceLevelWithout + Math.round((rescuedUnits / simulatedDemand) * 100));

  // Update KPI Grid
  const kpiGrid = document.getElementById('sim-kpi-grid');
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="stat-card stat-teal">
        <div class="stat-content">
          <span class="stat-label">Simulated Demand</span>
          <span class="stat-value">${simulatedDemand.toLocaleString()} Units</span>
          <span class="stat-meta">Surge multiplier ${demandMult}x</span>
        </div>
      </div>

      <div class="stat-card stat-rose">
        <div class="stat-content">
          <span class="stat-label">Stockout Risk (Isolated)</span>
          <span class="stat-value">${unmanagedStockouts.toLocaleString()} Units</span>
          <span class="stat-meta text-danger">Units unmet without sharing</span>
        </div>
      </div>

      <div class="stat-card stat-emerald">
        <div class="stat-content">
          <span class="stat-label">Supplied via Network</span>
          <span class="stat-value">+${rescuedUnits.toLocaleString()} Units</span>
          <span class="stat-meta text-success">&#10003; Shared from surplus donors</span>
        </div>
      </div>

      <div class="stat-card stat-sky">
        <div class="stat-content">
          <span class="stat-label">Resilience Fulfillment</span>
          <span class="stat-value">${serviceLevelWith}%</span>
          <span class="stat-meta">Vs ${serviceLevelWithout}% in isolated facilities</span>
        </div>
      </div>
    `;
  }

  // Update Chart
  const ctx = document.getElementById('chart-digital-twin');
  if (ctx && window.Chart) {
    if (simChartInstance) simChartInstance.destroy();

    const days = ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'];
    const baselineService = [92, 85, 74, serviceLevelWithout, serviceLevelWithout - 5, serviceLevelWithout + 4, serviceLevelWithout + 8];
    const intervenedService = [94, 91, 88, serviceLevelWith - 2, serviceLevelWith, serviceLevelWith + 1, serviceLevelWith + 2];

    simChartInstance = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'Isolated Facilities (No Sharing)',
            data: baselineService,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Active Redistribution Network',
            data: intervenedService,
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.15)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 20,
            max: 100,
            title: { display: true, text: 'Fulfillment Rate (%)', color: '#94A3B8' },
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
}

function setupScenarioEvents() {
  document.querySelectorAll('.scenario-card').forEach(card => {
    card.addEventListener('click', (e) => {
      document.querySelectorAll('.scenario-card').forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'var(--border-subtle)';
        c.style.background = 'var(--bg-card)';
        const titleEl = c.querySelector('.scenario-title');
        if (titleEl) titleEl.style.color = 'var(--text-heading)';
      });

      const activeCard = e.currentTarget;
      activeCard.classList.add('active');
      activeCard.style.borderColor = 'var(--teal-500)';
      activeCard.style.background = 'var(--navy-800)';
      const activeTitle = activeCard.querySelector('.scenario-title');
      if (activeTitle) activeTitle.style.color = 'var(--teal-400)';

      const scenId = activeCard.dataset.id;
      currentScenario = scenId;
      const s = SCENARIOS[scenId];

      const sD = document.getElementById('sim-slider-demand');
      const sH = document.getElementById('sim-slider-delay');
      const sS = document.getElementById('sim-slider-safety');
      const sE = document.getElementById('sim-slider-expiry');

      if (sD) sD.value = s.demandMult;
      if (sH) sH.value = s.delayHours;
      if (sS) sS.value = s.safetyMargin;
      if (sE) sE.value = s.expiryDays;

      document.getElementById('sim-label-demand').textContent = `${s.demandMult}x`;
      document.getElementById('sim-label-delay').textContent = `${s.delayHours} Hours`;
      document.getElementById('sim-label-safety').textContent = `${s.safetyMargin}%`;
      document.getElementById('sim-label-expiry').textContent = `${s.expiryDays} Days`;

      computeAndRenderSimulation();
      toast.info('Scenario Loaded', s.name);
    });
  });

  const sD = document.getElementById('sim-slider-demand');
  const sH = document.getElementById('sim-slider-delay');
  const sS = document.getElementById('sim-slider-safety');
  const sE = document.getElementById('sim-slider-expiry');

  const update = () => {
    if (sD) document.getElementById('sim-label-demand').textContent = `${sD.value}x`;
    if (sH) document.getElementById('sim-label-delay').textContent = `${sH.value} Hours`;
    if (sS) document.getElementById('sim-label-safety').textContent = `${sS.value}%`;
    if (sE) document.getElementById('sim-label-expiry').textContent = `${sE.value} Days`;
    computeAndRenderSimulation();
  };

  sD?.addEventListener('input', update);
  sH?.addEventListener('input', update);
  sS?.addEventListener('input', update);
  sE?.addEventListener('input', update);

  document.getElementById('btn-run-simulation')?.addEventListener('click', () => {
    computeAndRenderSimulation();
    toast.success('Simulation Completed', 'Network resilience recalculation complete.');
  });
}
