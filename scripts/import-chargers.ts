import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { normalizeOperator } from '../src/lib/operators';
import { normalizeConnector } from '../src/lib/connectors';
import { slugify, createStationSlug } from '../src/lib/slugs';
import type { StationRecord, GlobalSummary, ProvinciaSummary, OperatorCount, MunicipioCount } from '../src/lib/types';

const OFFICIAL_URL = 'https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/Export';
const DEFAULT_CSV_FALLBACK = 'c:\\Users\\Usuario\\Downloads\\InstalacionesPublicas_20261116_121623.csv';

const OUTPUT_DIR = path.resolve(process.cwd(), 'src/data');
const PROVINCIAS_DIR = path.join(OUTPUT_DIR, 'provincias');

// Rango de coordenadas de España (Península, Baleares, Canarias, Ceuta y Melilla)
function isWithinSpainCoordinates(lat: number, lng: number): boolean {
  if (isNaN(lat) || isNaN(lng)) return false;
  // Latitud: aprox 27.5 (Canarias) a 44.0 (Galicia/Asturias/País Vasco)
  // Longitud: aprox -18.5 (El Hierro) a 4.5 (Menorca)
  return lat >= 27.0 && lat <= 44.5 && lng >= -19.0 && lng <= 5.0;
}

function parsePower(str: string | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/kw/gi, '').replace(',', '.').replace(/[^0-9.]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanVal(v: string | undefined): string {
  if (!v) return '';
  return v.trim().replace(/^="?|"?$/g, '').replace(/^"|"$/g, '').trim();
}

/**
 * Obtiene el contenido del CSV (descarga o archivo local) y su fecha
 */
async function getCsvContent(): Promise<{ content: string; sourceDate: string }> {
  const csvEnvPath = process.env.CHARGERS_CSV_PATH || DEFAULT_CSV_FALLBACK;

  // 1. Intentar descarga oficial si se especifica --download o no hay archivo local
  const shouldDownload = process.argv.includes('--download');
  if (shouldDownload) {
    console.log(`[Fuente] Intentando descarga desde ${OFFICIAL_URL}...`);
    try {
      const response = await fetch(OFFICIAL_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Detectar UTF-16LE o UTF-8
        let text: string;
        if (buffer[0] === 0xff && buffer[1] === 0xfe) {
          text = buffer.toString('utf16le');
        } else {
          text = buffer.toString('utf-8');
        }
        const today = new Date().toISOString().split('T')[0];
        console.log(`[Fuente] Descarga completada con éxito (${(buffer.length / 1024 / 1024).toFixed(2)} MB).`);
        return { content: text, sourceDate: today };
      }
    } catch (err) {
      console.warn(`[Fuente] No se pudo descargar directamente (${err}). Usando archivo local.`);
    }
  }

  // 2. Usar archivo local
  if (fs.existsSync(csvEnvPath)) {
    console.log(`[Fuente] Leyendo archivo CSV local: ${csvEnvPath}`);
    const buffer = fs.readFileSync(csvEnvPath);
    let text: string;
    // Comprobar codificación UTF-16LE
    if ((buffer[0] === 0xff && buffer[1] === 0xfe) || buffer[1] === 0x00) {
      text = buffer.toString('utf16le');
    } else {
      text = buffer.toString('utf-8');
    }

    // Extraer fecha del nombre del archivo o mtime
    let fileDate = '2026-11-16';
    const match = csvEnvPath.match(/(\d{4})(\d{2})(\d{2})/);
    if (match) {
      fileDate = `${match[1]}-${match[2]}-${match[3]}`;
    } else {
      const stat = fs.statSync(csvEnvPath);
      fileDate = stat.mtime.toISOString().split('T')[0];
    }

    return { content: text, sourceDate: fileDate };
  }

  throw new Error(`No se encontró el archivo CSV en '${csvEnvPath}'. Establece CHARGERS_CSV_PATH en tu .env.`);
}

/**
 * Sanitiza las líneas del CSV oficial del Ministerio para que cumplan con el estándar RFC 4180
 * convirtiendo comillas internas sin escapar en comillas dobles escapadas ("").
 */
function sanitizeMinisterioCsv(rawContent: string): string {
  const lines = rawContent.split(/\r?\n/);
  const sanitizedLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    // Normalizar ="..." a "..."
    const cleanLine = line.replace(/="([^"]*)"/g, '"$1"');
    const parts = cleanLine.split(';');
    const sanitizedParts = parts.map(part => {
      const p = part.trim();
      if (p.startsWith('"') && p.endsWith('"')) {
        const inner = p.slice(1, -1);
        const escaped = inner.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return p;
    });
    sanitizedLines.push(sanitizedParts.join(';'));
  }

  return sanitizedLines.join('\n');
}

export async function importChargers() {
  console.log('=== IMPORTADOR OFICIAL DE PUNTOS DE RECARGA (RIPREE) ===\n');

  const { content, sourceDate } = await getCsvContent();

  console.log('[Parser] Normalizando comillas y fórmulas del CSV...');
  const sanitizedContent = sanitizeMinisterioCsv(content);

  console.log('[Parser] Parseando CSV con csv-parse...');
  const records = parse(sanitizedContent, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true
  });

  console.log(`[Parser] Filas encontradas en el CSV: ${records.length}`);

  // Contadores de descartes
  let discardedNoId = 0;
  let discardedInvalidCoords = 0;
  let discardedOutsideSpain = 0;

  const stationsMap = new Map<string, StationRecord>();

  for (const row of records) {
    const rawId = cleanVal(row['COD.INSTALACION'] || row['ID. PUNTO DE RECARGA']);
    if (!rawId) {
      discardedNoId++;
      continue;
    }

    const rawLat = cleanVal(row['LATITUD']).replace(',', '.');
    const rawLng = cleanVal(row['LONGITUD']).replace(',', '.');
    const lat = parseFloat(rawLat);
    const lng = parseFloat(rawLng);

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      discardedInvalidCoords++;
      continue;
    }

    if (!isWithinSpainCoordinates(lat, lng)) {
      discardedOutsideSpain++;
      continue;
    }

    const power = parsePower(row['POTENCIA MAXIMA']);
    const connector = normalizeConnector(row['TIPO CONECTOR']);
    const rawChargeType = cleanVal(row['TIPO DE CARGA']).toUpperCase();
    const chargeType = rawChargeType === 'DC' || rawChargeType === 'AC' ? rawChargeType : power > 22 ? 'DC' : 'AC';

    const rawOperator = cleanVal(row['NOMBRE OPERADOR']) || 'Desconocido';
    const normOperator = normalizeOperator(rawOperator);

    const nombre = cleanVal(row['NOMBRE INSTALACION']) || `Punto de Recarga ${rawId}`;
    const provincia = cleanVal(row['PROVINCIA']) || 'Sin Provincia';
    const municipio = cleanVal(row['MUNICIPIO']) || 'Sin Municipio';
    const comunidad = cleanVal(row['COMUNIDAD AUTONOMA']) || '';
    const direccion = cleanVal(row['DIRECCIÓN']) || '';
    const codigo_postal = cleanVal(row['CODIGO POSTAL']) || '';
    const horario = cleanVal(row['HORARIO APERTURA']) || '24 horas';

    if (!stationsMap.has(rawId)) {
      stationsMap.set(rawId, {
        id: rawId,
        nombre,
        operador: normOperator,
        operador_original: rawOperator,
        comunidad,
        provincia,
        municipio,
        direccion,
        codigo_postal,
        horario,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        potencia_max_kw: power,
        num_conectores: 1,
        conectores: [connector],
        tipos_carga: [chargeType],
        slug: createStationSlug(rawId, nombre)
      });
    } else {
      const existing = stationsMap.get(rawId)!;
      existing.num_conectores += 1;
      if (power > existing.potencia_max_kw) {
        existing.potencia_max_kw = power;
      }
      if (!existing.conectores.includes(connector)) {
        existing.conectores.push(connector);
      }
      if (!existing.tipos_carga.includes(chargeType)) {
        existing.tipos_carga.push(chargeType);
      }
    }
  }

  const allStations = Array.from(stationsMap.values());
  const totalDiscarded = discardedNoId + discardedInvalidCoords + discardedOutsideSpain;

  console.log('\n--- RESUMEN DE IMPORTACIÓN Y CALIDAD DE DATOS ---');
  console.log(`✔ Estaciones válidas procesadas: ${allStations.length.toLocaleString('es-ES')}`);
  console.log(`✖ Total filas descartadas: ${totalDiscarded.toLocaleString('es-ES')}`);
  console.log(`   - Sin ID de instalación: ${discardedNoId}`);
  console.log(`   - Coordenadas nulas/inválidas: ${discardedInvalidCoords}`);
  console.log(`   - Fuera del territorio español: ${discardedOutsideSpain}`);

  // Asegurar directorios de destino fuera de public
  fs.mkdirSync(PROVINCIAS_DIR, { recursive: true });

  // Agrupar estaciones por provincia
  const stationsByProvincia = new Map<string, StationRecord[]>();
  for (const station of allStations) {
    const provSlug = slugify(station.provincia) || 'sin-provincia';
    if (!stationsByProvincia.has(provSlug)) {
      stationsByProvincia.set(provSlug, []);
    }
    stationsByProvincia.get(provSlug)!.push(station);
  }

  console.log(`\n[Guardado] Generando archivos JSON particionados por provincia en src/data/provincias/ (${stationsByProvincia.size} provincias)...`);

  const provinciasSummary: ProvinciaSummary[] = [];

  for (const [provSlug, provStations] of stationsByProvincia.entries()) {
    const provName = provStations[0]?.provincia || provSlug;
    const comunidad = provStations[0]?.comunidad || '';

    // Escribir archivo por provincia
    const filePath = path.join(PROVINCIAS_DIR, `${provSlug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(provStations));

    // Calcular métricas de la provincia
    let ultra = 0;
    let rapida = 0;
    let normal = 0;
    const conectorMap: Record<string, number> = {};
    const opCountMap = new Map<string, number>();
    const munCountMap = new Map<string, number>();

    for (const s of provStations) {
      if (s.potencia_max_kw > 100) ultra++;
      else if (s.potencia_max_kw >= 50) rapida++;
      else normal++;

      for (const con of s.conectores) {
        conectorMap[con] = (conectorMap[con] || 0) + 1;
      }

      opCountMap.set(s.operador, (opCountMap.get(s.operador) || 0) + 1);
      munCountMap.set(s.municipio, (munCountMap.get(s.municipio) || 0) + 1);
    }

    const operadoresPrincipales: OperatorCount[] = Array.from(opCountMap.entries())
      .map(([operador, count]) => ({ operador, slug: slugify(operador), count }))
      .sort((a, b) => b.count - a.count);

    const municipios: MunicipioCount[] = Array.from(munCountMap.entries())
      .map(([municipio, count]) => ({ municipio, slug: slugify(municipio), count }))
      .sort((a, b) => b.count - a.count);

    provinciasSummary.push({
      provincia: provName,
      slug: provSlug,
      comunidad,
      total_puntos: provStations.length,
      potencia_ultra: ultra,
      potencia_rapida: rapida,
      potencia_normal: normal,
      conectores: conectorMap,
      operadores_principales: operadoresPrincipales,
      municipios
    });
  }

  provinciasSummary.sort((a, b) => b.total_puntos - a.total_puntos);

  // Agregación de operadores globales
  const globalOpMap = new Map<string, { total: number; provs: Map<string, number> }>();
  for (const s of allStations) {
    if (!globalOpMap.has(s.operador)) {
      globalOpMap.set(s.operador, { total: 0, provs: new Map() });
    }
    const entry = globalOpMap.get(s.operador)!;
    entry.total += 1;
    entry.provs.set(s.provincia, (entry.provs.get(s.provincia) || 0) + 1);
  }

  const operadoresGlobales = Array.from(globalOpMap.entries())
    .map(([operador, data]) => ({
      operador,
      slug: slugify(operador),
      total_puntos: data.total,
      provincias_cobertura: Array.from(data.provs.entries())
        .map(([provincia, count]) => ({ provincia, slug: slugify(provincia), count }))
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => b.total_puntos - a.total_puntos);

  const globalSummary: GlobalSummary = {
    metadata: {
      fuente: 'Registro de Puntos de Recarga (RIPREE) - Ministerio para la Transición Ecológica y el Reto Demográfico / datos.gob.es',
      fecha_datos: sourceDate,
      url_oficial: OFFICIAL_URL,
      total_estaciones: allStations.length,
      total_descartados: totalDiscarded,
      motivos_descarte: {
        sin_id: discardedNoId,
        coordenadas_invalidas: discardedInvalidCoords,
        fuera_de_espana: discardedOutsideSpain
      }
    },
    provincias: provinciasSummary,
    operadores: operadoresGlobales
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(globalSummary));
  console.log(`✔ Resumen global guardado en src/data/summary.json`);
  console.log(`✔ Importación completada con éxito. Datos fechados a: ${sourceDate}\n`);
}

// Ejecutar si se llama directamente
if (require.main === module || process.argv[1]?.includes('import-chargers')) {
  importChargers().catch((err) => {
    console.error('Error durante la importación:', err);
    process.exit(1);
  });
}
