/**
 * PharmaSync CARE — Landing Page
 * Introduces the platform, features the Anime.js animated background,
 * and provides clear paths to authentication and the core application.
 */

import { auth } from '../auth.js';
import { AnimatedNetworkBackground } from '../components/animated-bg.js';

let activeBgInstance = null;

export async function render(container) {
  // Clean up any existing background instance before re-mounting
  if (activeBgInstance) {
    activeBgInstance.destroy();
    activeBgInstance = null;
  }

  const isAuthenticated = auth.isAuthenticated();
  const currentUser = auth.getCurrentUser();

  container.innerHTML = `
    <div class="landing-page-wrapper">
      <!-- Animated Network Canvas Container (Anime.js) -->
      <div id="landing-canvas-mount" class="landing-canvas-mount"></div>

      <!-- Landing Navigation Header -->
      <header class="landing-header">
        <div class="landing-header-inner">
          <a href="#/landing" class="landing-brand">
            <div class="landing-brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 2v20M2 12h20"/>
                <circle cx="12" cy="12" r="9"/>
              </svg>
            </div>
            <div class="landing-brand-text">
              <span class="landing-brand-name">PharmaSync</span>
              <span class="landing-brand-badge">CARE</span>
            </div>
          </a>

          <nav class="landing-nav-links">
            <a href="#hero" class="landing-nav-link" id="nav-overview-link">Overview</a>
            <a href="#how-it-works" class="landing-nav-link" id="nav-how-link">How It Works</a>
            <a href="#about" class="landing-nav-link" id="nav-about-link">About</a>
          </nav>

          <div class="landing-header-actions">
            ${isAuthenticated ? `
              <span class="landing-user-badge">
                <span class="user-dot"></span>
                <span>${currentUser?.name?.split(' ')[0] || 'Authenticated'}</span>
              </span>
              <a href="#/dashboard" class="btn btn-primary btn-sm">Access Dashboard &rarr;</a>
            ` : `
              <a href="#/login" class="btn btn-secondary btn-sm">Login</a>
              <a href="#/login?redirect=dashboard" class="btn btn-primary btn-sm">Access Dashboard</a>
            `}
          </div>
        </div>
      </header>

      <!-- Main Landing Content (Positioned over Animated Canvas) -->
      <main class="landing-main-content">
        <!-- Hero Section -->
        <section id="hero" class="landing-hero-section">
          <div class="landing-container">
            <div class="landing-hero-content">
              <div class="landing-eyebrow">
                <span class="eyebrow-symbol">&bull;</span>
                <span>HEALTHCARE INVENTORY COORDINATION</span>
              </div>

              <h1 class="landing-hero-title">
                Connecting Medicine Surplus to Healthcare Needs.
              </h1>

              <p class="landing-hero-description">
                PharmaSync CARE helps healthcare facilities manage medicine inventory,
                identify potential surplus stock, and coordinate medicine redistribution
                when another facility faces a shortage.
              </p>

              <div class="landing-hero-actions">
                <button type="button" class="btn btn-primary btn-lg" id="btn-hero-primary">
                  <span>Access Dashboard</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>

                <button type="button" class="btn btn-secondary btn-lg" id="btn-hero-secondary">
                  <span>How It Works</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>

              <div class="landing-hero-meta">
                <span>Direct facility-to-facility coordination</span>
                <span>&bull;</span>
                <span>Shelf-life feasibility tracking</span>
                <span>&bull;</span>
                <span>Verified chain-of-custody transfer manifests</span>
              </div>
            </div>
          </div>
        </section>

        <!-- How It Works Section -->
        <section id="how-it-works" class="landing-section landing-how-section">
          <div class="landing-container">
            <div class="section-header">
              <div class="section-tag">WORKFLOW ARCHITECTURE</div>
              <h2 class="section-title">How It Works</h2>
              <p class="section-desc">
                Three structured steps to eliminate waste and fulfill critical clinical shortages.
              </p>
            </div>

            <div class="how-steps-grid">
              <!-- Step 01 -->
              <div class="how-step-card">
                <div class="step-num">01</div>
                <div class="step-content">
                  <h3 class="step-title">Manage Inventory</h3>
                  <p class="step-body">
                    Record medicine batches, available quantities, expiry dates, and relevant stock information.
                  </p>
                  <div class="step-subtext">
                    Tracks safety buffers and remaining shelf-life without interrupting internal hospital dispensation.
                  </div>
                </div>
              </div>

              <!-- Step 02 -->
              <div class="how-step-card">
                <div class="step-num">02</div>
                <div class="step-content">
                  <h3 class="step-title">Identify Matches</h3>
                  <p class="step-body">
                    Find potential suppliers based on medicine compatibility, available quantity, expiry feasibility, and distance.
                  </p>
                  <div class="step-subtext">
                    Verifies temperature constraints and guarantees minimum 45-day transit safety margins.
                  </div>
                </div>
              </div>

              <!-- Step 03 -->
              <div class="how-step-card">
                <div class="step-num">03</div>
                <div class="step-content">
                  <h3 class="step-title">Coordinate Transfers</h3>
                  <p class="step-body">
                    Create medicine transfers, track their progress, and record receipt confirmation.
                  </p>
                  <div class="step-subtext">
                    Five-stage custody progression: Proposed &rarr; Requested &rarr; Approved &rarr; Dispatched &rarr; Received.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- About PharmaSync CARE Section -->
        <section id="about" class="landing-section landing-about-section">
          <div class="landing-container">
            <div class="about-grid">
              <div class="about-text-col">
                <div class="section-tag">SYSTEM PURPOSE</div>
                <h2 class="section-title">The Redistribution Challenge</h2>
                <p class="about-paragraph">
                  In modern regional healthcare networks, inventory fragmentation creates a persistent imbalance:
                  one healthcare facility may face a critical medicine shortage while a neighboring facility holds
                  usable surplus stock nearing expiration that cannot be fully consumed locally.
                </p>
                <p class="about-paragraph">
                  Without structured coordination, surplus medicines expire on shelves and become chemical waste,
                  while clinics miles away cancel surgeries or turn patients away.
                </p>
                <p class="about-paragraph">
                  <strong>PharmaSync CARE</strong> bridges this gap through predictive excess identification,
                  algorithmic match validation, and fair-share allocation—ensuring life-saving medications reach
                  patients where they are needed most.
                </p>
              </div>

              <div class="about-metrics-col">
                <div class="about-stat-box">
                  <div class="about-stat-label">Stock Feasibility Gating</div>
                  <div class="about-stat-val">45+ Days</div>
                  <div class="about-stat-sub">Minimum recipient buffer threshold before batch eligibility is authorized</div>
                </div>

                <div class="about-stat-box">
                  <div class="about-stat-label">Custody Lifecycle</div>
                  <div class="about-stat-val">5 Stages</div>
                  <div class="about-stat-sub">From shortage declaration to pharmacist receipt confirmation</div>
                </div>

                <div class="about-stat-box">
                  <div class="about-stat-label">Multi-Facility Scope</div>
                  <div class="about-stat-val">6 Nodes</div>
                  <div class="about-stat-sub">Central hospitals, community retail pharmacies, and rural health clinics</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Inter-Facility Verification Protocol -->
        <section class="landing-disclaimer-section">
          <div class="landing-container">
            <div class="landing-disclaimer-box">
              <div class="disclaimer-badge">NETWORK INTEGRITY</div>
              <p class="disclaimer-text">
                PharmaSync CARE coordinates institutional medicine inventory verification across licensed healthcare facilities. All transfer manifests require authenticated dual-facility sign-off prior to dispatch.
                
              </p>
            </div>
          </div>
        </section>
      </main>

      <!-- Minimal Monochrome Footer -->
      <footer class="landing-footer">
        <div class="landing-container">
          <div class="landing-footer-inner">
            <div class="footer-left">
              <div class="footer-brand">
                <span style="font-weight: 600; color: #FFFFFF;">PharmaSync CARE</span>
                <span style="color: #737373;">&mdash; Intelligent Medicine Redistribution Network</span>
              </div>
              <div class="footer-desc">
                Intelligent Medicine Redistribution Platform connecting healthcare networks to eliminate pharmaceutical waste.
                Built with semantic HTML5, CSS3, Vanilla ES Modules, and Anime.js.
              </div>
            </div>

            <div class="footer-right">
              <div class="footer-links">
                <a href="#hero">Overview</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#about">About</a>
                <a href="#/login">Login</a>
                <a href="#/dashboard">Dashboard</a>
              </div>
              <div class="footer-copy">
                &copy; 2026 PharmaSync CARE &bull; Enterprise Healthcare Inventory Network
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `;

  // Mount Anime.js background
  const mountPoint = document.getElementById('landing-canvas-mount');
  if (mountPoint) {
    activeBgInstance = new AnimatedNetworkBackground();
    activeBgInstance.mount(mountPoint);
  }

  // Bind interactive CTA actions
  document.getElementById('btn-hero-primary')?.addEventListener('click', () => {
    if (auth.isAuthenticated()) {
      window.location.hash = '#/dashboard';
    } else {
      window.location.hash = '#/login?redirect=dashboard';
    }
  });

  document.getElementById('btn-hero-secondary')?.addEventListener('click', () => {
    const target = document.getElementById('how-it-works');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Smooth scroll links
  document.getElementById('nav-overview-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('nav-how-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('nav-about-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  });
}

/**
 * Teardown animation when navigating away
 */
export function cleanup() {
  if (activeBgInstance) {
    activeBgInstance.destroy();
    activeBgInstance = null;
  }
}
