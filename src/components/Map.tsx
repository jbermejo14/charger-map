'use client';

import { useEffect, useRef, useState } from 'react';
import type { StationRecord } from '@/lib/types';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface MapProps {
  stations: StationRecord[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  selectedStationId?: string;
  onSelectStation?: (station: StationRecord) => void;
  showLayerSelector?: boolean;
}

export default function Map({
  stations,
  center = [40.4168, -3.7038],
  zoom = 6,
  height = '100%',
  selectedStationId,
  onSelectStation,
  showLayerSelector = true
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const tileLayersRef = useRef<any[]>([]);
  const markersMapRef = useRef<globalThis.Map<string, any>>(new globalThis.Map());

  const [activeLayer, setActiveLayer] = useState<'osm' | 'dark' | 'sat' | 'carto'>('osm');

  // Aplicar capa seleccionada
  const applyTileLayer = (map: any, L: any, layerKey: 'osm' | 'dark' | 'sat' | 'carto') => {
    tileLayersRef.current.forEach((layer) => {
      try {
        map.removeLayer(layer);
      } catch {}
    });
    tileLayersRef.current = [];

    if (layerKey === 'osm') {
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19
      });
      osm.addTo(map);
      tileLayersRef.current.push(osm);
    } else if (layerKey === 'dark') {
      const darkBase = L.tileLayer(
        'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, OpenStreetMap contributors',
          maxZoom: 16
        }
      );
      const darkRef = L.tileLayer(
        'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 16 }
      );
      darkBase.addTo(map);
      darkRef.addTo(map);
      tileLayersRef.current.push(darkBase, darkRef);
    } else if (layerKey === 'sat') {
      const sat = L.tileLayer(
        'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, Maxar',
          maxZoom: 18
        }
      );
      sat.addTo(map);
      tileLayersRef.current.push(sat);
    } else if (layerKey === 'carto') {
      const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      });
      carto.addTo(map);
      tileLayersRef.current.push(carto);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      // Importar markercluster
      await import('leaflet.markercluster');

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        minZoom: 4,
        maxZoom: 19,
        zoomControl: false,
        preferCanvas: true
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Capa base inicial
      applyTileLayer(map, L, activeLayer);

      // Inicializar MarkerClusterGroup con opciones de rendimiento
      const clusterGroup = (L as any).markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 100,
        chunkDelay: 50,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 18,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: any) => {
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

      map.addLayer(clusterGroup);

      mapInstanceRef.current = map;
      clusterGroupRef.current = clusterGroup;

      renderMarkers(map, L, clusterGroup, stations);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Función para crear marcadores
  const renderMarkers = (map: any, L: any, clusterGroup: any, currentStations: StationRecord[]) => {
    clusterGroup.clearLayers();
    markersMapRef.current.clear();

    const markers: any[] = [];

    currentStations.forEach((station) => {
      const power = station.potencia_max_kw || 0;
      const isUltra = power >= 150;
      const isFast = power >= 50 && power < 150;
      const isSemi = power >= 22 && power < 50;

      const powerLabel = power >= 1 ? `${Math.round(power)}k` : 'AC';
      const tierClass = isUltra ? 'ultra' : isFast ? 'fast' : isSemi ? 'semi' : 'normal';

      const icon = L.divIcon({
        html: `
          <div class="custom-marker" title="${station.nombre}">
            <div class="marker-pin ${tierClass}">
              <svg class="marker-bolt" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span class="marker-power">${powerLabel}</span>
            </div>
          </div>
        `,
        className: 'ev-leaflet-marker',
        iconSize: [38, 42],
        iconAnchor: [19, 42],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([station.lat, station.lng], { icon });

      const connectorsBadges = (station.conectores || [])
        .map((c) => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-500 border border-orange-500/30">${c}</span>`)
        .join(' ');

      const typesBadges = (station.tipos_carga || [])
        .map((t) => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">${t}</span>`)
        .join(' ');

      const popupHtml = `
        <div style="padding: 14px; min-width: 250px; max-width: 300px; font-family: inherit;">
          <div style="font-size: 11px; font-weight: 800; color: #ff6b00; text-transform: uppercase; margin-bottom: 4px;">
            ${station.operador}
          </div>
          <h4 style="font-size: 14px; font-weight: 700; color: var(--text-primary, #111); margin-bottom: 6px; line-height: 1.3;">
            ${station.nombre}
          </h4>
          <p style="font-size: 11px; color: var(--text-secondary, #666); margin-bottom: 10px;">
            ${station.direccion ? station.direccion + ', ' : ''}<strong>${station.municipio}</strong> (${station.provincia})
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: rgba(0,0,0,0.04); padding: 8px; border-radius: 8px; font-size: 11px; margin-bottom: 10px;">
            <div>
              <span style="color: #888; display: block; font-size: 10px;">Potencia máx.</span>
              <strong style="color: #ff6b00; font-size: 13px;">${station.potencia_max_kw} kW</strong>
            </div>
            <div>
              <span style="color: #888; display: block; font-size: 10px;">Tomas / Tomas</span>
              <strong>${station.num_conectores} conex.</strong>
            </div>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px;">
            ${connectorsBadges}
            ${typesBadges}
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="/punto/${station.slug}" style="flex: 1; text-align: center; background: #ff6b00; color: #fff; font-weight: 700; font-size: 11px; padding: 6px 10px; border-radius: 6px; text-decoration: none;">
              Ver Ficha
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}" target="_blank" rel="noopener noreferrer" style="border: 1px solid #ccc; color: #555; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-decoration: none;">
              Ruta
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 320 });

      marker.on('click', () => {
        if (onSelectStation) onSelectStation(station);
      });

      markersMapRef.current.set(station.id, marker);
      markers.push(marker);
    });

    clusterGroup.addLayers(markers);

    if (markers.length > 0 && currentStations.length <= 50) {
      try {
        map.fitBounds(clusterGroup.getBounds().pad(0.1));
      } catch {}
    }
  };

  // Actualizar marcadores si cambia stations
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current) return;
    import('leaflet').then((L) => {
      renderMarkers(mapInstanceRef.current, L.default, clusterGroupRef.current, stations);
    });
  }, [stations]);

  // Si cambia selectedStationId, hacer zoom
  useEffect(() => {
    if (!selectedStationId || !mapInstanceRef.current || !clusterGroupRef.current) return;
    const marker = markersMapRef.current.get(selectedStationId);
    if (marker) {
      clusterGroupRef.current.zoomToShowLayer(marker, () => {
        marker.openPopup();
      });
    }
  }, [selectedStationId]);

  const switchLayer = async (key: 'osm' | 'dark' | 'sat' | 'carto') => {
    setActiveLayer(key);
    if (mapInstanceRef.current) {
      const L = (await import('leaflet')).default;
      applyTileLayer(mapInstanceRef.current, L, key);
    }
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Selector de capas flotante idéntico a ZBE-MAP */}
      {showLayerSelector && (
        <div className="absolute top-3 left-3 z-[400] flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]/90 p-1 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => switchLayer('osm')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeLayer === 'osm'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            OSM
          </button>
          <button
            type="button"
            onClick={() => switchLayer('dark')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeLayer === 'dark'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Oscuro
          </button>
          <button
            type="button"
            onClick={() => switchLayer('sat')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeLayer === 'sat'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Satélite
          </button>
          <button
            type="button"
            onClick={() => switchLayer('carto')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeLayer === 'carto'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            CARTO
          </button>
        </div>
      )}
    </div>
  );
}
