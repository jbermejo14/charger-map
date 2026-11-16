import fs from 'node:fs';
import path from 'node:path';
import type { GlobalSummary, ProvinciaSummary, StationRecord } from './types';
import { slugify, parseStationSlug } from './slugs';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const SUMMARY_PATH = path.join(DATA_DIR, 'summary.json');
const PROVINCIAS_DIR = path.join(DATA_DIR, 'provincias');

let cachedSummary: GlobalSummary | null = null;
const cachedProvinciasStations = new Map<string, StationRecord[]>();

export function getGlobalSummary(): GlobalSummary {
  if (cachedSummary) return cachedSummary;
  if (!fs.existsSync(SUMMARY_PATH)) {
    throw new Error('No se encontró summary.json. Ejecuta npm run import-chargers.');
  }
  const content = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  cachedSummary = JSON.parse(content) as GlobalSummary;
  return cachedSummary;
}

export function getAllProvincias(): ProvinciaSummary[] {
  return getGlobalSummary().provincias;
}

export function getProvinciaBySlug(slug: string): ProvinciaSummary | null {
  const summary = getGlobalSummary();
  return summary.provincias.find((p) => p.slug === slug) || null;
}

export function getStationsByProvincia(provinciaSlug: string): StationRecord[] {
  if (cachedProvinciasStations.has(provinciaSlug)) {
    return cachedProvinciasStations.get(provinciaSlug)!;
  }

  const filePath = path.join(PROVINCIAS_DIR, `${provinciaSlug}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const stations = JSON.parse(content) as StationRecord[];
  cachedProvinciasStations.set(provinciaSlug, stations);
  return stations;
}

export function getStationsByMunicipio(provinciaSlug: string, municipioSlug: string): StationRecord[] {
  const allStations = getStationsByProvincia(provinciaSlug);
  return allStations.filter((s) => slugify(s.municipio) === municipioSlug);
}

export function getStationById(id: string): StationRecord | null {
  // Buscar en todos los archivos de provincia si es necesario
  const summary = getGlobalSummary();
  for (const prov of summary.provincias) {
    const stations = getStationsByProvincia(prov.slug);
    const found = stations.find((s) => s.id === id);
    if (found) return found;
  }
  return null;
}

export function getStationBySlug(fullSlug: string): StationRecord | null {
  const parsed = parseStationSlug(fullSlug);
  if (!parsed) return null;
  return getStationById(parsed.id);
}

export function getOperatorBySlug(operatorSlug: string) {
  const summary = getGlobalSummary();
  return summary.operadores.find((op) => op.slug === operatorSlug) || null;
}

export function getAllStationSlugs(): { slug: string }[] {
  const summary = getGlobalSummary();
  const slugs: { slug: string }[] = [];

  for (const prov of summary.provincias) {
    const stations = getStationsByProvincia(prov.slug);
    for (const s of stations) {
      slugs.push({ slug: s.slug });
    }
  }

  return slugs;
}
