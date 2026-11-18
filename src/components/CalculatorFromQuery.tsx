'use client';

import { useSearchParams } from 'next/navigation';
import Calculator from '@/components/Calculator';

/** Potencia máxima aceptada desde la URL, en kW. */
export const MAX_CHARGER_POWER_KW = 1000;

/** Longitud máxima del nombre de estación aceptado desde la URL. */
export const MAX_STATION_NAME_LENGTH = 120;

/** Potencia inicial de la URL: solo un número finito mayor que 0 y no superior a MAX_CHARGER_POWER_KW. */
export function parseInitialPower(raw: string | null): number | undefined {
  if (!raw || raw.trim() === '') return undefined;
  const power = Number(raw);
  return Number.isFinite(power) && power > 0 && power <= MAX_CHARGER_POWER_KW ? power : undefined;
}

/** Nombre de estación de la URL recortado a MAX_STATION_NAME_LENGTH, o undefined si falta. */
export function parseInitialName(raw: string | null): string | undefined {
  if (!raw) return undefined;
  return raw.slice(0, MAX_STATION_NAME_LENGTH);
}

/**
 * Lee `power` y `name` de la URL en el navegador: con exportación estática la página
 * no puede recibir `searchParams` en el servidor. Debe renderizarse dentro de <Suspense>.
 */
export default function CalculatorFromQuery() {
  const params = useSearchParams();

  return (
    <Calculator
      initialPower={parseInitialPower(params.get('power'))}
      stationName={parseInitialName(params.get('name'))}
    />
  );
}
