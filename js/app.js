// Lógica principal de la aplicación con dataset real completo de España
class App {
  constructor() {
    this.currentTheme = localStorage.getItem('ev_theme') || 'dark';
    this.stations = [];
    this.filteredStations = [];
    this.selectedStationForCalc = null;
    this.activeTab = 'stations'; // 'stations' o 'calculator'

    // Paginación para el listado lateral (DOM ligero)
    this.pageSize = 30;
    this.displayedCount = 30;

    this.filters = {
      search: '',
      minPower: 0, // 0 (Todas), 22, 50, 150
      provincia: 'all',
      municipio: 'all',
      connector: 'all',
      operator: 'all'
    };
  }

  async init() {
    this.applyTheme(this.currentTheme);
    chargerMap.init('map', this.currentTheme);

    this.setupEventListeners();
    this.populateVehicleSelect();

    // Actualizar indicador de carga
    const countBadge = document.getElementById('stationsCountBadge');
    if (countBadge) countBadge.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando catálogo real...';

    // Cargar dataset completo de España (12.100+ estaciones)
    this.stations = await EV_DATABASE.loadStations();
    this.filteredStations = [...this.stations];

    this.populateProvinceFilter();
    this.populateOperatorFilter();
    this.updateMunicipioFilter();

    // Renderizar mapa y listado
    this.renderStationsList();
    this.updateMapMarkers();

    // Iniciar cálculo por defecto con el primer vehículo
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

    // Pestañas (Puntos de recarga / Calculadora)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Búsqueda de texto con debounce ligero
    let searchTimeout;
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.filters.search = e.target.value.toLowerCase().trim();
        this.applyFilters();
      }, 250);
    });

    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.filters.search = '';
        this.applyFilters();
      });
    }

    // Botones de filtro de potencia mínima (Todas, ≥22, ≥50, ≥150 kW)
    document.querySelectorAll('.power-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.power-filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.filters.minPower = parseFloat(e.currentTarget.dataset.minPower) || 0;
        this.applyFilters();
      });
    });

    // Filtro Provincia
    const provinciaSelect = document.getElementById('provinciaSelect');
    if (provinciaSelect) {
      provinciaSelect.addEventListener('change', (e) => {
        this.filters.provincia = e.target.value;
        this.updateMunicipioFilter();
        this.applyFilters();
      });
    }

    // Filtro Municipio
    const municipioSelect = document.getElementById('municipioSelect');
    if (municipioSelect) {
      municipioSelect.addEventListener('change', (e) => {
        this.filters.municipio = e.target.value;
        this.applyFilters();
      });
    }

    // Filtro Conector
    document.getElementById('connectorSelect').addEventListener('change', (e) => {
      this.filters.connector = e.target.value;
      this.applyFilters();
    });

    // Filtro Operador
    document.getElementById('operatorSelect').addEventListener('change', (e) => {
      this.filters.operator = e.target.value;
      this.applyFilters();
    });

    // Botón Resetear Filtros
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        this.resetAllFilters();
      });
    }

    // Botón Cargar Más Estaciones
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.loadMoreStations();
      });
    }

    // Botón mi ubicación
    document.getElementById('locateBtn').addEventListener('click', () => {
      this.getUserLocation();
    });

    // Botón ajustar vista del mapa
    document.getElementById('fitBoundsBtn').addEventListener('click', () => {
      chargerMap.fitAll();
    });

    // Selector de capas del mapa (como en ZBE-MAP: OSM, Oscuro, Satélite, CARTO)
    document.querySelectorAll('.map-layer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const layer = e.currentTarget.dataset.layer;
        chargerMap.setLayer(layer);
      });
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

    // Limpiar estación vinculada en calculadora
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
     FILTRADO Y LISTADO DE ESTACIONES REALES
  ======================================================== */
  populateProvinceFilter() {
    const provinciaSelect = document.getElementById('provinciaSelect');
    if (!provinciaSelect) return;

    provinciaSelect.innerHTML = '<option value="all">Todas las Provincias</option>';
    const provincias = Array.from(new Set(this.stations.map(s => s.provincia).filter(Boolean))).sort();
    
    provincias.forEach(prov => {
      const opt = document.createElement('option');
      opt.value = prov;
      opt.textContent = prov;
      provinciaSelect.appendChild(opt);
    });
  }

  updateMunicipioFilter() {
    const municipioSelect = document.getElementById('municipioSelect');
    if (!municipioSelect) return;

    municipioSelect.innerHTML = '<option value="all">Todos los Municipios</option>';

    let pool = this.stations;
    if (this.filters.provincia !== 'all') {
      pool = pool.filter(s => s.provincia === this.filters.provincia);
    }

    const municipios = Array.from(new Set(pool.map(s => s.municipio).filter(Boolean))).sort();
    municipios.forEach(mun => {
      const opt = document.createElement('option');
      opt.value = mun;
      opt.textContent = mun;
      municipioSelect.appendChild(opt);
    });

    this.filters.municipio = 'all';
  }

  populateOperatorFilter() {
    const operatorSelect = document.getElementById('operatorSelect');
    if (!operatorSelect) return;

    operatorSelect.innerHTML = '<option value="all">Todos los operadores</option>';

    // Contar estaciones por operador para ordenar por presencia
    const opCount = {};
    this.stations.forEach(s => {
      const op = s.operador || 'Otros';
      opCount[op] = (opCount[op] || 0) + 1;
    });

    const sortedOps = Object.keys(opCount).sort((a, b) => opCount[b] - opCount[a]);

    sortedOps.forEach(op => {
      const count = opCount[op];
      const option = document.createElement('option');
      option.value = op;
      option.textContent = `${op} (${count})`;
      operatorSelect.appendChild(option);
    });
  }

  resetAllFilters() {
    this.filters = {
      search: '',
      minPower: 0,
      provincia: 'all',
      municipio: 'all',
      connector: 'all',
      operator: 'all'
    };

    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.power-filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.minPower === '0');
    });

    document.getElementById('provinciaSelect').value = 'all';
    this.updateMunicipioFilter();
    document.getElementById('connectorSelect').value = 'all';
    document.getElementById('operatorSelect').value = 'all';

    this.applyFilters();
  }

  applyFilters() {
    const { search, minPower, provincia, municipio, connector, operator } = this.filters;

    this.filteredStations = this.stations.filter(station => {
      // 1. Potencia mínima
      if (minPower > 0 && (station.potencia_max_kw || 0) < minPower) {
        return false;
      }

      // 2. Provincia
      if (provincia !== 'all' && station.provincia !== provincia) {
        return false;
      }

      // 3. Municipio
      if (municipio !== 'all' && station.municipio !== municipio) {
        return false;
      }

      // 4. Operador
      if (operator !== 'all' && station.operador !== operator) {
        return false;
      }

      // 5. Tipo de conector
      if (connector !== 'all') {
        if (!station.conectores || !station.conectores.includes(connector)) {
          return false;
        }
      }

      // 6. Búsqueda de texto (nombre, municipio, provincia, direccion, operador)
      if (search) {
        const textToSearch = `${station.nombre} ${station.municipio} ${station.provincia} ${station.direccion} ${station.operador}`.toLowerCase();
        if (!textToSearch.includes(search)) {
          return false;
        }
      }

      return true;
    });

    // Reiniciar paginación al cambiar filtros
    this.displayedCount = this.pageSize;

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
    const paginationFooter = document.getElementById('paginationFooter');
    const paginationInfo = document.getElementById('paginationInfo');

    const total = this.filteredStations.length;
    const currentBatch = this.filteredStations.slice(0, this.displayedCount);

    if (countBadge) {
      countBadge.textContent = `${total.toLocaleString('es-ES')} estaciones encontradas`;
    }

    if (total === 0) {
      listContainer.innerHTML = `
        <div class="empty-stations-state">
          <i class="fas fa-charging-station fa-3x"></i>
          <h4>No hay estaciones con estos filtros</h4>
          <p>Prueba a rebajar la potencia mínima o seleccionar otra provincia/municipio.</p>
        </div>
      `;
      if (paginationFooter) paginationFooter.classList.add('hidden');
      return;
    }

    listContainer.innerHTML = currentBatch.map(station => this.createStationCardHtml(station)).join('');

    // Actualizar paginador
    if (paginationFooter) {
      if (this.displayedCount < total) {
        paginationFooter.classList.remove('hidden');
        if (paginationInfo) {
          paginationInfo.textContent = `Mostrando ${currentBatch.length} de ${total.toLocaleString('es-ES')}`;
        }
      } else {
        paginationFooter.classList.add('hidden');
      }
    }
  }

  loadMoreStations() {
    const listContainer = document.getElementById('stationsList');
    const total = this.filteredStations.length;
    const prevCount = this.displayedCount;
    this.displayedCount = Math.min(total, this.displayedCount + this.pageSize);

    const nextBatch = this.filteredStations.slice(prevCount, this.displayedCount);
    const htmlChunk = nextBatch.map(station => this.createStationCardHtml(station)).join('');
    listContainer.insertAdjacentHTML('beforeend', htmlChunk);

    const paginationFooter = document.getElementById('paginationFooter');
    const paginationInfo = document.getElementById('paginationInfo');

    if (this.displayedCount >= total) {
      if (paginationFooter) paginationFooter.classList.add('hidden');
    } else {
      if (paginationInfo) {
        paginationInfo.textContent = `Mostrando ${this.displayedCount} de ${total.toLocaleString('es-ES')}`;
      }
    }
  }

  createStationCardHtml(station) {
    const power = station.potencia_max_kw || 0;
    const isUltra = power >= 150;
    const isFast = power >= 50 && power < 150;
    const isSemi = power >= 22 && power < 50;

    const tierClass = isUltra ? 'ultra' : isFast ? 'fast' : isSemi ? 'semi' : '';
    const tierName = isUltra ? 'Ultrarrápida' : isFast ? 'Rápida' : isSemi ? 'Semi-rápida' : 'Lenta / AC';

    const connectors = station.conectores || [];
    const chargeTypes = station.tipos_carga || [];

    return `
      <div class="station-card" id="card-${station.id}" onclick="window.app.onCardClick('${station.id}')">
        <div class="card-top">
          <span class="operator-tag">${station.operador}</span>
          <span class="status-pill available"><i class="fas fa-circle"></i> ${tierName}</span>
        </div>
        <h4 class="card-name">${station.nombre}</h4>
        <p class="card-location">
          <i class="fas fa-map-marker-alt"></i> 
          <strong>${station.municipio}</strong> (${station.provincia})
          ${station.direccion ? `<span class="card-address">· ${station.direccion}</span>` : ''}
        </p>

        <div class="card-specs">
          <div class="spec-chip power ${tierClass}">
            <i class="fas fa-bolt"></i> ${station.potencia_max_kw} kW
          </div>
          <div class="spec-chip ports">
            <i class="fas fa-plug"></i> ${station.num_conectores} conector${station.num_conectores > 1 ? 'es' : ''}
          </div>
          <div class="spec-chip price">
            <i class="fas fa-tag"></i> ~${(station.precio_estimado || 0.45).toFixed(2)} €/kWh
          </div>
        </div>

        <div class="card-connectors">
          ${connectors.map(c => `<span class="con-badge">${c}</span>`).join('')}
          ${chargeTypes.map(t => `<span class="con-badge charge-type">${t}</span>`).join('')}
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
    if (!select) return;
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
    const power = station.potencia_max_kw || 22;
    document.getElementById('chargerPowerInput').value = power;
    document.getElementById('priceInput').value = (station.precio_estimado || 0.45).toFixed(2);

    // Seleccionar corriente AC o DC según el tipo y potencia
    const hasDC = (station.tipos_carga || []).includes('DC') || power > 22;
    if (hasDC) {
      const dcRadio = document.querySelector('input[name="currentType"][value="dc"]');
      if (dcRadio) dcRadio.checked = true;
    } else {
      const acRadio = document.querySelector('input[name="currentType"][value="ac"]');
      if (acRadio) acRadio.checked = true;
    }

    // Mostrar banner de estación seleccionada
    const banner = document.getElementById('selectedStationBanner');
    const nameEl = document.getElementById('selectedStationName');
    const specsEl = document.getElementById('selectedStationSpecs');
    if (banner && nameEl && specsEl) {
      banner.classList.remove('hidden');
      nameEl.textContent = `${station.nombre} · ${station.municipio}`;
      specsEl.textContent = `${station.operador} · ${power} kW · ${(station.precio_estimado || 0.45).toFixed(2)} €/kWh`;
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

    const timeValueEl = document.getElementById('resTimeValue');
    const timeUnitEl = document.getElementById('resTimeUnit');
    if (result.hours > 0) {
      timeValueEl.textContent = `${result.hours}h ${result.minutes}m`;
      timeUnitEl.textContent = `(${result.totalMinutes} minutos)`;
    } else {
      timeValueEl.textContent = `${result.minutes} min`;
      timeUnitEl.textContent = 'Estimado según curva';
    }

    document.getElementById('resCostValue').textContent = `${result.totalCost.toFixed(2)} €`;
    document.getElementById('resEnergyValue').textContent = `${result.netKwhNeeded} kWh`;
    document.getElementById('resGrossEnergyValue').textContent = `(${result.grossKwhSupplied} kWh facturados)`;
    document.getElementById('resRangeValue').textContent = `+${result.gainedRangeKm} km`;
    document.getElementById('resCost100kmValue').textContent = `${result.costPer100km.toFixed(2)} € / 100km`;
    document.getElementById('resEffectivePowerValue').textContent = `${result.effectivePeakPower} kW`;

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

    const warningBox = document.getElementById('calcWarning80');
    if (warningBox) {
      if (result.warning80) {
        warningBox.classList.remove('hidden');
      } else {
        warningBox.classList.add('hidden');
      }
    }

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
      alert('La geolocalización no está soportada por tu navegador.');
      return;
    }

    locateBtn.classList.add('loading');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locateBtn.classList.remove('loading');
        const { latitude, longitude } = pos.coords;
        chargerMap.setUserLocation(latitude, longitude);

        // Ordenar estaciones por distancia al usuario
        this.stations.forEach(s => {
          s.distance = this.calculateDistance(latitude, longitude, s.lat, s.lng);
        });
        this.stations.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        this.applyFilters();
      },
      (err) => {
        locateBtn.classList.remove('loading');
        console.warn('Error al obtener ubicación:', err);
        chargerMap.setUserLocation(40.4168, -3.7038);
      },
      { timeout: 8000 }
    );
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
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

// Iniciar aplicación
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
