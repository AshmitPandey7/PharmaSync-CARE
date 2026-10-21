/**
 * PharmaSync CARE — Application Main Entry Point
 */

import { auth } from './auth.js';
import { sidebar } from './components/sidebar.js';
import { topbar } from './components/topbar.js';
import { router } from './router.js';
import { toast } from './components/toast.js';

function bootstrap() {
  try {
    // Initialize UI Shell
    sidebar.render('dashboard');
    topbar.render('Dashboard');

    // Initialize Router
    router.init();

    // Welcome announcement toast (once per session if authenticated)
    if (auth.isAuthenticated() && !sessionStorage.getItem('pharmasync_welcome_shown')) {
      sessionStorage.setItem('pharmasync_welcome_shown', '1');
      setTimeout(() => {
        toast.info(
          'PharmaSync CARE Ready',
          'Medicine redistribution workflow: Add Stock \u2192 Create Request \u2192 Find Supplier \u2192 Create Transfer \u2192 Mark Received.'
        );
      }, 600);
    }
  } catch (err) {
    console.error('Fatal bootstrap error:', err);
  }
}

// Ensure execution whether DOMContentLoaded has already fired or is pending
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
