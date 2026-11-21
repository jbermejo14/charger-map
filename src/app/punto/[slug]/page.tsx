import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getStationBySlug,
  getAllStationSlugs,
  getGlobalSummary,
  getStationsByProvincia,
  getStationsByMunicipio,
} from '@/lib/data';
import {
  nearbyStations,
  stationDisplayTitle,
  stationMetaTitle,
  formatKw,
  formatMunicipalityName,
  stationSummary,
  FAST_CHARGE_MIN_KW,
  ULTRA_CHARGE_MIN_KW,
} from '@/lib/stationInsights';
import { slugify } from '@/lib/slugs';
import Breadcrumbs from '@/components/Breadcrumbs';
import { AdSlot } from '@/components/AdSlot';
import { InternalLink } from '@/components/InternalLink';
import { absoluteUrl } from '@/lib/site';
import ClientMap from '@/components/ClientMap';
import { toHomeStation, toMapPoint } from '@/lib/mapData';
import { Zap, MapPin, Building2, Clock, Navigation, Calculator, ExternalLink, ShieldCheck } from 'lucide-react';

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Generar fichas estáticas para todas las estaciones
  const slugs = getAllStationSlugs();
  return slugs;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const station = getStationBySlug(slug);
  if (!station) return { title: 'Punto de recarga no encontrado' };

  const title = stationMetaTitle(station);
  const municipality = formatMunicipalityName(station.municipio);
  const description = `Ficha técnica del punto de recarga ${station.nombre} (${station.operador}) en ${municipality}, ${station.provincia}. Potencia de ${station.potencia_max_kw} kW, conectores ${station.conectores.join(', ')} y cómo llegar.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/punto/${slug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/punto/${slug}`),
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

function formatKm(km: number): string {
  return km.toFixed(1).replace('.', ',');
}

export default async function PuntoPage({ params }: PageProps) {
  const { slug } = await params;
  const station = getStationBySlug(slug);
  if (!station) notFound();

  const summary = getGlobalSummary();
  const date = summary.metadata.fecha_datos;

  const provSlug = slugify(station.provincia);
  const munSlug = slugify(station.municipio);
  const opSlug = slugify(station.operador);
  const displayTitle = stationDisplayTitle(station);
  const municipality = formatMunicipalityName(station.municipio);
  const summaryText = stationSummary(station, getStationsByMunicipio(provSlug, munSlug));
  const nearby = nearbyStations(station, getStationsByProvincia(provSlug));

  // Schema.org estructurado JSON-LD específico para punto de recarga
  const stationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ChargingStation',
    name: displayTitle,
    description: `Estación de recarga pública de ${station.potencia_max_kw} kW operada por ${station.operador} en ${municipality}, ${station.provincia}.`,
    url: absoluteUrl(`/punto/${slug}`),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: station.lat,
      longitude: station.lng,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: station.direccion || station.municipio,
      addressLocality: station.municipio,
      addressRegion: station.provincia,
      postalCode: station.codigo_postal || undefined,
      addressCountry: 'ES',
    },
    maximumOutput: `${station.potencia_max_kw} kW`,
    connectorType: station.conectores,
    openingHours: station.horario && station.horario !== 'No especificado' ? station.horario : 'Mo-Su 00:00-23:59',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '00:00',
        closes: '23:59',
      },
    ],
    provider: {
      '@type': 'Organization',
      name: station.operador,
    },
  };

  const isUltra = station.potencia_max_kw >= ULTRA_CHARGE_MIN_KW;
  const isFast = station.potencia_max_kw >= FAST_CHARGE_MIN_KW && station.potencia_max_kw < ULTRA_CHARGE_MIN_KW;
  const tierName = isUltra ? 'Ultrarrápida (≥150 kW)' : isFast ? 'Rápida (50-149 kW)' : 'Normal / AC (≤22 kW)';

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-8">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(stationJsonLd) }}
      />

      {/* Migas de pan */}
      <Breadcrumbs
        items={[
          { name: station.provincia, url: `/provincia/${provSlug}` },
          { name: municipality, url: `/provincia/${provSlug}/${munSlug}` },
          { name: `Punto de ${formatKw(station.potencia_max_kw)} kW`, url: `/punto/${slug}` }
        ]}
      />

      {/* Cabecera de la Estación */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/operador/${opSlug}`}
            className="rounded-full bg-accent/10 border border-accent/30 px-3 py-1 text-xs font-black text-accent hover:bg-accent/20 transition-colors uppercase tracking-wider"
          >
            {station.operador}
          </Link>
          <span className="rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
            {tierName}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Código: {station.nombre} · ID RIPREE: {station.id}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          {displayTitle}
        </h1>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{summaryText}</p>

        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-accent shrink-0" />
            <span>
              {station.direccion ? `${station.direccion}, ` : ''}
              <InternalLink href={`/provincia/${provSlug}/${munSlug}`} className="font-bold text-[var(--text-primary)] hover:underline">
                {municipality}
              </InternalLink>{' '}
              ({station.provincia})
              {station.codigo_postal ? ` · CP ${station.codigo_postal}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
            <span>{station.horario && station.horario !== 'No especificado' ? station.horario : '24 horas / Acceso público'}</span>
          </div>
        </div>
      </section>

      {/* Botones de acción rápida: Cómo llegar y Calcular */}
      <div className="flex flex-wrap gap-3">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-on-accent px-5 py-3 text-xs font-bold text-white hover:opacity-95 transition-opacity"
        >
          <Navigation className="h-4 w-4" />
          Cómo llegar con Google Maps <ExternalLink className="h-3 w-3 opacity-80" />
        </a>

        <Link
          href={`/calculadora?power=${station.potencia_max_kw}&name=${encodeURIComponent(station.nombre)}`}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-5 py-3 text-xs font-bold text-[var(--text-primary)] hover:border-accent hover:text-accent transition-colors"
        >
          <Calculator className="h-4 w-4 text-accent" />
          Calcular tiempo y coste para esta estación
        </Link>
      </div>

      {/* Grid de Especificaciones Técnicas */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
            Potencia Máxima
          </span>
          <div className="text-2xl sm:text-3xl font-black text-accent mt-1">
            {station.potencia_max_kw} kW
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            Corriente {station.tipos_carga.join(' / ')}
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Tomas / Puntos
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] mt-1">
            {station.num_conectores}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            conector{station.num_conectores > 1 ? 'es' : ''} disponibles
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Operador
          </span>
          <div className="text-base sm:text-lg font-black text-[var(--text-primary)] mt-1 truncate">
            {station.operador}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] truncate block">
            {station.operador_original}
          </span>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Coordenadas GPS
          </span>
          <div className="text-xs font-mono font-bold text-[var(--text-primary)] mt-1">
            {station.lat.toFixed(5)}, {station.lng.toFixed(5)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">WGS84</span>
        </div>
      </section>

      {/* Conectores Disponibles */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-accent">
          Tipos de Conector Instalados en este Punto
        </h2>
        <div className="flex flex-wrap gap-2">
          {station.conectores.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-body)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
              <Zap className="h-4 w-4 text-accent" />
              <span>{c}</span>
            </div>
          ))}
          {station.tipos_carga.map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-positive/30 bg-positive/10 px-3 py-2 text-xs font-bold text-positive">
              Corriente {t}
            </div>
          ))}
        </div>
      </section>

      {nearby.length > 0 && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-3">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Puntos de recarga cercanos</h2>
          <ul className="space-y-2">
            {nearby.map(({ station: near, km }) => (
              <li key={near.id} className="text-sm text-[var(--text-secondary)]">
                <InternalLink href={`/punto/${near.slug}`} className="font-bold text-[var(--text-primary)] hover:underline">
                  {stationDisplayTitle(near)}
                </InternalLink>{' '}
                · a {formatKm(km)} km · {near.operador}
              </li>
            ))}
          </ul>
          <InternalLink href={`/provincia/${provSlug}/${munSlug}`} className="text-xs font-bold text-accent hover:underline">
            Todos los puntos de recarga de {municipality}
          </InternalLink>
        </section>
      )}

      <AdSlot />

      {/* Mapa del Punto */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" />
          Ubicación en el Mapa
        </h2>
        <div className="rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-md">
          <ClientMap
            stations={[toMapPoint(toHomeStation(station))]}
            center={[station.lat, station.lng]}
            zoom={16}
            height="360px"
          />
        </div>
      </section>

      {/* Aviso de Transparencia de Fuente */}
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 text-xs text-[var(--text-secondary)]">
        <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div>
          <strong>Información verificada:</strong> Este punto está dado de alta en el Registro de Puntos de Recarga (RIPREE) del Ministerio para la Transición Ecológica (fecha de datos: {date}). Al no existir precios regulados ni telemetría obligatoria abierta en tiempo real, consulta la aplicación del operador ({station.operador}) antes de cargar para confirmar la tarifa actual y el estado del conector en este instante.
        </div>
      </div>

      <AdSlot />
    </div>
  );
}
