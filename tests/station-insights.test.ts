import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { StationRecord } from '../src/lib/types';
import {
  distanceKm,
  formatMunicipalityName,
  SAME_SITE_MAX_KM,
  nearbyStations,
  stationDisplayTitle,
  stationSummary,
  NEARBY_LIMIT,
  NEARBY_MAX_KM,
} from '../src/lib/stationInsights';

const BASE_LAT = 38.19;
const BASE_LNG = -0.55;
const KM_PER_DEGREE_LAT = 111;

function makeStation(id: string, overrides: Partial<StationRecord> = {}): StationRecord {
  return {
    id,
    nombre: `E-A-SantaPola-${id}`,
    operador: 'Iberdrola',
    operador_original: 'IBERDROLA',
    comunidad: 'Comunitat Valenciana',
    provincia: 'Alicante',
    municipio: 'Santa Pola',
    direccion: '',
    codigo_postal: '',
    horario: '',
    lat: BASE_LAT,
    lng: BASE_LNG,
    potencia_max_kw: 22,
    num_conectores: 2,
    conectores: ['Tipo 2 (Mennekes)'],
    tipos_carga: ['AC'],
    slug: id,
    ...overrides,
  };
}

function atKm(id: string, km: number): StationRecord {
  return makeStation(id, { lat: BASE_LAT + km / KM_PER_DEGREE_LAT });
}

describe('distanceKm', () => {
  it('es cero entre el mismo punto y aproximada entre puntos separados', () => {
    assert.equal(distanceKm({ lat: 1, lng: 1 }, { lat: 1, lng: 1 }), 0);
    const km = distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    assert.ok(Math.abs(km - KM_PER_DEGREE_LAT) < 1);
  });
});

describe('nearbyStations', () => {
  const origin = makeStation('origin');

  it('ordena por distancia y excluye el propio punto', () => {
    const result = nearbyStations(origin, [atKm('far', 5), origin, atKm('near', 1)]);
    assert.deepEqual(result.map((r) => r.station.id), ['near', 'far']);
    assert.ok(result[0].km < result[1].km);
    assert.ok(Math.abs(result[0].km - 1) < 0.01);
    assert.ok(Math.abs(result[1].km - 5) < 0.01);
  });

  it('excluye los puntos del mismo emplazamiento (a 50 m o menos) y mantiene los de 100 m', () => {
    const candidates = [makeStation('same-site'), atKm('thirty-meters', 0.03), atKm('hundred-meters', 0.1)];
    assert.ok(0.03 <= SAME_SITE_MAX_KM && SAME_SITE_MAX_KM < 0.1);
    assert.deepEqual(nearbyStations(origin, candidates).map((r) => r.station.id), ['hundred-meters']);
  });

  it('respeta el radio máximo por defecto y el indicado', () => {
    const candidates = [atKm('in', NEARBY_MAX_KM - 1), atKm('out', NEARBY_MAX_KM + 1)];
    assert.deepEqual(nearbyStations(origin, candidates).map((r) => r.station.id), ['in']);
    assert.equal(nearbyStations(origin, candidates, { maxKm: NEARBY_MAX_KM + 5 }).length, 2);
  });

  it('respeta el límite por defecto y el indicado', () => {
    const candidates = Array.from({ length: NEARBY_LIMIT + 3 }, (_, i) => atKm(`c${i}`, (i + 1) / 2));
    assert.equal(nearbyStations(origin, candidates).length, NEARBY_LIMIT);
    assert.equal(nearbyStations(origin, candidates, { limit: 2 }).length, 2);
  });
});

describe('stationDisplayTitle', () => {
  it('incluye operador, municipio y kW enteros', () => {
    assert.equal(stationDisplayTitle(makeStation('a', { potencia_max_kw: 150 })), 'Punto de recarga Iberdrola en Santa Pola · 150 kW');
  });

  it('usa coma si los kW tienen decimales', () => {
    assert.equal(stationDisplayTitle(makeStation('a', { potencia_max_kw: 7.4 })), 'Punto de recarga Iberdrola en Santa Pola · 7,4 kW');
  });

  it('omite el operador si es genérico o está vacío', () => {
    const expected = 'Punto de recarga en Santa Pola · 22 kW';
    for (const operador of ['Desconocido', 'Otros', '', '  ']) {
      assert.equal(stationDisplayTitle(makeStation('a', { operador })), expected);
    }
  });
});

describe('stationSummary', () => {
  it('describe el único punto del municipio', () => {
    const only = makeStation('a', { potencia_max_kw: 7.4 });
    const text = stationSummary(only, [only]);
    assert.match(text, /Es el único punto de recarga público registrado en Santa Pola/);
    assert.match(text, /7,4 kW/);
    assert.match(text, /no hay ningún punto de carga rápida/);
    assert.match(text, /Santa Pola, con una potencia máxima de 7,4 kW\./);
    assert.match(text, /Dispone de 2 conectores \(Tipo 2\)\./);
  });

  it('indica que es el más potente del municipio', () => {
    const top = makeStation('top', { potencia_max_kw: 150 });
    const text = stationSummary(top, [top, makeStation('b'), makeStation('c')]);
    assert.match(text, /Es uno de los 3 puntos de recarga públicos de Santa Pola/);
    assert.match(text, /es el más potente del municipio, con 150 kW/);
  });

  it('en el caso general cita la mayor potencia y cuenta la carga rápida', () => {
    const mine = makeStation('mine', { num_conectores: 3, conectores: ['CCS2 (Combo)', 'Tipo 2 (Mennekes)', 'desconocido'] });
    const fast = makeStation('fast', { potencia_max_kw: 150 });
    const mid = makeStation('mid', { potencia_max_kw: 50 });
    const text = stationSummary(mine, [mine, fast, mid]);
    assert.match(text, /el más potente del municipio es de 150 kW/);
    assert.match(text, /hay 2 puntos de carga rápida \(≥ 50 kW\)/);
    assert.match(text, /Dispone de 3 conectores \(CCS2 y Tipo 2\)/);
    assert.doesNotMatch(text, /desconocido/);
  });

  it('indica el empate en la mayor potencia', () => {
    const mine = makeStation('mine', { potencia_max_kw: 50 });
    const text = stationSummary(mine, [mine, makeStation('b', { potencia_max_kw: 50 })]);
    assert.match(text, /comparte la mayor potencia del municipio, 50 kW/);
  });

  it('trata los conectores desconocidos y el caso sin tomas', () => {
    const unknown = makeStation('u', { num_conectores: 1, conectores: ['desconocido'] });
    assert.match(stationSummary(unknown, [unknown]), /Dispone de 1 conector.$/);
    const none = makeStation('n', { num_conectores: 0, conectores: [] });
    assert.doesNotMatch(stationSummary(none, [none]), /Dispone/);
  });

  it('muestra el municipio en orden natural', () => {
    const mine = makeStation('m', { municipio: 'Llacuna, La' });
    assert.match(stationSummary(mine, [mine]), /registrado en La Llacuna,/);
  });

  it('en un municipio sin carga rápida lo dice', () => {
    const mine = makeStation('mine');
    assert.match(stationSummary(mine, [mine, makeStation('b')]), /no hay ningún punto de carga rápida/);
  });
});

describe('formatMunicipalityName', () => {
  const cases: Array<[string, string]> = [
    ['Llacuna, La', 'La Llacuna'],
    ['Barco de Ávila, El', 'El Barco de Ávila'],
    ["Hospitalet de Llobregat, L'", "L'Hospitalet de Llobregat"],
    ['Orxa, l´/Lorcha', 'L´Orxa/Lorcha'],
    ['Alqueries, les/Alquerías del Niño Perdido', 'Les Alqueries/Alquerías del Niño Perdido'],
    ['Pobla, Sa', 'Sa Pobla'],
    ['Mercadal, Es', 'Es Mercadal'],
    ['Salines, Ses', 'Ses Salines'],
    ['Pino, O', 'O Pino'],
    ['Vila Joiosa, la/Villajoyosa', 'La Vila Joiosa/Villajoyosa'],
    ['Castell d´Aro, Platja d´Aro i s´Agaró', 'Castell d´Aro, Platja d´Aro i s´Agaró'],
    ['Alacant/Alicante', 'Alacant/Alicante'],
  ];
  for (const [input, expected] of cases) {
    it(`${input} -> ${expected}`, () => {
      assert.equal(formatMunicipalityName(input), expected);
    });
  }
});
