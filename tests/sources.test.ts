import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_DIR = path.join(__dirname, '..', 'src');
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.css'];
// Cadenas que no pueden aparecer en el código: API de servidor, teselas CARTO y la marca antigua.
const FORBIDDEN_STRINGS = ['/api/', 'cartocdn', 'ElectroCharge'];

function sourcesFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'data' ? [] : sourcesFiles(full);
    return SOURCE_EXTENSIONS.includes(path.extname(full)) ? [full] : [];
  });
}

test('ninguna fuente de src contiene /api/, cartocdn ni ElectroCharge', () => {
  for (const file of sourcesFiles(SOURCE_DIR)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const forbidden of FORBIDDEN_STRINGS) {
      assert.ok(!content.includes(forbidden), `${file} contiene "${forbidden}"`);
    }
  }
});
