import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SITE_NAME, absoluteUrl, getSiteUrl } from '@/lib/site';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff6b00',
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} - Buscador de Puntos de Recarga & Calculadora EV en España`,
    template: `%s | ${SITE_NAME}`
  },
  description: 'Catálogo de más de 12.000 puntos de recarga de vehículos eléctricos en España con datos del registro RIPREE del Ministerio. Encuentra cargadores por provincia, municipio y operador, y calcula tiempos y costes reales.',
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: `${SITE_NAME} - Puntos de Recarga y Calculadora EV en España`,
    description: 'Buscador de puntos de recarga para coches eléctricos en España con mapa interactivo y calculadora de curva de carga.',
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    locale: 'es_ES',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] antialiased">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
