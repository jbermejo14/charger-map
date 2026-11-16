/**
 * Normalización estricta de tipos de conectores.
 * Si no está presente o no se reconoce, se devuelve 'desconocido'.
 */
export function normalizeConnector(raw: string | undefined | null): string {
  if (!raw) return 'desconocido';

  const clean = raw.trim().replace(/^="?|"?$/g, '').replace(/^"|"$/g, '').trim();
  if (!clean || clean === '-' || clean === '""' || clean.toLowerCase() === 'desconocido') {
    return 'desconocido';
  }

  const upper = clean.toUpperCase();

  // CCS2 Combo
  if (upper.includes('COMBO') || upper.includes('CCS') || upper.includes('T2_COMBO') || upper.includes('CCS2')) {
    return 'CCS2 (Combo)';
  }

  // CHAdeMO
  if (upper.includes('CHADEMO') || upper.includes('CHA_DE_MO')) {
    return 'CHAdeMO';
  }

  // Tipo 2 Mennekes
  if (
    upper.includes('MENNEKES') ||
    upper.includes('TYPE 2') ||
    upper.includes('TYPE2') ||
    upper.includes('TIPO 2') ||
    upper.includes('TIPO2') ||
    upper.includes('IEC_62196_T2') ||
    upper === 'T2'
  ) {
    return 'Tipo 2 (Mennekes)';
  }

  // Schuko doméstico
  if (
    upper.includes('SCHUKO') ||
    upper.includes('DOMESTIC') ||
    upper.includes('DOMESTICO') ||
    upper.includes('DOMÉSTICO') ||
    upper.includes('ENCHUFE')
  ) {
    return 'Schuko (Doméstico)';
  }

  // Tipo 1 Yazaki
  if (upper.includes('T1') || upper.includes('YAZAKI') || upper.includes('TYPE 1') || upper.includes('TIPO 1')) {
    return 'Tipo 1 (Yazaki)';
  }

  // Tesla Supercharger / Propietario
  if (upper.includes('TESLA')) {
    return 'Tesla Supercharger';
  }

  // Si no se puede identificar con certeza, devolver 'desconocido' (no inventar Tipo 2)
  return 'desconocido';
}
