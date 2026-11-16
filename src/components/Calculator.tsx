'use client';

import { useState, useId } from 'react';
import {
  PRECONFIGURED_VEHICLES,
  DEFAULT_EXAMPLE_PRICE_PER_KWH,
  calculateCharge,
  type EVModel
} from '@/lib/charging';
import { Zap, Clock, Euro, Gauge, AlertCircle, Info, BatteryCharging } from 'lucide-react';

interface CalculatorProps {
  initialPower?: number;
  stationName?: string;
}

export default function Calculator({ initialPower, stationName }: CalculatorProps) {
  const vehicleSelectId = useId();
  const batteryCapacityId = useId();
  const vehicleMaxPowerId = useId();
  const avgConsumptionId = useId();
  const chargerPowerId = useId();
  const priceInputId = useId();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('tesla_m3_rwd');
  const [batteryCapacity, setBatteryCapacity] = useState<number>(60);
  const [vehicleMaxPower, setVehicleMaxPower] = useState<number>(170);
  const [avgConsumption, setAvgConsumption] = useState<number>(14.5);

  const [startSoc, setStartSoc] = useState<number>(15);
  const [targetSoc, setTargetSoc] = useState<number>(80);

  const [chargerPower, setChargerPower] = useState<number>(initialPower || 150);
  const [userPricePerKwh, setUserPricePerKwh] = useState<number>(DEFAULT_EXAMPLE_PRICE_PER_KWH);
  const [isAC, setIsAC] = useState<boolean>(initialPower ? initialPower <= 22 : false);

  const handleVehicleChange = (id: string) => {
    setSelectedVehicleId(id);
    const vehicle = PRECONFIGURED_VEHICLES.find((v) => v.id === id);
    if (vehicle) {
      setBatteryCapacity(vehicle.batteryCapacity);
      setVehicleMaxPower(vehicle.maxDcPower);
      setAvgConsumption(vehicle.avgConsumption);
    }
  };

  const isCustom = selectedVehicleId === 'custom';

  const result = calculateCharge({
    batteryCapacity,
    startSoc,
    targetSoc,
    chargerPower,
    vehicleMaxPower,
    userPricePerKwh,
    avgConsumption,
    isAC
  });

  const addedPct = Math.max(0, targetSoc - startSoc);
  const remainingPct = Math.max(0, 100 - targetSoc);

  return (
    <div className="space-y-6">
      {/* Banner si viene de una estación específica */}
      {stationName && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
          <Zap className="h-5 w-5 text-orange-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-[var(--text-primary)]">Calculando con datos de la estación: </span>
            <span className="text-[var(--text-secondary)]">{stationName} ({chargerPower} kW)</span>
          </div>
        </div>
      )}

      {/* 1. Selección de Vehículo */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-[11px]">1</span>
          Tu Vehículo Eléctrico
        </h3>

        <div className="space-y-1">
          <label htmlFor={vehicleSelectId} className="text-xs font-semibold text-[var(--text-secondary)]">Modelo</label>
          <select
            id={vehicleSelectId}
            value={selectedVehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] p-2.5 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-orange-500"
          >
            {PRECONFIGURED_VEHICLES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.batteryCapacity} kWh)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor={batteryCapacityId} className="text-[11px] font-semibold text-[var(--text-secondary)]">Batería Útil (kWh)</label>
            <input
              id={batteryCapacityId}
              type="number"
              value={batteryCapacity}
              readOnly={!isCustom}
              onChange={(e) => setBatteryCapacity(parseFloat(e.target.value) || 0)}
              className={`w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] p-2 text-xs font-medium text-[var(--text-primary)] mt-1 ${
                !isCustom ? 'opacity-80' : 'focus:border-orange-500'
              }`}
            />
          </div>
          <div>
            <label htmlFor={vehicleMaxPowerId} className="text-[11px] font-semibold text-[var(--text-secondary)]">Pot. Máx. Coche (kW)</label>
            <input
              id={vehicleMaxPowerId}
              type="number"
              value={vehicleMaxPower}
              readOnly={!isCustom}
              onChange={(e) => setVehicleMaxPower(parseFloat(e.target.value) || 0)}
              className={`w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] p-2 text-xs font-medium text-[var(--text-primary)] mt-1 ${
                !isCustom ? 'opacity-80' : 'focus:border-orange-500'
              }`}
            />
          </div>
          <div>
            <label htmlFor={avgConsumptionId} className="text-[11px] font-semibold text-[var(--text-secondary)]">Consumo (kWh/100km)</label>
            <input
              id={avgConsumptionId}
              type="number"
              value={avgConsumption}
              readOnly={!isCustom}
              onChange={(e) => setAvgConsumption(parseFloat(e.target.value) || 0)}
              className={`w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] p-2 text-xs font-medium text-[var(--text-primary)] mt-1 ${
                !isCustom ? 'opacity-80' : 'focus:border-orange-500'
              }`}
            />
          </div>
        </div>
      </section>

      {/* 2. Rango de Batería deseado (SoC) */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-[11px]">2</span>
          Nivel de Carga Deseado (SoC)
        </h3>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-[var(--text-secondary)]">Porcentaje Inicial</span>
              <span className="text-orange-500 font-bold">{startSoc}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="95"
              value={startSoc}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= targetSoc) setTargetSoc(Math.min(100, val + 5));
                setStartSoc(val);
              }}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-[var(--text-secondary)]">Porcentaje Objetivo</span>
              <span className="text-orange-500 font-bold">{targetSoc}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={targetSoc}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val <= startSoc) setStartSoc(Math.max(0, val - 5));
                setTargetSoc(val);
              }}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setStartSoc(10); setTargetSoc(80); }}
              className="flex-1 py-1.5 px-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] text-[11px] font-bold text-[var(--text-secondary)] hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              10% → 80% (Recomendado)
            </button>
            <button
              type="button"
              onClick={() => { setStartSoc(20); setTargetSoc(80); }}
              className="flex-1 py-1.5 px-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] text-[11px] font-bold text-[var(--text-secondary)] hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              20% → 80%
            </button>
            <button
              type="button"
              onClick={() => { setStartSoc(10); setTargetSoc(100); }}
              className="flex-1 py-1.5 px-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-page)] text-[11px] font-bold text-[var(--text-secondary)] hover:border-orange-500 hover:text-orange-500 transition-colors"
            >
              10% → 100%
            </button>
          </div>
        </div>
      </section>

      {/* 3. Parámetros del Cargador y Tarifa Editable */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-[11px]">3</span>
          Punto de Carga y Tarifa
        </h3>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="radio"
              name="currentType"
              checked={!isAC}
              onChange={() => setIsAC(false)}
              className="accent-orange-500"
            />
            Carga Rápida DC
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="radio"
              name="currentType"
              checked={isAC}
              onChange={() => setIsAC(true)}
              className="accent-orange-500"
            />
            Carga AC (Lenta / Normal)
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor={chargerPowerId} className="text-[11px] font-semibold text-[var(--text-secondary)]">Potencia del Cargador (kW)</label>
            <input
              id={chargerPowerId}
              type="number"
              min="2"
              max="400"
              value={chargerPower}
              onChange={(e) => setChargerPower(parseFloat(e.target.value) || 22)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] p-2.5 text-xs font-medium text-[var(--text-primary)] mt-1 focus:border-orange-500"
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label htmlFor={priceInputId} className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Tarifa (€ / kWh)
              </label>
              <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                Ejemplo configurable
              </span>
            </div>
            <input
              id={priceInputId}
              type="number"
              step="0.01"
              min="0.05"
              max="1.50"
              value={userPricePerKwh}
              onChange={(e) => setUserPricePerKwh(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] p-2.5 text-xs font-medium text-[var(--text-primary)] mt-1 focus:border-orange-500"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              * Introduce la tarifa real de tu operador o app de recarga.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Resultados de Estimación */}
      <section className="rounded-2xl border border-orange-500/40 bg-gradient-to-b from-orange-500/5 to-transparent p-6 shadow-xl space-y-6">
        <div className="text-center pb-4 border-b border-[var(--border-color)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Tiempo Estimado de Recarga
          </span>
          <div className="text-4xl sm:text-5xl font-black text-orange-500 tracking-tight my-1">
            {result.hours > 0 ? `${result.hours}h ${result.minutes}m` : `${result.minutes} min`}
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            Potencia pico efectiva: <strong>{result.effectivePeakPower} kW</strong>
          </span>
        </div>

        {/* Métricas clave */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3.5 text-center">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Coste Estimado</span>
            <span className="text-lg font-black text-[var(--text-primary)]">{result.totalCost.toFixed(2)} €</span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">({result.grossKwhSupplied} kWh facturados)</span>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3.5 text-center">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Energía Neta</span>
            <span className="text-lg font-black text-[var(--text-primary)]">{result.netKwhNeeded} kWh</span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">transferidos a celda</span>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3.5 text-center">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Autonomía Ganada</span>
            <span className="text-lg font-black text-emerald-500">+{result.gainedRangeKm} km</span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">estimación carretera</span>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3.5 text-center">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] block">Coste cada 100 km</span>
            <span className="text-lg font-black text-[var(--text-primary)]">{result.costPer100km.toFixed(2)} €</span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">según tu tarifa</span>
          </div>
        </div>

        {/* Barra de batería visual */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--text-secondary)] font-semibold">
            <span>Batería: {startSoc}%</span>
            <span className="text-orange-500 font-bold">+{addedPct}% añadido</span>
            <span>Objetivo: {targetSoc}%</span>
          </div>
          <div className="h-4 w-full rounded-full bg-[var(--bg-page)] border border-[var(--border-color)] p-0.5 flex overflow-hidden">
            <div style={{ width: `${startSoc}%` }} className="h-full bg-neutral-500 rounded-l-full" />
            <div style={{ width: `${addedPct}%` }} className="h-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/50" />
            <div style={{ width: `${remainingPct}%` }} className="h-full bg-transparent" />
          </div>
        </div>

        {/* Alerta inteligente >80% */}
        {result.warning80 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-500 leading-relaxed">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong>Consejo de recarga rápida en viaje:</strong> Cargar entre el 80% y el 100% triplica el tiempo por kWh debido a la curva de protección química de la batería. Suele ser mucho más rápido y rentable desconectar al 80% y continuar el trayecto hasta el próximo punto.
            </div>
          </div>
        )}

        {/* Desglose de fases */}
        {result.phases.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Desglose de la Curva de Potencia
            </span>
            <div className="space-y-1.5">
              {result.phases.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>{p.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[var(--text-secondary)] font-medium">
                    <span>~{p.avgPower} kW</span>
                    <strong className="text-orange-500">⏱ {p.minutes} min</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
