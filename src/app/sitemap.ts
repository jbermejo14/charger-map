import type { MetadataRoute } from 'next';
import { getGlobalSummary, getAllStationSlugs } from '@/lib/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://electrocarga.es';
  const summary = getGlobalSummary();
  const lastModified = new Date();

  const routes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/calculadora`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];

  // Provincias
  for (const prov of summary.provincias) {
    routes.push({
      url: `${siteUrl}/provincia/${prov.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    });

    // Municipios
    for (const mun of prov.municipios) {
      if (mun.count > 0) {
        routes.push({
          url: `${siteUrl}/provincia/${prov.slug}/${mun.slug}`,
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
      url: `${siteUrl}/operador/${op.slug}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // Fichas individuales de puntos de recarga
  const stationSlugs = getAllStationSlugs();
  for (const s of stationSlugs) {
    routes.push({
      url: `${siteUrl}/punto/${s.slug}`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return routes;
}
