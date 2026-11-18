import type { StationRecord } from './types';
import { assetPath } from './site';

/** Campos de un punto que necesita el explorador de la home cuando se elige una provincia. */
export type HomeStation = Pick<
  StationRecord,
  'id' | 'slug' | 'nombre' | 'operador' | 'provincia' | 'municipio' | 'direccion' | 'lat' | 'lng' | 'potencia_max_kw' | 'conectores' | 'tipos_carga'
>;

/** Punto mínimo que dibuja el mapa. */
export interface MapPoint {
  id: string;
  slug: string;
  lat: number;
  lng: number;
  powerKw: number;
  operator: string;
  province: string;
}

/**
 * Elemento de `public/datos/mapa.json`, con claves cortas para que el fichero pese poco:
 * i = id, s = slug, la = latitud, ln = longitud, p = potencia máxima (kW),
 * o = posición del operador en `operadores`, v = posición de la provincia en `provincias`.
 */
export interface CompactMapPoint {
  i: string;
  s: string;
  la: number;
  ln: number;
  p: number;
  o: number;
  v: number;
}

/** Contenido de `public/datos/mapa.json`. Operadores y provincias se guardan una sola vez. */
export interface MapPayload {
  operadores: string[];
  provincias: string[];
  puntos: CompactMapPoint[];
}

/** Ruta pública (sin ruta base) del JSON ligero del mapa nacional. */
export const MAP_DATA_PATH = '/datos/mapa.json';

/** Tamaño máximo permitido del JSON del mapa nacional, en bytes. */
export const MAP_DATA_MAX_BYTES = 1_500_000;

/** Decimales de las coordenadas: 5 dan precisión de ~1 m y ahorran bytes. */
const COORDINATE_DECIMALS = 5;

/** Ruta pública (sin ruta base) del detalle de una provincia. */
export function provinceDataPath(provinceSlug: string): string {
  return `/datos/provincias/${provinceSlug}.json`;
}

/** Reduce un punto al subconjunto que usa el explorador. */
export function toHomeStation(station: StationRecord): HomeStation {
  return {
    id: station.id,
    slug: station.slug,
    nombre: station.nombre,
    operador: station.operador,
    provincia: station.provincia,
    municipio: station.municipio,
    direccion: station.direccion,
    lat: station.lat,
    lng: station.lng,
    potencia_max_kw: station.potencia_max_kw,
    conectores: station.conectores,
    tipos_carga: station.tipos_carga,
  };
}

/** Convierte un punto con detalle en el punto mínimo del mapa. */
export function toMapPoint(station: HomeStation): MapPoint {
  return {
    id: station.id,
    slug: station.slug,
    lat: station.lat,
    lng: station.lng,
    powerKw: station.potencia_max_kw,
    operator: station.operador,
    province: station.provincia,
  };
}

function mapDataIndexOf(table: Map<string, number>, values: string[], value: string): number {
  const known = table.get(value);
  if (known !== undefined) return known;
  table.set(value, values.length);
  values.push(value);
  return values.length - 1;
}

/** Genera el contenido de `mapa.json` a partir de todos los puntos. */
export function buildMapPayload(stations: HomeStation[]): MapPayload {
  const operadores: string[] = [];
  const provincias: string[] = [];
  const operatorIndex = new Map<string, number>();
  const provinceIndex = new Map<string, number>();

  const puntos = stations.map((station) => ({
    i: station.id,
    s: station.slug,
    la: Number(station.lat.toFixed(COORDINATE_DECIMALS)),
    ln: Number(station.lng.toFixed(COORDINATE_DECIMALS)),
    p: station.potencia_max_kw,
    o: mapDataIndexOf(operatorIndex, operadores, station.operador),
    v: mapDataIndexOf(provinceIndex, provincias, station.provincia),
  }));

  return { operadores, provincias, puntos };
}

const MAP_DATA_REGENERATE_HINT = 'Ejecuta npm run preparar-datos.';

function mapDataCorruptError(detail: string): Error {
  return new Error(`mapa.json corrupto: ${detail}. ${MAP_DATA_REGENERATE_HINT}`);
}

/**
 * Expande el contenido de `mapa.json` a puntos con nombres completos.
 * Lanza Error si `puntos` no es una lista o un punto apunta a un operador o provincia inexistente.
 */
export function parseMapPayload(payload: MapPayload): MapPoint[] {
  if (!Array.isArray(payload.puntos)) {
    throw mapDataCorruptError('no contiene la lista de puntos');
  }
  return payload.puntos.map((point, index) => {
    const operator = payload.operadores?.[point.o];
    const province = payload.provincias?.[point.v];
    if (operator === undefined) {
      throw mapDataCorruptError(`el punto ${index} apunta a operador ${point.o} inexistente`);
    }
    if (province === undefined) {
      throw mapDataCorruptError(`el punto ${index} apunta a provincia ${point.v} inexistente`);
    }
    return {
      id: point.i,
      slug: point.s,
      lat: point.la,
      lng: point.ln,
      powerKw: point.p,
      operator,
      province,
    };
  });
}

async function mapDataFetchJson<T>(path: string): Promise<T> {
  const url = assetPath(path);
  const hint = `No se pudo cargar ${url}. ${MAP_DATA_REGENERATE_HINT} y recarga la página.`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(hint, { cause });
  }
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url} (HTTP ${response.status}). ${MAP_DATA_REGENERATE_HINT} y recarga la página.`);
  }
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new Error(hint, { cause });
  }
}

/** Descarga los puntos de todo el país para el mapa nacional. */
export async function fetchMapPoints(): Promise<MapPoint[]> {
  return parseMapPayload(await mapDataFetchJson<MapPayload>(MAP_DATA_PATH));
}

/** Descarga el detalle de los puntos de una provincia. */
export async function fetchProvinceStations(provinceSlug: string): Promise<HomeStation[]> {
  const stations = await mapDataFetchJson<HomeStation[]>(provinceDataPath(provinceSlug));
  if (!Array.isArray(stations)) {
    throw new Error(`${provinceDataPath(provinceSlug)} no es una lista de puntos. ${MAP_DATA_REGENERATE_HINT}`);
  }
  return stations;
}
