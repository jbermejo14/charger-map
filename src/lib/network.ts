import { existsSync, readFileSync } from 'node:fs';
import { BASE_PATH } from '@/lib/site';

const NETWORK_FILE_ENV = 'ODODEX_RED_ENLACES';
const SUPPORTED_NETWORK_VERSION = 1;

/** Enlace a una página de otra sección de la red de Ododex. */
export interface NetworkLink {
  seccion: string;
  texto: string;
  href: string;
}

/** Sección publicada de la red de Ododex. */
export interface NetworkSection {
  ruta: string;
  nombre: string;
  descripcion: string;
}

interface NetworkData {
  version: number;
  secciones: NetworkSection[];
  enlaces: Record<string, NetworkLink[]>;
}

let cachedNetwork: { filePath: string; data: NetworkData } | null = null;

function parseNetworkFile(filePath: string): NetworkData {
  let parsed: Partial<NetworkData>;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `El fichero de red de Ododex (${filePath}) no es un JSON válido: ${(error as Error).message}. Regénéralo con scripts/generar-red.mjs de ododex-sitio.`
    );
  }
  if (parsed?.version !== SUPPORTED_NETWORK_VERSION) {
    throw new Error(
      `El fichero de red de Ododex (${filePath}) tiene la versión ${String(parsed?.version)}; esta web solo admite la versión ${SUPPORTED_NETWORK_VERSION}.`
    );
  }
  if (!Array.isArray(parsed.secciones) || typeof parsed.enlaces !== 'object' || parsed.enlaces === null) {
    throw new Error(
      `El fichero de red de Ododex (${filePath}) no contiene "secciones" (lista) y "enlaces" (objeto).`
    );
  }
  return parsed as NetworkData;
}

function loadNetwork(): NetworkData | null {
  const filePath = process.env[NETWORK_FILE_ENV];
  if (!filePath || !existsSync(filePath)) return null;
  if (cachedNetwork?.filePath === filePath) return cachedNetwork.data;
  const data = parseNetworkFile(filePath);
  cachedNetwork = { filePath, data };
  return data;
}

/** Clave de red de una provincia: ruta desde la raíz del dominio, sin barra final. */
export function provinceNetworkKey(provinceSlug: string): string {
  return `${BASE_PATH}/provincia/${provinceSlug}`;
}

/** Clave de red de un municipio: ruta desde la raíz del dominio, sin barra final. */
export function municipalityNetworkKey(provinceSlug: string, municipalitySlug: string): string {
  return `${BASE_PATH}/provincia/${provinceSlug}/${municipalitySlug}`;
}

/**
 * Enlaces a otras secciones de Ododex para una página. La clave es la ruta desde la raíz
 * del dominio sin barra final. Devuelve [] si no hay red configurada o la ruta no tiene enlaces.
 * Lanza Error si el fichero de ODODEX_RED_ENLACES existe pero es inválido.
 */
export function getNetworkLinks(routeKey: string): NetworkLink[] {
  return loadNetwork()?.enlaces[routeKey] ?? [];
}

/** Secciones de la red excluyendo la propia. Devuelve [] si no hay red configurada. */
export function getNetworkSections(): NetworkSection[] {
  return (loadNetwork()?.secciones ?? []).filter((section) => section.ruta !== BASE_PATH);
}
