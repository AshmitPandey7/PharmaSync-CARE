/**
 * PharmaSync CARE — Healthcare Facilities Directory Page
 * Facility registry, capability badges, cold-chain verification, and interactive map.
 */

import { api } from '../api.js';
import { renderErrorState } from '../components/error-state.js';

let facilitiesList = [];
let inventoryList = [];
let shortagesList = [];
let mapInstance = null;

export async function render(container) {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  const [facRes, invRes, shtRes] = await Promise.all([
    api.getFacilities(),
    api.getInventory(),
    api.getShortages()
  ]);

  if ((!facRes.success && facRes.isNetworkError) || (!invRes.success && invRes.isNetworkError)) {
    renderErrorState(container, {
      title: 'Flask API Offline',
      message: facRes.error || invRes.error,
      onRetry: () => render(container)
    });
    return;
  }

  facilitiesList = facRes.data || [];
  inventoryList = invRes.data || [];
  shortagesList = shtRes.data || [];

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Healthcare Facilities &amp; Regional Network
        </h1>
        <p class="page-description">
          Directory of registered hospital pharmacies, community pharmacies, clinics, and logistics hubs participating in inter-facility redistribution.
        </p>
      </div>
      <div class="page-header-actions">
        <div style="display: flex; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 3px; gap: 4px;">
          <button class="btn btn-sm view-toggle-btn active" id="btn-view-cards" style="background: #FFFFFF; color: #090909; font-weight: 600;">Directory Cards</button>
          <button class="btn btn-sm view-toggle-btn" id="btn-view-map" style="background: transparent; color: var(--text-muted);">Regional Map</button>
        </div>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="table-container" style="margin-bottom: 24px;">
      <div class="table-toolbar">
        <div class="table-toolbar-left" style="flex: 1; display: flex; flex-wrap: wrap; gap: 10px;">
          <div class="search-input-wrapper" style="min-width: 240px; flex: 1;">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="net-search" placeholder="Search facilities by name, address, or license..." />
          </div>

          <select id="net-filter-type" class="filter-select">
            <option value="ALL">All Facility Types</option>
            <option value="Hospital Pharmacy">Hospital Pharmacy</option>
            <option value="Community Pharmacy">Community Pharmacy</option>
            <option value="Rural Health Centre">Rural Health Centre</option>
            <option value="Charitable Clinic">Charitable Clinic</option>
            <option value="Distribution Hub">Distribution Hub</option>
          </select>

          <select id="net-filter-coldchain" class="filter-select">
            <option value="ALL">Cold-Chain: All</option>
            <option value="YES">Certified Cold-Chain (2-8°C)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- View 1: Directory Cards Grid -->
    <div id="network-cards-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
      <!-- Dynamic facility cards -->
    </div>

    <!-- View 2: Geographic Map Container (Hidden by default) -->
    <div id="network-map-wrapper" style="display: none;">
      <div class="card" style="padding: 16px;">
        <div class="card-header" style="margin-bottom: 12px;">
          <div>
            <div class="card-title">Bengaluru Regional Healthcare Logistics Map</div>
            <div class="card-subtitle">Active healthcare facilities, certified cold-chain nodes, and redistribution radius</div>
          </div>
          <span class="badge badge-fac-hospital">${facilitiesList.length} Network Nodes Active</span>
        </div>
        <div id="facility-leaflet-map" class="map-container" style="height: 520px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); overflow: hidden; background: #0E0E0E;"></div>
      </div>
    </div>
  `;

  renderCards();
  setupEvents();
}

function renderCards() {
  const container = document.getElementById('network-cards-container');
  if (!container) return;

  const q = (document.getElementById('net-search')?.value || '').toLowerCase().trim();
  const typeVal = document.getElementById('net-filter-type')?.value || 'ALL';
  const coldVal = document.getElementById('net-filter-coldchain')?.value || 'ALL';

  const filtered = facilitiesList.filter(f => {
    const matchQ = !q ||
      f.name.toLowerCase().includes(q) ||
      f.address.toLowerCase().includes(q) ||
      (f.licenseNumber && f.licenseNumber.toLowerCase().includes(q));
    const matchT = typeVal === 'ALL' || f.type === typeVal;
    const matchC = coldVal === 'ALL' || (coldVal === 'YES' && f.coldChainCertified);
    return matchQ && matchT && matchC;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1;">
        <div class="empty-state">
          <div class="empty-state-title">No facilities match your search criteria</div>
          <div class="empty-state-desc">Try clearing filters or search terms.</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(f => {
    const facBatches = inventoryList.filter(b => b.facilityId === f.id);
    const facShortages = shortagesList.filter(s => s.facilityId === f.id && (s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED'));
    const surplusUnits = facBatches.reduce((sum, b) => sum + (b.eligibleSurplusQuantity || 0), 0);

    return `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 8px;">
            <div>
              <h3 style="font-size: 15.5px; font-weight: var(--font-bold); color: var(--text-heading); margin: 0;">${f.name}</h3>
              <span class="badge badge-fac-${f.typeBadge || 'hospital'}" style="margin-top: 5px;">${f.type}</span>
            </div>
            <span class="badge badge-exp-safe">ACTIVE</span>
          </div>

          <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -2px; margin-right: 4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${f.address}
          </p>

          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 10px 12px; font-size: 11.5px; display: flex; flex-direction: column; gap: 7px;">
            <div style="display: flex; justify-content: space-between;">
              <span class="text-muted">License ID:</span>
              <code style="font-family: var(--font-mono); color: var(--text-heading);">${f.licenseNumber || 'VERIFIED'}</code>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span class="text-muted">Cold Chain (2-8&deg;C):</span>
              <span style="font-weight: var(--font-semibold); color: ${f.coldChainCertified ? 'var(--emerald-400)' : 'var(--text-muted)'};">
                ${f.coldChainCertified ? '&#10003; Certified Refrigeration' : 'Ambient Room Temp Only'}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span class="text-muted">Inventory In-Stock:</span>
              <span style="font-weight: var(--font-semibold); color: #FFFFFF;">${facBatches.length} Batches (${surplusUnits} surplus units)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span class="text-muted">Active Shortages:</span>
              <span style="font-weight: var(--font-semibold); color: ${facShortages.length > 0 ? 'var(--rose-400)' : 'var(--text-muted)'};">
                ${facShortages.length > 0 ? `${facShortages.length} Requests Open` : 'None (Fully Stocked)'}
              </span>
            </div>
            ${f.bedCapacity > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span class="text-muted">Inpatient Beds:</span>
                <span style="font-weight: var(--font-semibold); color: var(--text-heading);">${f.bedCapacity} Beds</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px;">
          <div>
            <div style="font-weight: var(--font-semibold); color: var(--text-heading);">${f.contactPerson || 'Pharmacy Manager'}</div>
            <div class="text-muted">${f.phone || ''}</div>
          </div>
          <a href="#/inventory" class="btn btn-outline btn-sm" style="font-size: 11px;">View Stock</a>
        </div>
      </div>
    `;
  }).join('');
}

function setupEvents() {
  document.getElementById('net-search')?.addEventListener('input', renderCards);
  document.getElementById('net-filter-type')?.addEventListener('change', renderCards);
  document.getElementById('net-filter-coldchain')?.addEventListener('change', renderCards);

  const btnCards = document.getElementById('btn-view-cards');
  const btnMap = document.getElementById('btn-view-map');
  const cardsContainer = document.getElementById('network-cards-container');
  const mapWrapper = document.getElementById('network-map-wrapper');

  btnCards?.addEventListener('click', () => {
    btnCards.classList.add('active');
    btnCards.style.background = '#FFFFFF';
    btnCards.style.color = '#090909';
    btnCards.style.fontWeight = '600';
    btnMap.classList.remove('active');
    btnMap.style.background = 'transparent';
    btnMap.style.color = 'var(--text-muted)';
    btnMap.style.fontWeight = 'normal';
    cardsContainer.style.display = 'grid';
    mapWrapper.style.display = 'none';
  });

  btnMap?.addEventListener('click', () => {
    btnMap.classList.add('active');
    btnMap.style.background = '#FFFFFF';
    btnMap.style.color = '#090909';
    btnMap.style.fontWeight = '600';
    btnCards.classList.remove('active');
    btnCards.style.background = 'transparent';
    btnCards.style.color = 'var(--text-muted)';
    btnCards.style.fontWeight = 'normal';
    cardsContainer.style.display = 'none';
    mapWrapper.style.display = 'block';

    initLeafletMap();
  });
}

function initLeafletMap() {
  if (mapInstance) return;

  const mapEl = document.getElementById('facility-leaflet-map');
  if (!mapEl || !window.L) return;

  // Initialize Leaflet centered in Bengaluru
  mapInstance = window.L.map('facility-leaflet-map').setView([12.9716, 77.5946], 12);

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  const bounds = [];

  const typeIcons = {
    'Hospital Pharmacy': { emoji: '🏥', color: '#38BDF8', border: '#38BDF8' },
    'Community Pharmacy': { emoji: '💊', color: '#10B981', border: '#10B981' },
    'Rural Health Centre': { emoji: '🩺', color: '#F59E0B', border: '#F59E0B' },
    'Charitable Clinic': { emoji: '✚', color: '#A855F7', border: '#A855F7' },
    'Distribution Hub': { emoji: '🏢', color: '#FFFFFF', border: '#FFFFFF' }
  };

  facilitiesList.forEach(fac => {
    if (fac.coordinates && fac.coordinates.length === 2) {
      bounds.push(fac.coordinates);
      const conf = typeIcons[fac.type] || { emoji: '🏥', color: '#38BDF8', border: '#38BDF8' };

      const customIcon = window.L.divIcon({
        className: 'facility-marker',
        html: `
          <div style="background: #090909; border: 2px solid ${conf.border}; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 10px rgba(0,0,0,0.8);">
            ${conf.emoji}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = window.L.marker(fac.coordinates, { icon: customIcon }).addTo(mapInstance);

      const facBatches = inventoryList.filter(b => b.facilityId === fac.id);
      const facShortages = shortagesList.filter(s => s.facilityId === fac.id && (s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED'));
      const surplusUnits = facBatches.reduce((sum, b) => sum + (b.eligibleSurplusQuantity || 0), 0);

      const popupHtml = `
        <div style="font-family: var(--font-sans); padding: 4px; color: #0F172A; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            <span style="font-size: 16px;">${conf.emoji}</span>
            <strong style="font-size: 13.5px; color: #0B192C;">${fac.name}</strong>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">${fac.type}</div>
          
          <div style="font-size: 11.5px; line-height: 1.5; border-top: 1px solid #E2E8F0; padding-top: 6px;">
            <div><strong>Location:</strong> ${fac.address}</div>
            <div><strong>Cold-Chain:</strong> ${fac.coldChainCertified ? '<span style="color: #059669; font-weight: bold;">Certified (2-8°C)</span>' : 'Ambient Room Temp'}</div>
            <div><strong>Stock:</strong> ${facBatches.length} batches held (${surplusUnits} surplus units)</div>
            <div><strong>Shortages:</strong> ${facShortages.length > 0 ? `<span style="color: #DC2626; font-weight: bold;">${facShortages.length} open</span>` : '0 requests'}</div>
          </div>

          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10.5px; color: #64748B;">${fac.phone || ''}</span>
            <a href="#/inventory" style="font-size: 11px; font-weight: bold; color: #2563EB; text-decoration: none;">View Stock &rarr;</a>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
    }
  });

  if (bounds.length > 1) {
    mapInstance.fitBounds(bounds, { padding: [50, 50] });
  }

  // Trigger leaflet layout recalculation
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 200);
}
