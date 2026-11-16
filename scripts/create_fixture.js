const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '..', 'tests', 'fixtures');
fs.mkdirSync(targetDir, { recursive: true });

const header = 'COMUNIDAD AUTONOMA;PROVINCIA;MUNICIPIO;LATITUD;LONGITUD;NOMBRE INSTALACION;DIRECCIÓN;CODIGO POSTAL;LOCALIZACION;TIPO HORARIO APERTURA;HORARIO APERTURA;NOMBRE OPERADOR;COD.OPERADOR;TIPOS DE SERVICIOS;COD.INSTALACION;ID. PUNTO DE RECARGA;ACCESIBILIDAD;METODOS DE PAGOS;COD. PUNTO DE RECARGA;ID. CONECTOR;TIPO CONECTOR;TIPO DE CARGA;FORMATO;POTENCIA MAXIMA;VOLTAJE;INTENSIDAD;FECHA DE ULTIMA MODIFICACION';

const rows = [
  // 1. Registro válido Madrid Iberdrola Combo CCS2
  '"Madrid, Comunidad de";"Madrid";"Madrid";="40.4168000";="-3.7038000";"Punto Centro Madrid";"Gran Vía 1";="28013";="EN LA CALLE";"24/7";"";"IBERDROLA CLIENTES S.A.U";"ES*IBE";"";"INST_MAD_01";"PR_01";"DISPONIBLE";"APP";"COD_01";"1";"IEC_62196_T2_COMBO";"DC";"Cable";"150,00 kW";"800 V";"200 A";"16/11/2026 10:00:00"',
  // 2. Registro válido con comillas complejas en nombre y operador BP Pulse
  '"Asturias, Principado de";"Asturias";"Langreo";="43.3026950";="-5.6905913";"Langreo - Calle Dolores Ibárruri "La Pasionaria"";"Calle Dolores, S/N";="33900";="EN LA CALLE";"24/7";"";"BP PULSE ESPAÑA";"ES*BPP";"";"INST_AST_02";"PR_02";"DISPONIBLE";"APP";"COD_02";"1";"IEC_62196_T2";"AC";"Socket";"22,00 kW";"400 V";"32 A";"16/11/2026 10:00:00"',
  // 3. Registro inválido: Coordenadas nulas (0, 0) -> Debe descartarse
  '"Andalucía";"Sevilla";"Sevilla";="0.0000000";="0.0000000";"Punto Coordenadas Nulas";"Calle Falsa 123";="41001";="EN LA CALLE";"24/7";"";"ENDESA X WAY";"ES*END";"";"INST_INV_03";"PR_03";"DISPONIBLE";"APP";"COD_03";"1";"IEC_62196_T2";"AC";"Socket";"22,00 kW";"400 V";"32 A";"16/11/2026 10:00:00"',
  // 4. Registro inválido: Sin COD.INSTALACION ni ID. PUNTO DE RECARGA -> Debe descartarse
  '"Madrid";"Madrid";"Madrid";="40.4000000";="-3.7000000";"Punto Sin ID";"Paseo Prado";="28014";="EN LA CALLE";"24/7";"";"REPSOL";"ES*REP";"";"";"";"DISPONIBLE";"APP";"COD_04";"1";"DESCONOCIDO";"AC";"Socket";"11,00 kW";"400 V";"16 A";"16/11/2026 10:00:00"',
  // 5. Registro inválido: Fuera de España (lat 55.0, lng 10.0 Dinamarca) -> Debe descartarse
  '"Extranjero";"Extranjero";"Copenhague";="55.6761000";="12.5683000";"Punto Fuera España";"Main St";="1000";="EN LA CALLE";"24/7";"";"TESLA";"ES*TES";"";"INST_OUT_05";"PR_05";"DISPONIBLE";"APP";"COD_05";"1";"IEC_62196_T2_COMBO";"DC";"Cable";"250,00 kW";"400 V";"500 A";"16/11/2026 10:00:00"'
];

const content = header + '\r\n' + rows.join('\r\n') + '\r\n';
const buffer = Buffer.from(content, 'utf16le');
const filePath = path.join(targetDir, 'sample_utf16le.csv');
fs.writeFileSync(filePath, buffer);
console.log('Fixture creado correctamente en:', filePath, `(${buffer.length} bytes)`);
