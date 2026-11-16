/**
 * Generador de slugs seguros, estables y sin tildes para URLs indexables.
 */
export function slugify(text: string): string {
  if (!text) return '';

  return text
    .toString()
    .normalize('NFD') // Descompone caracteres con tildes y diéresis
    .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-') // Sustituye caracteres no alfanuméricos por guiones
    .replace(/^-+|-+$/g, '') // Elimina guiones iniciales y finales
    .replace(/-{2,}/g, '-'); // Colapsa guiones repetidos
}

/**
 * Genera el slug canónico para un punto de recarga: {id}-{slug}
 */
export function createStationSlug(id: string, nombre: string): string {
  const cleanId = slugify(id);
  const cleanName = slugify(nombre);
  return `${cleanId}-${cleanName}`;
}

/**
 * Extrae el ID a partir del slug de un punto de recarga {id}-{slug}
 */
export function parseStationSlug(fullSlug: string): { id: string; nameSlug: string } | null {
  if (!fullSlug) return null;
  const firstDash = fullSlug.indexOf('-');
  if (firstDash === -1) {
    return { id: fullSlug, nameSlug: '' };
  }
  const id = fullSlug.slice(0, firstDash);
  const nameSlug = fullSlug.slice(firstDash + 1);
  return { id, nameSlug };
}
