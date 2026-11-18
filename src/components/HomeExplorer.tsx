'use client';

import { useState, useEffect, useMemo, useId } from 'react';
import Link from 'next/link';
import type { GlobalSummary } from '@/lib/types';
import { fetchMapPoints, fetchProvinceStations, toMapPoint, type HomeStation, type MapPoint } from '@/lib/mapData';
import { slugify } from '@/lib/slugs';
import { InternalLink } from '@/components/InternalLink';
import ClientMap from '@/components/ClientMap';
import { Search, MapPin, ChevronRight, RotateCcw, AlertCircle } from 'lucide-react';

interface HomeExplorerProps {
  summary: GlobalSummary;
}

const ALL_PROVINCES = 'all';
const CARDS_PAGE_SIZE = 30;

/** Filtros de potencia y operador, comunes al mapa nacional y al detalle de provincia. */
function homeExplorerMatchesBasics(powerKw: number, operator: string, minPower: number, selectedOperator: string): boolean {
  if (minPower > 0 && powerKw < minPower) return false;
  return selectedOperator === 'all' || operator === selectedOperator;
}

function homeExplorerMatchesDetail(station: HomeStation, selectedConnector: string, search: string): boolean {
  if (selectedConnector !== 'all' && !station.conectores.includes(selectedConnector)) return false;
  if (!search) return true;
  const text = `${station.nombre} ${station.municipio} ${station.provincia} ${station.direccion} ${station.operador}`.toLowerCase();
  return text.includes(search.toLowerCase());
}

/** En el mapa nacional solo hay slug, operador y provincia: la búsqueda se limita a ellos. */
function homeExplorerMatchesPoint(point: MapPoint, search: string): boolean {
  if (!search) return true;
  const query = slugify(search);
  if (!query) return true;
  return slugify(`${point.slug} ${point.operator} ${point.province}`).includes(query);
}

export default function HomeExplorer({ summary }: HomeExplorerProps) {
  const searchInputId = useId();
  const provinciaSelectId = useId();
  const operatorSelectId = useId();
  const connectorSelectId = useId();

  // Estados de filtros
  const [search, setSearch] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState<string>(ALL_PROVINCES);
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedConnector, setSelectedConnector] = useState<string>('all');
  const [minPower, setMinPower] = useState<number>(0);

  // Datos cargados: mapa nacional ligero o detalle de la provincia elegida
  const [nationalPoints, setNationalPoints] = useState<MapPoint[]>([]);
  const [provinceStations, setProvinceStations] = useState<HomeStation[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [selectedStationId, setSelectedStationId] = useState<string | undefined>();

  // Paginación de tarjetas
  const [displayLimit, setDisplayLimit] = useState(CARDS_PAGE_SIZE);

  const isNationalView = selectedProvincia === ALL_PROVINCES;

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setIsLoadingStations(true);
      setLoadError(null);
      try {
        if (isNationalView) {
          const points = await fetchMapPoints();
          if (!isCancelled) setNationalPoints(points);
        } else {
          setProvinceStations([]);
          const stations = await fetchProvinceStations(selectedProvincia);
          if (!isCancelled) setProvinceStations(stations);
        }
        if (!isCancelled) setDisplayLimit(CARDS_PAGE_SIZE);
      } catch (err) {
        console.error('Error cargando los puntos de recarga:', err);
        if (!isCancelled) {
          setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar los puntos de recarga.');
        }
      } finally {
        if (!isCancelled) setIsLoadingStations(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [selectedProvincia, isNationalView, reloadCount]);

  const filteredStations = useMemo(() => {
    if (isNationalView) return [];
    return provinceStations.filter(
      (station) =>
        homeExplorerMatchesBasics(station.potencia_max_kw, station.operador, minPower, selectedOperator) &&
        homeExplorerMatchesDetail(station, selectedConnector, search)
    );
  }, [isNationalView, provinceStations, minPower, selectedOperator, selectedConnector, search]);

  const mapPoints = useMemo(() => {
    if (!isNationalView) return filteredStations.map(toMapPoint);
    return nationalPoints.filter(
      (point) =>
        homeExplorerMatchesBasics(point.powerKw, point.operator, minPower, selectedOperator) &&
        homeExplorerMatchesPoint(point, search)
    );
  }, [isNationalView, filteredStations, nationalPoints, minPower, selectedOperator, search]);

  const displayedStations = filteredStations.slice(0, displayLimit);

  const resetFilters = () => {
    setSearch('');
    setSelectedProvincia(ALL_PROVINCES);
    setSelectedOperator('all');
    setSelectedConnector('all');
    setMinPower(0);
    setDisplayLimit(CARDS_PAGE_SIZE);
  };

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-[calc(100vh-4rem)] overflow-hidden">
      {/* Panel Lateral: Filtros y Tarjetas */}
      <aside className="w-full lg:w-[460px] flex flex-col bg-[var(--bg-surface)] border-b lg:border-b-0 lg:border-r border-[var(--border-color)] h-1/2 lg:h-full z-10 overflow-hidden shadow-lg">
        {/* Caja de filtros */}
        <div className="p-4 border-b border-[var(--border-color)] space-y-3 bg-[var(--bg-surface)] shrink-0">
          {/* Búsqueda por texto */}
          <div className="relative">
            <label htmlFor={searchInputId} className="sr-only">Buscar por municipio, calle o nombre</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              id={searchInputId}
              type="text"
              placeholder="Buscar por municipio, calle o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500"
            />
          </div>

          {/* Chips de Potencia mínima */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Potencia Mínima:
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setMinPower(0)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  minPower === 0
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'border border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:border-orange-500'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setMinPower(22)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  minPower === 22
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'border border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:border-orange-500'
                }`}
              >
                ≥ 22 kW Semi-rápida
              </button>
              <button
                type="button"
                onClick={() => setMinPower(50)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  minPower === 50
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'border border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:border-orange-500'
                }`}
              >
                ≥ 50 kW Rápida
              </button>
              <button
                type="button"
                onClick={() => setMinPower(150)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  minPower === 150
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'border border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-secondary)] hover:border-orange-500'
                }`}
              >
                ≥ 150 kW Ultrarrápida
              </button>
            </div>
          </div>

          {/* Desplegables de Provincia, Operador y Conector */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={provinciaSelectId} className="sr-only">Provincia</label>
              <select
                id={provinciaSelectId}
                value={selectedProvincia}
                onChange={(e) => setSelectedProvincia(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500"
              >
                <option value={ALL_PROVINCES}>Todas las Provincias ({summary.provincias.length})</option>
                {summary.provincias.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.provincia} ({p.total_puntos})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={operatorSelectId} className="sr-only">Operador</label>
              <select
                id={operatorSelectId}
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-orange-500"
              >
                <option value="all">Todos los Operadores</option>
                {summary.operadores.slice(0, 30).map((op) => (
                  <option key={op.slug} value={op.operador}>
                    {op.operador} ({op.total_puntos})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex-1">
              <label htmlFor={connectorSelectId} className="sr-only">Conector</label>
              <select
                id={connectorSelectId}
                value={selectedConnector}
                disabled={isNationalView}
                title={isNationalView ? 'Elige una provincia para filtrar por conector' : undefined}
                onChange={(e) => setSelectedConnector(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] p-1 text-[11px] text-[var(--text-primary)] outline-none focus:border-orange-500"
              >
                <option value="all">Todos los conectores</option>
                <option value="CCS2 (Combo)">CCS2 (Combo)</option>
                <option value="Tipo 2 (Mennekes)">Tipo 2 (Mennekes)</option>
                <option value="CHAdeMO">CHAdeMO</option>
                <option value="Schuko (Doméstico)">Schuko (Doméstico)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-orange-500 px-2 py-1 rounded border border-[var(--border-color)]"
            >
              <RotateCcw className="h-3 w-3" /> Limpiar
            </button>
          </div>

          {/* Contador de resultados */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border-color)]">
            <span>
              {isLoadingStations ? (
                <span className="flex items-center gap-1.5 text-orange-500">
                  <span className="h-3 w-3 animate-spin rounded-full border border-orange-500 border-t-transparent" />
                  Cargando...
                </span>
              ) : (
                <>
                  <strong className="text-orange-500">{mapPoints.length.toLocaleString('es-ES')}</strong> estaciones encontradas
                </>
              )}
            </span>
            <span className="text-[11px]">
              {isNationalView ? 'Mapa nacional' : `Mostrando ${displayedStations.length} de ${filteredStations.length}`}
            </span>
          </div>
        </div>

        {/* Lista de tarjetas con scroll */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loadError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-[var(--text-primary)]">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <div className="space-y-2">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => setReloadCount((count) => count + 1)}
                  className="rounded-lg border border-[var(--border-color)] px-2.5 py-1 font-bold hover:border-orange-500"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
          {isNationalView && !loadError && (
            <div className="text-center py-10 px-4 text-xs text-[var(--text-muted)]">
              El mapa muestra todos los puntos de España. Elige una provincia para ver aquí el detalle de cada punto.
            </div>
          )}
          {!isNationalView && displayedStations.length === 0 && !isLoadingStations && !loadError ? (
            <div className="text-center py-10 px-4 text-xs text-[var(--text-muted)]">
              No se han encontrado puntos de recarga con los filtros seleccionados.
            </div>
          ) : (
            displayedStations.map((station) => (
              <div
                key={station.id}
                onClick={() => setSelectedStationId(station.id)}
                className="group rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] p-3 hover:border-orange-500 transition-all cursor-pointer space-y-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500">
                    {station.operador}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    {station.potencia_max_kw} kW
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight group-hover:text-orange-500 transition-colors">
                  {station.nombre}
                </h4>

                <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                  <MapPin className="h-3 w-3 shrink-0 text-orange-500" />
                  <span className="truncate">
                    <strong>{station.municipio}</strong> ({station.provincia})
                    {station.direccion ? ` · ${station.direccion}` : ''}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {station.conectores.map((c, i) => (
                    <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                      {c}
                    </span>
                  ))}
                  {station.tipos_carga.map((t, i) => (
                    <span key={i} className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {t}
                    </span>
                  ))}
                </div>

                <div
                  className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/60 text-[10px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <InternalLink
                    href={`/punto/${station.slug}`}
                    className="font-bold text-orange-500 hover:underline flex items-center gap-0.5"
                  >
                    Ficha detallada <ChevronRight className="h-3 w-3" />
                  </InternalLink>
                  <Link
                    href={`/calculadora?power=${station.potencia_max_kw}&name=${encodeURIComponent(station.nombre)}`}
                    className="text-[var(--text-secondary)] hover:text-orange-500 font-semibold"
                  >
                    ⚡ Calcular tiempo
                  </Link>
                </div>
              </div>
            ))
          )}

          {/* Botón Cargar Más */}
          {displayedStations.length < filteredStations.length && (
            <div className="pt-2 pb-4">
              <button
                type="button"
                onClick={() => setDisplayLimit((prev) => prev + CARDS_PAGE_SIZE)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:opacity-95 transition-opacity"
              >
                Cargar más estaciones (+{CARDS_PAGE_SIZE})
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mapa Central con Clustering */}
      <section className="flex-1 h-1/2 lg:h-full relative">
        <ClientMap
          stations={mapPoints}
          selectedStationId={selectedStationId}
          onSelectStation={(s) => setSelectedStationId(s.id)}
        />
      </section>
    </div>
  );
}
