import type { Metadata } from 'next';
import { Suspense } from 'react';
import CalculatorFromQuery from '@/components/CalculatorFromQuery';
import Breadcrumbs from '@/components/Breadcrumbs';
import { AdSlot } from '@/components/AdSlot';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import { Calculator as CalcIcon, Info, Zap, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Calculadora de Carga de Coche Eléctrico (Tiempo y Coste Real)',
  description: 'Calcula el tiempo de recarga y el coste en euros para cualquier vehículo eléctrico en España. Simula la curva de desaceleración por encima del 80% y ajusta la potencia de carga y tu tarifa por kWh.',
  alternates: {
    canonical: absoluteUrl('/calculadora'),
  },
  openGraph: {
    title: `Calculadora de Carga de Coche Eléctrico - ${SITE_NAME}`,
    description: 'Estima con precisión física el tiempo y coste de cargar tu coche eléctrico con curva de potencia y tarifa configurable.',
    url: absoluteUrl('/calculadora'),
    type: 'website',
  }
};

export default function CalculadoraPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-8">
      {/* Migas de pan */}
      <Breadcrumbs
        items={[
          { name: 'Calculadora de Carga', url: '/calculadora' }
        ]}
      />

      {/* Cabecera */}
      <section className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/30 px-3 py-1 text-xs font-bold text-accent">
          <CalcIcon className="h-3.5 w-3.5" /> Simulador con Curva de Carga Física
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          Calculadora de <span className="text-accent">Carga Eléctrica</span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Estima el <strong>tiempo real de recarga</strong> y el <strong>coste en euros</strong> para tu coche eléctrico. A diferencia de las calculadoras lineales simples, nuestro motor simula la <strong>curva de reducción de potencia progresiva por encima del 75-80%</strong> para proteger la degradación química de la batería.
        </p>
      </section>

      {/* Componente de la Calculadora */}
      <Suspense fallback={<p className="text-xs text-[var(--text-muted)]">Cargando calculadora...</p>}>
        <CalculatorFromQuery />
      </Suspense>

      <AdSlot />

      {/* Consejos prácticos de recarga */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Info className="h-5 w-5 text-accent" />
          Claves para Optimizar el Tiempo y Coste de tu Recarga
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4 space-y-1.5">
            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5 text-accent" /> La regla del 20% al 80%
            </h3>
            <p>
              En trayectos largos y estaciones rápidas DC (&gt;50 kW), la velocidad entre el 20% y el 80% es hasta tres veces superior que en el tramo final del 80% al 100%. Salvo necesidad estricta para alcanzar tu destino, continuar viaje al alcanzar el 80% ahorra tiempo y dinero.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4 space-y-1.5">
            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-positive" /> Transparencia en Tarifas
            </h3>
            <p>
              El coste final depende del operador y de la app de recarga o abono que utilices (muchas apps ofrecen interoperabilidad con tarifas diferentes al operador físico). Introduce en el campo de precio la tarifa real que te facture tu proveedor habitual.
            </p>
          </div>
        </div>
      </section>

      <AdSlot />
    </div>
  );
}
