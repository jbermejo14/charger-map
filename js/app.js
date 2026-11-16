// Lógica principal de la aplicación
class App {
  constructor() {
    this.currentTheme = localStorage.getItem('ev_theme') || 'dark';
    this.stations = [...EV_DATABASE.stations];
    this.filteredStations = [...this.stations];
    this.selectedStationForCalc = null;
    this.activeTab = 'stations'; // 'stations' o 'calculator'

    this.filters = {
      search: '',
      powerType: 'all',
      connector: 'all',
      onlyAvailable: false,
      operator: 'all'
    };
  }

  init() {
    this.applyTheme(this.currentTheme);
    chargerMap.init('map', this.currentTheme);

    this.setupEventListeners();
    this.populateVehicleSelect();
    this.populateOperatorFilter();
    this.renderStationsList();
    this.updateMapMarkers();

    // Iniciar cálculo por defecto con el primer coche
    this.onVehicleChange();
    this.runCalculation();
  }

  /* ========================================================
     GESTIÓN DE TEMA (CLARO / OSCURO)
  ======================================================== */
  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ev_theme', theme);

    // Actualizar icono del botón
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    if (themeIcon) {
      if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        if (themeText) themeText.textContent = 'Modo Claro';
      } else {
        themeIcon.className = 'fas fa-moon';
        if (themeText) themeText.textContent = 'Modo Oscuro';
      }
    }

    if (chargerMap && chargerMap.map) {
      chargerMap.setTheme(theme);
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  /* ========================================================
     EVENT LISTENERS & BINDINGS
  ======================================================== */
  setupEventListeners() {
    // Botón cambio de modo
    document.getElementById('themeToggleBtn').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Pestañas móviles o selector de paneles
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Búsqueda y filtros
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.filters.search = e.target.value.toLowerCase().trim();
      this.applyFilters();
    });

    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.filters.search = '';
        this.applyFilters();
      });
    }

    // Botones de filtro de potencia
    document.querySelectorAll('.power-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.power-filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.filters.powerType = e.currentTarget.dataset.power;
        this.applyFilters();
      });
    });

    // Filtro conector
    document.getElementById('connectorSelect').addEventListener('change', (e) => {
      this.filters.connector = e.target.value;
      this.applyFilters();
    });

    // Filtro operador
    document.getElementById('operatorSelect').addEventListener('change', (e) => {
      this.filters.operator = e.target.value;
      this.applyFilters();
    });

    // Checkbox solo disponibles
    document.getElementById('onlyAvailableCheck').addEventListener('change', (e) => {
      this.filters.onlyAvailable = e.target.checked;
      this.applyFilters();
    });

    // Botón mi ubicación
    document.getElementById('locateBtn').addEventListener('click', () => {
      this.getUserLocation();
    });

    // Botón ajustar vista del mapa
    document.getElementById('fitBoundsBtn').addEventListener('click', () => {
      chargerMap.fitAll();
    });

    // Calculadora: cambio de vehículo
    document.getElementById('vehicleSelect').addEventListener('change', () => {
      this.onVehicleChange();
      this.runCalculation();
    });

    // Sliders de batería
    const startSocRange = document.getElementById('startSocRange');
    const targetSocRange = document.getElementById('targetSocRange');
    
    startSocRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const targetVal = parseInt(targetSocRange.value, 10);
      if (val >= targetVal) {
        targetSocRange.value = Math.min(100, val + 5);
        document.getElementById('targetSocLabel').textContent = targetSocRange.value + '%';
      }
      document.getElementById('startSocLabel').textContent = val + '%';
      this.runCalculation();
    });

    targetSocRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const startVal = parseInt(startSocRange.value, 10);
      if (val <= startVal) {
        startSocRange.value = Math.max(0, val - 5);
        document.getElementById('startSocLabel').textContent = startSocRange.value + '%';
      }
      document.getElementById('targetSocLabel').textContent = val + '%';
      this.runCalculation();
    });

    // Botones presets rápidos de SoC
    document.querySelectorAll('.soc-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const from = parseInt(e.currentTarget.dataset.from, 10);
        const to = parseInt(e.currentTarget.dataset.to, 10);
        startSocRange.value = from;
        targetSocRange.value = to;
        document.getElementById('startSocLabel').textContent = from + '%';
        document.getElementById('targetSocLabel').textContent = to + '%';
        this.runCalculation();
      });
    });

    // Inputs de la calculadora que recalculan al cambiar
    ['batteryCapacityInput', 'chargerPowerInput', 'priceInput', 'consumptionInput', 'vehicleMaxPowerInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.runCalculation());
      }
    });

    // Tipo de corriente (DC / AC)
    document.querySelectorAll('input[name="currentType"]').forEach(radio => {
      radio.addEventListener('change', () => this.runCalculation());
    });

    // Limpiar estación seleccionada en calculadora
    const clearSelectedStationBtn = document.getElementById('clearSelectedStationBtn');
    if (clearSelectedStationBtn) {
      clearSelectedStationBtn.addEventListener('click', () => {
        this.clearSelectedStationForCalc();
      });
    }
  }

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const stationsView = document.getElementById('stationsView');
    const calculatorView = document.getElementById('calculatorView');

    if (tab === 'stations') {
      stationsView.classList.remove('hidden-view');
      calculatorView.classList.add('hidden-view');
    } else {
      stationsView.classList.add('hidden-view');
      calculatorView.classList.remove('hidden-view');
      this.runCalculation();
    }
  }

  /* ========================================================
     FILTRADO Y LISTADO DE ESTACIONES
  ======================================================== */
  populateOperatorFilter() {
    const operatorSelect = document.getElementById('operatorSelect');
    const operators = Array.from(new Set(this.stations.map(s => s.operator))).sort();
    
    operators.forEach(op => {
      const option = document.createElement('option');
      option.value = op;
      option.textContent = op;
      operatorSelect.appendChild(option);
    });
  }

  applyFilters() {
    this.filteredStations = this.stations.filter(station => {
      // Búsqueda de texto
      if (this.filters.search) {
        const term = this.filters.search;
        const matchText = (
          station.name.toLowerCase().includes(term) ||
          station.city.toLowerCase().includes(term) ||
          station.address.toLowerCase().includes(term) ||
          station.operator.toLowerCase().includes(term)
        );
        if (!matchText) return false;
      }

      // Tipo de potencia
      if (this.filters.powerType !== 'all') {
        if (this.filters.powerType === 'ultra' && station.powerKw < 100) return false;
        if (this.filters.powerType === 'fast' && (station.powerKw < 50 || station.powerKw >= 100)) return false;
        if (this.filters.powerType === 'normal' && station.powerKw >= 50) return false;
      }

      // Conector
      if (this.filters.connector !== 'all') {
        if (!station.connectors.includes(this.filters.connector)) return false;
      }

      // Operador
      if (this.filters.operator !== 'all') {
        if (station.operator !== this.filters.operator) return false;
      }

      // Solo disponibles
      if (this.filters.onlyAvailable) {
        if (station.status !== 'available' || station.availablePorts <= 0) return false;
      }

      return true;
    });

    this.renderStationsList();
    this.updateMapMarkers();
  }

  updateMapMarkers() {
    chargerMap.renderStations(this.filteredStations, (station) => {
      this.highlightStationCard(station.id);
    });
  }

  renderStationsList() {
    const listContainer = document.getElementById('stationsList');
    const countBadge = document.getElementById('stationsCountBadge');

    if (countBadge) {
      countBadge.textContent = `${this.filteredStations.length} encontrados`;
    }

    if (this.filteredStations.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-stations-state">
          <i class="fas fa-charging-station fa-3x"></i>
          <h4>No hay cargadores que coincidan</h4>
          <p>Prueba a relajar los filtros de búsqueda o cambiar de ubicación.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.filteredStations.map(station => {
      const isUltra = station.powerKw >= 100;
      const isFast = station.powerKw >= 50 && station.powerKw < 100;
      const statusBadge = station.status === 'available' 
        ? '<span class="status-pill available"><i class="fas fa-circle"></i> Disponible</span>' 
        : station.status === 'busy' 
          ? '<span class="status-pill busy"><i class="fas fa-circle"></i> Ocupado</span>' 
          : '<span class="status-pill maintenance"><i class="fas fa-tools"></i> Mantenimiento</span>';

      return `
        <div class="station-card" id="card-${station.id}" onclick="window.app.onCardClick('${station.id}')">
          <div class="card-top">
            <span class="operator-tag">${station.operator}</span>
            ${statusBadge}
          </div>
          <h4 class="card-name">${station.name}</h4>
          <p class="card-location"><i class="fas fa-map-marker-alt"></i> ${station.city} · <span class="card-address">${station.address}</span></p>

          <div class="card-specs">
            <div class="spec-chip power ${isUltra ? 'ultra' : isFast ? 'fast' : ''}">
              <i class="fas fa-bolt"></i> ${station.powerKw} kW
            </div>
            <div class="spec-chip price">
              <i class="fas fa-tag"></i> ${station.pricePerKwh.toFixed(2)} €/kWh
            </div>
            <div class="spec-chip ports">
              <i class="fas fa-plug"></i> ${station.availablePorts}/${station.totalPorts} libres
            </div>
          </div>

          <div class="card-connectors">
            ${station.connectors.map(c => `<span class="con-badge">${c}</span>`).join('')}
          </div>

          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-card-calc" onclick="window.app.useStationInCalculator('${station.id}')">
              <i class="fas fa-calculator"></i> Calcular Carga
            </button>
            <button class="btn-card-view" onclick="window.app.onCardClick('${station.id}')">
              <i class="fas fa-crosshairs"></i> Ubicar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  onCardClick(stationId) {
    chargerMap.focusStation(stationId);
    this.highlightStationCard(stationId);
  }

  highlightStationCard(stationId) {
    document.querySelectorAll('.station-card').forEach(c => c.classList.remove('selected-card'));
    const card = document.getElementById(`card-${stationId}`);
    if (card) {
      card.classList.add('selected-card');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /* ========================================================
     CALCULADORA DE CARGA
  ======================================================== */
  populateVehicleSelect() {
    const select = document.getElementById('vehicleSelect');
    select.innerHTML = '';

    EV_DATABASE.vehicles.forEach(vehicle => {
      const option = document.createElement('option');
      option.value = vehicle.id;
      option.textContent = `${vehicle.name} (${vehicle.batteryCapacity} kWh)`;
      select.appendChild(option);
    });
  }

  onVehicleChange() {
    const select = document.getElementById('vehicleSelect');
    const vehicleId = select.value;
    const vehicle = EV_DATABASE.vehicles.find(v => v.id === vehicleId);

    if (!vehicle) return;

    const capacityInput = document.getElementById('batteryCapacityInput');
    const vehicleMaxPowerInput = document.getElementById('vehicleMaxPowerInput');
    const consumptionInput = document.getElementById('consumptionInput');

    capacityInput.value = vehicle.batteryCapacity;
    vehicleMaxPowerInput.value = vehicle.maxDcPower;
    consumptionInput.value = vehicle.avgConsumption;

    // Si es personalizado, permitir habilitar edición directa
    const isCustom = vehicleId === 'custom';
    capacityInput.readOnly = !isCustom;
    vehicleMaxPowerInput.readOnly = !isCustom;
    consumptionInput.readOnly = !isCustom;
  }

  useStationInCalculator(stationId) {
    const station = this.stations.find(s => s.id === stationId);
    if (!station) return;

    this.selectedStationForCalc = station;

    // Rellenar datos en la calculadora
    document.getElementById('chargerPowerInput').value = station.powerKw;
    document.getElementById('priceInput').value = station.pricePerKwh;

    // Determinar corriente AC / DC según potencia
    if (station.powerKw <= 22) {
      const acRadio = document.querySelector('input[name="currentType"][value="ac"]');
      if (acRadio) acRadio.checked = true;
    } else {
      const dcRadio = document.querySelector('input[name="currentType"][value="dc"]');
      if (dcRadio) dcRadio.checked = true;
    }

    // Mostrar banner de estación seleccionada
    const banner = document.getElementById('selectedStationBanner');
    const nameEl = document.getElementById('selectedStationName');
    const specsEl = document.getElementById('selectedStationSpecs');
    if (banner && nameEl && specsEl) {
      banner.classList.remove('hidden');
      nameEl.textContent = `${station.name} (${station.operator})`;
      specsEl.textContent = `${station.powerKw} kW · ${station.pricePerKwh.toFixed(2)} €/kWh · ${station.city}`;
    }

    // Cambiar a la pestaña de calculadora
    this.switchTab('calculator');
    this.runCalculation();
  }

  clearSelectedStationForCalc() {
    this.selectedStationForCalc = null;
    const banner = document.getElementById('selectedStationBanner');
    if (banner) banner.classList.add('hidden');
    this.runCalculation();
  }

  runCalculation() {
    const batteryCapacity = parseFloat(document.getElementById('batteryCapacityInput').value) || 60;
    const vehicleMaxPower = parseFloat(document.getElementById('vehicleMaxPowerInput').value) || 150;
    const chargerPower = parseFloat(document.getElementById('chargerPowerInput').value) || 100;
    const pricePerKwh = parseFloat(document.getElementById('priceInput').value) || 0.45;
    const consumption = parseFloat(document.getElementById('consumptionInput').value) || 16.0;

    const startSoc = parseInt(document.getElementById('startSocRange').value, 10);
    const targetSoc = parseInt(document.getElementById('targetSocRange').value, 10);

    const isAC = document.querySelector('input[name="currentType"]:checked')?.value === 'ac';

    const result = evCalculator.calculate({
      batteryCapacity,
      startSoc,
      targetSoc,
      chargerPower,
      vehicleMaxPower,
      pricePerKwh,
      consumptionPer100km: consumption,
      isAC
    });

    this.renderCalculationResults(result, { startSoc, targetSoc, batteryCapacity });
  }

  renderCalculationResults(result, meta) {
    const errorBox = document.getElementById('calcErrorBox');
    const resultsContainer = document.getElementById('calcResultsContainer');

    if (result.error) {
      if (errorBox) {
        errorBox.textContent = result.error;
        errorBox.classList.remove('hidden');
      }
      if (resultsContainer) resultsContainer.classList.add('hidden');
      return;
    }

    if (errorBox) errorBox.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.remove('hidden');

    // Tiempo grande
    const timeValueEl = document.getElementById('resTimeValue');
    const timeUnitEl = document.getElementById('resTimeUnit');
    if (result.hours > 0) {
      timeValueEl.textContent = `${result.hours}h ${result.minutes}m`;
      timeUnitEl.textContent = `(${result.totalMinutes} minutos)`;
    } else {
      timeValueEl.textContent = `${result.minutes} min`;
      timeUnitEl.textContent = 'Estimado';
    }

    // Coste, Energía y Autonomía
    document.getElementById('resCostValue').textContent = `${result.totalCost.toFixed(2)} €`;
    document.getElementById('resEnergyValue').textContent = `${result.netKwhNeeded} kWh`;
    document.getElementById('resGrossEnergyValue').textContent = `(${result.grossKwhSupplied} kWh facturados)`;
    document.getElementById('resRangeValue').textContent = `+${result.gainedRangeKm} km`;
    document.getElementById('resCost100kmValue').textContent = `${result.costPer100km.toFixed(2)} € / 100km`;
    document.getElementById('resEffectivePowerValue').textContent = `${result.effectivePeakPower} kW`;

    // Barra de batería visual
    const batteryStartBar = document.getElementById('batteryStartBar');
    const batteryAddedBar = document.getElementById('batteryAddedBar');
    const batteryRemainingBar = document.getElementById('batteryRemainingBar');

    const addedPct = meta.targetSoc - meta.startSoc;
    const remainingPct = 100 - meta.targetSoc;

    batteryStartBar.style.width = `${meta.startSoc}%`;
    batteryAddedBar.style.width = `${addedPct}%`;
    batteryRemainingBar.style.width = `${remainingPct}%`;

    document.getElementById('batteryLegendStart').textContent = `Inicial: ${meta.startSoc}%`;
    document.getElementById('batteryLegendAdded').textContent = `Añadido: +${addedPct}% (${result.netKwhNeeded} kWh)`;
    document.getElementById('batteryLegendTarget').textContent = `Final: ${meta.targetSoc}%`;

    // Aviso > 80%
    const warningBox = document.getElementById('calcWarning80');
    if (warningBox) {
      if (result.warning80) {
        warningBox.classList.remove('hidden');
      } else {
        warningBox.classList.add('hidden');
      }
    }

    // Desglose de Fases
    const phasesList = document.getElementById('calcPhasesList');
    if (phasesList && result.phases) {
      phasesList.innerHTML = result.phases.map(phase => `
        <div class="phase-row">
          <div class="phase-info">
            <span class="phase-dot"></span>
            <strong>${phase.label}</strong>
          </div>
          <div class="phase-stats">
            <span class="phase-pwr">${phase.power} kW prom.</span>
            <span class="phase-time">⏱ ${phase.minutes} min</span>
          </div>
        </div>
      `).join('');
    }
  }

  /* ========================================================
     GEOLOCALIZACIÓN
  ======================================================== */
  getUserLocation() {
    const locateBtn = document.getElementById('locateBtn');
    if (!navigator.geolocation) {
      alert('La geolocalización no está soportada por este navegador.');
      return;
    }

    locateBtn.classList.add('loading');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locateBtn.classList.remove('loading');
        const { latitude, longitude } = pos.coords;
        chargerMap.setUserLocation(latitude, longitude);

        // Ordenar estaciones por distancia
        this.stations.forEach(s => {
          s.distance = this.calculateDistance(latitude, longitude, s.lat, s.lng);
        });
        this.stations.sort((a, b) => a.distance - b.distance);
        this.applyFilters();
      },
      (err) => {
        locateBtn.classList.remove('loading');
        console.warn('Error al obtener ubicación:', err);
        // Fallback a ubicación aproximada de Madrid
        chargerMap.setUserLocation(40.4168, -3.7038);
      },
      { timeout: 8000 }
    );
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
