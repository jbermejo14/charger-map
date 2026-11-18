import fs from 'node:fs';
import path from 'node:path';
import { getAllProvincias, getStationsByProvincia } from '../src/lib/data';
import {
  MAP_DATA_MAX_BYTES,
  MAP_DATA_PATH,
  buildMapPayload,
  provinceDataPath,
  toHomeStation,
} from '../src/lib/mapData';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BYTES_PER_MEGABYTE = 1024 * 1024;
const MEGABYTE_DECIMALS = 2;
const EXIT_CODE_ERROR = 1;

function prepararDatosWrite(publicPath: string, content: unknown): number {
  const file = path.join(PUBLIC_DIR, publicPath);
  const json = JSON.stringify(content);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json);
  return Buffer.byteLength(json);
}

function prepararDatosMain(): void {
  const provinces = getAllProvincias();
  const allStations = provinces.flatMap((province) => {
    const stations = getStationsByProvincia(province.slug).map(toHomeStation);
    prepararDatosWrite(provinceDataPath(province.slug), stations);
    return stations;
  });

  const mapBytes = prepararDatosWrite(MAP_DATA_PATH, buildMapPayload(allStations));
  if (mapBytes > MAP_DATA_MAX_BYTES) {
    throw new Error(`mapa.json pesa ${mapBytes} bytes y el máximo es ${MAP_DATA_MAX_BYTES}. Acorta las claves o quita campos de CompactMapPoint.`);
  }
  const megabytes = (mapBytes / BYTES_PER_MEGABYTE).toFixed(MEGABYTE_DECIMALS);
  console.log(`Datos preparados: ${allStations.length} puntos, ${provinces.length} provincias, mapa.json ${megabytes} MB.`);
}

try {
  prepararDatosMain();
} catch (err) {
  console.error('No se pudieron preparar los datos del mapa:', err);
  process.exit(EXIT_CODE_ERROR);
}
