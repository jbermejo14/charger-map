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

## 5. Contenido propio de las fichas de punto (SEO, noviembre de 2026)

### 5.1 Objetivo y alcance

La auditoría SEO del 18/11/2026 (`../ododex-sitio/docs/09-auditoria-seo-2026-11.md`) encontró estos problemas en las fichas de punto (12 114 páginas):

- unas 155 palabras;
- un parecido del 55 % entre fichas;
- un `h1` que es el código interno del punto ("E-A-SantaPola-003").

Cada ficha debe tener un título legible, una frase propia y enlaces a sus vecinas.

Fuera de alcance:

- enlaces a otras secciones de Ododex;
- cambios en otras páginas;
- cambios en slugs o URLs;
- cambios en `scripts/` y en los datos.

### 5.2 Módulos

#### C3 — `src/lib/stationInsights.ts` (funciones puras, sin E/S)

- `distanceKm(a: {lat, lng}, b: {lat, lng}): number`: distancia haversine.
- `nearbyStations(station: StationRecord, candidates: StationRecord[], options?: { maxKm?: number; limit?: number }): Array<{ station: StationRecord; km: number }>`:
  - devuelve los puntos más cercanos, sin contar el propio y sin contar los que estén en las mismas coordenadas exactas que él (mismo emplazamiento);
  - solo los que están dentro de `maxKm`, ordenados por distancia;
  - constantes `NEARBY_MAX_KM = 10` y `NEARBY_LIMIT = 6`.
- `stationDisplayTitle(station: StationRecord): string`:
  - formato: "Punto de recarga {operador} en {municipio} · {kW} kW". Los kW salen como entero si no tienen decimales y con coma si los tienen;
  - si el operador está vacío o es genérico (por ejemplo "Desconocido" u "Otros"; revisa los valores reales en `src/data/`), se usa "Punto de recarga en {municipio} · {kW} kW".
- `stationSummary(station: StationRecord, municipalityStations: StationRecord[]): string` devuelve un párrafo en español que combina:
  - cuántos puntos hay en el municipio ("Es uno de los 14 puntos de recarga públicos de Santa Pola", o "Es el único punto de recarga público registrado en X");
  - su potencia comparada con el resto ("el más potente del municipio" / "el más potente del municipio es de 150 kW");
  - cuántos son de carga rápida (≥ 50 kW) en el municipio;
  - los conectores, en lenguaje natural ("con 2 conectores Tipo 2").

  Los umbrales van en constantes con nombre y deben coincidir con los que ya usa la página (rápida ≥ 50 kW, ultrarrápida ≥ 150 kW).

#### C4 — Ficha `src/app/punto/[slug]/page.tsx`

- **Título y `h1`:** el título del documento y el `h1` pasan a `stationDisplayTitle(station)`. El código `station.nombre` se muestra en la línea de etiquetas, junto al ID de RIPREE ("Código: E-A-SantaPola-003").
- **Migas de pan:** el último elemento de la miga y el `name` del JSON-LD pueden seguir siendo `station.nombre`; elige el más claro y justifícalo en el informe.
- **Resumen:** bajo el `h1`, un párrafo con `stationSummary(...)`. Los puntos del municipio salen de `getStationsByMunicipio`.
- **Sección nueva "Puntos de recarga cercanos"** (`h2`), tras los conectores:
  - los candidatos son los de la provincia (`getStationsByProvincia`), cacheados a nivel de módulo por provincia;
  - cada elemento lleva `stationDisplayTitle` con `InternalLink` a su ficha (es una ruta solo HTML), la distancia ("a 1,2 km") y el operador;
  - al final, un enlace a "Todos los puntos de recarga de {municipio}";
  - si no hay ninguno cercano, la sección no se pinta.
- **Anuncios:** se mantienen los `AdSlot` actuales, como máximo 3 por página.

### 5.3 Orden

C3 → C4.

### 5.4 Criterios de aceptación

- **`npm test`** pasa con pruebas nuevas para:
  - `nearbyStations`: orden, límite, exclusión de sí mismo y del mismo emplazamiento, radio;
  - `stationDisplayTitle`: operador genérico y kW con decimales;
  - `stationSummary`: único punto, el más potente, caso general y municipio sin carga rápida.
- **`links.test.ts`** sigue pasando: no hay ningún `<Link>` hacia rutas solo HTML.
- **`npx tsc --noEmit`** pasa.
- **En pantalla** (sesión principal): una ficha en un municipio con muchos puntos y otra con uno solo, a 375 y 1280 px.

### 5.5 Ajustes tras la revisión (18/11/2026)

- **Conectores.**
  - En los datos, `conectores` es la lista de **tipos** sin repetir, y el número de tomas está en `num_conectores`.
  - El resumen dice "Dispone de {num_conectores} conectores ({tipos})", o en singular "Dispone de 1 conector (Tipo 2)".
  - "desconocido" se excluye. Si no queda ningún tipo, se dice solo el número; si el número es 0, se omite la frase.
- **Nombres de municipio.**
  - `formatMunicipalityName(name)` coloca delante el artículo pospuesto. Formas que trata:
    - castellano: La, El, Los, Las;
    - catalán: L', l´, Els, Les;
    - balear: Es, Ses, Sa;
    - gallego: A, O, As, Os.
  - Respeta la segunda denominación tras `/`. Ejemplo: "Vila Joiosa, la/Villajoyosa" → "La Vila Joiosa/Villajoyosa".
  - No toca los nombres cuya última parte tras la coma no sea un artículo.
  - Se usa en todos los textos visibles nuevos y en las descripciones (metadata y JSON-LD). No se usa para los slugs.
- **Mismo emplazamiento.**
  - Se considera del mismo emplazamiento, y se excluye de los cercanos, todo punto a `SAME_SITE_MAX_KM = 0.05` (50 m) o menos.
  - Sustituye al criterio de coordenadas exactas.
- **Título del documento** (`stationMetaTitle`):
  - si `stationDisplayTitle` cabe en 56 caracteres (65 menos el sufijo " | Ododex"), se usa tal cual;
  - si no, se usa "Punto de recarga en {municipio} · {kW} kW".
  - El `h1` y el `name` del JSON-LD siguen con `stationDisplayTitle`.
- **Miga de pan:** el último elemento es "Punto de {kW} kW", más corto.

### 5.6 Metadatos SEO de operador, portada y calculadora (19/11/2026)

Lógica pura en `src/lib/seo.ts`, probada en `tests/seo.test.ts` (recorre los operadores reales).

- **Títulos:** título completo (con " | Ododex", 9 caracteres) de 65 como máximo. Operador: primer candidato que quepa en 65 con el sufijo, en este orden: "Puntos de recarga de {Operador} ({n})", "{Operador}: {n} puntos de recarga", "{Operador}: puntos de recarga", "{Operador}". Si ninguno cabe, el primero con el nombre recortado por palabras completas (a 60) y "…".
- **Descripciones:** de 120 a 160 caracteres (operador: cola larga o corta según quepa el nombre).
- **Nombre legible (`readableOperatorName`):** se quitan los puntos finales ("EMAYA." → "Emaya"). Si el nombre ya tiene minúsculas, no se toca. Si llega entero en mayúsculas, se pasa a tipo título ("AJUNTAMENT DE SANTA MARIA DEL CAMI" → "Ajuntament de Santa Maria del Cami"), con partículas (de, del, des, la, el, y…) en minúscula (se evalúan antes que las siglas, salvo la primera palabra), números romanos (I, II, III, IV) en mayúsculas, "d'"/"l'" en minúscula y guiones respetados. Se mantienen en mayúsculas: un nombre de una sola palabra de 4 letras o menos, las siglas de `SEO_KNOWN_ACRONYMS` (EDP, BP, ABB, AENA) y toda palabra sin vocales o con dígitos (X, JV, H2PLT).
- **Dónde se usa:** título, descripción, `h1`, migas, textos y enlaces a otros operadores de la página de operador, y los enlaces de operadores de la portada.
- **Portada:** JSON-LD `WebApplication` (`homeJsonLd`; sin `BreadcrumbList` de un solo elemento). Título y descripción acortados. **Calculadora:** título ≤ 60 y descripción ≤ 160.

### 5.7 Enlaces de la red de Ododex (19/11/2026)

Implementa la sección 10 de `../ododex-sitio/ARCHITECTURE.md`.

- **`src/lib/network.ts`:** lee en compilación el JSON de la ruta de `ODODEX_RED_ENLACES`, con caché en memoria por ruta. Sin variable o sin fichero devuelve "sin red" (`[]`), sin error; JSON inválido, `version !== 1` o estructura incorrecta lanzan `Error` en español. Funciones: `getNetworkLinks(clave)`, `getNetworkSections()` (excluye `BASE_PATH`), `provinceNetworkKey` y `municipalityNetworkKey` (clave = ruta desde la raíz del dominio sin barra final, con los slugs de la web).
- **`NetworkLinks`** (« En Ododex también »): tras el contenido y antes del último `AdSlot` de provincia, municipio y ficha de punto (esta con los enlaces de su municipio). Los `href` son de otra sección: `<a href>` tal cual, sin `InternalLink`, `next/link` ni `assetPath`.
- **`Footer`:** « Otras webs de Ododex » con las secciones de la red, sin la propia.
- Pruebas: `tests/network.test.ts`.
