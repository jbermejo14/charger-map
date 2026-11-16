# ElectroCharge ⚡ - Buscador de Puntos de Recarga & Calculadora EV en España

Plataforma web de alto rendimiento construida con **Next.js (App Router)**, **TypeScript**, **Tailwind CSS 4** y **Leaflet MarkerCluster**, diseñada para explorar el censo oficial de más de **12.114 puntos de recarga de vehículos eléctricos** en España, con páginas estáticas indexables (SSG), SEO avanzado y calculadora de recarga basada en curvas de potencia reales.

---

## 📋 Características Principales

1. **🗺️ Buscador & Mapa Nacional con Clustering**:
   - Mapa interactivo con **Leaflet** y **MarkerCluster** agrupando más de 12.100 puntos en burbujas con gradiente naranja (`#FF6B00`) sin congelar el navegador.
   - Selector de capas de mapa idéntico a ZBE-MAP: **OSM (OpenStreetMap)**, **Oscuro (Dark Gray Canvas)**, **Satélite (Esri World Imagery)** y **CARTO (Positron)**.
   - Filtros en tiempo real por **Provincia**, **Operador**, **Tipo de Conector** y **Potencia Mínima** (`Todas`, `≥ 22 kW Semi-rápida`, `≥ 50 kW Rápida`, `≥ 150 kW Ultrarrápida`).
   - Paginación progresiva de tarjetas (lotes de 30) para mantener el árbol DOM ligero.

2. **⚡ Calculadora de Carga Eléctrica**:
   - Lógica pura aislada en `src/lib/charging.ts`.
   - **Simulación física de curva de recarga**: Modela la desaceleración térmica a partir del 75-80% en carga rápida DC, avisando al usuario de la pérdida de eficiencia al superar el 80%.
   - **Transparencia en tarifas**: No inventa precios. El usuario introduce su tarifa en €/kWh según su contrato o app de recarga, con un valor documentado de ejemplo por defecto (0,45 €/kWh).

3. **🏛️ Arquitectura Estática y SEO de Máxima Indexabilidad**:
   - `/`: Buscador y mapa principal con datos consolidados.
   - `/provincia/[provincia]`: Ficha de provincia con desglose de potencias (>100 kW, 50-100 kW, ≤22 kW), conectores, operadores principales y listado de municipios.
   - `/provincia/[provincia]/[municipio]`: Directorio local con tabla de estaciones, coordenadas, tipos de carga, mapa centrado y municipios cercanos.
   - `/operador/[operador]`: Cobertura provincial y volumen de presencia en España.
   - `/punto/[id]-[slug]`: Ficha técnica de cada instalación con dirección, código postal, horario, tipos de conectores, mapa y enlace a Google Maps "Cómo llegar".
   - `/calculadora`: Herramienta interactiva de cálculo y consejos para viajes.
   - **SEO Avanzado**: Canonical absoluto configurable (`NEXT_PUBLIC_SITE_URL`), Open Graph, Breadcrumbs estructurados, Schema.org `ChargingStation` JSON-LD, `sitemap.xml` y `robots.txt`.

4. **🌓 Diseño Naranja y Negro**:
   - Estética oscura y clara conmutables con un solo clic.
   - Persistencia de tema en `localStorage` y sincronización con las capas del mapa.

---

## 🏛️ Fuente Oficial de los Datos

Los datos provienen del **Registro Administrativo de Instalaciones de Puntos de Recarga de Energía Eléctrica (RIPREE)**, regulado por la Secretaría de Estado de Energía del **Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)** conforme al marco regulatorio estatal y al reglamento europeo **AFIR** (*Alternative Fuels Infrastructure Regulation*), publicado en **datos.gob.es**.

- **URL de exportación oficial**:  
  `https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/Export`
- **Formato del archivo**: CSV codificado en `UTF-16LE`, delimitado por punto y coma (`;`).
- **Fecha de los datos incluidos**: **16 de noviembre de 2026** (extraída del nombre y metadatos del archivo de origen).
- **Aviso sobre tarifas y disponibilidad**:  
  El RIPREE es un registro censal y técnico administrativo. **No expone tarifas dinámicas ni telemetría en tiempo real (libre/ocupado)**. Por ello, la plataforma no inventa disponibilidades no verificadas y permite al conductor introducir su precio de recarga real.

---

## ⚙️ Variables de Entorno

Copia el archivo `.env.example` a `.env.local` y ajusta las variables según tu entorno:

```bash
cp .env.example .env.local
```

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | URL base absoluta para metaetiquetas canonical, Open Graph y sitemap | `https://electrocarga.es` |
| `CHARGERS_CSV_PATH` | Ruta local al archivo CSV oficial descargado | `c:\Users\Usuario\Downloads\InstalacionesPublicas_20261116_121623.csv` |

---

## 🔄 Cómo Actualizar el Catálogo de Datos

El importador oficial lee el CSV, sanitiza anomalías de formato (comillas internas sin escapar conforme a RFC 4180), descarta registros sin ID o fuera de España, normaliza operadores y conectores, y genera JSON particionados por provincia fuera de la carpeta `public`:

```bash
npm run import-chargers
```

### Reglas de Calidad del Importador:
1. **Descarte de registros inválidos**:
   - Descarta filas sin `COD.INSTALACION` o `ID. PUNTO DE RECARGA`.
   - Descarta coordenadas nulas (`0.0, 0.0`), `NaN` o situadas fuera del territorio español (latitud 27° a 44.5°, longitud -19° a +5°).
   - Escribe en la terminal el número de filas descartadas y el motivo exacto.
2. **Normalización estricta de operadores**:
   - Conserva siempre `operador_original`.
   - Aplica un diccionario de equivalencias sin fusionar empresas distintas (por ejemplo, **BP Pulse** se mantiene como operador independiente y no se cuenta como Iberdrola).
3. **Conectores no identificados**:
   - Si no se especifica el tipo de conector o es irreconocible, se clasifica como `"desconocido"` en lugar de suponer Tipo 2.
4. **Particionado por Provincia**:
   - Genera archivos JSON independientes en `src/data/provincias/{provincia-slug}.json` y un índice ligero en `src/data/summary.json`. Cada página carga únicamente los puntos que muestra.

---

## 🧪 Pruebas Automatizadas (Sin Red)

La suite de pruebas unitarias utiliza el test runner nativo de Node.js (`node:test`) con TypeScript y no realiza peticiones externas a la red:

```bash
npm test
```

### Casos de Prueba Cubiertos:
- **`tests/charging.test.ts`**: Cálculos de potencia, energía neta y facturada, curva de ralentización >80% (`warning80`), tiempos y costes.
- **`tests/csv-import.test.ts`**: Lectura y decodificación de fixture en UTF-16LE, sanitización de comillas RFC 4180 y descarte de coordenadas inválidas o fuera de España.
- **`tests/operators.test.ts`**: Verificación de equivalencias (comprobación de que BP Pulse no se mezcla con Iberdrola, limpieza de sufijos societarios).
- **`tests/connectors.test.ts`**: Normalización de CCS2 Combo, Tipo 2 Mennekes, CHAdeMO, Schuko y detección de desconocidos.
- **`tests/slugs.test.ts`**: Generación de slugs sin tildes, colapso de guiones y reversibilidad de IDs.
- **`tests/sitemap-and-routes.test.ts`**: Generación de sitemap con URLs absolutas y respuestas 404 para slugs inexistentes.

---

## 💻 Desarrollo y Compilación

Instala las dependencias con versiones fijadas:
```bash
npm install
```

Ejecuta el servidor de desarrollo:
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

Genera la compilación estática para producción:
```bash
npm run build
```

Arranca el servidor en modo producción:
```bash
npm start
```
