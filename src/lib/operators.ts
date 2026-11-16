/**
 * Normalización estricta de operadores de puntos de recarga sin mezclar empresas distintas.
 */

interface OperatorRule {
  normalized: string;
  matches: (rawUpper: string) => boolean;
}

const OPERATOR_RULES: OperatorRule[] = [
  // BP Pulse es una entidad independiente y joint venture propia (NO mezclar con Iberdrola)
  {
    normalized: 'BP Pulse',
    matches: (s) => s.includes('BP PULSE') || s.includes('BPPULSE') || s.includes('BRITISH PETROLEUM') || s.includes('BP ENERGIA')
  },
  // Iberdrola
  {
    normalized: 'Iberdrola',
    matches: (s) => s.includes('IBERDROLA') || s.includes('IBERDROLA CLIENTES') || s.includes('IBERDROLA REDES')
  },
  // Endesa X Way
  {
    normalized: 'Endesa X Way',
    matches: (s) => s.includes('ENDESA X') || s.includes('ENDESA')
  },
  // Repsol
  {
    normalized: 'Repsol',
    matches: (s) => s.includes('REPSOL') || s.includes('CAMPSA') || s.includes('PETRONOR')
  },
  // Tesla
  {
    normalized: 'Tesla',
    matches: (s) => s.includes('TESLA')
  },
  // Ionity
  {
    normalized: 'Ionity',
    matches: (s) => s.includes('IONITY')
  },
  // Wenea
  {
    normalized: 'Wenea',
    matches: (s) => s.includes('WENEA')
  },
  // Zunder
  {
    normalized: 'Zunder',
    matches: (s) => s.includes('ZUNDER') || s.includes('EASYCHARGER')
  },
  // TotalEnergies
  {
    normalized: 'TotalEnergies',
    matches: (s) => s.includes('TOTALENERGIES') || s.includes('TOTAL ENERGIES')
  },
  // EDP
  {
    normalized: 'EDP',
    matches: (s) => s.includes('EDP CLIENTES') || s.includes('EDP ENERGIA') || s.includes('EDP MOVE ON') || s === 'EDP'
  },
  // Plenoil
  {
    normalized: 'Plenoil',
    matches: (s) => s.includes('PLENOIL')
  },
  // Acciona Recarga
  {
    normalized: 'Acciona Recarga',
    matches: (s) => s.includes('ACCIONA')
  },
  // Eranovum
  {
    normalized: 'Eranovum',
    matches: (s) => s.includes('ERANOVUM')
  },
  // Etecnic
  {
    normalized: 'Etecnic',
    matches: (s) => s.includes('ETECNIC')
  },
  // Fenie Energía
  {
    normalized: 'Fenie Energía',
    matches: (s) => s.includes('FENIE')
  },
  // Charging Together / Powergy
  {
    normalized: 'Charging Together',
    matches: (s) => s.includes('CHARGING TOGETHER') || s.includes('POWERGY')
  },
  // B:SM Barcelona de Serveis Municipals
  {
    normalized: 'B:SM Barcelona',
    matches: (s) => s.includes('BARCELONA DE SERVEIS') || s.includes('B:SM') || s.includes('B-SM') || s.includes('ENDIMAR')
  },
  // Mercadona
  {
    normalized: 'Mercadona',
    matches: (s) => s.includes('MERCADONA')
  },
  // Porsche
  {
    normalized: 'Porsche',
    matches: (s) => s.includes('PORSCHE')
  },
  // Galp
  {
    normalized: 'Galp',
    matches: (s) => s.includes('GALP')
  },
  // Cepsa / Moeve
  {
    normalized: 'Moeve (Cepsa)',
    matches: (s) => s.includes('CEPSA') || s.includes('MOEVE')
  },
  // Ballenoil
  {
    normalized: 'Ballenoil',
    matches: (s) => s.includes('BALLENOIL')
  },
  // Powerdot
  {
    normalized: 'Powerdot',
    matches: (s) => s.includes('POWERDOT') || s.includes('POWER DOT')
  },
  // Shell Recharge
  {
    normalized: 'Shell Recharge',
    matches: (s) => s.includes('SHELL')
  },
  // Telpark / Empark
  {
    normalized: 'Telpark',
    matches: (s) => s.includes('TELPARK') || s.includes('EMPARK')
  },
  // Saba Aparcamientos
  {
    normalized: 'Saba',
    matches: (s) => s.includes('SABA APARCA') || s.includes('SABA')
  }
];

/**
 * Normaliza el nombre del operador a su marca comercial limpia,
 * o conserva una versión limpia del nombre original si no está en la tabla de equivalencias.
 */
export function normalizeOperator(raw: string): string {
  if (!raw) return 'Desconocido';
  const clean = raw.trim().replace(/^="?|"?$/g, '').replace(/^"|"$/g, '').trim();
  if (!clean) return 'Desconocido';

  const upper = clean.toUpperCase();

  for (const rule of OPERATOR_RULES) {
    if (rule.matches(upper)) {
      return rule.normalized;
    }
  }

  // Si no coincide con ninguna regla conocida, limpiar sufijos societarios comunes
  return clean
    .replace(/,?\s*(S\.?A\.?U?\.?|S\.?L\.?U?\.?|S\.?R\.?L\.?\.?|S\.?A\.?P\.?\.?)\b/gi, '')
    .replace(/[.,\s]+$/, '')
    .trim();
}
