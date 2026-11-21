import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllProvincias, getProvinciaBySlug, getStationsByProvincia, getGlobalSummary } from '@/lib/data';
import Breadcrumbs from '@/components/Breadcrumbs';
import { AdSlot } from '@/components/AdSlot';
import { InternalLink } from '@/components/InternalLink';
import { absoluteUrl } from '@/lib/site';
import { toHomeStation, toMapPoint } from '@/lib/mapData';
import ClientMap from '@/components/ClientMap';
import { Zap, MapPin, Building2, BatteryCharging, ChevronRight, Layers } from 'lucide-react';

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ provincia: string }>;
}

export async function generateStaticParams() {
  const provincias = getAllProvincias();
  return provincias.map((p) => ({
    provincia: p.slug
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { provincia: slug } = await params;
  const prov = getProvinciaBySlug(slug);
  if (!prov) return { title: 'Provincia no encontrada' };

  const title = `Puntos de Recarga en ${prov.provincia} (${prov.total_puntos} Estaciones)`;
  const description = `Guía de ${prov.total_puntos} puntos de recarga en ${prov.provincia}. Desglose de cargadores ultrarrápidos (>100 kW), rápidos y conectores Mennekes/CCS2 en ${prov.municipios.length} municipios.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/provincia/${slug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/provincia/${slug}`),
      type: 'website',
      images: [
        {
          url: absoluteUrl('/brand/ododex-og.png'),
          width: 1200,
          height: 630,
          alt: `${title} · Ododex`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl('/brand/ododex-og.png')],
    },
  };
}

export default async function ProvinciaPage({ params }: PageProps) {
  const { provincia: slug } = await params;
  const prov = getProvinciaBySlug(slug);

  if (!prov) {
    notFound();
  }

  const stations = getStationsByProvincia(slug);
  const summary = getGlobalSummary();
  const date = summary.metadata.fecha_datos;

  // Centro aproximado de la provincia a partir del promedio de coordenadas
  const avgLat = stations.reduce((acc, s) => acc + s.lat, 0) / (stations.length || 1);
  const avgLng = stations.reduce((acc, s) => acc + s.lng, 0) / (stations.length || 1);

  // Redacción de texto único con cifras reales (Requisito 6)
  const topOperator = prov.operadores_principales[0]?.operador || 'Varios operadores';
  const topOperatorCount = prov.operadores_principales[0]?.count || 0;
  const topMunicipio = prov.municipios[0]?.municipio || '';
  const topMunicipioCount = prov.municipios[0]?.count || 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-8">
      {/* Migas de pan */}
      <Breadcrumbs
        items={[
          { name: 'Provincias', url: '/' },
          { name: prov.provincia, url: `/provincia/${slug}` }
        ]}
      />

      {/* Cabecera Principal */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/10 border border-accent/30 px-2.5 py-0.5 text-xs font-bold text-accent">
            {prov.comunidad}
          </span>
          <span className="text-xs text-[var(--text-muted)]">Censo RIPREE · {date}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          Puntos de Recarga en <span className="text-accent">{prov.provincia}</span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-4xl leading-relaxed">
          La provincia de <strong>{prov.provincia}</strong> cuenta con un total censado de{' '}
          <strong>{prov.total_puntos.toLocaleString('es-ES')} estaciones de recarga eléctrica de acceso público</strong>. De ellas,{' '}
          <strong className="text-accent">{prov.potencia_ultra} disponen de carga ultrarrápida (&gt;100 kW)</strong>,{' '}
          <strong>{prov.potencia_rapida} de carga rápida (50 a 100 kW)</strong> y {prov.potencia_normal} de recarga normal o semirápida (≤22 kW).
          La red abarca <strong>{prov.municipios.length} municipios</strong>, siendo <strong>{topMunicipio}</strong> la localidad con mayor concentración ({topMunicipioCount} puntos), y <strong>{topOperator}</strong> el operador con mayor despliegue ({topOperatorCount} instalaciones).
        </p>
      </section>

      {/* Grid de Métricas de la Provincia */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase">
            <Zap className="h-4 w-4 text-accent" /> Total Puntos
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1">
            {prov.total_puntos.toLocaleString('es-ES')}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">estaciones censadas</span>
        </div>

        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase">
            <Zap className="h-4 w-4" /> Ultrarrápida (&gt;100 kW)
          </div>
          <div className="text-2xl sm:text-3xl font-black text-accent mt-1">
            {prov.potencia_ultra}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">ideal viajes de larga distancia</span>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-warning uppercase">
            <BatteryCharging className="h-4 w-4" /> Rápida (50-100 kW)
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1">
            {prov.potencia_rapida}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">recargas en 30-50 min</span>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase">
            <Layers className="h-4 w-4 text-accent" /> Normal (≤22 kW)
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1">
            {prov.potencia_normal}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">urbana / destino AC</span>
        </div>
      </section>

      {/* Mapa de la provincia */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" />
          Mapa de Puntos de Recarga en {prov.provincia}
        </h2>
        <div className="rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-md">
          <ClientMap
            stations={stations.map((station) => toMapPoint(toHomeStation(station)))}
            center={[avgLat, avgLng]}
            zoom={9}
            height="450px"
          />
        </div>
      </section>

      {/* Desglose por Conectores y Operadores Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conectores */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" /> Conectores Disponibles en {prov.provincia}
          </h3>
          <div className="space-y-2">
            {Object.entries(prov.conectores).map(([conector, count]) => {
              const pct = Math.round((count / (prov.total_puntos || 1)) * 100);
              return (
                <div key={conector} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[var(--text-secondary)]">{conector}</span>
                    <span><strong>{count}</strong> puntos ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--bg-body)] overflow-hidden">
                    <div style={{ width: `${Math.min(100, pct)}%` }} className="h-full bg-accent" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Operadores principales */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" /> Operadores con Cobertura en {prov.provincia}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prov.operadores_principales.slice(0, 10).map((op) => (
              <Link
                key={op.slug}
                href={`/operador/${op.slug}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-body)] hover:border-accent transition-colors"
              >
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">{op.operador}</span>
                <span className="text-xs font-black text-accent shrink-0">{op.count}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <AdSlot />

      {/* Lista de Municipios con puntos de recarga */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" />
          Municipios con Puntos de Recarga en {prov.provincia} ({prov.municipios.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {prov.municipios.map((mun) => (
            <InternalLink
              key={mun.slug}
              href={`/provincia/${slug}/${mun.slug}`}
              className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-accent hover:bg-accent/5 transition-all text-xs"
            >
              <span className="font-semibold text-[var(--text-primary)] truncate">{mun.municipio}</span>
              <span className="text-[10px] font-bold text-accent shrink-0 ml-1">{mun.count}</span>
            </InternalLink>
          ))}
        </div>
      </section>

      <AdSlot />
    </div>
  );
}
