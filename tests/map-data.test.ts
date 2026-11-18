import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAllProvincias, getStationsByProvincia } from '../src/lib/data';
import {
  MAP_DATA_MAX_BYTES,
  MAP_DATA_PATH,
  buildMapPayload,
  parseMapPayload,
  provinceDataPath,
  toHomeStation,
  toMapPoint,
  type HomeStation,
  type MapPayload,
} from '../src/lib/mapData';
import { assetPath } from '../src/lib/site';

function mapDataStation(overrides: Partial<HomeStation>): HomeStation {
  return {
    id: 'A1',
    slug: 'a1-punto-uno',
    nombre: 'Punto uno',
    operador: 'Iberdrola',
    provincia: 'Madrid',
    municipio: 'Getafe',
    direccion: 'Calle Mayor 1',
    lat: 40.123456789,
    lng: -3.987654321,
    potencia_max_kw: 50,
    conectores: ['CCS2 (Combo)'],
    tipos_carga: ['DC'],
    ...overrides,
  };
}

describe('mapa.json (src/lib/mapData.ts)', () => {
  const fixture = [
    mapDataStation({}),
    mapDataStation({ id: 'B2', slug: 'b2-punto-dos', operador: 'Repsol', provincia: 'Soria', potencia_max_kw: 7.4 }),
    mapDataStation({ id: 'C3', slug: 'c3-punto-tres' }),
  ];

  it('genera un elemento por punto con los campos esperados y coordenadas redondeadas', () => {
    const payload = buildMapPayload(fixture);
    assert.equal(payload.puntos.length, 3);
    assert.deepEqual(Object.keys(payload.puntos[0]), ['i', 's', 'la', 'ln', 'p', 'o', 'v']);
    assert.equal(payload.puntos[0].la, 40.12346);
    assert.equal(payload.puntos[0].ln, -3.98765);
    assert.equal(payload.puntos[1].p, 7.4);
  });

  it('guarda cada operador y provincia una sola vez', () => {
    const payload = buildMapPayload(fixture);
    assert.deepEqual(payload.operadores, ['Iberdrola', 'Repsol']);
    assert.deepEqual(payload.provincias, ['Madrid', 'Soria']);
    assert.equal(payload.puntos[2].o, payload.puntos[0].o);
  });

  it('parseMapPayload recupera operador y provincia de cada punto', () => {
    const points = parseMapPayload(buildMapPayload(fixture));
    assert.equal(points[1].operator, 'Repsol');
    assert.equal(points[1].province, 'Soria');
    assert.equal(points[1].slug, 'b2-punto-dos');
    assert.equal(points[1].powerKw, 7.4);
  });

  it('toMapPoint conserva id, slug, coordenadas y potencia', () => {
    assert.deepEqual(toMapPoint(fixture[0]), {
      id: 'A1',
      slug: 'a1-punto-uno',
      lat: fixture[0].lat,
      lng: fixture[0].lng,
      powerKw: 50,
      operator: 'Iberdrola',
      province: 'Madrid',
    });
  });

  it('las rutas de datos se piden con la ruta base', () => {
    assert.equal(assetPath(MAP_DATA_PATH), '/es/puntos-recarga/datos/mapa.json');
    assert.equal(assetPath(provinceDataPath('madrid')), '/es/puntos-recarga/datos/provincias/madrid.json');
  });

  it('con los datos reales pesa menos de 1,5 MB y no pierde puntos', () => {
    const stations = getAllProvincias().flatMap((province) => getStationsByProvincia(province.slug).map(toHomeStation));
    const payload = buildMapPayload(stations);
    const bytes = Buffer.byteLength(JSON.stringify(payload));
    assert.equal(payload.puntos.length, stations.length);
    assert.ok(bytes < MAP_DATA_MAX_BYTES, `mapa.json pesa ${bytes} bytes`);
  });

  it('parseMapPayload rechaza un operador inexistente con un mensaje accionable', () => {
    const payload = buildMapPayload(fixture);
    payload.puntos[1].o = 99;
    assert.throws(() => parseMapPayload(payload), /mapa.json corrupto: el punto 1 apunta a operador 99 inexistente. Ejecuta npm run preparar-datos./);
  });

  it('parseMapPayload rechaza una provincia inexistente', () => {
    const payload = buildMapPayload(fixture);
    payload.puntos[0].v = -1;
    assert.throws(() => parseMapPayload(payload), /el punto 0 apunta a provincia -1 inexistente/);
  });

  it('parseMapPayload rechaza un payload sin lista de puntos', () => {
    const payload = { operadores: [], provincias: [] } as unknown as MapPayload;
    assert.throws(() => parseMapPayload(payload), /mapa.json corrupto/);
  });
});
