/**
 * PharmaSync CARE — Reusable Toast Notifications
 */

export const toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show({ type = 'info', title = '', message = '', duration = 4500 }) {
    if (!this.container) this.init();

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;

    const icons = {
      success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    toastEl.innerHTML = `
      ${icons[type] || icons.info}
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" title="Close">&times;</button>
    `;

    const closeBtn = toastEl.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.dismiss(toastEl);
    });

    this.container.appendChild(toastEl);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toastEl);
      }, duration);
    }

    return toastEl;
  },

  dismiss(toastEl) {
    if (!toastEl || !toastEl.parentNode) return;
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(20px)';
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, 200);
  },

  success(title, message) { return this.show({ type: 'success', title, message }); },
  error(title, message) { return this.show({ type: 'error', title, message }); },
  warning(title, message) { return this.show({ type: 'warning', title, message }); },
  info(title, message) { return this.show({ type: 'info', title, message }); }
};
