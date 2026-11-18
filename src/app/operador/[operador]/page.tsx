import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGlobalSummary, getOperatorBySlug } from '@/lib/data';
import Breadcrumbs from '@/components/Breadcrumbs';
import { absoluteUrl } from '@/lib/site';
import { Building2, Zap, MapPin, ChevronRight, ShieldCheck } from 'lucide-react';

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ operador: string }>;
}

export async function generateStaticParams() {
  const summary = getGlobalSummary();
  return summary.operadores.map((op) => ({
    operador: op.slug
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { operador: slug } = await params;
  const op = getOperatorBySlug(slug);
  if (!op) return { title: 'Operador no encontrado' };

  const title = `Puntos de Recarga de ${op.operador} en España (${op.total_puntos.toLocaleString('es-ES')} Estaciones)`;
  const description = `Consulta la red de ${op.total_puntos.toLocaleString('es-ES')} puntos de recarga de ${op.operador} en España. Cobertura provincial, desgloses de potencia y mapa de estaciones.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/operador/${slug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/operador/${slug}`),
      type: 'website',
    }
  };
}

export default async function OperadorPage({ params }: PageProps) {
  const { operador: slug } = await params;
  const op = getOperatorBySlug(slug);
  if (!op) notFound();

  const summary = getGlobalSummary();
  const date = summary.metadata.fecha_datos;

  const topProvincias = op.provincias_cobertura.slice(0, 5);
  const totalProvincias = op.provincias_cobertura.length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-8">
      {/* Migas de pan */}
      <Breadcrumbs
        items={[
          { name: 'Operadores', url: '/' },
          { name: op.operador, url: `/operador/${slug}` }
        ]}
      />

      {/* Cabecera */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 text-xs font-bold text-orange-500">
            Red de Recarga
          </span>
          <span className="text-xs text-[var(--text-muted)]">Censo RIPREE · {date}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          Red de Recarga de <span className="text-orange-500">{op.operador}</span> en España
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-4xl leading-relaxed">
          El operador <strong>{op.operador}</strong> cuenta con una infraestructura censada de{' '}
          <strong>{op.total_puntos.toLocaleString('es-ES')} estaciones de recarga de acceso público</strong> distribuidas a lo largo de{' '}
          <strong>{totalProvincias} provincias</strong> en el territorio español.
          {topProvincias.length > 0 && (
            <>
              {' '}Su mayor presencia se concentra en{' '}
              <strong>{topProvincias.map((p) => `${p.provincia} (${p.count})`).join(', ')}</strong>.
            </>
          )}
        </p>
      </section>

      {/* Métricas destacadas */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase">
            <Zap className="h-4 w-4 text-orange-500" /> Total Estaciones
          </div>
          <div className="text-3xl font-black text-[var(--text-primary)] mt-1">
            {op.total_puntos.toLocaleString('es-ES')}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">puntos de recarga censados</span>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase">
            <MapPin className="h-4 w-4" /> Cobertura Territorial
          </div>
          <div className="text-3xl font-black text-orange-500 mt-1">
            {totalProvincias} de 50
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">provincias con infraestructura</span>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase">
            <ShieldCheck className="h-4 w-4" /> Registro RIPREE
          </div>
          <div className="text-xl font-black text-[var(--text-primary)] mt-1">
            Verificado
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">datos RIPREE / MITECO</span>
        </div>
      </section>

      {/* Cobertura por Provincia */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <MapPin className="h-5 w-5 text-orange-500" />
          Despliegue de {op.operador} por Provincia ({totalProvincias} Provincias)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {op.provincias_cobertura.map((p) => {
            const pct = Math.round((p.count / (op.total_puntos || 1)) * 100);
            return (
              <Link
                key={p.slug}
                href={`/provincia/${p.slug}`}
                className="group rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 hover:border-orange-500 transition-all space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-[var(--text-primary)] group-hover:text-orange-500 transition-colors">
                    {p.provincia}
                  </span>
                  <span className="text-xs font-black text-orange-500">
                    {p.count} pts
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--bg-page)] overflow-hidden">
                  <div style={{ width: `${Math.min(100, Math.max(8, pct))}%` }} className="h-full bg-orange-500" />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  {pct}% del total de {op.operador}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Otros operadores */}
      <section className="pt-6 border-t border-[var(--border-color)] space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Explora otros operadores de recarga
        </h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {summary.operadores
            .filter((o) => o.slug !== slug)
            .slice(0, 15)
            .map((otherOp) => (
              <Link
                key={otherOp.slug}
                href={`/operador/${otherOp.slug}`}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-orange-500 text-[var(--text-secondary)] hover:text-orange-500 transition-colors"
              >
                {otherOp.operador} ({otherOp.total_puntos})
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
