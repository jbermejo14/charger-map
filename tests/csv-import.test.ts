import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { normalizeOperator } from '../src/lib/operators';
import { normalizeConnector } from '../src/lib/connectors';

describe('Parseo de CSV y Filtro de Calidad (tests/fixtures/sample_utf16le.csv)', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures', 'sample_utf16le.csv');

  it('debe existir el fixture en codificación UTF-16LE', () => {
    assert.ok(fs.existsSync(fixturePath), 'El archivo fixture debe existir');
    const buffer = fs.readFileSync(fixturePath);
    assert.ok(buffer.length > 0);
  });

  it('debe leer y decodificar correctamente el buffer UTF-16LE', () => {
    const buffer = fs.readFileSync(fixturePath);
    const text = buffer.toString('utf16le');
    assert.ok(text.includes('COMUNIDAD AUTONOMA;PROVINCIA;MUNICIPIO'));
    assert.ok(text.includes('Langreo - Calle Dolores'));
  });

  it('debe sanitizar comillas internas complejas y parsear con csv-parse', () => {
    const buffer = fs.readFileSync(fixturePath);
    const rawContent = buffer.toString('utf16le');

    // Sanitización idéntica a scripts/import-chargers.ts
    const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const sanitizedLines = lines.map((line) => {
      const cleanLine = line.replace(/="([^"]*)"/g, '"$1"');
      const parts = cleanLine.split(';');
      return parts
        .map((part) => {
          const p = part.trim();
          if (p.startsWith('"') && p.endsWith('"')) {
            const inner = p.slice(1, -1);
            return `"${inner.replace(/"/g, '""')}"`;
          }
          return p;
        })
        .join(';');
    });

    const records: Record<string, string>[] = parse(sanitizedLines.join('\n'), {
      delimiter: ';',
      columns: true,
      relax_quotes: true,
      trim: true
    });

    assert.equal(records.length, 5, 'Deben parsearse las 5 filas de prueba');

    // Fila 1: Madrid válida
    const row1 = records[0];
    assert.equal(row1['MUNICIPIO'], 'Madrid');
    assert.equal(normalizeOperator(row1['NOMBRE OPERADOR']), 'Iberdrola');
    assert.equal(normalizeConnector(row1['TIPO CONECTOR']), 'CCS2 (Combo)');

    // Fila 2: Asturias con comillas complejas y BP Pulse
    const row2 = records[1];
    assert.equal(row2['MUNICIPIO'], 'Langreo');
    assert.ok(row2['NOMBRE INSTALACION'].includes('Dolores'));
    assert.equal(normalizeOperator(row2['NOMBRE OPERADOR']), 'BP Pulse');

    // Comprobar descartes lógicos:
    // Fila 3: Coordenadas 0,0 -> Invalido
    const lat3 = parseFloat(records[2]['LATITUD'].replace(/^[="]+|["]+$/g, ''));
    assert.equal(lat3, 0);

    // Fila 4: Sin ID
    assert.equal(records[3]['COD.INSTALACION'].replace(/^[="]+|["]+$/g, ''), '');

    // Fila 5: Copenhague (lat 55) -> Fuera de España
    const lat5 = parseFloat(records[4]['LATITUD'].replace(/^[="]+|["]+$/g, ''));
    assert.ok(lat5 > 45, 'Debe estar fuera del rango español (27 a 44)');
  });
});
