import React from 'react';
import { getNetworkLinks } from '@/lib/network';

export interface NetworkLinksProps {
  /** Ruta de la página desde la raíz del dominio, sin barra final (clave del fichero de red). */
  routeKey: string;
}

/**
 * Bloque « En Ododex también » con enlaces a otras webs de la red. Los href son de otra
 * sección del dominio, así que se pintan tal cual con <a>, sin ruta base propia.
 */
export function NetworkLinks({ routeKey }: NetworkLinksProps) {
  const links = getNetworkLinks(routeKey);
  if (links.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 space-y-3">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">En Ododex también</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href} className="text-sm">
            <a href={link.href} className="font-bold text-accent hover:underline">
              {link.texto}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
