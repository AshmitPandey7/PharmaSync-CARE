/**
 * PharmaSync CARE — Compare Allocation Options Page
 * Plain-English strategy comparisons, radar profile visualization, and dark styling.
 */

import { toast } from '../components/toast.js';

let radarChartInstance = null;

export async function render(container) {
  if (radarChartInstance) {
    radarChartInstance.destroy();
    radarChartInstance = null;
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--teal-400)" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
          </svg>
          Compare Allocation Options
        </h1>
        <p class="page-description">
          Compare different redistribution strategies: shortest transport distance, maximum waste prevention, or a balanced approach.
        </p>
      </div>
    </div>

    <!-- Practical Caveat Note -->
    <div class="explain-card" style="border-left-color: var(--amber-500); margin-bottom: 20px;">
      <div class="explain-header">
        <span style="font-weight: var(--font-bold); color: var(--text-heading);">Optimization Formulation Note</span>
        <span class="badge badge-exp-warning">Decision Model</span>
      </div>
      <p style="font-size: 12px; color: var(--text-main); margin: 0; line-height: 1.5;">
        This prototype evaluates trade-offs between competing priorities (speed, distance, and expiry risk). In full production deployments, exact global solutions are solved via backend linear programming algorithms.
      </p>
    </div>

    <!-- Strategy Weights Control Card -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div>
          <div class="card-title">Adjust Strategy Priorities</div>
          <div class="card-subtitle">Tune network goals to see how recommendations shift</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; background: var(--bg-surface); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div class="slider-control-group">
          <div class="slider-header">
            <span>Waste Prevention:</span>
            <strong id="opt-label-w1" style="color: var(--teal-400);">80%</strong>
          </div>
          <input type="range" id="opt-slider-w1" class="slider-input" min="0" max="100" value="80" />
          <span class="form-help">Prioritizes expiring stock</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Transit Distance / Cost:</span>
            <strong id="opt-label-w2" style="color: var(--teal-400);">50%</strong>
          </div>
          <input type="range" id="opt-slider-w2" class="slider-input" min="0" max="100" value="50" />
          <span class="form-help">Prefers closer facilities</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Fair Allocation:</span>
            <strong id="opt-label-w3" style="color: var(--teal-400);">75%</strong>
          </div>
          <input type="range" id="opt-slider-w3" class="slider-input" min="0" max="100" value="75" />
          <span class="form-help">Distributes fairly to small clinics</span>
        </div>

        <div class="slider-control-group">
          <div class="slider-header">
            <span>Donor Safety Buffer:</span>
            <strong id="opt-label-w4" style="color: var(--teal-400);">60%</strong>
          </div>
          <input type="range" id="opt-slider-w4" class="slider-input" min="0" max="100" value="60" />
          <span class="form-help">Retains reserve for donor</span>
        </div>
      </div>
    </div>

    <!-- Comparison Grid: 3 Clear Strategies -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 24px;">
      <!-- Strategy A -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title" style="font-size: 14.5px; color: var(--text-heading);">A. Shortest Distance (Fastest)</div>
            <div class="card-subtitle">Minimizes travel time and fuel cost</div>
          </div>
        </div>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 9px;">
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Average Transit:</span>
            <strong style="color: var(--emerald-400);">5.2 km (Very Low)</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Waste Avoided:</span>
            <span style="color: var(--amber-400); font-weight: var(--font-bold);">54%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Fair Distribution:</span>
            <span>Favors nearest local clinics</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Donor Buffer Preserved:</span>
            <strong>92% (High cushion)</strong>
          </div>
        </div>
      </div>

      <!-- Strategy B -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title" style="font-size: 14.5px; color: var(--rose-400);">B. Maximum Waste Prevention</div>
            <div class="card-subtitle">Zero tolerance for expired medicine</div>
          </div>
        </div>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 9px;">
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Average Transit:</span>
            <strong>24.6 km (Longer routes)</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Waste Avoided:</span>
            <span style="color: var(--emerald-400); font-weight: var(--font-bold);">94% (Highest)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Fair Distribution:</span>
            <span>Moderate (Driven by expiry date)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Donor Buffer Preserved:</span>
            <strong>68% (Tighter cushion)</strong>
          </div>
        </div>
      </div>

      <!-- Strategy C: Balanced -->
      <div class="card" style="border-color: var(--teal-500); box-shadow: 0 0 0 1px var(--teal-500);">
        <div class="card-header">
          <div>
            <div class="card-title" style="font-size: 14.5px; color: var(--teal-400);">C. Balanced Approach</div>
            <div class="card-subtitle">Best overall compromise</div>
          </div>
          <span class="badge badge-rec-transfer">Recommended</span>
        </div>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 9px;">
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Average Transit:</span>
            <strong style="color: var(--text-heading);">9.8 km (Reasonable)</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Waste Avoided:</span>
            <span style="color: var(--emerald-400); font-weight: var(--font-bold);" id="opt-kpi-waste">86%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Fair Distribution:</span>
            <strong id="opt-kpi-fairness" style="color: var(--teal-400);">High Equity across facilities</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">Donor Buffer Preserved:</span>
            <strong id="opt-kpi-buffer">84% (Safe cushion retained)</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Radar Chart: Multi-Criteria Comparison -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Strategy Comparison Profile</div>
          <div class="card-subtitle">Visualizing trade-offs between competing logistics goals (0-100 Score)</div>
        </div>
      </div>
      <div class="chart-wrapper">
        <canvas id="chart-opt-radar"></canvas>
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin: 12px 0 0 0; text-align: center;">
        The balanced strategy prevents 86% of potential medicine waste while keeping average delivery distance within 10 km and preserving donor reserves.
      </p>
    </div>
  `;

  setupSliderControls();
  renderRadar();
}

function renderRadar() {
  const ctx = document.getElementById('chart-opt-radar');
  if (!ctx || !window.Chart) return;

  if (radarChartInstance) radarChartInstance.destroy();

  const w1 = Number(document.getElementById('opt-slider-w1')?.value || 80);
  const w2 = Number(document.getElementById('opt-slider-w2')?.value || 50);
  const w3 = Number(document.getElementById('opt-slider-w3')?.value || 75);
  const w4 = Number(document.getElementById('opt-slider-w4')?.value || 60);

  const balancedScores = [
    Math.round(80 + (w1 * 0.15)),
    Math.round(75 + (w2 * 0.15)),
    Math.round(85 + (w3 * 0.12)),
    Math.round(82 + (w4 * 0.12))
  ];

  radarChartInstance = new window.Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Waste Prevention', 'Distance Efficiency', 'Fair Distribution', 'Donor Reserve Cushion'],
      datasets: [
        {
          label: 'Shortest Distance',
          data: [54, 95, 45, 92],
          borderColor: '#64748b',
          backgroundColor: 'rgba(100, 116, 139, 0.2)'
        },
        {
          label: 'Maximum Waste Prevention',
          data: [94, 40, 60, 68],
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.2)'
        },
        {
          label: 'Balanced (Recommended)',
          data: balancedScores,
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.3)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 20,
          max: 100,
          ticks: { stepSize: 20, color: '#94A3B8', backdropColor: 'transparent' },
          grid: { color: 'rgba(255, 255, 255, 0.08)' },
          angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
          pointLabels: { color: '#CBD5E1', font: { size: 11.5 } }
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

function setupSliderControls() {
  const s1 = document.getElementById('opt-slider-w1');
  const s2 = document.getElementById('opt-slider-w2');
  const s3 = document.getElementById('opt-slider-w3');
  const s4 = document.getElementById('opt-slider-w4');

  const update = () => {
    if (s1) document.getElementById('opt-label-w1').textContent = `${s1.value}%`;
    if (s2) document.getElementById('opt-label-w2').textContent = `${s2.value}%`;
    if (s3) document.getElementById('opt-label-w3').textContent = `${s3.value}%`;
    if (s4) document.getElementById('opt-label-w4').textContent = `${s4.value}%`;
    renderRadar();
  };

  s1?.addEventListener('input', update);
  s2?.addEventListener('input', update);
  s3?.addEventListener('input', update);
  s4?.addEventListener('input', update);
}
