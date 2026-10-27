/**
 * PharmaSync CARE — Guided Demonstration Assistant
 * Interactive presentation companion for DBMS academic project viva.
 * Provides talking points, target route navigation, and step-by-step workflow guidance.
 */

import { config } from '../config.js';

export const GUIDED_STEPS = [
  {
    step: 1,
    title: 'Introduction & Problem Statement',
    route: '#/dashboard',
    heading: 'Healthcare Inventory Coordination Problem',
    problemScript: 'Healthcare facilities in India frequently face localized medicine stockouts (especially during post-monsoon viral surges), while neighboring facilities hold surplus stock nearing expiry.',
    talkingPoints: [
      'Explain the real-world problem: One hospital or clinic runs out of essential medicines while another nearby hospital has usable surplus stock.',
      'PharmaSync CARE coordinates medicine redistribution across hospitals, community pharmacies, and rural clinics before medicines expire.',
      'Point out the active healthcare facilities in Bengaluru (Apex Central Hospital, City Care Pharmacy, Green Valley Health Centre).'
    ],
    actionHint: 'Observe the 3 primary questions answered on the dashboard: Available Stock, Urgent Requests, and Active Transfers.'
  },
  {
    step: 2,
    title: 'Medicine Stock Management',
    route: '#/inventory',
    heading: 'Batch-Level Inventory & Safety Buffer Policy',
    problemScript: 'Hospitals must record batches with expiry dates and safety buffers so that only genuine surplus is redistributed without starving local patients.',
    talkingPoints: [
      'Demonstrate how a facility records medicine batches, quantities, expiry dates, and storage requirements.',
      'Highlight our 20% Safety Stock Policy: The database protects local emergency reserve stock and only marks surplus above the threshold as redistributable.',
      'Point to Batch PCM-2026-A1 (Paracetamol 650mg Tablets, 250 available units, 200 surplus, expires June 2027) held at Apex Central Hospital.'
    ],
    actionHint: 'Review batch details and show the "Eligible Surplus" column calculated by the system.'
  },
  {
    step: 3,
    title: 'Medicine Shortage Requests',
    route: '#/shortages',
    heading: 'Structured Clinical Shortage Declarations',
    problemScript: 'Clinics need a structured database mechanism to declare deficits with urgency levels and deadlines rather than informal phone calls.',
    talkingPoints: [
      'Show how Green Valley Health Centre has raised shortage ticket SHT-2026-001 for 100 units of Paracetamol 650mg Tablets.',
      'Explain the schema fields: Requesting Facility, Medicine Name, Required Quantity, Urgency Level (HIGH), and Required-By Date.',
      'Explain why structured requests are vital: They prevent duplicate requisitions and enable automated multi-criteria matching.'
    ],
    actionHint: 'Click "Find Supplier →" on Green Valley Health Centre\'s Paracetamol request to proceed to the matching engine.'
  },
  {
    step: 4,
    title: 'Find Suitable Suppliers (Matching Engine)',
    route: '#/matching?shortage=SHT-2026-001',
    heading: 'Algorithmic Multi-Criteria Supplier Matching',
    problemScript: 'Suppliers cannot be selected randomly. A valid donor must hold compatible medicine, satisfy remaining shelf-life rules, and be within feasible proximity.',
    talkingPoints: [
      'Explain the 4 matching criteria evaluated by the database query: Exact medicine compatibility, Shelf-life > 45 days policy, Available surplus >= required units, and Proximity via Haversine distance.',
      'Show the match breakdown for Apex Central Hospital (96% Match Score): 13.5 km away, 200 surplus units available, expiry well within safety limits.',
      'Emphasize that the system displays explicit reasons why candidate facilities qualify or are disqualified.'
    ],
    actionHint: 'Click "Initiate Transfer →" on Apex Central Hospital to open the transfer manifest dialog.'
  },
  {
    step: 5,
    title: 'Create a Medicine Transfer',
    route: '#/matching?shortage=SHT-2026-001',
    heading: 'Transactional Reservation & Manifest Generation',
    problemScript: 'When a transfer is initiated, the database must atomically reserve donor stock to prevent race conditions (double allocation).',
    talkingPoints: [
      'Demonstrate the transfer creation modal: Supplying facility (Apex Central), Requesting facility (Green Valley), Quantity (100 units), and generated Transfer Code (TRF-2026-001).',
      'Explain DBMS transaction safety: The system places an atomic reservation lock on batch PCM-2026-A1 so those 100 units cannot be transferred to anyone else while in progress.',
      'Submit the transfer order to record the manifest in the database.'
    ],
    actionHint: 'Confirm the transfer order and navigate to the Transfers page to track its lifecycle.'
  },
  {
    step: 6,
    title: 'Track Transfer Custody Lifecycle',
    route: '#/transfers',
    heading: 'Finite-State Machine & Immutable Audit Trail',
    problemScript: 'Healthcare medicines require strict chain-of-custody tracking from initial request through dispatch and receipt.',
    talkingPoints: [
      'Explain the transfer finite-state machine: Requested → Approved → Dispatched → Received.',
      'Demonstrate how authorized personnel advance status (e.g., Chief Pharmacist approves, Logistics dispatches with carrier details).',
      'Point out transfer TRF-2026-003 (Normal Saline 0.9%, 50 units, DISPATCHED en route to Green Valley Health Centre).'
    ],
    actionHint: 'Observe the carrier tracking and temperature compliance log on the transfer card.'
  },
  {
    step: 7,
    title: 'Confirm Receipt & Inventory Update',
    route: '#/transfers',
    heading: 'Atomic Settlement & Balance Finalization',
    problemScript: 'Physical delivery confirmation must atomically finalize donor inventory deductions and credit stock to the receiving clinic.',
    talkingPoints: [
      'Demonstrate clicking "Mark as Received" on transfer TRF-2026-003 or your newly created transfer.',
      'Explain the atomic settlement: The donor reserved stock is decremented, new verified stock is added to the recipient\'s inventory, and the shortage ticket is closed.',
      'Show how the status updates in real-time with an audit timestamp and inspecting officer\'s name.'
    ],
    actionHint: 'Click "Mark Received" on an active transfer and observe the immediate confirmation toast.'
  },
  {
    step: 8,
    title: 'Final Dashboard Summary',
    route: '#/dashboard',
    heading: 'Closed-Loop Redistribution Verification',
    problemScript: 'The entire redistribution lifecycle has completed cleanly from surplus identification to verified delivery.',
    talkingPoints: [
      'Return to the Dashboard to review the updated metrics.',
      'Show that the transfer is archived as completed, clinic shortages have reduced, and network surplus was successfully redistributed.',
      'Conclude the presentation: PharmaSync CARE provides end-to-end database integrity, prevents medicine expiration wastage, and improves healthcare delivery.'
    ],
    actionHint: 'You have completed the full demonstration! You can click "Reset Demo Data" anytime to repeat the demo.'
  }
];

class GuidedDemoAssistant {
  constructor() {
    this.currentStepIndex = 0;
    this.isActive = false;
    this.isMinimized = false;
  }

  init() {
    this.renderDock();
    this.bindGlobalEvents();
  }

  start() {
    this.isActive = true;
    this.isMinimized = false;
    this.currentStepIndex = 0;
    this.updateDock();
    this.navigateToCurrentStep();
  }

  stop() {
    this.isActive = false;
    const dockEl = document.getElementById('guided-demo-dock');
    if (dockEl) dockEl.style.display = 'none';
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.updateDock();
  }

  next() {
    if (this.currentStepIndex < GUIDED_STEPS.length - 1) {
      this.currentStepIndex++;
      this.updateDock();
      this.navigateToCurrentStep();
    }
  }

  prev() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.updateDock();
      this.navigateToCurrentStep();
    }
  }

  goToStep(index) {
    if (index >= 0 && index < GUIDED_STEPS.length) {
      this.currentStepIndex = index;
      this.updateDock();
      this.navigateToCurrentStep();
    }
  }

  navigateToCurrentStep() {
    const step = GUIDED_STEPS[this.currentStepIndex];
    if (step && step.route) {
      if (window.location.hash !== step.route) {
        window.location.hash = step.route;
      }
    }
  }

  bindGlobalEvents() {
    window.addEventListener('pharmasync:start-guided-demo', () => {
      this.start();
    });
  }

  renderDock() {
    let dockEl = document.getElementById('guided-demo-dock');
    if (!dockEl) {
      dockEl = document.createElement('div');
      dockEl.id = 'guided-demo-dock';
      dockEl.className = 'guided-demo-dock';
      document.body.appendChild(dockEl);
    }
    this.updateDock();
  }

  updateDock() {
    const dockEl = document.getElementById('guided-demo-dock');
    if (!dockEl) return;

    if (!this.isActive) {
      dockEl.style.display = 'none';
      return;
    }

    dockEl.style.display = 'block';

    const step = GUIDED_STEPS[this.currentStepIndex];
    const totalSteps = GUIDED_STEPS.length;
    const progressPct = Math.round(((this.currentStepIndex + 1) / totalSteps) * 100);

    if (this.isMinimized) {
      dockEl.innerHTML = `
        <div class="guided-dock-minimized" id="btn-expand-guided-demo" title="Expand Guided Demonstration Assistant">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="guided-dock-badge">DEMO ASSISTANT</span>
            <strong>Step ${step.step} of ${totalSteps}: ${step.title}</strong>
          </div>
          <button type="button" class="btn btn-secondary btn-xs" style="padding: 2px 8px; font-size: 11px;">Expand &uarr;</button>
        </div>
      `;
      document.getElementById('btn-expand-guided-demo')?.addEventListener('click', () => this.toggleMinimize());
      return;
    }

    dockEl.innerHTML = `
      <div class="guided-dock-card">
        <!-- Progress Bar -->
        <div class="guided-progress-track">
          <div class="guided-progress-fill" style="width: ${progressPct}%;"></div>
        </div>

        <!-- Header -->
        <div class="guided-dock-header">
          <div class="guided-dock-header-left">
            <span class="guided-dock-badge">DEMO MODE WALKTHROUGH</span>
            <span class="guided-step-counter">Step ${step.step} of ${totalSteps}</span>
            <select class="guided-step-select" id="guided-step-dropdown" title="Jump to any step">
              ${GUIDED_STEPS.map((s, idx) => `
                <option value="${idx}" ${idx === this.currentStepIndex ? 'selected' : ''}>
                  ${s.step}. ${s.title}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="guided-dock-header-right">
            <button type="button" class="guided-icon-btn" id="btn-guided-minimize" title="Minimize Dock" aria-label="Minimize">
              &minus;
            </button>
            <button type="button" class="guided-icon-btn" id="btn-guided-close" title="Exit Walkthrough" aria-label="Close">
              &times;
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="guided-dock-body">
          <div class="guided-step-title-row">
            <h3 class="guided-step-title">${step.step}. ${step.heading}</h3>
            <a href="${step.route}" class="btn btn-primary btn-sm guided-nav-btn" id="btn-guided-open-page">
              Open Page &rarr;
            </a>
          </div>

          <div class="guided-speech-box">
            <div class="guided-speech-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>What to Say to Your Professor / Examiner:</span>
            </div>
            <ul class="guided-points-list">
              ${step.talkingPoints.map(pt => `<li>${pt}</li>`).join('')}
            </ul>
          </div>

          <div class="guided-action-hint">
            <strong>Demonstration Action:</strong> ${step.actionHint}
          </div>
        </div>

        <!-- Footer Navigation -->
        <div class="guided-dock-footer">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-guided-restart" title="Restart Guided Demo from Step 1">
            Restart Demo
          </button>

          <div class="guided-footer-nav-group">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-guided-prev" ${this.currentStepIndex === 0 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-guided-next">
              ${this.currentStepIndex === totalSteps - 1 ? 'Finish Walkthrough &#10003;' : 'Next Step &rarr;'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind Event Listeners
    document.getElementById('btn-guided-minimize')?.addEventListener('click', () => this.toggleMinimize());
    document.getElementById('btn-guided-close')?.addEventListener('click', () => this.stop());
    document.getElementById('btn-guided-restart')?.addEventListener('click', () => this.goToStep(0));
    document.getElementById('btn-guided-prev')?.addEventListener('click', () => this.prev());
    document.getElementById('btn-guided-next')?.addEventListener('click', () => {
      if (this.currentStepIndex === totalSteps - 1) {
        this.stop();
      } else {
        this.next();
      }
    });

    document.getElementById('guided-step-dropdown')?.addEventListener('change', (e) => {
      this.goToStep(Number(e.target.value));
    });

    document.getElementById('btn-guided-open-page')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateToCurrentStep();
    });
  }
}

export const guidedDemo = new GuidedDemoAssistant();
