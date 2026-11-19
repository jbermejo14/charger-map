import React from 'react';
import Link from 'next/link';
import { getGlobalSummary } from '@/lib/data';
import { SITE_NAME } from '@/lib/site';
import { getNetworkSections } from '@/lib/network';
import { ConsentSettingsButton } from '@/components/ConsentSettingsButton';

const RIPREE_EXPORT_URL = 'https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/Export';

const FOOTER_LINK_GROUPS = [
  {
    title: 'Provincias:',
    links: [
      { label: 'Madrid', href: '/provincia/madrid' },
      { label: 'Barcelona', href: '/provincia/barcelona' },
      { label: 'Valencia', href: '/provincia/valencia-valencia' },
      { label: 'Sevilla', href: '/provincia/sevilla' }
    ]
  },
  {
    title: 'Operadores:',
    links: [
      { label: 'Iberdrola', href: '/operador/iberdrola' },
      { label: 'Endesa X Way', href: '/operador/endesa-x-way' },
      { label: 'Repsol', href: '/operador/repsol' },
      { label: 'Tesla', href: '/operador/tesla' }
    ]
  },
  {
    title: 'Herramientas:',
    links: [
      { label: 'Mapa de recarga', href: '/' },
      { label: 'Calculadora de carga', href: '/calculadora' }
    ]
  }
] as const;

export interface FooterProps {
  /** Muestra el botón para cambiar el consentimiento; solo si AdSense está configurado. */
  mostrarConsentimiento?: boolean;
}

/** Pie con la fuente de los datos (RIPREE), el aviso de sitio no oficial y los enlaces legales. */
export function Footer({ mostrarConsentimiento = false }: FooterProps) {
  const { metadata } = getGlobalSummary();
  const networkSections = getNetworkSections();
  const total = metadata.total_estaciones.toLocaleString('es-ES');

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <p className="footer-text">
          <strong>{SITE_NAME}</strong> &bull; Puntos de recarga para vehículos eléctricos en España.
        </p>
        <p className="footer-subtext">
          Fuente: <a href={RIPREE_EXPORT_URL} target="_blank" rel="noopener noreferrer">registro RIPREE</a> del
          Ministerio para la Transición Ecológica y el Reto Demográfico. Datos a {metadata.fecha_datos}: {total} puntos
          públicos. Pueden no estar al día ni reflejar si un punto funciona.
        </p>
        <p className="footer-subtext">
          Sitio independiente: no es una web oficial del Ministerio ni de ningún operador de recarga. Las tarifas
          dependen de cada operador y la calculadora es solo orientativa.
        </p>
        <nav aria-label="Información legal" className="footer-legal">
          <Link href="/aviso-legal">Aviso legal</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          {mostrarConsentimiento && <ConsentSettingsButton />}
        </nav>
        {FOOTER_LINK_GROUPS.map(group => (
          <div key={group.title} className="footer-links">
            <span>{group.title}</span>
            {group.links.map(link => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
        {networkSections.length > 0 && (
          <div className="footer-links">
            <span>Otras webs de Ododex:</span>
            {networkSections.map(section => (
              <a key={section.ruta} href={section.ruta} title={section.descripcion}>
                {section.nombre}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
