import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://electrocarga.es';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff6b00',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ElectroCharge - Buscador de Puntos de Recarga & Calculadora EV en España',
    template: '%s | ElectroCharge'
  },
  description: 'Catálogo de más de 12.000 puntos de recarga de vehículos eléctricos en España con datos del registro RIPREE del Ministerio. Encuentra cargadores por provincia, municipio y operador, y calcula tiempos y costes reales.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ElectroCharge - Puntos de Recarga y Calculadora EV en España',
    description: 'Buscador de puntos de recarga para coches eléctricos en España con mapa interactivo y calculadora de curva de carga.',
    url: SITE_URL,
    siteName: 'ElectroCharge',
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
