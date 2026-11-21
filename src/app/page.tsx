import type { Metadata } from 'next';
import Link from 'next/link';
import { getGlobalSummary } from '@/lib/data';
import HomeExplorer from '@/components/HomeExplorer';
import { AdSlot } from '@/components/AdSlot';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Buscador de Puntos de Recarga de Coches Eléctricos en España',
  description:
    'Mapa con más de 12.000 puntos de recarga del registro oficial RIPREE en España. Filtra por potencia ultrarrápida, tipo de conector y operador.',
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: 'Buscador de Puntos de Recarga de Coches Eléctricos en España',
    description:
      'Mapa con más de 12.000 puntos de recarga del registro oficial RIPREE en España. Filtra por potencia ultrarrápida, tipo de conector y operador.',
    url: absoluteUrl('/'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/brand/ododex-og.png'),
        width: 1200,
        height: 630,
        alt: 'Puntos de Recarga en España · Ododex',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [absoluteUrl('/brand/ododex-og.png')],
  },
};

export default function HomePage() {
  const summary = getGlobalSummary();
  const total = summary.metadata.total_estaciones.toLocaleString('es-ES');
  const date = summary.metadata.fecha_datos;

  const explorerSummary = {
    provincias: summary.provincias.map((p) => ({
      slug: p.slug,
      provincia: p.provincia,
      total_puntos: p.total_puntos,
    })),
    operadores: summary.operadores.slice(0, 30).map((op) => ({
      slug: op.slug,
      operador: op.operador,
      total_puntos: op.total_puntos,
    })),
  };

  return (
    <div className="flex-1 flex flex-col">
      <h1 className="sr-only">
        Buscador de Puntos de Recarga de Coches Eléctricos en España - Mapa
      </h1>

      {/* Componente Interactivo Buscador + Mapa con payload ligero */}
      <HomeExplorer summary={explorerSummary} />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 my-6 empty:hidden">
        <AdSlot />
      </div>

      {/* Sección SEO semántica y legible sin JavaScript */}
      <section className="bg-[var(--bg-surface)] border-t border-[var(--border-color)] py-10 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-3xl mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              Infraestructura de Recarga Pública en España
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              El censo del Registro Administrativo de Instalaciones de Puntos de Recarga de Energía Eléctrica (RIPREE), gestionado por la Secretaría de Estado de Energía y el MITECO, recoge a fecha de <strong>{date}</strong> un total de <strong>{total} estaciones públicas operativas</strong> en las 50 provincias y ciudades autónomas españolas.
            </p>
          </div>

          <h3 id="provincias" className="scroll-mt-32 text-xs font-bold uppercase tracking-wider text-accent mb-3">
            Explora Puntos de Recarga por Provincia
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
            {summary.provincias.map((prov) => (
              <Link
                key={prov.slug}
                href={`/provincia/${prov.slug}`}
                className="flex items-center justify-between p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-body)] hover:border-accent transition-colors"
              >
                <span className="font-semibold text-[var(--text-primary)] truncate">{prov.provincia}</span>
                <span className="text-[10px] font-bold text-accent ml-1 shrink-0">{prov.total_puntos}</span>
              </Link>
            ))}
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-accent mt-8 mb-3">
            Principales Operadores de Movilidad Eléctrica
          </h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {summary.operadores.slice(0, 16).map((op) => (
              <Link
                key={op.slug}
                href={`/operador/${op.slug}`}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-body)] hover:border-accent text-[var(--text-secondary)] hover:text-accent transition-colors"
              >
                <strong className="text-[var(--text-primary)]">{op.operador}</strong>{' '}
                <span className="text-[10px] text-accent">({op.total_puntos.toLocaleString('es-ES')})</span>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <AdSlot />
          </div>
        </div>
      </section>
    </div>
  );
}
