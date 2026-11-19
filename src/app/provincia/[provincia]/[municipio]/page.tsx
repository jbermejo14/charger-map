import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllProvincias, getProvinciaBySlug, getStationsByMunicipio, getStationsByProvincia, getGlobalSummary } from '@/lib/data';
import Breadcrumbs from '@/components/Breadcrumbs';
import { AdSlot } from '@/components/AdSlot';
import { InternalLink } from '@/components/InternalLink';
import { NetworkLinks } from '@/components/NetworkLinks';
import { municipalityNetworkKey } from '@/lib/network';
import { absoluteUrl } from '@/lib/site';
import { slugify } from '@/lib/slugs';
import { toHomeStation, toMapPoint } from '@/lib/mapData';
import ClientMap from '@/components/ClientMap';
import { distanceKm, FAST_CHARGE_MIN_KW, formatKw } from '@/lib/stationInsights';
import type { StationRecord } from '@/lib/types';
import { Zap, MapPin, Building2, Navigation, BatteryCharging } from 'lucide-react';

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ provincia: string; municipio: string }>;
}

export async function generateStaticParams() {
  const provincias = getAllProvincias();
  const paramsList: { provincia: string; municipio: string }[] = [];

  for (const prov of provincias) {
    // Solo municipios con al menos 1 punto (Requisito 5: No generes municipios sin puntos)
    for (const mun of prov.municipios) {
      if (mun.count > 0) {
        paramsList.push({
          provincia: prov.slug,
          municipio: mun.slug
        });
      }
    }
  }

  return paramsList;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { provincia: provSlug, municipio: munSlug } = await params;
  const prov = getProvinciaBySlug(provSlug);
  if (!prov) return { title: 'Municipio no encontrado' };

  const mun = prov.municipios.find((m) => m.slug === munSlug);
  if (!mun) return { title: 'Municipio no encontrado' };

  const title = `Puntos de Recarga en ${mun.municipio} (${mun.count} Estaciones) | ${prov.provincia}`;
  const description = `Directorio de ${mun.count} puntos de recarga para coches eléctricos en ${mun.municipio} (${prov.provincia}). Potencias, operadores, conectores Mennekes/CCS y ubicaciones exactas.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/provincia/${provSlug}/${munSlug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/provincia/${provSlug}/${munSlug}`),
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

export default async function MunicipioPage({ params }: PageProps) {
  const { provincia: provSlug, municipio: munSlug } = await params;
  const prov = getProvinciaBySlug(provSlug);
  if (!prov) notFound();

  const mun = prov.municipios.find((m) => m.slug === munSlug);
  if (!mun) notFound();

  const stations = getStationsByMunicipio(provSlug, munSlug);
  if (stations.length === 0) notFound();

  const summary = getGlobalSummary();
  const date = summary.metadata.fecha_datos;

  // Centro de las coordenadas del municipio
  const avgLat = stations.reduce((acc, s) => acc + s.lat, 0) / stations.length;
  const avgLng = stations.reduce((acc, s) => acc + s.lng, 0) / stations.length;

  // Municipios cercanos en la misma provincia (excluyendo el actual)
  const nearbyMunicipios = prov.municipios
    .filter((m) => m.slug !== munSlug)
    .slice(0, 12);

  // Estadísticas del municipio
  const ultraCount = stations.filter((s) => s.potencia_max_kw > 100).length;
  const rapidaCount = stations.filter((s) => s.potencia_max_kw >= 50 && s.potencia_max_kw <= 100).length;
  const normalCount = stations.filter((s) => s.potencia_max_kw < 50).length;

  const isSmallMunicipality = stations.length <= 2;
  let nearestFastStation: { station: StationRecord; km: number } | null = null;
  if (isSmallMunicipality && rapidaCount === 0 && ultraCount === 0) {
    const provStations = getStationsByProvincia(provSlug);
    const fastCandidates = provStations.filter(
      (s) => s.potencia_max_kw >= FAST_CHARGE_MIN_KW && slugify(s.municipio) !== munSlug,
    );
    let minD = Infinity;
    let best: StationRecord | null = null;
    for (const cand of fastCandidates) {
      const d = distanceKm({ lat: avgLat, lng: avgLng }, { lat: cand.lat, lng: cand.lng });
      if (d < minD) {
        minD = d;
        best = cand;
      }
    }
    if (best && minD < 100) {
      nearestFastStation = { station: best, km: minD };
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-8">
      {/* Migas de pan */}
      <Breadcrumbs
        items={[
          { name: 'Provincias', url: '/' },
          { name: prov.provincia, url: `/provincia/${provSlug}` },
          { name: mun.municipio, url: `/provincia/${provSlug}/${munSlug}` }
        ]}
      />

      {/* Cabecera */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/provincia/${provSlug}`}
            className="rounded-full bg-accent/10 border border-accent/30 px-2.5 py-0.5 text-xs font-bold text-accent hover:bg-accent/20 transition-colors"
          >
            Provincia de {prov.provincia}
          </Link>
          <span className="text-xs text-[var(--text-muted)]">Censo RIPREE · {date}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          Puntos de Recarga en <span className="text-accent">{mun.municipio}</span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-4xl leading-relaxed">
          El municipio de <strong>{mun.municipio}</strong> ({prov.provincia}) dispone de un total de{' '}
          <strong>{stations.length} estaciones públicas de carga para vehículos eléctricos</strong> censadas en el registro RIPREE del Ministerio.
          {ultraCount > 0 ? ` Entre ellas cuenta con ${ultraCount} estación(es) de carga ultrarrápida (>100 kW)` : ''}
          {rapidaCount > 0 ? `, ${rapidaCount} estación(es) rápida(s) (50-100 kW)` : ''}
          {normalCount > 0 ? ` y ${normalCount} de carga normal o semirápida` : ''}.
        </p>
      </section>

      {/* Mapa del municipio */}
      <section className="rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-md">
        <ClientMap
          stations={stations.map((station) => toMapPoint(toHomeStation(station)))}
          center={[avgLat, avgLng]}
          zoom={13}
          height="380px"
        />
      </section>

      {/* Tabla completa de puntos de recarga en el municipio */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          Listado de Puntos de Recarga en {mun.municipio} ({stations.length})
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-body)] border-b border-[var(--border-color)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Estación / Operador</th>
                <th className="py-3 px-4">Dirección</th>
                <th className="py-3 px-4">Potencia</th>
                <th className="py-3 px-4">Conectores</th>
                <th className="py-3 px-4">Horario</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {stations.map((s) => (
                <tr key={s.id} className="hover:bg-accent/5 transition-colors">
                  <td className="py-3 px-4">
                    <InternalLink href={`/punto/${s.slug}`} className="font-bold text-[var(--text-primary)] hover:text-accent block">
                      {s.nombre}
                    </InternalLink>
                    <Link href={`/operador/${slugify(s.operador)}`} className="text-[11px] font-semibold text-accent hover:underline">
                      {s.operador}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">
                    {s.direccion || `${s.municipio}`}
                    {s.codigo_postal ? ` (CP ${s.codigo_postal})` : ''}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-[var(--text-primary)]">
                      {s.potencia_max_kw} kW
                    </span>
                    <span className="block text-[10px] text-[var(--text-muted)]">
                      {s.tipos_carga.join(' / ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {s.conectores.map((c, i) => (
                        <span key={i} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-body)] border border-[var(--border-color)]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-muted)] text-[11px]">
                    {s.horario === 'No especificado' ? '24 horas' : s.horario}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <InternalLink
                        href={`/punto/${s.slug}`}
                        className="px-2.5 py-1 rounded-lg bg-on-accent text-white font-bold hover:bg-on-accent-hover transition-colors"
                      >
                        Ficha
                      </InternalLink>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-accent"
                        title="Cómo llegar"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Contexto comarcal para municipios con pocos puntos */}
      {nearestFastStation && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-2 text-xs">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BatteryCharging className="h-4 w-4 text-accent" />
            Carga rápida más cercana a {mun.municipio}
          </h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Actualmente los cargadores de {mun.municipio} son de carga semirápida o normal (≤{Math.max(...stations.map((s) => s.potencia_max_kw))} kW). La estación de carga rápida (≥50 kW) más próxima se ubica en <strong>{nearestFastStation.station.municipio}</strong>, a aproximadamente <strong>{nearestFastStation.km.toFixed(1).replace('.', ',')} km</strong> ({nearestFastStation.station.nombre}, con {formatKw(nearestFastStation.station.potencia_max_kw)} kW operado por {nearestFastStation.station.operador}).
          </p>
        </section>
      )}

      <AdSlot />

      {/* Municipios cercanos en la misma provincia */}
      {nearbyMunicipios.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            Otros Municipios con Puntos de Recarga en {prov.provincia}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {nearbyMunicipios.map((nm) => (
              <InternalLink
                key={nm.slug}
                href={`/provincia/${provSlug}/${nm.slug}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-accent text-xs transition-colors"
              >
                <span className="font-semibold text-[var(--text-primary)] truncate">{nm.municipio}</span>
                <span className="text-[10px] font-bold text-accent shrink-0 ml-1">{nm.count}</span>
              </InternalLink>
            ))}
          </div>
        </section>
      )}

      <NetworkLinks routeKey={municipalityNetworkKey(provSlug, munSlug)} />

      <AdSlot />
    </div>
  );
}
