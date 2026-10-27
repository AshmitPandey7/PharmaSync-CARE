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
    // Remove legacy demo dock if present
    const legacyDock = document.getElementById('guided-demo-dock');
    if (legacyDock) legacyDock.remove();

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
          'PharmaSync CARE Connected',
          'Multi-facility medicine redistribution network active. All systems operational.'
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
