import { SITE_NAME, absoluteUrl } from './site';

/** Longitud máxima admitida del título completo (con el sufijo del sitio). */
export const SEO_TITLE_HARD_MAX = 65;
/** Longitud a la que apuntan los títulos generados (con el sufijo del sitio). */
export const SEO_TITLE_TARGET = 60;
/** Longitud del sufijo " | Ododex" que añade la plantilla del layout. */
export const SEO_TITLE_SUFFIX_LENGTH = ` | ${SITE_NAME}`.length;
/** Longitud mínima de una descripción. */
export const SEO_DESCRIPTION_MIN = 120;
/** Longitud máxima de una descripción. */
export const SEO_DESCRIPTION_MAX = 160;
/** Un nombre de una sola palabra de esta longitud o menos que llega en mayúsculas se trata como sigla. */
export const SEO_SHORT_ACRONYM_MAX_LETTERS = 4;

/**
 * Siglas que se respetan en mayúsculas cuando el nombre llega entero en mayúsculas.
 * Además se respeta toda palabra sin vocales o con dígitos (X, JV, SL, H2PLT).
 */
export const SEO_KNOWN_ACRONYMS: ReadonlySet<string> = new Set(['EDP', 'BP', 'ABB', 'AENA']);

const SEO_TITLE_BODY_MAX = SEO_TITLE_TARGET - SEO_TITLE_SUFFIX_LENGTH;
const SEO_TITLE_PREFIX = 'Puntos de recarga de ';
const SEO_ELLIPSIS = '…';
const SEO_INITIALS = /^\p{Lu}(\.\p{Lu})+\.?$/u;
const SEO_PARTICLE_MAX_LETTERS = 3;
const SEO_TRAILING_DOTS = /\.+$/;
const SEO_LOWERCASE_LETTER = /\p{Ll}/u;
const SEO_NOT_LETTER_OR_DIGIT = /[^\p{L}\d]/gu;
const SEO_VOWEL = /[aeiouáéíóúàèìòùü]/i;
const SEO_DIGIT = /\d/;
const SEO_ELIDED_PREFIX = /^(d|l)(['´’])(.+)$/i;
const SEO_ROMAN_NUMERAL = /^(I{1,3}|IV)$/;
const SEO_THOUSAND = 1000;
const SEO_WHITESPACE = /\s+/;
// Cola corta para los nombres largos, que no dejan sitio a la larga.
const SEO_DESCRIPTION_TAIL_SHORT = 'en España: cobertura por provincia, potencia de cada punto y mapa de estaciones.';
const SEO_DESCRIPTION_TAIL_LONG = `${SEO_DESCRIPTION_TAIL_SHORT} Datos oficiales del censo RIPREE.`;
// Partículas que en un nombre en tipo título van en minúscula (salvo al principio).
const SEO_LOWERCASE_PARTICLES: ReadonlySet<string> = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'per', 'des', 'da', 'do', 'dos', 'das',
]);

function seoCapitalize(word: string): string {
  const lower = word.toLocaleLowerCase('es');
  return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
}

function seoKeepsUppercase(word: string): boolean {
  if (SEO_INITIALS.test(word)) return true;
  const letters = word.replace(SEO_NOT_LETTER_OR_DIGIT, '');
  if (SEO_KNOWN_ACRONYMS.has(letters)) return true;
  return SEO_DIGIT.test(letters) || !SEO_VOWEL.test(letters);
}

function seoTitleCaseWord(word: string, isFirst: boolean): string {
  const lower = word.toLocaleLowerCase('es');
  if (!isFirst && SEO_LOWERCASE_PARTICLES.has(lower)) return lower;
  if (SEO_ROMAN_NUMERAL.test(word.replace(SEO_NOT_LETTER_OR_DIGIT, ''))) return word;
  if (seoKeepsUppercase(word)) return word;
  const elided = SEO_ELIDED_PREFIX.exec(word);
  if (elided) return `${elided[1].toLocaleLowerCase('es')}${elided[2]}${seoCapitalize(elided[3])}`;
  return word.split('-').map(seoCapitalize).join('-');
}

/**
 * Nombre de operador legible. Quita los puntos finales (el censo trae "EMAYA.").
 * Si el nombre llega entero en mayúsculas lo pasa a tipo título ("AJUNTAMENT DE SANTA MARIA DEL CAMI" →
 * "Ajuntament de Santa Maria del Cami"), salvo siglas: SEO_KNOWN_ACRONYMS, palabras sin vocales
 * o con dígitos, números romanos (I, II, III, IV) y nombres de una sola palabra de 4 letras o menos.
 * Las partículas (de, y, des…) se evalúan antes que las siglas, salvo en la primera palabra.
 * Un nombre que ya tiene minúsculas no se toca. Las tildes que falten en la fuente ("CAMI") no se recuperan.
 */
export function readableOperatorName(name: string): string {
  const trimmed = name.trim().replace(SEO_TRAILING_DOTS, '').trim();
  if (SEO_LOWERCASE_LETTER.test(trimmed)) return trimmed;
  const words = trimmed.split(SEO_WHITESPACE);
  const isShortAcronym = words.length === 1 && trimmed.length <= SEO_SHORT_ACRONYM_MAX_LETTERS;
  if (isShortAcronym) return trimmed;
  return words.map((word, index) => seoTitleCaseWord(word, index === 0)).join(' ');
}

/** Recorta el texto por palabras completas para que quepa en maxLength, añadiendo "…". Nunca corta una palabra ni termina en una partícula ("de", "la"). */
export function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const words = text.split(' ');
  let kept = 1;
  while (kept < words.length && seoJoinWords(words, kept + 1).length <= maxLength) kept++;
  while (kept > 1 && seoIsParticle(words[kept - 1])) kept--;
  return seoJoinWords(words, kept);
}

function seoJoinWords(words: string[], count: number): string {
  return `${words.slice(0, count).join(' ')}${SEO_ELLIPSIS}`;
}

function seoIsParticle(word: string): boolean {
  return word.length <= SEO_PARTICLE_MAX_LETTERS && word === word.toLocaleLowerCase('es');
}

/** Número con separador de millares en español. */
export function seoFormatCount(count: number): string {
  return count.toLocaleString('es-ES');
}

function seoOperatorTitleCandidates(name: string, total: number): string[] {
  const count = seoFormatCount(total);
  return [
    `${SEO_TITLE_PREFIX}${name} (${count})`,
    `${name}: ${count} puntos de recarga`,
    `${name}: puntos de recarga`,
    name,
  ];
}

/**
 * Título (sin sufijo del sitio) de la página de un operador. Usa el primer candidato que quepa en 65
 * caracteres con el sufijo: "Puntos de recarga de {Operador} ({n})", "{Operador}: {n} puntos de recarga",
 * "{Operador}: puntos de recarga" y "{Operador}". Si ninguno cabe, se recorta el nombre por palabras
 * completas en el formato del primero (objetivo de 60 caracteres).
 */
export function operatorMetaTitle(operatorName: string, total: number): string {
  const name = readableOperatorName(operatorName);
  const candidates = seoOperatorTitleCandidates(name, total);
  const chosen = candidates.find((c) => c.length + SEO_TITLE_SUFFIX_LENGTH <= SEO_TITLE_HARD_MAX);
  if (chosen) return chosen;
  const suffix = ` (${seoFormatCount(total)})`;
  const nameBudget = SEO_TITLE_BODY_MAX - SEO_TITLE_PREFIX.length - suffix.length;
  return `${SEO_TITLE_PREFIX}${truncateAtWord(name, nameBudget)}${suffix}`;
}

/**
 * Descripción de la página de un operador, de 120 a 160 caracteres. Usa la cola larga si el nombre
 * cabe entero; si no, la corta y, de ser necesario, recorta el nombre por palabras completas.
 */
export function operatorMetaDescription(operatorName: string, total: number): string {
  const stations = total === 1 ? '1 punto de recarga' : `${seoFormatCount(total)} puntos de recarga`;
  const head = `Consulta los ${stations} de `;
  const readable = readableOperatorName(operatorName);
  const longVersion = `${head}${readable} ${SEO_DESCRIPTION_TAIL_LONG}`;
  if (longVersion.length <= SEO_DESCRIPTION_MAX) return longVersion;
  const nameBudget = SEO_DESCRIPTION_MAX - head.length - SEO_DESCRIPTION_TAIL_SHORT.length - 1;
  return `${head}${truncateAtWord(readable, nameBudget)} ${SEO_DESCRIPTION_TAIL_SHORT}`;
}

/** Título de la portada (sin sufijo del sitio). */
export const HOME_META_TITLE = 'Puntos de recarga de coches eléctricos en España';
/**
 * Descripción de la portada. El total de estaciones se redondea a la baja a millares ("más de 12.000");
 * si es menor de mil se omite la cifra.
 */
export function homeMetaDescription(totalStations: number): string {
  const thousands = Math.floor(totalStations / SEO_THOUSAND) * SEO_THOUSAND;
  const amount = thousands > 0 ? `más de ${seoFormatCount(thousands)} puntos de recarga` : 'puntos de recarga';
  return `Mapa con ${amount} del registro RIPREE del Ministerio. Filtra por potencia, tipo de conector y operador.`;
}
/** Título de la calculadora (sin sufijo del sitio). */
export const CALCULATOR_META_TITLE = 'Calculadora de carga de coche eléctrico';
/** Descripción de la calculadora. */
export const CALCULATOR_META_DESCRIPTION =
  'Calcula el tiempo de recarga y el coste en euros de tu coche eléctrico, con curva de carga por encima del 80% y tu tarifa por kWh.';

/** Datos estructurados de la portada: WebApplication con la descripción dada. */
export function homeJsonLd(description: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${SITE_NAME} - Puntos de recarga`,
    url: absoluteUrl('/'),
    description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    inLanguage: 'es',
  };
}

const SEO_PLACE_SEPARATORS = /[/,]/;
const SEO_SENTENCE_SEPARATOR = ' ';

/** Nombre de lugar sin la parte cooficial o aclaratoria: "Castellón/Castelló" → "Castellón". */
export function shortPlaceName(name: string): string {
  return name.split(SEO_PLACE_SEPARATORS)[0].trim();
}

/** Dos nombres de lugar iguales sin distinguir mayúsculas (municipio Madrid en la provincia de Madrid). */
export function isSamePlace(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('es') === b.trim().toLocaleLowerCase('es');
}

/** Une frases con un espacio, descartando las vacías. */
export function joinSentences(...parts: ReadonlyArray<string | null | false>): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(SEO_SENTENCE_SEPARATOR);
}

function seoFirstFitting(variants: readonly string[], maxLength: number): string | undefined {
  return variants.find((variant) => variant.length <= maxLength);
}

/**
 * Elige el título (sin sufijo del sitio) recorriendo los niveles en orden. En cada nivel prefiere la primera
 * variante que deja el título completo en 60 caracteres y, si no, la primera que lo deja en 65.
 * Lanza un error si ninguna variante de ningún nivel cabe: nunca devuelve un título fuera de rango.
 */
export function pickTitle(...tiers: ReadonlyArray<readonly string[]>): string {
  const targetBody = SEO_TITLE_TARGET - SEO_TITLE_SUFFIX_LENGTH;
  const hardBody = SEO_TITLE_HARD_MAX - SEO_TITLE_SUFFIX_LENGTH;
  for (const tier of tiers) {
    const picked = seoFirstFitting(tier, targetBody) ?? seoFirstFitting(tier, hardBody);
    if (picked !== undefined) return picked;
  }
  throw new Error(`Ninguna variante de título cabe en ${SEO_TITLE_HARD_MAX} caracteres: ${JSON.stringify(tiers)}`);
}

function seoFillDescription(variant: string, fillers: readonly string[]): string {
  let text = variant;
  for (const filler of fillers) {
    if (text.length >= SEO_DESCRIPTION_MIN) break;
    const extended = joinSentences(text, filler);
    if (extended.length <= SEO_DESCRIPTION_MAX) text = extended;
  }
  return text;
}

function seoIsValidDescription(text: string): boolean {
  return text.length >= SEO_DESCRIPTION_MIN && text.length <= SEO_DESCRIPTION_MAX;
}

/**
 * Elige la descripción: recorre las variantes de la más rica a la más corta, completa con frases de
 * relleno las que se quedan por debajo de 120 caracteres y devuelve la primera que queda entre 120 y 160.
 * Lanza un error si ninguna lo consigue.
 */
export function fitDescription(variants: readonly string[], fillers: readonly string[]): string {
  for (const variant of variants) {
    const text = seoFillDescription(variant, fillers);
    if (seoIsValidDescription(text)) return text;
  }
  throw new Error(
    `Ninguna variante de descripción queda entre ${SEO_DESCRIPTION_MIN} y ${SEO_DESCRIPTION_MAX} caracteres: ${JSON.stringify(variants)}`,
  );
}
