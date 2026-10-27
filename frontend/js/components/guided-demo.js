/**
 * PharmaSync CARE — Walkthrough & Demonstration Assistant (Headless)
 * Note: Floating presentation dock disabled per production guidelines.
 */

export const guidedDemo = {
  isActive: false,
  init() {
    const dockEl = document.getElementById('guided-demo-dock');
    if (dockEl) dockEl.remove();
  },
  start() {
    const dockEl = document.getElementById('guided-demo-dock');
    if (dockEl) dockEl.remove();
  },
  stop() {
    const dockEl = document.getElementById('guided-demo-dock');
    if (dockEl) dockEl.remove();
  },
  renderDock() {},
  updateDock() {}
};
