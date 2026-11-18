import type { MetadataRoute } from 'next';
import { getGlobalSummary, getAllStationSlugs } from '@/lib/data';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const summary = getGlobalSummary();
  const lastModified = new Date();

  const routes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: absoluteUrl(`/calculadora`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];

  // Provincias
  for (const prov of summary.provincias) {
    routes.push({
      url: absoluteUrl(`/provincia/${prov.slug}`),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    });

    // Municipios
    for (const mun of prov.municipios) {
      if (mun.count > 0) {
        routes.push({
          url: absoluteUrl(`/provincia/${prov.slug}/${mun.slug}`),
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  }

  // Operadores
  for (const op of summary.operadores) {
    routes.push({
      url: absoluteUrl(`/operador/${op.slug}`),
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // Fichas individuales de puntos de recarga
  const stationSlugs = getAllStationSlugs();
  for (const s of stationSlugs) {
    routes.push({
      url: absoluteUrl(`/punto/${s.slug}`),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return routes;
}
