// Gestión del Mapa Leaflet y Marcadores
class ChargerMap {
  constructor() {
    this.map = null;
    this.markers = new Map();
    this.markerCluster = null;
    this.currentTileLayer = null;
    this.userLocationMarker = null;

    // Capas de mapas para modo oscuro y claro
    this.tileLayers = {
      dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }
      },
      light: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        options: {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }
      }
    };
  }

  init(containerId = 'map', initialTheme = 'dark') {
    // Centro inicial: Madrid / España
    this.map = L.map(containerId, {
      center: [40.4168, -3.7038],
      zoom: 6,
      zoomControl: false
    });

    // Añadir control de zoom en esquina superior derecha
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.setTheme(initialTheme);
  }

  setTheme(theme) {
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }
    const layerConfig = this.tileLayers[theme] || this.tileLayers.dark;
    this.currentTileLayer = L.tileLayer(layerConfig.url, layerConfig.options).addTo(this.map);
  }

  createCustomIcon(station) {
    const isUltra = station.powerKw >= 100;
    const isFast = station.powerKw >= 50 && station.powerKw < 100;
    const statusColor = station.status === 'available' ? '#10b981' : station.status === 'busy' ? '#ef4444' : '#f59e0b';
    const statusText = station.status === 'available' ? 'Disp' : station.status === 'busy' ? 'Ocup' : 'Mant';

    const html = `
      <div class="custom-marker ${station.status}">
        <div class="marker-pin ${isUltra ? 'ultra' : isFast ? 'fast' : 'normal'}">
          <svg class="marker-bolt" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span class="marker-power">${station.powerKw}k</span>
        </div>
        <span class="marker-status-dot" style="background:${statusColor};" title="${statusText}"></span>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'ev-leaflet-marker',
      iconSize: [44, 48],
      iconAnchor: [22, 48],
      popupAnchor: [0, -45]
    });
  }

  renderStations(stations, onSelectStation) {
    // Limpiar marcadores anteriores
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers.clear();

    stations.forEach(station => {
      const icon = this.createCustomIcon(station);
      const marker = L.marker([station.lat, station.lng], { icon }).addTo(this.map);

      const statusBadge = station.status === 'available' 
        ? '<span class="badge-status available">● Disponible</span>' 
        : station.status === 'busy' 
          ? '<span class="badge-status busy">● Ocupado</span>' 
          : '<span class="badge-status maintenance">● Mantenimiento</span>';

      const connectorsHtml = station.connectors.map(c => `<span class="badge-connector">${c}</span>`).join(' ');

      const popupContent = `
        <div class="station-popup">
          <div class="popup-header">
            <div class="popup-operator">${station.operator}</div>
            ${statusBadge}
          </div>
          <h3 class="popup-title">${station.name}</h3>
          <p class="popup-address"><i class="fas fa-location-dot"></i> ${station.address}, <strong>${station.city}</strong></p>
          
          <div class="popup-specs-grid">
            <div class="spec-item">
              <span class="spec-label">Potencia máx.</span>
              <span class="spec-val highlight">${station.powerKw} kW</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Tarifa aprox.</span>
              <span class="spec-val">${station.pricePerKwh.toFixed(2)} €/kWh</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Disponibles</span>
              <span class="spec-val">${station.availablePorts} de ${station.totalPorts}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Valoración</span>
              <span class="spec-val">★ ${station.rating}</span>
            </div>
          </div>

          <div class="popup-connectors">
            ${connectorsHtml}
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
    });
  }

  focusStation(stationId) {
    const marker = this.markers.get(stationId);
    if (marker) {
      const latLng = marker.getLatLng();
      this.map.flyTo(latLng, 14, { duration: 1.2 });
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
    const group = new L.featureGroup(Array.from(this.markers.values()));
    this.map.fitBounds(group.getBounds().pad(0.1));
  }
}

const chargerMap = new ChargerMap();
