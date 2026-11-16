const fs = require('fs');
const path = require('path');

const csvPath = 'c:\\Users\\Usuario\\Downloads\\InstalacionesPublicas_20261116_121623.csv';
const outputPath = path.join(__dirname, '..', 'data', 'chargers.json');

console.log('Reading CSV...');
const content = fs.readFileSync(csvPath, 'utf16le');
const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

console.log(`Total rows: ${lines.length}`);
const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));

function cleanVal(v) {
  if (!v) return '';
  return v.trim().replace(/^="?|"?$/g, '').replace(/^"|"$/g, '').trim();
}

function parsePower(str) {
  if (!str) return 0;
  const cleaned = cleanVal(str).replace(/kw/i, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeConnector(raw) {
  const c = cleanVal(raw);
  if (!c) return 'Tipo 2 (Mennekes)';
  const upper = c.toUpperCase();
  if (upper.includes('COMBO') || upper.includes('CCS') || upper.includes('T2_COMBO')) {
    return 'CCS2 (Combo)';
  }
  if (upper.includes('CHADEMO')) {
    return 'CHAdeMO';
  }
  if (upper.includes('MENNEKES') || upper.includes('T2') || upper.includes('TYPE 2') || upper.includes('TIPO 2') || upper.includes('IEC_62196_T2')) {
    return 'Tipo 2 (Mennekes)';
  }
  if (upper.includes('DOMESTIC') || upper.includes('SCHUKO') || upper.includes('DOMESTICO') || upper.includes('DOMÉSTICO')) {
    return 'Schuko (Doméstico)';
  }
  if (upper.includes('T1') || upper.includes('YAZAKI')) {
    return 'Tipo 1 (Yazaki)';
  }
  if (upper.includes('TESLA')) {
    return 'Tesla Supercharger';
  }
  return c;
}

function simplifyOperator(raw) {
  const op = cleanVal(raw);
  const upper = op.toUpperCase();
  if (upper.includes('IBERDROLA') || upper.includes('BP PULSE')) return 'Iberdrola';
  if (upper.includes('ENDESA')) return 'Endesa X Way';
  if (upper.includes('REPSOL')) return 'Repsol';
  if (upper.includes('TESLA')) return 'Tesla';
  if (upper.includes('IONITY')) return 'Ionity';
  if (upper.includes('WENEA')) return 'Wenea';
  if (upper.includes('ZUNDER') || upper.includes('EASYCHARGER')) return 'Zunder';
  if (upper.includes('TOTALENERGIES')) return 'TotalEnergies';
  if (upper.includes('EDP')) return 'EDP';
  if (upper.includes('PLENOIL')) return 'Plenoil';
  if (upper.includes('ACCIONA')) return 'Acciona';
  if (upper.includes('ERANOVUM')) return 'Eranovum';
  if (upper.includes('ETECNIC')) return 'Etecnic';
  if (upper.includes('FENIE')) return 'Fenie Energía';
  if (upper.includes('CHARGING TOGETHER') || upper.includes('POWERGY')) return 'Charging Together';
  if (upper.includes('BARCELONA DE SERVEIS') || upper.includes('B:SM') || upper.includes('ENDIMAR')) return 'B:SM Barcelona';
  if (upper.includes('PORSCHE')) return 'Porsche Destination';
  if (upper.includes('MERCADONA')) return 'Mercadona';
  return op || 'Operador Local';
}

function estimatePrice(operator, power) {
  if (operator === 'Tesla') return 0.46;
  if (operator === 'Ionity') return 0.65;
  if (operator === 'Zunder') return 0.55;
  if (operator === 'Iberdrola') return power >= 100 ? 0.54 : power >= 50 ? 0.49 : 0.40;
  if (operator === 'Endesa X Way') return power >= 100 ? 0.55 : power >= 50 ? 0.48 : 0.39;
  if (operator === 'Repsol') return power >= 100 ? 0.54 : 0.47;
  if (power >= 150) return 0.55;
  if (power >= 50) return 0.48;
  return 0.38;
}

const stationsMap = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const parts = line.split(';');
  if (parts.length < headers.length) continue;

  const row = {};
  for (let j = 0; j < headers.length; j++) {
    row[headers[j]] = cleanVal(parts[j]);
  }

  const codInst = row['COD.INSTALACION'] || row['ID. PUNTO DE RECARGA'] || `inst_${i}`;
  const lat = parseFloat(row['LATITUD'].replace(',', '.'));
  const lng = parseFloat(row['LONGITUD'].replace(',', '.'));

  // Validar coordenadas (España: lat ~ 27 a 44, lng ~ -19 a 5)
  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;

  const power = parsePower(row['POTENCIA MAXIMA']);
  const connector = normalizeConnector(row['TIPO CONECTOR']);
  const chargeType = row['TIPO DE CARGA'] ? cleanVal(row['TIPO DE CARGA']).toUpperCase() : '';

  const opRaw = row['NOMBRE OPERADOR'] || 'Desconocido';
  const opNormalized = simplifyOperator(opRaw);

  if (!stationsMap.has(codInst)) {
    stationsMap.set(codInst, {
      id: codInst,
      nombre: row['NOMBRE INSTALACION'] || 'Estación de Recarga',
      operador: opNormalized,
      operador_original: opRaw,
      comunidad: row['COMUNIDAD AUTONOMA'] || '',
      provincia: row['PROVINCIA'] || '',
      municipio: row['MUNICIPIO'] || '',
      direccion: row['DIRECCIÓN'] || '',
      codigo_postal: row['CODIGO POSTAL'] || '',
      horario: row['HORARIO APERTURA'] || '24 horas',
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      potencia_max_kw: power,
      num_conectores: 1,
      conectores: [connector],
      tipos_carga: chargeType ? [chargeType] : (power > 22 ? ['DC'] : ['AC'])
    });
  } else {
    const station = stationsMap.get(codInst);
    station.num_conectores += 1;
    if (power > station.potencia_max_kw) {
      station.potencia_max_kw = power;
    }
    if (!station.conectores.includes(connector)) {
      station.conectores.push(connector);
    }
    if (chargeType && !station.tipos_carga.includes(chargeType)) {
      station.tipos_carga.push(chargeType);
    }
  }
}

const stations = Array.from(stationsMap.values());

stations.forEach(s => {
  s.potencia_max_kw = Number(s.potencia_max_kw.toFixed(1));
  s.precio_estimado = estimatePrice(s.operador, s.potencia_max_kw);
});

console.log(`Processed ${stations.length} unique stations.`);
fs.writeFileSync(outputPath, JSON.stringify(stations));
const stats = fs.statSync(outputPath);
console.log(`Saved to ${outputPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
