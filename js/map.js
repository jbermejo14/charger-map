// Gestión del Mapa Leaflet y Marcadores con Clustering (leaflet.markercluster)
class ChargerMap {
  constructor() {
    this.map = null;
    this.markers = new Map();
    this.clusterGroup = null;
    this.currentTileLayers = [];
    this.userLocationMarker = null;
    this.currentLayerType = 'osm';

    // Capas de mapa idénticas a ZBE-MAP
    this.layersConfig = {
      osm: {
        type: 'single',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
          subdomains: ['a', 'b', 'c'],
          maxZoom: 19
        }
      },
      dark: {
        type: 'esri-dark',
        base: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ref: 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        optionsBase: {
          attribution: '&copy; Esri, <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
          maxZoom: 16
        },
        optionsRef: {
          maxZoom: 16
        }
      },
      sat: {
        type: 'single',
        url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 18
        }
      },
      carto: {
        type: 'single',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        options: {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }
      }
    };
  }

  init(containerId = 'map', initialTheme = 'dark') {
    // Centro inicial: Madrid / España con maxZoom definido para MarkerCluster
    this.map = L.map(containerId, {
      center: [40.4168, -3.7038],
      zoom: 6,
      minZoom: 4,
      maxZoom: 19,
      zoomControl: false,
      preferCanvas: true
    });

    // Control de zoom en esquina superior derecha
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // 1. Inicializar primero la capa base para que MarkerCluster disponga del maxZoom
    const defaultLayer = initialTheme === 'dark' ? 'dark' : 'osm';
    this.setLayer(defaultLayer);

    // 2. Inicializar Cluster Group con soporte para 12.000+ marcadores
    this.initClusterGroup();
  }

  initClusterGroup() {
    this.clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 50,
      maxClusterRadius: 65,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 18,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let sizeClass = 'small';
        let sizePx = 36;
        if (count >= 100) {
          sizeClass = 'large';
          sizePx = 48;
        } else if (count >= 20) {
          sizeClass = 'medium';
          sizePx = 42;
        }

        const displayCount = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;

        return L.divIcon({
          html: `<div class="ev-cluster-bubble ${sizeClass}"><span>${displayCount}</span></div>`,
          className: 'ev-custom-cluster-icon',
          iconSize: L.point(sizePx, sizePx),
          iconAnchor: L.point(sizePx / 2, sizePx / 2)
        });
      }
    });

    this.map.addLayer(this.clusterGroup);
  }

  setLayer(layerKey) {
    this.currentTileLayers.forEach(layer => {
      try {
        this.map.removeLayer(layer);
      } catch (e) {}
    });
    this.currentTileLayers = [];

    const config = this.layersConfig[layerKey] || this.layersConfig.osm;
    this.currentLayerType = layerKey;

    if (config.type === 'esri-dark') {
      const darkBase = L.tileLayer(config.base, config.optionsBase).addTo(this.map);
      const darkRef = L.tileLayer(config.ref, config.optionsRef).addTo(this.map);
      this.currentTileLayers.push(darkBase, darkRef);
    } else {
      const layer = L.tileLayer(config.url, config.options).addTo(this.map);
      this.currentTileLayers.push(layer);
    }

    document.querySelectorAll('.map-layer-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layer === layerKey);
    });
  }

  setTheme(theme) {
    if (theme === 'dark') {
      this.setLayer('dark');
    } else {
      this.setLayer('osm');
    }
  }

  createCustomIcon(station) {
    const power = station.potencia_max_kw || 0;
    const isUltra = power >= 150;
    const isFast = power >= 50 && power < 150;
    const isSemi = power >= 22 && power < 50;

    const powerLabel = power >= 1 ? `${Math.round(power)}k` : 'AC';
    const tierClass = isUltra ? 'ultra' : isFast ? 'fast' : isSemi ? 'semi' : 'normal';

    const html = `
      <div class="custom-marker" title="${station.nombre} - ${station.potencia_max_kw} kW">
        <div class="marker-pin ${tierClass}">
          <svg class="marker-bolt" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span class="marker-power">${powerLabel}</span>
        </div>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'ev-leaflet-marker',
      iconSize: [40, 44],
      iconAnchor: [20, 44],
      popupAnchor: [0, -42]
    });
  }

  renderStations(stations, onSelectStation) {
    if (!this.clusterGroup) return;

    this.clusterGroup.clearLayers();
    this.markers.clear();

    const markersToAdd = [];

    stations.forEach(station => {
      const icon = this.createCustomIcon(station);
      const marker = L.marker([station.lat, station.lng], { icon });

      const power = station.potencia_max_kw || 0;
      const isUltra = power >= 150;
      const isFast = power >= 50 && power < 150;

      const powerBadge = isUltra 
        ? '<span class="badge-tier ultra">Ultrarrápida (≥150 kW)</span>'
        : isFast 
          ? '<span class="badge-tier fast">Rápida (50-149 kW)</span>'
          : '<span class="badge-tier normal">Semi-rápida / Lenta</span>';

      const connectorsHtml = (station.conectores || []).map(c => `<span class="badge-connector">${c}</span>`).join(' ');
      const typesHtml = (station.tipos_carga || []).map(t => `<span class="badge-charge-type">${t}</span>`).join(' ');

      const popupContent = `
        <div class="station-popup">
          <div class="popup-header">
            <div class="popup-operator">${station.operador}</div>
            ${powerBadge}
          </div>
          <h3 class="popup-title">${station.nombre}</h3>
          <p class="popup-address"><i class="fas fa-location-dot"></i> ${station.direccion ? station.direccion + ', ' : ''}<strong>${station.municipio}</strong> (${station.provincia})</p>
          
          <div class="popup-specs-grid">
            <div class="spec-item">
              <span class="spec-label">Potencia máx.</span>
              <span class="spec-val highlight">${station.potencia_max_kw} kW</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Tarifa aprox.</span>
              <span class="spec-val">${station.precio_estimado ? station.precio_estimado.toFixed(2) + ' €/kWh' : '0.45 €/kWh'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Puestos / Conectores</span>
              <span class="spec-val">${station.num_conectores} conector${station.num_conectores > 1 ? 'es' : ''}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Horario</span>
              <span class="spec-val" style="font-size:0.75rem;">${station.horario && station.horario !== 'No especificado' ? 'Disponible' : '24 horas'}</span>
            </div>
          </div>

          <div class="popup-connectors">
            ${connectorsHtml}
            ${typesHtml}
          </div>

          <div class="popup-actions">
            <button class="btn-popup-calc" onclick="window.app.useStationInCalculator('${station.id}')">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Calcular carga aquí
            </button>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}" target="_blank" rel="noopener" class="btn-popup-route" title="Cómo llegar con Google Maps">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              Ruta
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 320, minWidth: 280, className: 'custom-leaflet-popup' });
      
      marker.on('click', () => {
        if (onSelectStation) {
          onSelectStation(station);
        }
      });

      this.markers.set(station.id, marker);
      markersToAdd.push(marker);
    });

    this.clusterGroup.addLayers(markersToAdd);
  }

  focusStation(stationId) {
    const marker = this.markers.get(stationId);
    if (!marker) return;

    if (this.clusterGroup.hasLayer(marker)) {
      this.clusterGroup.zoomToShowLayer(marker, () => {
        marker.openPopup();
      });
    } else {
      const latLng = marker.getLatLng();
      this.map.flyTo(latLng, 15, { duration: 1 });
      marker.openPopup();
    }
  }

  setUserLocation(lat, lng) {
    if (this.userLocationMarker) {
      this.map.removeLayer(this.userLocationMarker);
    }

    const icon = L.divIcon({
      html: `
        <div class="user-location-marker">
          <div class="pulse-ring"></div>
          <div class="location-dot"></div>
        </div>
      `,
      className: 'user-pos-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    this.userLocationMarker = L.marker([lat, lng], { icon }).addTo(this.map);
    this.map.flyTo([lat, lng], 13, { duration: 1.5 });
  }

  fitAll() {
    if (this.markers.size === 0) return;
    if (this.clusterGroup && this.clusterGroup.getLayers().length > 0) {
      this.map.fitBounds(this.clusterGroup.getBounds().pad(0.08));
    }
  }
}

const chargerMap = new ChargerMap();
