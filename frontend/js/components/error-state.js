/**
 * PharmaSync CARE — Reusable Error State Component
 * Renders consistent empty-state error messages with Retry and Demo Mode fallback.
 */

import { config } from '../config.js';

export function renderErrorState(container, { title = 'API Connection Error', message, onRetry } = {}) {
  const displayMsg = message || `Could not connect to Flask REST API at ${config.API_BASE_URL}. Ensure the backend server is running (python backend/run.py) and CORS is enabled.`;

  container.innerHTML = `
    <div class="empty-state" style="margin: 40px auto; max-width: 540px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 36px 24px;">
      <div class="empty-state-icon" style="color: var(--status-critical); border-color: var(--status-critical-border); width: 44px; height: 44px; margin-bottom: 14px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="empty-state-title" style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${title}</div>
      <div class="empty-state-desc" style="max-width: 460px; font-size: 13px; line-height: 1.5; color: var(--text-muted); margin-bottom: 20px;">
        ${displayMsg}
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
        <button class="btn btn-primary btn-sm" id="btn-err-retry" style="display: inline-flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
          Retry Connection
        </button>
        <button class="btn btn-secondary btn-sm" id="btn-err-demo">
          Switch to Demo Mode
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-err-retry')?.addEventListener('click', () => {
    if (onRetry) onRetry();
  });

  document.getElementById('btn-err-demo')?.addEventListener('click', () => {
    config.setDemoMode(true);
    window.dispatchEvent(new CustomEvent('pharmasync:mode-changed', { detail: { demoMode: true } }));
    if (onRetry) onRetry();
  });
}
