import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getGlobalSummary, getStationsByProvincia } from '../src/lib/data';
import {
  municipalityMetaDescription,
  municipalityMetaTitle,
  provinceMetaDescription,
  provinceMetaTitle,
  stationMetaDescription,
  stationMetaTitle,
} from '../src/lib/pageSeoText';
import {
  CALCULATOR_META_DESCRIPTION,
  CALCULATOR_META_TITLE,
  HOME_META_TITLE,
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_TITLE_HARD_MAX,
  SEO_TITLE_SUFFIX_LENGTH,
  SEO_TITLE_TARGET,
  fitDescription,
  homeMetaDescription,
  operatorMetaDescription,
  operatorMetaTitle,
  pickTitle,
} from '../src/lib/seo';
import { SITE_NAME } from '../src/lib/site';
import { slugify } from '../src/lib/slugs';
import type { StationRecord } from '../src/lib/types';

const SINGULAR_WITH_PLURAL_NOUN = /\b1 (puntos|municipios|conectores|operadores)\b/;
const KEYWORD_START = /^(Puntos de recarga|Punto de recarga|Recarga)/;
const AREA_AND_STATION_PAGE = /^\/(provincia|punto)\//;
const TITLE_TARGET_BODY = SEO_TITLE_TARGET - SEO_TITLE_SUFFIX_LENGTH;
const TITLE_BODY_ABOVE_TARGET = 3;

interface PageSeo {
  page: string;
  title: string;
  description: string;
}

function makeStation(overrides: Partial<StationRecord> = {}): StationRecord {
  return {
    id: '1',
    nombre: 'Estación de prueba',
    operador: 'Iberdrola',
    operador_original: 'IBERDROLA CLIENTES S.A.U',
    comunidad: 'Comunidad Valenciana',
    provincia: 'Alicante/Alacant',
    municipio: 'Santa Pola',
    direccion: 'Calle Mayor 1',
    codigo_postal: '03130',
    horario: '24 horas',
    lat: 38.19,
    lng: -0.55,
    potencia_max_kw: 22,
    num_conectores: 2,
    conectores: ['Tipo 2 (Mennekes)'],
    tipos_carga: ['AC'],
    slug: '1-estacion-de-prueba',
    ...overrides,
  };
}

function collectProvincePages(): PageSeo[] {
  return getGlobalSummary().provincias.map((province) => ({
    page: `/provincia/${province.slug}`,
    title: provinceMetaTitle(province.provincia),
    description: provinceMetaDescription(province),
  }));
}

function groupByMunicipality(stations: StationRecord[]): Map<string, StationRecord[]> {
  const groups = new Map<string, StationRecord[]>();
  for (const station of stations) {
    const key = slugify(station.municipio);
    groups.set(key, [...(groups.get(key) ?? []), station]);
  }
  return groups;
}

function collectMunicipalityAndStationPages(): PageSeo[] {
  const pages: PageSeo[] = [];
  for (const province of getGlobalSummary().provincias) {
    const stations = getStationsByProvincia(province.slug);
    const groups = groupByMunicipality(stations);
    for (const municipality of province.municipios) {
      pages.push({
        page: `/provincia/${province.slug}/${municipality.slug}`,
        title: municipalityMetaTitle(municipality.municipio, province.provincia),
        description: municipalityMetaDescription({
          municipality: municipality.municipio,
          province: province.provincia,
          stations: groups.get(municipality.slug) ?? [],
        }),
      });
    }
    for (const station of stations) {
      pages.push({
        page: `/punto/${station.slug}`,
        title: stationMetaTitle(station),
        description: stationMetaDescription(station),
      });
    }
  }
  return pages;
}

function collectOperatorAndFixedPages(): PageSeo[] {
  const summary = getGlobalSummary();
  const pages: PageSeo[] = summary.operadores.map((op) => ({
    page: `/operador/${op.slug}`,
    title: operatorMetaTitle(op.operador, op.total_puntos),
    description: operatorMetaDescription(op.operador, op.total_puntos),
  }));
  pages.push({ page: '/', title: HOME_META_TITLE, description: homeMetaDescription(summary.metadata.total_estaciones) });
  pages.push({ page: '/calculadora', title: CALCULATOR_META_TITLE, description: CALCULATOR_META_DESCRIPTION });
  return pages;
}

describe('pickTitle y fitDescription', () => {
  it('pickTitle prefiere la variante de 60 caracteres y acepta hasta 65 dentro del mismo nivel', () => {
    const above = 'a'.repeat(TITLE_TARGET_BODY + TITLE_BODY_ABOVE_TARGET);
    const within = 'b'.repeat(TITLE_TARGET_BODY);
    assert.equal(pickTitle([above, within]), within);
    assert.equal(pickTitle([above]), above);
  });

  it('pickTitle pasa al nivel siguiente si no cabe y lanza un error si no queda ninguno', () => {
    const tooLong = 'a'.repeat(SEO_TITLE_HARD_MAX);
    assert.equal(pickTitle([tooLong], ['corto']), 'corto');
    assert.throws(() => pickTitle([tooLong], [tooLong]), /Ninguna variante de título/);
  });

  it('fitDescription rellena hasta 120 y lanza un error si ninguna variante queda en rango', () => {
    const base = 'x'.repeat(SEO_DESCRIPTION_MIN - 20);
    const filled = fitDescription([base], ['Frase de relleno que añade veinte.']);
    assert.ok(filled.length >= SEO_DESCRIPTION_MIN && filled.length <= SEO_DESCRIPTION_MAX);
    assert.throws(() => fitDescription(['y'.repeat(SEO_DESCRIPTION_MAX + 1)], []), /Ninguna variante de descripción/);
    assert.throws(() => fitDescription(['corta'], []), /Ninguna variante de descripción/);
  });
});

describe('títulos y descripciones de provincia, municipio y punto', () => {
  it('provincia: nombre natural y singular cuando hay un punto', () => {
    assert.equal(provinceMetaTitle('Palmas, Las'), 'Puntos de recarga en Las Palmas');
    assert.equal(provinceMetaTitle('Santa Cruz de Tenerife'), 'Puntos de recarga en Santa Cruz de Tenerife');
    const description = provinceMetaDescription({
      provincia: 'Melilla',
      slug: 'melilla',
      comunidad: 'Melilla',
      total_puntos: 1,
      potencia_ultra: 0,
      potencia_rapida: 1,
      potencia_normal: 0,
      conectores: {},
      operadores_principales: [{ operador: 'Iberdrola', slug: 'iberdrola', count: 1 }],
      municipios: [{ municipio: 'Melilla', slug: 'melilla', count: 1 }],
    });
    assert.ok(description.startsWith('1 punto de recarga en Melilla'), description);
    assert.ok(description.includes('1 municipio.'), description);
    assert.ok(description.includes('Operador principal: Iberdrola.'), description);
  });

  it('municipio: provincia solo si no coincide y nombre corto cuando el largo no cabe', () => {
    assert.equal(municipalityMetaTitle('Vegas del Genil', 'Granada'), 'Puntos de recarga en Vegas del Genil (Granada)');
    assert.equal(municipalityMetaTitle('Madrid', 'Madrid'), 'Puntos de recarga en Madrid');
    assert.equal(
      municipalityMetaTitle('Sant Vicent del Raspeig/San Vicente del Raspeig', 'Alicante/Alacant'),
      'Puntos de recarga en Sant Vicent del Raspeig',
    );
    assert.equal(
      municipalityMetaTitle('Villarcayo de Merindad de Castilla la Vieja', 'Burgos'),
      'Recarga en Villarcayo de Merindad de Castilla la Vieja',
    );
  });

  it('municipio sin puntos lanza un error', () => {
    assert.throws(
      () => municipalityMetaDescription({ municipality: 'Vacío', province: 'Soria', stations: [] }),
      /no tiene puntos/,
    );
  });

  it('punto: palabra clave al principio y recorte progresivo', () => {
    assert.equal(stationMetaTitle(makeStation()), 'Punto de recarga Iberdrola en Santa Pola · 22 kW');
    const long = makeStation({ operador: 'Operador con un nombre larguísimo S.L.', municipio: 'Barco de Ávila, El' });
    assert.equal(stationMetaTitle(long), 'Punto de recarga en El Barco de Ávila · 22 kW');
    const longest = makeStation({ municipio: 'Villarcayo de Merindad de Castilla la Vieja' });
    assert.equal(stationMetaTitle(longest), 'Recarga en Villarcayo de Merindad de Castilla la Vieja');
  });

  it('punto: la descripción lleva nombre, operador, potencia y conectores con la concordancia correcta', () => {
    const one = stationMetaDescription(makeStation({ num_conectores: 1 }));
    assert.ok(one.includes('Punto de recarga Estación de prueba (Iberdrola) en Santa Pola (Alicante/Alacant)'), one);
    assert.ok(one.includes('22 kW de potencia máxima y 1 conector (Tipo 2)'), one);
    assert.ok(stationMetaDescription(makeStation({ num_conectores: 3 })).includes('3 conectores (Tipo 2)'));
  });
});

describe('todas las páginas generables con los datos reales', () => {
  const pages = [...collectProvincePages(), ...collectMunicipalityAndStationPages(), ...collectOperatorAndFixedPages()];

  it('cubre portada, calculadora, provincias, municipios, operadores y fichas', () => {
    const summary = getGlobalSummary();
    const municipalities = summary.provincias.reduce((total, p) => total + p.municipios.length, 0);
    const stations = summary.provincias.reduce((total, p) => total + p.total_puntos, 0);
    const expected = 2 + summary.provincias.length + municipalities + summary.operadores.length + stations;
    assert.equal(pages.length, expected);
  });

  it('título completo de 65 caracteres o menos, sin marca repetida ni truncado', () => {
    for (const { page, title } of pages) {
      assert.ok(title.length + SEO_TITLE_SUFFIX_LENGTH <= SEO_TITLE_HARD_MAX, `${page}: ${title} (${title.length})`);
      assert.ok(!title.includes(SITE_NAME), `${page}: marca repetida en "${title}"`);
      assert.ok(!title.includes('…') || page.startsWith('/operador/'), `${page}: título truncado "${title}"`);
    }
  });

  it('los títulos de provincia, municipio y punto empiezan por la palabra clave', () => {
    for (const { page, title } of pages.filter((p) => AREA_AND_STATION_PAGE.test(p.page))) {
      assert.match(title, KEYWORD_START, `${page}: ${title}`);
    }
  });

  it('descripción de 120 a 160 caracteres y concordancia de número', () => {
    for (const { page, description } of pages) {
      assert.ok(
        description.length >= SEO_DESCRIPTION_MIN && description.length <= SEO_DESCRIPTION_MAX,
        `${page}: ${description} (${description.length})`,
      );
      assert.ok(!SINGULAR_WITH_PLURAL_NOUN.test(description), `${page}: concordancia en "${description}"`);
    }
  });

  it('las descripciones son únicas entre todas las páginas indexables', () => {
    const seen = new Map<string, string>();
    for (const { page, description } of pages) {
      const previous = seen.get(description);
      assert.equal(previous, undefined, `${page} repite la descripción de ${previous}: ${description}`);
      seen.set(description, page);
    }
  });
});
