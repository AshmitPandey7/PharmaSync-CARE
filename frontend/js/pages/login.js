/**
 * PharmaSync CARE — Login Page Component
 * Dedicated monochrome authentication page with working password visibility toggle,
 * credential validation, evaluator quick-fill tools, and destination redirect.
 */

import { auth } from '../auth.js';
import { toast } from '../components/toast.js';

export async function render(container) {
  // If already logged in, redirect directly to dashboard
  if (auth.isAuthenticated()) {
    window.location.hash = '#/dashboard';
    return;
  }

  // Extract redirect target if any
  const hash = window.location.hash;
  const redirectMatch = hash.match(/redirect=([^&]+)/);
  const targetDestination = redirectMatch ? decodeURIComponent(redirectMatch[1]) : 'dashboard';

  container.innerHTML = `
    <div class="login-page-wrapper">
      <div class="login-card-container">
        <!-- Return Link -->
        <a href="#/landing" class="login-back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Return to Overview</span>
        </a>

        <!-- Main Login Box -->
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 2v20M2 12h20"/>
                <circle cx="12" cy="12" r="9"/>
              </svg>
            </div>
            <div class="login-brand-title">PharmaSync <span>CARE</span></div>
            <h1 class="login-title">Welcome back</h1>
            <p class="login-subtitle">Sign in to access your facility dashboard.</p>
          </div>

          <!-- Alert for Errors -->
          <div id="login-error-alert" class="login-error-alert" style="display: none;"></div>

          <form id="login-form" class="login-form" novalidate onsubmit="return false;">
            <!-- Username / Email Field -->
            <div class="form-group">
              <label class="form-label" for="login-username">
                <span>Username or Facility Email</span>
              </label>
              <input 
                type="text" 
                id="login-username" 
                class="form-input" 
                placeholder="e.g. admin or s.nair@apexcentral.health" 
                autocomplete="username" 
                required 
              />
            </div>

            <!-- Password Field with Show/Hide Toggle -->
            <div class="form-group">
              <div class="form-label-row">
                <label class="form-label" for="login-password">Password</label>
                <button type="button" class="login-forgot-link" id="btn-forgot-password">
                  Forgot password?
                </button>
              </div>
              <div class="password-input-wrapper">
                <input 
                  type="password" 
                  id="login-password" 
                  class="form-input password-input" 
                  placeholder="Enter your account password" 
                  autocomplete="current-password" 
                  required 
                />
                <button 
                  type="button" 
                  id="btn-toggle-password" 
                  class="password-toggle-btn" 
                  aria-label="Show password as plain text" 
                  title="Toggle password visibility"
                >
                  <!-- Eye Open Icon (Default when hidden) -->
                  <svg id="icon-eye-open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <!-- Eye Closed / Off Icon (Hidden by default) -->
                  <svg id="icon-eye-closed" style="display: none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m9.88 9.88 4.24 4.24m-6.36-4.24a9 9 0 0 0-5.76 2.12 18 18 0 0 0 16 0 9 9 0 0 0-2.64-1.63M3 3l18 18"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Remember Me Row -->
            <div class="login-remember-row">
              <label class="remember-checkbox-label">
                <input type="checkbox" id="login-remember" class="remember-checkbox" checked />
                <span>Remember this facility session</span>
              </label>
            </div>

            <!-- Primary Sign In Button -->
            <button type="submit" id="btn-login-submit" class="btn btn-primary btn-login-submit">
              <span>Sign In</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          <!-- Evaluator Quick Demo Credentials Card -->
          <div class="demo-credentials-card">
            <div class="demo-card-header">
              <span class="demo-card-tag">EVALUATOR DEMO CREDENTIALS</span>
              <span class="demo-card-hint">Pre-configured accounts</span>
            </div>
            
            <div class="demo-accounts-list">
              <div class="demo-acc-item" data-user="admin" data-pass="pharmasync2026">
                <div class="demo-acc-meta">
                  <strong>admin</strong> &bull; <code>pharmasync2026</code>
                  <span class="demo-role-text">Apex Central Hospital (Chief Pharmacist)</span>
                </div>
                <button type="button" class="btn btn-outline btn-sm btn-quick-fill">Auto-fill</button>
              </div>

              <div class="demo-acc-item" data-user="venkat" data-pass="pharmasync2026">
                <div class="demo-acc-meta">
                  <strong>venkat</strong> &bull; <code>pharmasync2026</code>
                  <span class="demo-role-text">City Care Pharmacy (Community Pharmacist)</span>
                </div>
                <button type="button" class="btn btn-outline btn-sm btn-quick-fill">Auto-fill</button>
              </div>

              <div class="demo-acc-item" data-user="joseph" data-pass="pharmasync2026">
                <div class="demo-acc-meta">
                  <strong>joseph</strong> &bull; <code>pharmasync2026</code>
                  <span class="demo-role-text">Green Valley Clinic (Clinical Officer)</span>
                </div>
                <button type="button" class="btn btn-outline btn-sm btn-quick-fill">Auto-fill</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Academic Disclaimer Footnote -->
        <div class="login-footer-disclaimer">
          Student DBMS Prototype &bull; Synthetic Demonstration Data &bull; Non-Clinical Use
        </div>
      </div>
    </div>
  `;

  // Bind Show/Hide Password Toggle
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('btn-toggle-password');
  const iconEyeOpen = document.getElementById('icon-eye-open');
  const iconEyeClosed = document.getElementById('icon-eye-closed');

  toggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      iconEyeOpen.style.display = 'none';
      iconEyeClosed.style.display = 'inline-block';
      toggleBtn.setAttribute('aria-label', 'Hide password');
    } else {
      passwordInput.type = 'password';
      iconEyeOpen.style.display = 'inline-block';
      iconEyeClosed.style.display = 'none';
      toggleBtn.setAttribute('aria-label', 'Show password as plain text');
    }
  });

  // Forgot password notice
  document.getElementById('btn-forgot-password')?.addEventListener('click', (e) => {
    e.preventDefault();
    toast.info(
      'Prototype Recovery Notice',
      'In this student prototype, use the pre-configured evaluator accounts below to sign in instantly.'
    );
  });

  // Auto-fill demo credentials buttons
  const usernameInput = document.getElementById('login-username');
  container.querySelectorAll('.btn-quick-fill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.currentTarget.closest('.demo-acc-item');
      if (item && usernameInput && passwordInput) {
        usernameInput.value = item.dataset.user;
        passwordInput.value = item.dataset.pass;
        hideError();
        toast.info('Credentials Populated', `Selected ${item.dataset.user} (${item.dataset.pass})`);
      }
    });
  });

  // Handle Form Submission
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('btn-login-submit');

  const showError = (msg) => {
    const alert = document.getElementById('login-error-alert');
    if (alert) {
      alert.textContent = msg;
      alert.style.display = 'block';
    }
  };

  const hideError = () => {
    const alert = document.getElementById('login-error-alert');
    if (alert) {
      alert.style.display = 'none';
      alert.textContent = '';
    }
  };

  const handleLogin = async () => {
    hideError();
    const username = usernameInput?.value?.trim();
    const password = passwordInput?.value?.trim();
    const rememberMe = document.getElementById('login-remember')?.checked || false;

    if (!username || !password) {
      showError('Please enter both your username or facility email and password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Signing in...';

    // Call authentication service
    const res = auth.login(username, password, rememberMe);

    if (res.success) {
      toast.success(
        'Access Granted',
        `Authenticated as ${res.user.name} (${res.user.facilityName})`
      );
      // Route to destination
      setTimeout(() => {
        window.location.hash = `#/${targetDestination}`;
      }, 150);
    } else {
      showError(res.error || 'Authentication failed. Please verify your credentials.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Sign In</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }
  };

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });

  submitBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    handleLogin();
  });
}
