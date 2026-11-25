import type { StationRecord } from './types';
import { readableOperatorName } from './seo';

/** Radio máximo, en km, para considerar un punto "cercano". */
export const NEARBY_MAX_KM = 10;
/** Número máximo de puntos cercanos que se devuelven. */
export const NEARBY_LIMIT = 6;
/** Umbral de carga rápida en kW (el mismo que usa la ficha). */
export const FAST_CHARGE_MIN_KW = 50;
/** Umbral de carga ultrarrápida en kW (el mismo que usa la ficha). */
export const ULTRA_CHARGE_MIN_KW = 150;

/** Distancia en km (50 m) por debajo de la cual dos puntos son del mismo emplazamiento. */
export const SAME_SITE_MAX_KM = 0.05;

const EARTH_RADIUS_KM = 6371;
const RADIANS_PER_DEGREE = Math.PI / 180;
const UNKNOWN_CONNECTOR = 'desconocido';
// Valores de operador sin información real. En los datos actuales no aparece ninguno; se mantiene
// por si el dato llega vacío o genérico (el importador pone "Desconocido" si el operador falta).
const GENERIC_OPERATORS = new Set(['', 'desconocido', 'otros', 'otro', 'n/a', '-', 'sin operador', 'sin especificar']);

interface Coordinates {
  lat: number;
  lng: number;
}

export interface NearbyStation {
  station: StationRecord;
  km: number;
}

function insightsToRadians(degrees: number): number {
  return degrees * RADIANS_PER_DEGREE;
}

/** Distancia en kilómetros entre dos coordenadas (fórmula de haversine). */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = insightsToRadians(b.lat - a.lat);
  const dLng = insightsToRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(insightsToRadians(a.lat)) * Math.cos(insightsToRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Puntos más cercanos a `station`, ordenados por distancia. Excluye el propio punto y
 * los del mismo emplazamiento (a `SAME_SITE_MAX_KM` o menos).
 */
export function nearbyStations(
  station: StationRecord,
  candidates: StationRecord[],
  options: { maxKm?: number; limit?: number } = {},
): NearbyStation[] {
  const maxKm = options.maxKm ?? NEARBY_MAX_KM;
  const limit = options.limit ?? NEARBY_LIMIT;
  const result: NearbyStation[] = [];
  for (const candidate of candidates) {
    if (candidate.id === station.id) continue;
    const km = distanceKm(station, candidate);
    if (km > SAME_SITE_MAX_KM && km <= maxKm) result.push({ station: candidate, km });
  }
  return result.sort((x, y) => x.km - y.km).slice(0, limit);
}

/** Potencia en español: entero si no tiene decimales, con coma si los tiene. */
export function formatKw(kw: number): string {
  return Number.isInteger(kw) ? String(kw) : String(kw).replace('.', ',');
}

// Artículos pospuestos ("Llacuna, La"). Los que acaban en apóstrofo se pegan al nombre sin espacio.
const POSTPOSED_ARTICLES = new Set([
  'la', 'el', 'los', 'las',
  "l'", 'l´', 'els', 'les',
  'es', 'ses', 'sa',
  'a', 'o', 'as', 'os',
]);
const ELIDED_ARTICLE_ENDINGS = ["'", '´'];
const ARTICLE_SEPARATOR = ', ';
const ALTERNATIVE_NAME_SEPARATOR = '/';

function insightsMoveArticle(part: string): string {
  const cut = part.lastIndexOf(ARTICLE_SEPARATOR);
  if (cut < 0) return part;
  const article = part.slice(cut + ARTICLE_SEPARATOR.length).trim();
  if (!POSTPOSED_ARTICLES.has(article.toLowerCase())) return part;
  const capitalized = article.charAt(0).toUpperCase() + article.slice(1);
  const glue = ELIDED_ARTICLE_ENDINGS.some((ending) => article.endsWith(ending)) ? '' : ' ';
  return `${capitalized}${glue}${part.slice(0, cut)}`;
}

/**
 * Nombre de municipio en orden natural: "Llacuna, La" pasa a "La Llacuna". Trata cada
 * denominación separada por "/" y deja igual los nombres sin artículo pospuesto.
 */
export function formatMunicipalityName(name: string): string {
  return name.split(ALTERNATIVE_NAME_SEPARATOR).map(insightsMoveArticle).join(ALTERNATIVE_NAME_SEPARATOR);
}

/** Indica si el operador aporta información real (no vacío ni genérico). */
export function stationHasOperator(operator: string): boolean {
  return !GENERIC_OPERATORS.has(operator.trim().toLowerCase());
}

/** Título legible de la ficha: "Punto de recarga {operador} en {municipio} · {kW} kW". */
export function stationDisplayTitle(station: StationRecord): string {
  const operator = stationHasOperator(station.operador) ? ` ${readableOperatorName(station.operador)}` : '';
  return `Punto de recarga${operator} en ${formatMunicipalityName(station.municipio)} · ${formatKw(station.potencia_max_kw)} kW`;
}

function insightsCountSentence(count: number, municipality: string): string {
  if (count === 1) return `Es el único punto de recarga público registrado en ${municipality}`;
  return `Es uno de los ${count} puntos de recarga públicos de ${municipality}`;
}

function insightsPowerSentence(station: StationRecord, others: StationRecord[]): string {
  const kw = formatKw(station.potencia_max_kw);
  if (others.length === 0) return `, con una potencia máxima de ${kw} kW`;
  const maxOther = Math.max(...others.map((o) => o.potencia_max_kw));
  if (station.potencia_max_kw > maxOther) return ` y es el más potente del municipio, con ${kw} kW`;
  if (station.potencia_max_kw === maxOther) return ` y comparte la mayor potencia del municipio, ${kw} kW`;
  return ` y ofrece ${kw} kW; el más potente del municipio es de ${formatKw(maxOther)} kW`;
}

function insightsFastSentence(all: StationRecord[]): string {
  const fast = all.filter((s) => s.potencia_max_kw >= FAST_CHARGE_MIN_KW).length;
  const threshold = `≥ ${FAST_CHARGE_MIN_KW} kW`;
  if (fast === 0) return `En el municipio no hay ningún punto de carga rápida (${threshold})`;
  if (fast === 1) return `En el municipio hay 1 punto de carga rápida (${threshold})`;
  return `En el municipio hay ${fast} puntos de carga rápida (${threshold})`;
}

/** Tipos de conector del punto sin repetir, sin el texto entre paréntesis ni los desconocidos. */
export function stationConnectorTypes(station: StationRecord): string[] {
  const types = station.conectores
    .map((raw) => raw.replace(/\s*\(.*\)\s*$/, '').trim())
    .filter((name) => name && name.toLowerCase() !== UNKNOWN_CONNECTOR);
  return Array.from(new Set(types));
}

function insightsJoinList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

// `conectores` son tipos sin repetir; el número de tomas está en `num_conectores`.
function insightsConnectorSentence(station: StationRecord): string {
  const count = station.num_conectores;
  if (count <= 0) return '';
  const noun = count === 1 ? 'conector' : 'conectores';
  const types = stationConnectorTypes(station);
  if (types.length === 0) return `Dispone de ${count} ${noun}`;
  return `Dispone de ${count} ${noun} (${insightsJoinList(types)})`;
}

/**
 * Párrafo propio de la ficha que compara el punto con el resto de su municipio.
 * `municipalityStations` es la lista de puntos del municipio (incluya o no al propio punto).
 */
export function stationSummary(station: StationRecord, municipalityStations: StationRecord[]): string {
  const others = municipalityStations.filter((s) => s.id !== station.id);
  const all = [station, ...others];
  const first = `${insightsCountSentence(all.length, formatMunicipalityName(station.municipio))}${insightsPowerSentence(station, others)}.`;
  const sentences = [first, `${insightsFastSentence(all)}.`];
  const connectors = insightsConnectorSentence(station);
  if (connectors) sentences.push(`${connectors}.`);
  return sentences.join(' ');
}
