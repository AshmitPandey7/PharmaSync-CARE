/**
 * PharmaSync CARE — API Service Layer
 * Cleanly handles both Demo Mode (synthetic state) and Real Flask API Mode.
 * Never silently fakes successful live backend responses when the server is down.
 */

import { config } from './config.js';
import {
  DEMO_FACILITIES,
  DEMO_INVENTORY,
  DEMO_SHORTAGES,
  DEMO_TRANSFERS,
  DEMO_AUDIT_LOGS,
  DEMO_USERS
} from './demo-data.js';

// Local state for Demo Mode with session/local persistence
const LOCAL_STORAGE_STATE_KEY = 'pharmasync_demo_state_v4';

class DemoStateStore {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_STATE_KEY) : null;
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not parse saved demo state, falling back to initial data', e);
    }
    return {
      facilities: JSON.parse(JSON.stringify(DEMO_FACILITIES)),
      inventory: JSON.parse(JSON.stringify(DEMO_INVENTORY)),
      shortages: JSON.parse(JSON.stringify(DEMO_SHORTAGES)),
      transfers: JSON.parse(JSON.stringify(DEMO_TRANSFERS)),
      auditLogs: JSON.parse(JSON.stringify(DEMO_AUDIT_LOGS)),
      users: JSON.parse(JSON.stringify(DEMO_USERS))
    };
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }

  reset() {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_STATE_KEY);
    this.state = {
      facilities: JSON.parse(JSON.stringify(DEMO_FACILITIES)),
      inventory: JSON.parse(JSON.stringify(DEMO_INVENTORY)),
      shortages: JSON.parse(JSON.stringify(DEMO_SHORTAGES)),
      transfers: JSON.parse(JSON.stringify(DEMO_TRANSFERS)),
      auditLogs: JSON.parse(JSON.stringify(DEMO_AUDIT_LOGS)),
      users: JSON.parse(JSON.stringify(DEMO_USERS))
    };
    this.save();
  }
}

const demoStore = new DemoStateStore();

/**
 * Low-level HTTP fetch helper for real Flask API
 */
async function fetchFromApi(endpoint, options = {}) {
  const url = `${config.API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-App': 'PharmaSync-CARE-Frontend',
    'X-User-Id': config.CURRENT_USER?.id || 'USR-ANON'
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      const errorMsg = errorData.message || (errorData.error ? errorData.error.message : null) || `Server returned error HTTP ${response.status}`;
      return {
        success: false,
        status: response.status,
        error: errorMsg,
        details: errorData.error?.details || errorData.details || null,
        data: null
      };
    }

    const json = await response.json();
    return {
      success: true,
      status: response.status,
      data: json.data !== undefined ? json.data : json,
      meta: json.meta !== undefined ? json.meta : null
    };
  } catch (err) {
    clearTimeout(timeoutId);
    let errorMessage = err.message;
    if (err.name === 'AbortError') {
      errorMessage = `Request timed out after 8s connecting to Flask backend at ${url}`;
    } else if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('fetch failed') || err.message.includes('NetworkError') || err.message.includes('ECONNREFUSED'))) {
      errorMessage = `Cannot connect to Flask API at ${config.API_BASE_URL}. Ensure Flask server is running and CORS is enabled.`;
    }

    return {
      success: false,
      status: 0,
      isNetworkError: true,
      error: errorMessage,
      data: null
    };
  }
}

/**
 * Public API client exposing all PharmaSync CARE endpoints
 */
export const api = {
  // Utility: Reset demo data
  resetDemoData() {
    demoStore.reset();
  },
  async resetAllData() {
    demoStore.reset();
  },

  // Health check
  async getHealth() {
    if (config.DEMO_MODE) {
      return {
        success: true,
        data: {
          status: 'OK',
          mode: 'DEMO_STANDALONE',
          database: 'SYNTHETIC_MEMORY',
          timestamp: new Date().toISOString()
        }
      };
    }
    return fetchFromApi('/health');
  },

  // Facilities
  async getFacilities() {
    if (config.DEMO_MODE) {
      return { success: true, data: [...demoStore.state.facilities] };
    }
    return fetchFromApi('/facilities');
  },

  async getFacilityById(id) {
    if (config.DEMO_MODE) {
      const fac = demoStore.state.facilities.find(f => f.id === id);
      return fac ? { success: true, data: fac } : { success: false, error: 'Facility not found', status: 404 };
    }
    return fetchFromApi(`/facilities/${id}`);
  },

  async createFacility(facilityData) {
    if (config.DEMO_MODE) {
      const newFacility = {
        id: `FAC-${String(demoStore.state.facilities.length + 1).padStart(3, '0')}`,
        active: true,
        ...facilityData
      };
      demoStore.state.facilities.push(newFacility);
      demoStore.save();
      return { success: true, data: newFacility };
    }
    return fetchFromApi('/facilities', {
      method: 'POST',
      body: JSON.stringify(facilityData)
    });
  },

  async updateFacility(id, updates) {
    if (config.DEMO_MODE) {
      const idx = demoStore.state.facilities.findIndex(f => f.id === id);
      if (idx === -1) return { success: false, error: 'Facility not found', status: 404 };
      demoStore.state.facilities[idx] = { ...demoStore.state.facilities[idx], ...updates };
      demoStore.save();
      return { success: true, data: demoStore.state.facilities[idx] };
    }
    return fetchFromApi(`/facilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getDonorFacilities() {
    if (config.DEMO_MODE) {
      return { success: true, data: [...demoStore.state.facilities] };
    }
    return fetchFromApi('/network/donors');
  },

  // Medicine Catalogue
  async getMedicines(filters = {}) {
    if (config.DEMO_MODE) {
      const meds = [];
      const seen = new Set();
      demoStore.state.inventory.forEach(item => {
        if (!seen.has(item.medicineName)) {
          seen.add(item.medicineName);
          meds.push({
            id: `MED-${String(seen.size).padStart(3, '0')}`,
            name: item.medicineName,
            genericName: item.genericName,
            category: item.category,
            strength: item.strength,
            dosageForm: item.dosageForm || 'Tablet',
            coldChainRequired: Boolean(item.coldChainRequired),
            unit: item.unit || 'tablets'
          });
        }
      });
      return { success: true, data: meds };
    }
    const queryParams = new URLSearchParams(filters).toString();
    return fetchFromApi(`/medicines${queryParams ? '?' + queryParams : ''}`);
  },

  async getMedicineById(id) {
    if (config.DEMO_MODE) {
      return { success: true, data: { id, name: 'Medicine ' + id } };
    }
    return fetchFromApi(`/medicines/${id}`);
  },

  async createMedicine(medicineData) {
    if (config.DEMO_MODE) {
      const newMed = { id: `MED-${Math.floor(100 + Math.random() * 900)}`, ...medicineData };
      return { success: true, data: newMed };
    }
    return fetchFromApi('/medicines', {
      method: 'POST',
      body: JSON.stringify(medicineData)
    });
  },

  async updateMedicine(id, updates) {
    if (config.DEMO_MODE) {
      return { success: true, data: { id, ...updates } };
    }
    return fetchFromApi(`/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },


  // Inventory Management
  async getInventory(filters = {}) {
    if (config.DEMO_MODE) {
      let list = [...demoStore.state.inventory];
      if (filters.facilityId && filters.facilityId !== 'ALL') {
        list = list.filter(item => item.facilityId === filters.facilityId);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(item =>
          item.medicineName.toLowerCase().includes(q) ||
          item.batchNumber.toLowerCase().includes(q) ||
          item.genericName.toLowerCase().includes(q)
        );
      }
      if (filters.category && filters.category !== 'ALL') {
        list = list.filter(item => item.category === filters.category);
      }
      return { success: true, data: list };
    }

    const queryParams = new URLSearchParams(filters).toString();
    return fetchFromApi(`/inventory${queryParams ? '?' + queryParams : ''}`);
  },

  async addInventoryBatch(batchData) {
    if (config.DEMO_MODE) {
      const newBatch = {
        id: `BAT-${Math.floor(100 + Math.random() * 900)}`,
        reservedQuantity: 0,
        availableQuantity: Number(batchData.totalQuantity),
        eligibleSurplusQuantity: Math.max(0, Number(batchData.totalQuantity) - ((Number(batchData.expectedMonthlyDemand) || 50) + (Number(batchData.safetyStockThreshold) || 20))),
        status: 'ADEQUATE',
        ...batchData,
        totalQuantity: Number(batchData.totalQuantity),
        expectedMonthlyDemand: Number(batchData.expectedMonthlyDemand) || 50,
        safetyStockThreshold: Number(batchData.safetyStockThreshold) || 20,
        unitPrice: Number(batchData.unitPrice) || 10
      };

      demoStore.state.inventory.unshift(newBatch);
      this.addAuditLog('INVENTORY_ADD', `Batch ${newBatch.batchNumber}`, `Added batch of ${newBatch.medicineName}`);
      demoStore.save();
      return { success: true, data: newBatch };
    }

    return fetchFromApi('/inventory', {
      method: 'POST',
      body: JSON.stringify(batchData)
    });
  },

  async updateInventoryBatch(id, updates) {
    if (config.DEMO_MODE) {
      const idx = demoStore.state.inventory.findIndex(item => item.id === id);
      if (idx === -1) return { success: false, error: 'Batch not found', status: 404 };

      demoStore.state.inventory[idx] = { ...demoStore.state.inventory[idx], ...updates };
      const item = demoStore.state.inventory[idx];
      // Keep surplus in sync
      if (updates.availableQuantity !== undefined || updates.totalQuantity !== undefined) {
        const avail = item.availableQuantity != null ? item.availableQuantity : item.totalQuantity;
        item.eligibleSurplusQuantity = Math.max(0, avail - ((item.expectedMonthlyDemand || 50) + (item.safetyStockThreshold || 20)));
      }
      this.addAuditLog('INVENTORY_UPDATE', `Batch ${item.batchNumber}`, 'Updated batch details');
      demoStore.save();
      return { success: true, data: item };
    }

    return fetchFromApi(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // Aliases for cleaner page code
  async addBatch(batchData) {
    return this.addInventoryBatch(batchData);
  },

  async updateBatch(id, updates) {
    return this.updateInventoryBatch(id, updates);
  },

  // Rescue Centre
  async getRescueCandidates() {
    if (config.DEMO_MODE) {
      const today = new Date();
      // Calculate transparent Rescue Priority Scores and recommendations
      const candidates = demoStore.state.inventory.map(item => {
        const expDate = new Date(item.expiryDate);
        const daysToExpiry = Math.max(0, Math.round((expDate - today) / (1000 * 60 * 60 * 24)));
        const expectedDemand = item.expectedMonthlyDemand || 100;
        const safetyStock = item.safetyStockThreshold || 30;
        const potentialSurplus = Math.max(0, item.availableQuantity - (expectedDemand + safetyStock));

        let recommendation = 'RETAIN';
        let priorityScore = 0;
        let reasons = [];

        if (daysToExpiry < 15) {
          recommendation = 'BLOCK';
          reasons.push(`Remaining shelf life (${daysToExpiry}d) is below the minimum 15-day transit & inspection safety threshold.`);
          priorityScore = 15;
        } else if (potentialSurplus <= 0) {
          recommendation = 'RETAIN';
          reasons.push(`Available stock (${item.availableQuantity}) is required locally to meet expected demand (${expectedDemand}) + safety buffer (${safetyStock}).`);
          priorityScore = 20;
        } else if (daysToExpiry <= 60 && potentialSurplus > 0) {
          recommendation = 'TRANSFER';
          // Transparent formula: 45 pts from expiry urgency + 35 pts from surplus volume ratio + 20 pts value/criticality
          const urgencyComponent = Math.min(45, Math.round((60 - daysToExpiry) * 0.75));
          const surplusComponent = Math.min(35, Math.round((potentialSurplus / item.totalQuantity) * 35));
          const valueComponent = item.unitPrice > 100 ? 20 : 10;
          priorityScore = Math.min(100, urgencyComponent + surplusComponent + valueComponent);

          reasons.push(`Expires in ${daysToExpiry} days. ${potentialSurplus} units exceed local projected demand.`);
          if (item.coldChainRequired) reasons.push('Requires verified cold-chain route (2-8°C).');
        } else {
          recommendation = 'MONITOR';
          priorityScore = 42;
          reasons.push(`Surplus available (${potentialSurplus} units), but expiry (${daysToExpiry}d) is adequate for scheduled monitoring.`);
        }

        return {
          ...item,
          daysToExpiry,
          potentialSurplus,
          priorityScore,
          recommendation,
          reasons
        };
      });

      return { success: true, data: candidates };
    }

    return fetchFromApi('/rescue/candidates');
  },

  // Shortage Management
  async getShortages(filters = {}) {
    if (config.DEMO_MODE) {
      let list = [...demoStore.state.shortages];
      if (filters.urgency && filters.urgency !== 'ALL') {
        list = list.filter(s => s.urgency === filters.urgency);
      }
      if (filters.status && filters.status !== 'ALL') {
        list = list.filter(s => s.status === filters.status);
      }
      return { success: true, data: list };
    }

    const queryParams = new URLSearchParams(filters).toString();
    return fetchFromApi(`/shortages${queryParams ? '?' + queryParams : ''}`);
  },

  async createShortage(shortageData) {
    if (config.DEMO_MODE) {
      const facility = demoStore.state.facilities.find(f => f.id === shortageData.facilityId) || demoStore.state.facilities[0];
      const newShortage = {
        id: `SHT-${Math.floor(200 + Math.random() * 800)}`,
        facilityId: facility.id,
        facilityName: facility.name,
        fulfilledQuantity: 0,
        unmetQuantity: Number(shortageData.requiredQuantity),
        status: 'OPEN',
        potentialMatchesCount: 1,
        requestedDate: new Date().toISOString().split('T')[0],
        ...shortageData,
        requiredQuantity: Number(shortageData.requiredQuantity)
      };

      demoStore.state.shortages.unshift(newShortage);
      this.addAuditLog('SHORTAGE_CREATED', `Shortage ${newShortage.id}`, `Declared shortage of ${newShortage.medicineName} (${newShortage.requiredQuantity} units)`);
      demoStore.save();
      return { success: true, data: newShortage };
    }

    return fetchFromApi('/shortages', {
      method: 'POST',
      body: JSON.stringify(shortageData)
    });
  },

  // Smart Matching
  async findMatchCandidates(shortageId) {
    if (config.DEMO_MODE) {
      const shortage = demoStore.state.shortages.find(s => s.id === shortageId);
      if (!shortage) return { success: false, error: 'Shortage not found' };

      const recipientFacility = demoStore.state.facilities.find(f => f.id === shortage.facilityId);
      const candidates = [];

      demoStore.state.inventory.forEach(batch => {
        // Exclude donor being the recipient facility itself
        if (batch.facilityId === shortage.facilityId) return;

        const donorFacility = demoStore.state.facilities.find(f => f.id === batch.facilityId);
        const expDate = new Date(batch.expiryDate);
        const daysToExpiry = Math.max(0, Math.round((expDate - new Date()) / (1000 * 60 * 60 * 24)));

        // Medicine compatibility check
        const nameMatch = batch.medicineName.toLowerCase().includes(shortage.medicineName.toLowerCase()) ||
                          shortage.medicineName.toLowerCase().includes(batch.medicineName.toLowerCase()) ||
                          batch.genericName.toLowerCase().includes(shortage.genericName?.toLowerCase() || '');

        if (!nameMatch) return;

        // Shelf-life feasibility check (Must satisfy recipient minimum requirement: 45 days)
        const meetsShelfLife = daysToExpiry >= config.POLICY.MIN_SHELF_LIFE_DAYS;

        // Cold chain compatibility
        const coldChainFeasible = !batch.coldChainRequired || (donorFacility.coldChainCertified && recipientFacility?.coldChainCertified);

        // Distance estimate (synthetic approximation)
        const distanceKm = Math.round(Math.abs(donorFacility.coordinates[0] - (recipientFacility?.coordinates[0] || 12.97)) * 110 +
                           Math.abs(donorFacility.coordinates[1] - (recipientFacility?.coordinates[1] || 77.59)) * 110);

        // Eligible redistributable quantity
        const eligibleQty = Math.min(batch.eligibleSurplusQuantity, batch.availableQuantity);

        // Compatibility score calculation (0 - 100)
        let score = 0;
        let reasons = [];
        let eligible = true;

        if (!meetsShelfLife) {
          eligible = false;
          reasons.push(`Ineligible: Remaining shelf life (${daysToExpiry}d) is below minimum safety policy threshold (${config.POLICY.MIN_SHELF_LIFE_DAYS}d).`);
        } else {
          score += 40; // Expiry feasibility points
          reasons.push(`Shelf life verified: ${daysToExpiry} days remaining (buffer satisfied).`);
        }

        if (batch.coldChainRequired && !coldChainFeasible) {
          eligible = false;
          reasons.push(`Ineligible: Cold chain requirement cannot be guaranteed between these facilities.`);
        } else if (batch.coldChainRequired) {
          score += 15;
          reasons.push('Cold-chain logistics certified at both ends.');
        }

        if (eligibleQty <= 0) {
          eligible = false;
          reasons.push(`Ineligible: Zero surplus available without encroaching on local reserve.`);
        } else {
          score += Math.min(30, Math.round((eligibleQty / shortage.unmetQuantity) * 30));
          reasons.push(`Available surplus: ${eligibleQty} units (can fulfill ${Math.min(100, Math.round((eligibleQty/shortage.unmetQuantity)*100))}%).`);
        }

        if (distanceKm < config.POLICY.LOCAL_RADIUS_KM) {
          score += 15;
          reasons.push(`Transit zone: Local tier (${distanceKm} km, transit under 2h).`);
        } else if (distanceKm < config.POLICY.REGIONAL_RADIUS_KM) {
          score += 10;
          reasons.push(`Transit zone: Regional tier (${distanceKm} km).`);
        } else {
          score += 5;
          reasons.push(`Transit zone: Extended tier (${distanceKm} km).`);
        }

        candidates.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          medicineName: batch.medicineName,
          strength: batch.strength,
          donorFacilityId: donorFacility.id,
          donorFacilityName: donorFacility.name,
          donorType: donorFacility.type,
          availableSurplus: eligibleQty,
          daysToExpiry,
          expiryDate: batch.expiryDate,
          distanceKm,
          coldChainRequired: batch.coldChainRequired,
          matchScore: eligible ? Math.min(100, score) : 0,
          isEligible: eligible,
          reasons
        });
      });

      // Sort by matchScore descending
      candidates.sort((a, b) => b.matchScore - a.matchScore);

      return {
        success: true,
        data: {
          shortage,
          candidates
        }
      };
    }

    return fetchFromApi('/matching/candidates', {
      method: 'POST',
      body: JSON.stringify({ shortageId })
    });
  },

  // FairShare Allocation
  async simulateFairShare(scenarioConfig) {
    if (config.DEMO_MODE) {
      const supply = scenarioConfig.totalAvailableUnits || 200;
      const requests = scenarioConfig.requests || [
        { facilityId: 'FAC-001', facilityName: 'Apex Central Hospital', requested: 120, bedCapacity: 450, currentStock: 10, urgency: 'EMERGENCY', vulnerabilityScore: 0.8 },
        { facilityId: 'FAC-003', facilityName: 'Green Valley Health Centre', requested: 90, bedCapacity: 30, currentStock: 0, urgency: 'EMERGENCY', vulnerabilityScore: 0.95 },
        { facilityId: 'FAC-005', facilityName: 'St. Jude Charitable Dispensary', requested: 80, bedCapacity: 15, currentStock: 2, urgency: 'HIGH', vulnerabilityScore: 0.85 }
      ];

      const totalDemand = requests.reduce((sum, r) => sum + r.requested, 0);

      // 1. FCFS (First-Come-First-Served) baseline calculation
      let remainingSupplyFcfs = supply;
      const fcfsResults = requests.map(r => {
        const allocated = Math.min(r.requested, remainingSupplyFcfs);
        remainingSupplyFcfs -= allocated;
        return {
          facilityId: r.facilityId,
          facilityName: r.facilityName,
          requested: r.requested,
          allocated,
          fulfillmentPct: Math.round((allocated / r.requested) * 100),
          unmet: r.requested - allocated
        };
      });

      // 2. FairShare Multi-Criteria Proportional Model
      // Compute weights using: Urgency (40%), Vulnerability (30%), Bed/Demand needs (30%)
      const weights = requests.map(r => {
        const urgencyWeight = r.urgency === 'EMERGENCY' ? 1.5 : (r.urgency === 'HIGH' ? 1.2 : 0.9);
        const vulnWeight = r.vulnerabilityScore || 0.5;
        const demandRatio = r.requested / totalDemand;
        return urgencyWeight * vulnWeight * demandRatio;
      });

      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let fairShareRemaining = supply;

      const fairShareResults = requests.map((r, i) => {
        const rawShare = Math.round((weights[i] / totalWeight) * supply);
        const allocated = Math.min(r.requested, rawShare);
        return {
          facilityId: r.facilityId,
          facilityName: r.facilityName,
          requested: r.requested,
          allocated,
          fulfillmentPct: Math.round((allocated / r.requested) * 100),
          unmet: r.requested - allocated,
          criteriaScore: Math.round((weights[i] / totalWeight) * 100)
        };
      });

      return {
        success: true,
        data: {
          totalAvailableSupply: supply,
          totalDemand,
          deficit: Math.max(0, totalDemand - supply),
          comparison: {
            fcfs: fcfsResults,
            fairShare: fairShareResults
          },
          explanation: `Supply (${supply} units) is ${Math.round((supply/totalDemand)*100)}% of total demand (${totalDemand} units). FairShare prevented complete starvation of subsequent facilities by prioritizing clinical urgency & vulnerability index rather than submission order timestamp.`
        }
      };
    }

    return fetchFromApi('/allocation/simulate', {
      method: 'POST',
      body: JSON.stringify(scenarioConfig)
    });
  },

  async commitAllocation(allocations) {
    if (config.DEMO_MODE) {
      return { success: true, data: { committedCount: allocations?.length || 0, status: 'COMMITTED' } };
    }
    return fetchFromApi('/allocations/commit', {
      method: 'POST',
      body: JSON.stringify({ allocations })
    });
  },


  // Transfer Management
  async getTransfers(filters = {}) {
    if (config.DEMO_MODE) {
      let list = [...demoStore.state.transfers];
      if (filters.status && filters.status !== 'ALL') {
        list = list.filter(t => t.status === filters.status);
      }
      if (filters.facilityId && filters.facilityId !== 'ALL') {
        list = list.filter(t => t.senderFacilityId === filters.facilityId || t.recipientFacilityId === filters.facilityId);
      }
      return { success: true, data: list };
    }

    const queryParams = new URLSearchParams(filters).toString();
    return fetchFromApi(`/transfers${queryParams ? '?' + queryParams : ''}`);
  },

  async getTransferById(id) {
    if (config.DEMO_MODE) {
      const trf = demoStore.state.transfers.find(t => t.id === id);
      return trf ? { success: true, data: trf } : { success: false, error: 'Transfer not found', status: 404 };
    }
    return fetchFromApi(`/transfers/${id}`);
  },

  async createTransfer(transferData) {
    if (config.DEMO_MODE) {
      const count = demoStore.state.transfers.length + 1;
      const newTransfer = {
        id: `TRF-${Math.floor(500 + Math.random() * 500)}`,
        transferCode: `TRF-2026-${String(count).padStart(3, '0')}`,
        status: 'PROPOSED',
        lifecycleIndex: 0,
        requestedDate: null,
        approvedDate: null,
        dispatchedDate: null,
        receivedDate: null,
        carrierName: 'Pending Assignment',
        temperatureLog: 'Ambient / Standard Cold',
        isSimulated: true,
        statusHistory: [
          { status: 'PROPOSED', timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16), by: config.CURRENT_USER.name, note: 'Transfer proposed' }
        ],
        ...transferData
      };

      // Transactionally reserve stock from donor batch in demo store
      if (newTransfer.batchId) {
        const batch = demoStore.state.inventory.find(b => b.id === newTransfer.batchId);
        if (batch) {
          const qty = Number(newTransfer.quantity);
          batch.reservedQuantity = (batch.reservedQuantity || 0) + qty;
          batch.availableQuantity = Math.max(0, (batch.availableQuantity || batch.totalQuantity) - qty);
          batch.eligibleSurplusQuantity = Math.max(0, (batch.eligibleSurplusQuantity || 0) - qty);
        }
      }

      demoStore.state.transfers.unshift(newTransfer);
      this.addAuditLog('TRANSFER_CREATED', newTransfer.transferCode, `Created transfer order for ${newTransfer.quantity} units of ${newTransfer.medicineName}`);
      demoStore.save();
      return { success: true, data: newTransfer };
    }

    return fetchFromApi('/transfers', {
      method: 'POST',
      body: JSON.stringify(transferData)
    });
  },

  async updateTransferStatus(id, newStatus, note = '') {
    if (config.DEMO_MODE) {
      const trf = demoStore.state.transfers.find(t => t.id === id);
      if (!trf) return { success: false, error: 'Transfer not found' };

      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
      trf.status = newStatus;

      const lifecycleMap = {
        PROPOSED: 0,
        REQUESTED: 1,
        APPROVED: 2,
        DISPATCHED: 3,
        RECEIVED: 4,
        REJECTED: -1,
        CANCELLED: -1
      };

      trf.lifecycleIndex = lifecycleMap[newStatus] !== undefined ? lifecycleMap[newStatus] : trf.lifecycleIndex;

      if (newStatus === 'REQUESTED') trf.requestedDate = timestamp;
      if (newStatus === 'APPROVED') trf.approvedDate = timestamp;
      if (newStatus === 'DISPATCHED') trf.dispatchedDate = timestamp;
      if (newStatus === 'RECEIVED') trf.receivedDate = timestamp;

      trf.statusHistory.push({
        status: newStatus,
        timestamp,
        by: config.CURRENT_USER.name,
        note: note || `Status updated to ${newStatus}`
      });

      // Transactional effects in demo store
      if (newStatus === 'RECEIVED') {
        const qty = Number(trf.quantity);
        // A. Decrement donor reserved and total stock
        if (trf.batchId) {
          const donorBatch = demoStore.state.inventory.find(b => b.id === trf.batchId);
          if (donorBatch) {
            donorBatch.reservedQuantity = Math.max(0, (donorBatch.reservedQuantity || 0) - qty);
            donorBatch.totalQuantity = Math.max(0, (donorBatch.totalQuantity || 0) - qty);
          }
        }
        // B. Credit stock to recipient facility
        const recipientBatch = demoStore.state.inventory.find(b =>
          b.facilityId === trf.recipientFacilityId &&
          b.medicineName.toLowerCase() === trf.medicineName.toLowerCase()
        );
        if (recipientBatch) {
          recipientBatch.availableQuantity = (recipientBatch.availableQuantity || 0) + qty;
          recipientBatch.totalQuantity = (recipientBatch.totalQuantity || 0) + qty;
        } else {
          demoStore.state.inventory.push({
            id: `BAT-${Math.floor(200 + Math.random() * 800)}`,
            batchNumber: `REC-${trf.transferCode.replace('TRF-', '')}`,
            medicineName: trf.medicineName,
            genericName: trf.genericName || trf.medicineName,
            strength: trf.strength || 'Standard',
            dosageForm: trf.dosageForm || 'Oral Solid',
            category: trf.category || 'Essential',
            totalQuantity: qty,
            reservedQuantity: 0,
            availableQuantity: qty,
            eligibleSurplusQuantity: 0,
            expectedMonthlyDemand: 50,
            safetyStockThreshold: 20,
            expiryDate: '2027-06-30',
            unitPrice: 10.00,
            facilityId: trf.recipientFacilityId,
            coldChainRequired: false,
            status: 'ADEQUATE'
          });
        }
        // C. Update matching shortage ticket
        const matchingShortage = demoStore.state.shortages.find(s =>
          (trf.shortageId && s.id === trf.shortageId) ||
          (s.facilityId === trf.recipientFacilityId && s.medicineName.toLowerCase() === trf.medicineName.toLowerCase() && s.status !== 'FULFILLED')
        );
        if (matchingShortage) {
          matchingShortage.fulfilledQuantity = (matchingShortage.fulfilledQuantity || 0) + qty;
          matchingShortage.unmetQuantity = Math.max(0, (matchingShortage.unmetQuantity || matchingShortage.requiredQuantity) - qty);
          matchingShortage.status = matchingShortage.unmetQuantity === 0 ? 'FULFILLED' : 'PARTIALLY_MATCHED';
        }
      } else if (newStatus === 'CANCELLED' || newStatus === 'REJECTED') {
        // Release reservation back to available
        if (trf.batchId) {
          const donorBatch = demoStore.state.inventory.find(b => b.id === trf.batchId);
          if (donorBatch) {
            const qty = Number(trf.quantity);
            donorBatch.reservedQuantity = Math.max(0, (donorBatch.reservedQuantity || 0) - qty);
            donorBatch.availableQuantity = (donorBatch.availableQuantity || 0) + qty;
            donorBatch.eligibleSurplusQuantity = (donorBatch.eligibleSurplusQuantity || 0) + qty;
          }
        }
      }

      this.addAuditLog(`TRANSFER_${newStatus}`, trf.transferCode, `Updated status to ${newStatus}. ${note}`);
      demoStore.save();
      return { success: true, data: trf };
    }

    return fetchFromApi(`/transfers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus, note })
    });
  },

  async approveTransfer(id, note = '') {
    if (config.DEMO_MODE) {
      return this.updateTransferStatus(id, 'APPROVED', note);
    }
    return fetchFromApi(`/transfers/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  },

  async dispatchTransfer(id, note = '') {
    if (config.DEMO_MODE) {
      return this.updateTransferStatus(id, 'DISPATCHED', note);
    }
    return fetchFromApi(`/transfers/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  },

  async receiveTransfer(id, note = '') {
    if (config.DEMO_MODE) {
      return this.updateTransferStatus(id, 'RECEIVED', note);
    }
    return fetchFromApi(`/transfers/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  },


  // Audit Logs
  async getAuditLogs() {
    if (config.DEMO_MODE) {
      return { success: true, data: [...demoStore.state.auditLogs] };
    }
    return fetchFromApi('/audit-logs');
  },

  addAuditLog(action, entity, details) {
    const newLog = {
      id: `LOG-${Math.floor(900 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: config.CURRENT_USER.name,
      role: config.CURRENT_USER.role,
      action,
      entity,
      details,
      ipAddress: '192.168.1.105'
    };
    demoStore.state.auditLogs.unshift(newLog);
    demoStore.save();
  },

  async getUsers() {
    if (config.DEMO_MODE) {
      return { success: true, data: [...demoStore.state.users] };
    }
    return fetchFromApi('/users');
  },

  // Executive Dashboard & Analytics
  async getDashboardSummary(facilityId = null) {
    if (config.DEMO_MODE) {
      const inv = demoStore.state.inventory;
      const sht = demoStore.state.shortages;
      const trf = demoStore.state.transfers;
      return {
        success: true,
        data: {
          totalBatches: inv.length,
          totalAvailableUnits: inv.reduce((sum, b) => sum + (b.availableQuantity || b.totalQuantity || 0), 0),
          openShortagesCount: sht.filter(s => s.status === 'OPEN' || s.status === 'PARTIALLY_MATCHED').length,
          totalUnmetUnits: sht.filter(s => s.status === 'OPEN').reduce((sum, s) => sum + (s.unmetQuantity || 0), 0),
          ongoingTransfersCount: trf.filter(t => ['REQUESTED', 'APPROVED', 'DISPATCHED'].includes(t.status)).length,
          completedTransfersCount: trf.filter(t => t.status === 'RECEIVED').length,
          surplusUnitsAvailable: inv.reduce((sum, b) => sum + (b.eligibleSurplusQuantity || 0), 0),
          urgentAttentionCount: 4
        }
      };
    }
    const q = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
    return fetchFromApi(`/dashboard/summary${q}`);
  },

  async getDashboardAnalytics(timeframe = '30') {
    if (config.DEMO_MODE) {
      return {
        success: true,
        data: {
          totalUnitsShared: 380,
          totalRequested: 330,
          totalFulfilled: 200,
          fulfillmentRatePct: 61,
          networkResilienceScore: 92,
          participation: [],
          monthlyTrends: {
            labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
            transferred: [120, 190, 240, 310, 280, 380],
            preventedWaste: [80, 140, 210, 270, 250, 350]
          }
        }
      };
    }
    return fetchFromApi(`/dashboard/analytics?timeframe=${encodeURIComponent(timeframe)}`);
  },

  // Digital Twin Simulations
  async runSimulation(params) {
    if (config.DEMO_MODE) {
      const demandMult = Number(params.demandMultiplier || 2.5);
      const delayHours = Number(params.delayHours || 4);
      const baseDemand = 3400;
      const simDemand = Math.round(baseDemand * demandMult);
      const unmanaged = Math.round(simDemand * (0.35 + (delayHours * 0.003)));
      const supplied = Math.round(unmanaged * 0.72);
      return {
        success: true,
        data: {
          simulationId: `SIM-${Math.floor(100 + Math.random() * 900)}`,
          isSandboxed: true,
          metrics: {
            simulatedDemand: simDemand,
            unmanagedStockouts: unmanaged,
            suppliedViaNetwork: supplied,
            resilienceFulfillmentPct: 92,
            isolatedServiceLevelPct: 65
          }
        }
      };
    }
    return fetchFromApi('/simulations', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async getSimulations() {
    if (config.DEMO_MODE) {
      return { success: true, data: [] };
    }
    return fetchFromApi('/simulations');
  },

  async getSimulationById(id) {
    if (config.DEMO_MODE) {
      return { success: false, error: 'Simulation not found in demo mode', status: 404 };
    }
    return fetchFromApi(`/simulations/${id}`);
  },


  // Optimization & Counterfactual Sensitivity
  async runOptimization(params) {
    if (config.DEMO_MODE) {
      return {
        success: true,
        data: {
          runId: `OPT-${Math.floor(100 + Math.random() * 900)}`,
          objectiveScores: { wastePreventionScore: 94, transportEfficiencyScore: 82, speedScore: 88 },
          allocations: [],
          tradeoffSummary: 'Optimization balanced waste prevention and transit distance.'
        }
      };
    }
    return fetchFromApi('/optimization/runs', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async getOptimizationRuns() {
    if (config.DEMO_MODE) {
      return { success: true, data: [] };
    }
    return fetchFromApi('/optimization/runs');
  },

  async getOptimizationRunById(id) {
    if (config.DEMO_MODE) {
      return { success: false, error: 'Run not found in demo mode', status: 404 };
    }
    return fetchFromApi(`/optimization/runs/${id}`);
  },


  async runCounterfactual(params) {
    if (config.DEMO_MODE) {
      return {
        success: true,
        data: {
          isCounterfactual: true,
          outcome: { recommendation: 'APPROVE', isFeasible: true, explanation: 'All constraints verified.' }
        }
      };
    }
    return fetchFromApi('/optimization/counterfactuals', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }
};
