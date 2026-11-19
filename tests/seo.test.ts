import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGlobalSummary } from '../src/lib/data';
import {
  CALCULATOR_META_DESCRIPTION,
  CALCULATOR_META_TITLE,
  HOME_META_TITLE,
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_KNOWN_ACRONYMS,
  SEO_SHORT_ACRONYM_MAX_LETTERS,
  SEO_TITLE_HARD_MAX,
  SEO_TITLE_SUFFIX_LENGTH,
  SEO_TITLE_TARGET,
  homeJsonLd,
  homeMetaDescription,
  operatorMetaDescription,
  operatorMetaTitle,
  readableOperatorName,
  truncateAtWord,
} from '../src/lib/seo';

const ENTIRELY_UPPERCASE = /^[^\p{Ll}]*\p{Lu}[^\p{Ll}]*$/u;
const NON_LETTERS = /[^\p{L}]/gu;

// Palabra en mayúsculas de más de 4 letras que no es una sigla de la lista explícita.
function isShoutedWord(word: string): boolean {
  const letters = word.replace(NON_LETTERS, '');
  const isAllowed = letters.length <= SEO_SHORT_ACRONYM_MAX_LETTERS || SEO_KNOWN_ACRONYMS.has(letters);
  return ENTIRELY_UPPERCASE.test(word) && !isAllowed;
}

test('readableOperatorName: pasa a tipo título y mantiene partículas en minúscula', () => {
  assert.equal(readableOperatorName('AJUNTAMENT DE SANTA MARIA DEL CAMI'), 'Ajuntament de Santa Maria del Cami');
  assert.equal(readableOperatorName("AJUNTAMENT D'INCA"), "Ajuntament d'Inca");
  assert.equal(readableOperatorName('CHARG-ELECTRA SPAIN'), 'Charg-Electra Spain');
  assert.equal(readableOperatorName('ENERGEA CONSULTING Y ASESORES'), 'Energea Consulting y Asesores');
  assert.equal(readableOperatorName('ESTACION SERVICIO JAIME I.'), 'Estacion Servicio Jaime I');
  assert.equal(readableOperatorName('AJUNTAMENT DES CASTELL'), 'Ajuntament des Castell');
});

test('readableOperatorName: respeta siglas, palabras sin vocales y dígitos', () => {
  assert.equal(readableOperatorName('EDP'), 'EDP');
  assert.equal(readableOperatorName('ENDESA X'), 'Endesa X');
  assert.equal(readableOperatorName('INFRAESTRUCTURAS XYZ JV.'), 'Infraestructuras XYZ JV');
  assert.equal(readableOperatorName('ANARGO 2002'), 'Anargo 2002');
  assert.equal(readableOperatorName('ABB E-MOBILITY.'), 'ABB E-Mobility');
  assert.equal(readableOperatorName('AENA S.M.E..'), 'AENA S.M.E');
});

test('readableOperatorName: no toca nombres con minúsculas y quita puntos finales', () => {
  assert.equal(readableOperatorName('QWELLO España'), 'QWELLO España');
  assert.equal(readableOperatorName('Moeve (Cepsa)'), 'Moeve (Cepsa)');
  assert.equal(readableOperatorName('Emovili Fast.'), 'Emovili Fast');
});

test('truncateAtWord: no corta palabras y respeta el límite', () => {
  assert.equal(truncateAtWord('corto', 10), 'corto');
  const cut = truncateAtWord('Sociedad Cooperativa de Productores', 22);
  assert.equal(cut, 'Sociedad Cooperativa…');
  assert.equal(truncateAtWord('Consejo Insular de la Energía', 24), 'Consejo Insular…');
  assert.ok(cut.length <= 22);
});

test('operatorMetaTitle: elige el primer candidato que cabe antes de recortar', () => {
  assert.equal(operatorMetaTitle('Iberdrola', 12345), 'Puntos de recarga de Iberdrola (12.345)');
  assert.equal(
    operatorMetaTitle('AJUNTAMENT DE SANTA MARIA DEL CAMI', 6),
    'Ajuntament de Santa Maria del Cami: 6 puntos de recarga',
  );
  assert.equal(
    operatorMetaTitle('Consejo Insular de la Energía de Gran Canaria', 47),
    'Consejo Insular de la Energía de Gran Canaria',
  );
});

test('operatorMetaTitle: recorta por palabras solo si ni el nombre solo cabe', () => {
  const title = operatorMetaTitle('SOCIEDAD COOPERATIVA DE PRODUCTORES TAXISTAS DE LAS PALMAS DE GRAN CANARIA', 1);
  assert.equal(title, 'Puntos de recarga de Sociedad Cooperativa… (1)');
});

test('operatorMetaDescription: singular para un único punto', () => {
  assert.ok(operatorMetaDescription('Tesla', 1).includes('1 punto de recarga de Tesla'));
});

test('todos los operadores reales: título <= 65 con sufijo, descripción 120-160, nombre legible', () => {
  const { operadores } = getGlobalSummary();
  assert.ok(operadores.length > 0);
  for (const op of operadores) {
    const title = operatorMetaTitle(op.operador, op.total_puntos);
    assert.ok(title.length + SEO_TITLE_SUFFIX_LENGTH <= SEO_TITLE_HARD_MAX, `${title} (${title.length})`);
    const description = operatorMetaDescription(op.operador, op.total_puntos);
    assert.ok(
      description.length >= SEO_DESCRIPTION_MIN && description.length <= SEO_DESCRIPTION_MAX,
      `${description} (${description.length})`,
    );
    const readable = readableOperatorName(op.operador);
    const shouted = ENTIRELY_UPPERCASE.test(readable) ? readable.split(' ').filter(isShoutedWord) : [];
    assert.deepEqual(shouted, [], `Nombre entero en mayúsculas: ${readable}`);
  }
});

test('portada y calculadora: títulos <= 60 con sufijo y descripciones 120-160', () => {
  for (const title of [HOME_META_TITLE, CALCULATOR_META_TITLE]) {
    assert.ok(title.length + SEO_TITLE_SUFFIX_LENGTH <= SEO_TITLE_TARGET, title);
  }
  for (const description of [homeMetaDescription(getGlobalSummary().metadata.total_estaciones), CALCULATOR_META_DESCRIPTION]) {
    assert.ok(description.length >= SEO_DESCRIPTION_MIN && description.length <= SEO_DESCRIPTION_MAX, description);
  }
});

test('homeMetaDescription: redondea a la baja a millares y omite la cifra si es menor de mil', () => {
  assert.ok(homeMetaDescription(12999).includes('más de 12.000 puntos'));
  assert.ok(!homeMetaDescription(999).includes('más de'));
});

test('homeJsonLd: WebApplication con la URL de la portada y sin BreadcrumbList', () => {
  const ld = homeJsonLd('Descripción de prueba');
  assert.equal(ld['@context'], 'https://schema.org');
  assert.equal(ld['@type'], 'WebApplication');
  assert.match(String(ld.url), /\/es\/puntos-recarga$/);
  assert.equal(ld.inLanguage, 'es');
  assert.equal(ld.description, 'Descripción de prueba');
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(ld)));
});
