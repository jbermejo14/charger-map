# ElectroCharge ⚡ - Buscador de Puntos de Recarga & Calculadora EV

Aplicación web interactiva para la búsqueda de puntos de recarga de vehículos eléctricos (VE) con visualización en mapa y calculadora avanzada de carga. Diseñada con una estética moderna en tonos **naranja y negro** y conmutador integrado de **Modo Oscuro / Modo Claro**.

---

## 🚀 Características Principales

### 1. 🗺️ Buscador de Puntos de Recarga con Mapa Interactivo
- **Mapa interactivo con Leaflet**: Marcadores personalizados en naranja brillante con badges de potencia (ej. `250 kW`, `150 kW`, `50 kW`) y puntos indicadores de disponibilidad en tiempo real (*Verde*: Disponible, *Rojo*: Ocupado, *Ámbar*: Mantenimiento).
- **Adaptación visual al tema**: Cambia automáticamente entre capa de satélite urbana oscura (*CartoDB Dark Matter*) y clara (*CartoDB Voyager*) al alternar el modo.
- **Filtros avanzados en tiempo real**:
  - Búsqueda por texto (ciudad, calle, operador, nombre).
  - Filtro por velocidad: **Ultra-rápida** (>100 kW), **Rápida** (50-100 kW) y **Normal / Lenta** (≤22 kW).
  - Filtro por tipo de conector: **CCS2 (Combo)**, **Tipo 2 (Mennekes)**, **CHAdeMO**.
  - Filtro por operador: Tesla, Ionity, Iberdrola, Endesa X Way, Repsol, Zunder, Wenea, etc.
  - Filtro "Solo disponibles ahora".
- **Interacción directa con el mapa**:
  - Hacer clic en una tarjeta de la lista centra el mapa y abre los detalles del punto de recarga.
  - Hacer clic en el marcador muestra información completa: potencia, tarifa (€/kWh), puertos disponibles y enlaces de "Cómo llegar" (Google Maps).
  - Botón **"Mi Ubicación"** con geolocalización GPS para ordenar los cargadores por proximidad.

### 2. ⚡ Calculadora de Carga Eléctrica Avanzada
- **Base de datos de vehículos**: Incluye modelos populares precargados (Tesla Model 3, Tesla Model Y, Hyundai Ioniq 5, Kia EV6, MG4, Renault Megane E-Tech, Peugeot e-208, VW ID.4, Porsche Taycan) y modo personalizado.
- **Curva de carga realista**: Modela la caída de potencia real en recargas rápidas DC por encima del 75-80% (protección térmica de la batería) en lugar de una simple estimación lineal.
- **Desglose de resultados**:
  - Tiempo estimado de recarga (horas y minutos).
  - Coste total estimado en euros (€) según la tarifa por kWh.
  - Energía neta transferida y energía bruta facturada (teniendo en cuenta pérdidas de eficiencia).
  - Autonomía recuperada (km) y coste por cada 100 km.
  - Representación gráfica de la batería (nivel inicial, recarga añadida y remanente).
  - Alerta y consejo inteligente para recargas por encima del 80%.
  - Desglose por fases de potencia y tiempo.
- **Integración con el mapa**: Al pulsar **"Calcular carga aquí"** en cualquier cargador del mapa, la potencia y el precio de esa estación se transfieren automáticamente a la calculadora.

### 3. 🌗 Modo Oscuro / Modo Claro
- Botón prominente en el encabezado para alternar entre:
  - **Modo Oscuro**: Fondo negro profundo y grafito (`#0d0f12`, `#14171d`) con acentos en naranja neón (`#ff6a00`).
  - **Modo Claro**: Fondo blanco y gris perla (`#f8fafc`, `#ffffff`) con acentos naranja cálido (`#ea580c`).
- Persistencia de la preferencia en `localStorage`.

---

## 📂 Estructura del Proyecto

```
charger-map/
├── index.html        # Estructura principal y maquetación HTML5
├── css/
│   └── styles.css    # Paleta de colores naranja/negro, temas y responsive layout
├── js/
│   ├── data.js       # Base de datos de estaciones y vehículos eléctricos
│   ├── calculator.js # Motor de cálculo con modelado de curva de recarga
│   ├── map.js        # Integración de Leaflet, capas claro/oscuro y marcadores
│   └── app.js        # Orquestación de eventos, filtros y tema
└── server.js         # Servidor web local sin dependencias externas
```

---

## 💻 Cómo Ejecutarlo

Puedes abrir directamente el archivo `index.html` en cualquier navegador web moderno, o ejecutar el servidor local incluido:

```bash
node server.js
```
Luego abre tu navegador en:
👉 `http://localhost:5173`
