# Arquitectura: Ododex · Puntos de recarga

## 1. Objetivo y alcance

Buscador y mapa de los 12 114 puntos de recarga para vehículos eléctricos del censo RIPREE (Ministerio para la Transición Ecológica), con calculadora de recarga y páginas por provincia, municipio, operador y punto. Forma parte de la red **Ododex** y se publica gratis como sitio estático en Cloudflare, bajo `https://ododex.com/es/puntos-recarga`, en un Worker propio (`ododex-puntos-recarga`). Lo ensambla y despliega `../ododex-sitio`.

Este documento cubre la migración desde "ElectroCharge":

- exportación estática sin API;
- ruta base;
- datos ligeros para el mapa;
- teselas sin CARTO;
- enlaces solo HTML;
- marca, estilo, legales y anuncios de Ododex.

Fuera de alcance:

- cambiar la importación (`scripts/import-chargers.ts`), los datos (`src/data/`) o la lógica de `src/lib/charging.ts`, `connectors.ts` y `operators.ts`.

Ya hecho:

- se han borrado la versión antigua en HTML suelto y su procesador;
- están creados `public/brand/`, `src/app/icon.svg`, `config/titular.example.json` y `config/titular.json` (este último fuera de git).

Referencias de solo lectura:

- `../gasolineras`: el caso más parecido. Ficheros: `src/lib/site.ts` (con `isHtmlOnlyRoute`), `src/components/InternalLink.tsx`, `src/components/AdSlot.tsx`, la sección E de su `ARCHITECTURE.md` y `postcss.config.mjs`.
- `../multas-dgt`: marca, legales y pruebas de UI. Ficheros: `src/lib/legal.ts`, `src/components/{Header,Footer,BrandLogo,Breadcrumbs,AdSenseScript,ConsentSettingsButton,AdSlot}.tsx`, `src/app/{layout.tsx,globals.css,aviso-legal,privacidad,cookies}` y `test/`.
- `../ododex-sitio/ARCHITECTURE.md`, sección 8: bloques de anuncio.
- `../brand/README.md`: marca.

Volumen: 12 114 puntos, 2 120 municipios, 51 provincias y 160 operadores, unas 14 500 páginas. Para caber en 20 000 ficheros por Worker, las fichas de punto y de municipio se publican solo como HTML (`paginasSoloHtml` en `../ododex-sitio`).

## 2. Módulos

### C1 — Plataforma, exportación y datos

- **`src/lib/site.ts`**, con la misma interfaz que gasolineras:
  - `SITE_NAME = 'Ododex'` y `SECTION_NAME = 'Puntos de recarga'`;
  - `BASE_PATH = '/es/puntos-recarga'`;
  - `getSiteUrl`, `absoluteUrl` y `assetPath`;
  - `isHtmlOnlyRoute(path)`: verdadero para `/punto/<x>` y `/provincia/<p>/<m>`.
- **`next.config.ts`:**
  - `basePath`, con una constante duplicada y un comentario, como en los demás;
  - `output: 'export'`;
  - `images: { unoptimized: true }`.
- **Enlaces:** componente `InternalLink`, igual que en gasolineras, para todo enlace a una ruta solo HTML. En el HTML de Leaflet se usa `assetPath`. Una prueba prohíbe `<Link` hacia esas rutas.
- **Sin servidor:**
  - se elimina `src/app/api/` (lo hace la sesión principal);
  - el mapa nacional lee `public/datos/mapa.json`, un JSON ligero con un elemento por punto: `id`, `slug`, `lat`, `lng`, potencia máxima en kW, operador y provincia, con claves cortas documentadas. Debe pesar menos de 1,5 MB;
  - el detalle de una provincia en el explorador de la home se lee de `public/datos/provincias/<slug>.json`.
  - Ambos los genera `scripts/preparar-datos.ts` a partir de `src/data/`, y `"build": "npm run preparar-datos && next build --webpack"`. Hay que comprobar con `assetPath` que se piden bien. `.gitignore`: `public/datos/`.
- **Rutas dinámicas:** sin `revalidate`, con `dynamicParams = false`. `sitemap.ts` con `force-static` y `absoluteUrl`. Se elimina `src/app/robots.ts` (lo hace la sesión principal).
- **Canonical, `og:url`, JSON-LD y sitemap** con `absoluteUrl`. Desaparecen las URLs antiguas.
- **Mapas:**
  - se quita la capa CARTO, porque exige clave de API;
  - se mantienen OSM (por defecto, en los dos temas), Oscuro (Esri Dark Gray) y Satélite (Esri), con sus atribuciones;
  - contenedores con `isolate`;
  - CSS de Leaflet y de MarkerCluster en `@layer base`, sin ancho ni alto.
- **Tailwind:** se mantiene la integración actual por PostCSS con WASM, que ya funciona con webpack. Se quita `@tailwindcss/turbopack` si no se usa.

### C2 — Marca, estilo, legales y anuncios

Como el R4 de `../recalls-web/ARCHITECTURE.md` y las secciones 2.2, 2.3 y 2.6 de multas, en español:

- **Marca:**
  - `BrandLogo` y `Header`: logo, separador, `SECTION_NAME`, conmutador de tema con `ododex-theme` y `data-theme`, y fila de navegación con "Mapa" (`/`), "Provincias" (ancla o índice existente) y "Calculadora" (`/calculadora`);
  - `Footer`: legales, consentimiento, fuente RIPREE y aviso de que no es oficial;
  - fuentes Inter y JetBrains Mono;
  - fuera "ElectroCharge" y el tema antiguo;
  - sustituyen a `Navbar.tsx` (la sesión principal lo borra).
- **Estilo:**
  - tokens y clases de multas en `@layer components`;
  - colores semánticos, sin `orange-*`, `#FF6B00`, `#ff5500` ni degradados (incluido el degradado de las burbujas de MarkerCluster, que pasa a tokens);
  - sin desbordamiento a 375 px.
- **Legales:**
  - `src/lib/legal.ts` y las páginas `/aviso-legal`, `/privacidad` y `/cookies`, con `noindex, follow` y fuera del sitemap;
  - textos de esta web: datos RIPREE, que pueden no estar al día ni reflejar si el punto funciona; la calculadora es orientativa; la ubicación, si se usa, solo en el navegador; teselas de OpenStreetMap y Esri; AdSense con consentimiento.
- **Anuncios:** `AdSenseScript`, `ConsentSettingsButton` y `AdSlot` según la sección 8 de `../ododex-sitio/ARCHITECTURE.md`. Huecos:
  - home: tras el explorador y el mapa, y al final;
  - `/provincia/[p]`, `/provincia/[p]/[m]`, `/operador/[o]` y `/punto/[slug]`: tras el bloque principal y al final;
  - `/calculadora`: tras el resultado y al final;
  - ninguno en legales ni en la 404.

## 3. Orden

1. **C1.**
2. **C2.**

## 4. Criterios de aceptación

- `npm test` pasa: las 25 pruebas actuales, adaptadas, más las nuevas:
  - `site.test.ts`: URLs, ruta base e `isHtmlOnlyRoute`;
  - `links.test.ts`: no hay `<Link>` hacia rutas solo HTML;
  - `preparar-datos`: el `mapa.json` de una fixture tiene los campos esperados y pesa menos de 1,5 MB con los datos reales;
  - ninguna fuente contiene `/api/`, `cartocdn` ni `ElectroCharge`;
  - en C2: marca, colores, contraste, legales y `AdSlot`.
- `npx tsc --noEmit` pasa.
- `npm run build` con `NEXT_PUBLIC_SITE_URL=https://ododex.com` genera `out/` con:
  - `index.html`, `404.html` y `sitemap.xml`;
  - una página por punto, municipio, provincia y operador;
  - `datos/mapa.json`.

  Hay que dar el número de ficheros.
- En pantalla (sesión principal):
  - el mapa nacional con clustering y teselas;
  - los filtros;
  - una provincia, un municipio, un punto, un operador y la calculadora;
  - los legales;
  - en claro y oscuro, a 375 y 1280 px.
