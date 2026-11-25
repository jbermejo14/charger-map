import type { ProvinciaSummary, StationRecord } from './types';
import {
  fitDescription,
  isSamePlace,
  joinSentences,
  pickTitle,
  readableOperatorName,
  seoFormatCount,
  shortPlaceName,
} from './seo';
import {
  formatKw,
  formatMunicipalityName,
  stationConnectorTypes,
  stationHasOperator,
} from './stationInsights';

const FILLER_OFFICIAL_DATA = 'Datos del registro oficial RIPREE.';
const FILLER_MAP = 'Consulta el mapa y cómo llegar.';
const FILLER_COMPARE = 'Compara potencias, conectores y operadores.';
const AREA_FILLERS = [FILLER_OFFICIAL_DATA, FILLER_MAP, FILLER_COMPARE];
const STATION_FILLERS = [FILLER_OFFICIAL_DATA, FILLER_MAP];
const PAGE_WHITESPACE = /\s+/g;
const MAIN_OPERATORS_SHOWN = 3;
const FAST_RANGE_LABEL = '50-100 kW';
const ULTRA_LABEL = '>100 kW';

function pageCountPoints(count: number): string {
  return count === 1 ? '1 punto de recarga' : `${seoFormatCount(count)} puntos de recarga`;
}

function pageCountMunicipalities(count: number): string {
  return count === 1 ? '1 municipio' : `${seoFormatCount(count)} municipios`;
}

function pageJoinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/** "Valencia (Valencia)" sobra: si municipio y provincia coinciden solo se escribe el nombre. */
function pageWithProvince(place: string, province: string): string {
  return isSamePlace(place, province) ? place : `${place} (${province})`;
}

function pageOperatorNames(operators: ReadonlyArray<{ operador: string }>, limit: number): string[] {
  return operators.slice(0, limit).map((op) => readableOperatorName(op.operador));
}

/** Título (sin sufijo del sitio) de la página de una provincia. Lanza un error si ninguna variante cabe. */
export function provinceMetaTitle(rawProvince: string): string {
  const province = formatMunicipalityName(rawProvince);
  const short = shortPlaceName(province);
  return pickTitle([`Puntos de recarga en ${province}`], [`Puntos de recarga en ${short}`], [`Recarga en ${short}`]);
}

function pageFastPhrase(province: ProvinciaSummary): string {
  const ultra = `${seoFormatCount(province.potencia_ultra)} ultrarrápidos (${ULTRA_LABEL})`;
  const fast = `${seoFormatCount(province.potencia_rapida)} rápidos (${FAST_RANGE_LABEL})`;
  return `${ultra} y ${fast}`;
}

function pageMainOperatorsSentence(province: ProvinciaSummary, limit: number): string | false {
  const names = pageOperatorNames(province.operadores_principales, limit);
  if (names.length === 0) return false;
  const label = names.length === 1 ? 'Operador principal' : 'Operadores principales';
  return `${label}: ${pageJoinList(names)}.`;
}

/** Descripción (120-160 caracteres) de la página de una provincia, con los datos de su resumen. */
export function provinceMetaDescription(province: ProvinciaSummary): string {
  const name = formatMunicipalityName(province.provincia);
  const short = shortPlaceName(name);
  const points = pageCountPoints(province.total_puntos);
  const head = `${points} en ${name}: ${pageFastPhrase(province)}, en ${pageCountMunicipalities(province.municipios.length)}.`;
  const shortHead = `${points} en ${short}: ${pageFastPhrase(province)}.`;
  return fitDescription(
    [
      joinSentences(head, pageMainOperatorsSentence(province, MAIN_OPERATORS_SHOWN)),
      joinSentences(head, pageMainOperatorsSentence(province, 2)),
      joinSentences(head, pageMainOperatorsSentence(province, 1)),
      head,
      shortHead,
    ],
    AREA_FILLERS,
  );
}

/** Título (sin sufijo del sitio) de la página de un municipio. Lanza un error si ninguna variante cabe. */
export function municipalityMetaTitle(municipality: string, province: string): string {
  const name = formatMunicipalityName(municipality);
  const short = shortPlaceName(name);
  const shortProvince = shortPlaceName(formatMunicipalityName(province));
  const keyword = 'Puntos de recarga en';
  return pickTitle(
    [`${keyword} ${pageWithProvince(name, shortProvince)}`, `${keyword} ${name}`],
    [`${keyword} ${pageWithProvince(short, shortProvince)}`, `${keyword} ${short}`],
    [`Recarga en ${short}`],
  );
}

export interface MunicipalityMetaInput {
  municipality: string;
  province: string;
  stations: readonly StationRecord[];
}

function pageOperatorCounts(stations: readonly StationRecord[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const station of stations) {
    const name = readableOperatorName(station.operador);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
}

function pageMunicipalityOperatorsPhrase(stations: readonly StationRecord[], withTop: boolean): string | false {
  const operators = pageOperatorCounts(stations);
  if (operators.length === 0) return false;
  if (operators.length === 1) return `un único operador, ${operators[0].name}`;
  const base = `${operators.length} operadores`;
  return withTop ? `${base}, con ${operators[0].name} a la cabeza` : base;
}

function pageMunicipalityBody(input: MunicipalityMetaInput, withTop: boolean): string {
  const maxKw = Math.max(...input.stations.map((s) => s.potencia_max_kw));
  const operators = pageMunicipalityOperatorsPhrase(input.stations, withTop);
  const power = `potencia máxima de ${formatKw(maxKw)} kW`;
  return operators ? `${power} y ${operators}.` : `${power}.`;
}

/** Descripción (120-160 caracteres) de la página de un municipio. Lanza un error si no hay puntos. */
export function municipalityMetaDescription(input: MunicipalityMetaInput): string {
  if (input.stations.length === 0) {
    throw new Error(`El municipio ${input.municipality} no tiene puntos: no se puede describir.`);
  }
  const name = formatMunicipalityName(input.municipality);
  const short = shortPlaceName(name);
  const province = formatMunicipalityName(input.province);
  const shortProvince = shortPlaceName(province);
  const points = pageCountPoints(input.stations.length);
  const head = (place: string) => `${points} en ${place}:`;
  return fitDescription(
    [
      `${head(pageWithProvince(name, province))} ${pageMunicipalityBody(input, true)}`,
      `${head(pageWithProvince(name, province))} ${pageMunicipalityBody(input, false)}`,
      `${head(pageWithProvince(short, shortProvince))} ${pageMunicipalityBody(input, false)}`,
      `${head(short)} ${pageMunicipalityBody(input, false)}`,
    ],
    AREA_FILLERS,
  );
}

function pageStationOperatorPart(station: StationRecord): string {
  return stationHasOperator(station.operador) ? ` ${readableOperatorName(station.operador)}` : '';
}

/** Título (sin sufijo del sitio) de la ficha de un punto. Lanza un error si ninguna variante cabe. */
export function stationMetaTitle(station: StationRecord): string {
  const operator = pageStationOperatorPart(station);
  const municipality = formatMunicipalityName(station.municipio);
  const short = shortPlaceName(municipality);
  const kw = `${formatKw(station.potencia_max_kw)} kW`;
  const keyword = 'Punto de recarga';
  return pickTitle(
    [`${keyword}${operator} en ${municipality} · ${kw}`, `${keyword}${operator} en ${municipality}`],
    [`${keyword} en ${municipality} · ${kw}`, `${keyword} en ${municipality}`],
    [`${keyword} en ${short} · ${kw}`, `${keyword} en ${short}`],
    [`${keyword} ${short}`],
    [`Recarga en ${short}`],
  );
}

function pageConnectorsPhrase(station: StationRecord, withTypes: boolean): string | false {
  const count = station.num_conectores;
  if (count <= 0) return false;
  const noun = count === 1 ? 'conector' : 'conectores';
  const types = stationConnectorTypes(station);
  if (!withTypes || types.length === 0) return `${count} ${noun}`;
  return `${count} ${noun} (${pageJoinList(types)})`;
}

function pageStationPower(station: StationRecord, connectors: string | false): string {
  const power = `${formatKw(station.potencia_max_kw)} kW de potencia máxima`;
  return connectors ? `${power} y ${connectors}.` : `${power}.`;
}

function pageStationName(station: StationRecord): string {
  return station.nombre.replace(PAGE_WHITESPACE, ' ').trim();
}

/**
 * Descripción (120-160 caracteres) de la ficha de un punto, con su nombre, operador, potencia y conectores.
 * El nombre va siempre: es lo que distingue a puntos del mismo operador, lugar y potencia. Si ni así cabe,
 * la última variante añade la referencia del registro.
 */
export function stationMetaDescription(station: StationRecord): string {
  const operatorBare = pageStationOperatorPart(station);
  const operator = operatorBare ? ` (${operatorBare.trim()})` : '';
  const municipality = formatMunicipalityName(station.municipio);
  const province = formatMunicipalityName(station.provincia);
  const place = pageWithProvince(municipality, province);
  const shortPlace = pageWithProvince(shortPlaceName(municipality), shortPlaceName(province));
  const name = pageStationName(station);
  const head = (where: string) => `Punto de recarga ${name}${operator} en ${where}:`;
  const full = pageStationPower(station, pageConnectorsPhrase(station, true));
  const plain = pageStationPower(station, pageConnectorsPhrase(station, false));
  return fitDescription(
    [
      `${head(place)} ${full}`,
      `${head(place)} ${plain}`,
      `${head(shortPlace)} ${plain}`,
      `Punto de recarga ${name} en ${shortPlace}: ${plain}`,
      `Punto de recarga${operatorBare} en ${shortPlace}: ${plain} Ref. ${station.id}.`,
      `Punto de recarga en ${shortPlace}: ${plain} Ref. ${station.id}.`,
    ],
    STATION_FILLERS,
  );
}
