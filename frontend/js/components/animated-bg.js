/**
 * PharmaSync CARE — Animated Healthcare Network Background Component
 * Built with Anime.js v4
 *
 * Renders an understated, elegant monochrome constellation representing
 * interconnected healthcare facilities, inventory pipelines, and redistribution paths.
 */

import { animate } from '../../assets/vendor/anime.esm.js';

export class AnimatedNetworkBackground {
  constructor() {
    this.container = null;
    this.svg = null;
    this.animations = [];
    this.resizeHandler = null;
    this.isReducedMotion = false;
  }

  /**
   * Mount the animated background into a parent container
   * @param {HTMLElement} parentEl
   */
  mount(parentEl) {
    if (!parentEl) return;
    this.destroy(); // Clean any previous instance

    // Check prefers-reduced-motion
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.container = document.createElement('div');
    this.container.id = 'landing-animated-bg';
    this.container.className = 'landing-animated-bg';
    this.container.setAttribute('aria-hidden', 'true');
    parentEl.appendChild(this.container);

    this.buildNetwork();

    this.resizeHandler = () => {
      this.destroyAnimations();
      this.buildNetwork();
    };
    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  /**
   * Constructs the SVG nodes and paths
   */
  buildNetwork() {
    if (!this.container) return;
    this.container.innerHTML = '';

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';

    // Defs for subtle glowing filters / gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#404040" stop-opacity="0.4"/>
        <stop offset="50%" stop-color="#737373" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#404040" stop-opacity="0.3"/>
      </linearGradient>
    `;
    svg.appendChild(defs);

    // Generate balanced network distribution nodes
    const cols = width > 1200 ? 6 : (width > 768 ? 4 : 3);
    const rows = height > 900 ? 5 : (height > 600 ? 4 : 3);
    const colStep = width / cols;
    const rowStep = height / rows;

    const nodes = [];
    let idCounter = 0;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        // Skip some slots randomly to create an organic topological network
        if ((c + r) % 5 === 0 && Math.random() > 0.4) continue;

        const jitterX = (Math.random() - 0.5) * (colStep * 0.65);
        const jitterY = (Math.random() - 0.5) * (rowStep * 0.65);
        const x = Math.max(40, Math.min(width - 40, (c + 0.5) * colStep + jitterX));
        const y = Math.max(40, Math.min(height - 40, (r + 0.5) * rowStep + jitterY));

        // Node tier: Hub Hospital (4px), Pharmacy (3px), Rural Clinic (2px)
        const isHub = idCounter % 4 === 0;
        const radius = isHub ? 3.5 : (idCounter % 2 === 0 ? 2.5 : 2);

        nodes.push({
          id: idCounter++,
          x,
          y,
          originX: x,
          originY: y,
          radius,
          isHub
        });
      }
    }

    // Connect neighbor nodes with thin technical lines
    const maxDistance = Math.min(colStep * 1.6, 320);
    const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linesGroup.setAttribute('class', 'network-lines');

    const connections = [];

    for (let i = 0; i < nodes.length; i++) {
      let connectionsFromThisNode = 0;
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDistance && connectionsFromThisNode < 3) {
          connectionsFromThisNode++;
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', nodes[i].x);
          line.setAttribute('y1', nodes[i].y);
          line.setAttribute('x2', nodes[j].x);
          line.setAttribute('y2', nodes[j].y);
          line.setAttribute('stroke', '#333333');
          line.setAttribute('stroke-width', '1');
          line.setAttribute('stroke-opacity', (0.2 + Math.random() * 0.25).toFixed(2));
          line.setAttribute('class', 'net-line');

          linesGroup.appendChild(line);
          connections.push({ from: nodes[i], to: nodes[j], el: line });
        }
      }
    }
    svg.appendChild(linesGroup);

    // Nodes Group
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.setAttribute('class', 'network-nodes');

    const nodeElements = [];
    nodes.forEach(node => {
      // Glow ring for hub facilities
      if (node.isHub) {
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('cx', node.x);
        halo.setAttribute('cy', node.y);
        halo.setAttribute('r', node.radius * 2.8);
        halo.setAttribute('fill', 'none');
        halo.setAttribute('stroke', '#555555');
        halo.setAttribute('stroke-width', '0.75');
        halo.setAttribute('stroke-dasharray', '2 2');
        halo.setAttribute('stroke-opacity', '0.35');
        halo.setAttribute('class', 'hub-halo');
        nodesGroup.appendChild(halo);
      }

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', node.radius);
      circle.setAttribute('fill', node.isHub ? '#FFFFFF' : '#A3A3A3');
      circle.setAttribute('opacity', node.isHub ? '0.9' : '0.6');
      circle.setAttribute('class', 'net-node');

      nodesGroup.appendChild(circle);
      nodeElements.push({ el: circle, node });
    });
    svg.appendChild(nodesGroup);

    // Light Packets / Pulses traversing network connections
    const packetsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    packetsGroup.setAttribute('class', 'network-packets');

    const packetElements = [];
    const packetCount = Math.min(connections.length, 6);

    for (let p = 0; p < packetCount; p++) {
      const conn = connections[(p * 3 + 1) % connections.length];
      if (!conn) continue;

      const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      packet.setAttribute('cx', conn.from.x);
      packet.setAttribute('cy', conn.from.y);
      packet.setAttribute('r', '2');
      packet.setAttribute('fill', '#FFFFFF');
      packet.setAttribute('opacity', '0');
      packet.setAttribute('class', 'net-packet');

      packetsGroup.appendChild(packet);
      packetElements.push({ el: packet, conn });
    }
    svg.appendChild(packetsGroup);

    this.container.appendChild(svg);
    this.svg = svg;

    // Run Anime.js v4 animations if reduced motion is not requested
    if (!this.isReducedMotion) {
      this.startAnimations(linesGroup, nodeElements, packetElements);
    }
  }

  /**
   * Animate network elements using Anime.js v4
   */
  startAnimations(linesGroup, nodeElements, packetElements) {
    const animeFn = typeof animate === 'function' ? animate : window.anime?.animate;
    if (!animeFn) return;

    // 1. Subtle Line Opacity & Shift
    const lineEls = linesGroup.querySelectorAll('.net-line');
    if (lineEls.length > 0) {
      const lineAnim = animeFn(lineEls, {
        strokeOpacity: () => [0.15, 0.45],
        duration: 4500,
        delay: (el, i) => (i % 8) * 400,
        ease: 'inOutSine',
        loop: true,
        alternate: true
      });
      this.animations.push(lineAnim);
    }

    // 2. Gentle Hub Halo Breathing
    const halos = this.svg.querySelectorAll('.hub-halo');
    if (halos.length > 0) {
      const haloAnim = animeFn(halos, {
        r: (el) => [parseFloat(el.getAttribute('r')), parseFloat(el.getAttribute('r')) * 1.35],
        strokeOpacity: [0.15, 0.55],
        duration: 3600,
        delay: (el, i) => i * 600,
        ease: 'inOutSine',
        loop: true,
        alternate: true
      });
      this.animations.push(haloAnim);
    }

    // 3. Subtle Node Opacity Pulsing
    const nodes = this.svg.querySelectorAll('.net-node');
    if (nodes.length > 0) {
      const nodeAnim = animeFn(nodes, {
        opacity: [0.4, 0.85],
        duration: 3200,
        delay: (el, i) => (i % 6) * 350,
        ease: 'inOutQuad',
        loop: true,
        alternate: true
      });
      this.animations.push(nodeAnim);
    }

    // 4. Moving Data Packets along selected paths
    packetElements.forEach((p, idx) => {
      const startX = p.conn.from.x;
      const startY = p.conn.from.y;
      const endX = p.conn.to.x;
      const endY = p.conn.to.y;

      const packetAnim = animeFn(p.el, {
        cx: [startX, endX],
        cy: [startY, endY],
        opacity: [
          { value: 0, duration: 100 },
          { value: 0.9, duration: 600 },
          { value: 0.8, duration: 2000 },
          { value: 0, duration: 500 }
        ],
        duration: 3200 + idx * 700,
        delay: idx * 900,
        ease: 'inOutSine',
        loop: true
      });
      this.animations.push(packetAnim);
    });
  }

  /**
   * Pause and revert animations to prevent memory leaks
   */
  destroyAnimations() {
    this.animations.forEach(anim => {
      try {
        if (typeof anim.pause === 'function') anim.pause();
        if (typeof anim.revert === 'function') anim.revert();
      } catch (err) {
        // silent
      }
    });
    this.animations = [];
  }

  /**
   * Completely unmount background component
   */
  destroy() {
    this.destroyAnimations();

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }
}
