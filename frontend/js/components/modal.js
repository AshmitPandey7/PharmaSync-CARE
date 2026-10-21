/**
 * PharmaSync CARE — Reusable Modal Dialog
 */

export const modal = {
  container: null,
  activeCloseHandler: null,

  init() {
    this.container = document.getElementById('modal-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'modal-container';
      document.body.appendChild(this.container);
    }
  },

  open({ title = '', content = '', footer = '', size = 'md', onClose = null }) {
    if (!this.container) this.init();
    this.close(); // Clean any existing modal

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const dialog = document.createElement('div');
    dialog.className = `modal-dialog ${size === 'lg' ? 'modal-lg' : ''}`;

    dialog.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close-btn" aria-label="Close dialog">&times;</button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    `;

    backdrop.appendChild(dialog);
    this.container.appendChild(backdrop);

    const close = () => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
      document.removeEventListener('keydown', keyHandler);
      if (onClose) onClose();
    };

    const keyHandler = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', keyHandler);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    const closeBtn = dialog.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', close);

    this.activeCloseHandler = close;
    return { dialog, close };
  },

  close() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    if (this.activeCloseHandler) {
      this.activeCloseHandler = null;
    }
  }
};
