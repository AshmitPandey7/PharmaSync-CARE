/**
 * PharmaSync CARE — Client-Side Hash Router
 * Directs traffic to the public landing page, login page, and the 5 core workflow pages.
 * Enforces route protection and session verification.
 */

import { auth } from './auth.js';
import { topbar } from './components/topbar.js';
import { sidebar } from './components/sidebar.js';

import * as landingPage from './pages/landing.js';
import * as loginPage from './pages/login.js';
import * as dashboardPage from './pages/dashboard.js';
import * as inventoryPage from './pages/inventory.js';
import * as shortagesPage from './pages/shortages.js';
import * as matchingPage from './pages/matching.js';
import * as transfersPage from './pages/transfers.js';
import * as networkPage from './pages/network.js';
import * as adminPage from './pages/admin.js';

const routes = {
  landing: { title: 'Healthcare Inventory Coordination', module: landingPage, public: true },
  login: { title: 'Sign In', module: loginPage, public: true },
  dashboard: { title: 'Dashboard', module: dashboardPage, public: false },
  inventory: { title: 'Medicine Stock', module: inventoryPage, public: false },
  rescue: { title: 'Medicine Stock', module: inventoryPage, public: false }, // Aliased directly to stock
  shortages: { title: 'Medicine Needed', module: shortagesPage, public: false },
  needed: { title: 'Medicine Needed', module: shortagesPage, public: false }, // Alias
  matching: { title: 'Find Medicines', module: matchingPage, public: false },
  transfers: { title: 'Transfers', module: transfersPage, public: false },
  network: { title: 'Healthcare Facilities', module: networkPage, public: false },
  admin: { title: 'System & API Settings', module: adminPage, public: false }
};

export const router = {
  currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('pharmasync:facility-changed', () => this.handleRouting());
    window.addEventListener('pharmasync:mode-changed', () => this.handleRouting());
    window.addEventListener('pharmasync:data-reset', () => this.handleRouting());

    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      if (auth.isAuthenticated()) {
        window.location.hash = '#/dashboard';
      } else {
        window.location.hash = '#/landing';
      }
    } else {
      this.handleRouting();
    }
  },

  async handleRouting() {
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    const routeKey = rawHash.split('?')[0] || (auth.isAuthenticated() ? 'dashboard' : 'landing');

    // Clean up landing page animations if leaving the landing route
    if (this.currentRoute === 'landing' && routeKey !== 'landing') {
      try {
        landingPage.cleanup();
      } catch (err) {
        console.warn('Landing cleanup warning:', err);
      }
    }

    const route = routes[routeKey] || (auth.isAuthenticated() ? routes.dashboard : routes.landing);
    const isPublic = route.public === true;

    // Route Guard 1: Protected internal pages require authentication
    if (!isPublic && !auth.isAuthenticated()) {
      window.location.hash = `#/login?redirect=${encodeURIComponent(routeKey)}`;
      return;
    }

    // Route Guard 2: Authenticated user attempting to access login page
    if (routeKey === 'login' && auth.isAuthenticated()) {
      window.location.hash = '#/dashboard';
      return;
    }

    this.currentRoute = routeKey;

    // Toggle public mode classes on document.body
    document.body.classList.toggle('public-mode', isPublic);

    // Update layout shell when in internal authenticated mode
    if (!isPublic) {
      topbar.updateTitle(route.title);
      sidebar.render(routeKey);
    }

    const container = document.getElementById('app-content');
    if (!container) return;

    try {
      await route.module.render(container);
      // Scroll to top of viewport on route change
      const viewport = document.getElementById('main-viewport');
      if (viewport) {
        viewport.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Route render error:', err);
      container.innerHTML = `
        <div class="card" style="padding: 24px; text-align: center; border-color: var(--status-critical-border);">
          <div style="color: var(--status-critical); font-weight: bold; font-size: 15px; margin-bottom: 8px;">
            Error loading ${route.title}
          </div>
          <div class="text-muted" style="font-size: 13px; margin-bottom: 14px;">
            ${err.message || 'An unexpected error occurred while loading this page.'}
          </div>
          <a href="#/dashboard" class="btn btn-primary btn-sm">Return to Dashboard</a>
        </div>
      `;
    }
  }
};
