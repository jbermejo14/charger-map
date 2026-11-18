'use client';

import { useSearchParams } from 'next/navigation';
import Calculator from '@/components/Calculator';

/**
 * Lee `power` y `name` de la URL en el navegador: con exportación estática la página
 * no puede recibir `searchParams` en el servidor. Debe renderizarse dentro de <Suspense>.
 */
export default function CalculatorFromQuery() {
  const params = useSearchParams();
  const power = params.get('power');
  const parsedPower = power ? parseFloat(power) : NaN;

  return (
    <Calculator
      initialPower={Number.isNaN(parsedPower) ? undefined : parsedPower}
      stationName={params.get('name') ?? undefined}
    />
  );
}
