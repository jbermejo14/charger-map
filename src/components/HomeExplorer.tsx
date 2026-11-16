'use client';

import { useState, useEffect, useMemo, useId } from 'react';
import Link from 'next/link';
import type { StationRecord, GlobalSummary } from '@/lib/types';
import ClientMap from '@/components/ClientMap';
import { Search, Zap, MapPin, Building2, ChevronRight, RotateCcw } from 'lucide-react';

interface HomeExplorerProps {
  summary: GlobalSummary;
}

export default function HomeExplorer({ summary }: HomeExplorerProps) {
  const searchInputId = useId();
  const provinciaSelectId = useId();
  const operatorSelectId = useId();
  const connectorSelectId = useId();

  // Estados de filtros
  const [search, setSearch] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState<string>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [selectedConnector, setSelectedConnector] = useState<string>('all');
  const [minPower, setMinPower] = useState<number>(0);

  // Estaciones cargadas
  const [stations, setStations] = useState<StationRecord[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | undefined>();

  // Paginación de tarjetas
  const [displayLimit, setDisplayLimit] = useState(30);

  // Cargar estaciones según provincia o lote inicial
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setIsLoadingStations(true);
      try {
        let loaded: StationRecord[] = [];
        if (selectedProvincia !== 'all') {
          const res = await fetch(`/api/chargers?provincia=${encodeURIComponent(selectedProvincia)}`);
          if (res.ok) {
            loaded = await res.json();
          }
        } else {
          // Si es "all", cargar datos consolidados
          const res = await fetch('/api/chargers');
          if (res.ok) {
            loaded = await res.json();
          }
        }
        if (!isCancelled) {
          setStations(loaded);
          setDisplayLimit(30);
        }
      } catch (err) {
        console.error('Error cargando cargadores:', err);
      } finally {
        if (!isCancelled) setIsLoadingStations(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [selectedProvincia]);

  // Filtrado reactivo en cliente
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      if (minPower > 0 && station.potencia_max_kw < minPower) {
        return false;
      }
      if (selectedOperator !== 'all' && station.operador !== selectedOperator) {
        return false;
      }
      if (selectedConnector !== 'all' && !station.conectores.includes(selectedConnector)) {
        return false;
      }
      if (search) {
        const query = search.toLowerCase();
        const text = `${station.nombre} ${station.municipio} ${station.provincia} ${station.direccion} ${station.operador}`.toLowerCase();
        if (!text.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [stations, minPower, selectedOperator, selectedConnector, search]);

  const displayedStations = filteredStations.slice(0, displayLimit);

  const resetFilters = () => {
    setSearch('');
    setSelectedProvincia('all');
    setSelectedOperator('all');
    setSelectedConnector('all');
    setMinPower(0);
    setDisplayLimit(30);
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
                <option value="all">Todas las Provincias ({summary.provincias.length})</option>
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
                  <strong className="text-orange-500">{filteredStations.length.toLocaleString('es-ES')}</strong> estaciones encontradas
                </>
              )}
            </span>
            <span className="text-[11px]">
              Mostrando {displayedStations.length} de {filteredStations.length}
            </span>
          </div>
        </div>

        {/* Lista de tarjetas con scroll */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {displayedStations.length === 0 && !isLoadingStations ? (
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

                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/60 text-[10px]">
                  <Link
                    href={`/punto/${station.slug}`}
                    className="font-bold text-orange-500 hover:underline flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ficha detallada <ChevronRight className="h-3 w-3" />
                  </Link>
                  <Link
                    href={`/calculadora?power=${station.potencia_max_kw}&name=${encodeURIComponent(station.nombre)}`}
                    className="text-[var(--text-secondary)] hover:text-orange-500 font-semibold"
                    onClick={(e) => e.stopPropagation()}
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
                onClick={() => setDisplayLimit((prev) => prev + 30)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:opacity-95 transition-opacity"
              >
                Cargar más estaciones (+30)
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mapa Central con Clustering */}
      <section className="flex-1 h-1/2 lg:h-full relative">
        <ClientMap
          stations={filteredStations}
          selectedStationId={selectedStationId}
          onSelectStation={(s) => setSelectedStationId(s.id)}
        />
      </section>
    </div>
  );
}
