import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getNetworkLinks, getNetworkSections, municipalityNetworkKey } from '../src/lib/network';

const ENV_NAME = 'ODODEX_RED_ENLACES';
const OWN_SECTION = '/es/puntos-recarga';
const MUNICIPALITY_KEY = '/es/puntos-recarga/provincia/madrid/madrid';
const NETWORK_LINK = { seccion: '/es/gasolineras', texto: 'Gasolineras en Madrid', href: '/es/gasolineras/provincia/madrid/madrid' };

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'red-enlaces-'));
let fileCounter = 0;
const previousValue = process.env[ENV_NAME];

// Cada caso usa su propio fichero: el módulo cachea por ruta.
function writeNetworkFile(content: string): string {
  const filePath = path.join(tempDir, `red-${fileCounter++}.json`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

function validNetwork(): string {
  return JSON.stringify({
    version: 1,
    generado: '2026-11-19T18:00:00.000Z',
    secciones: [
      { ruta: '/es/multas', nombre: 'Multas', descripcion: 'd' },
      { ruta: OWN_SECTION, nombre: 'Puntos de recarga', descripcion: 'd' },
    ],
    enlaces: { [MUNICIPALITY_KEY]: [NETWORK_LINK] },
  });
}

afterEach(() => {
  if (previousValue === undefined) delete process.env[ENV_NAME];
  else process.env[ENV_NAME] = previousValue;
});

test('sin variable de entorno no hay enlaces ni secciones', () => {
  delete process.env[ENV_NAME];
  assert.deepEqual(getNetworkLinks(MUNICIPALITY_KEY), []);
  assert.deepEqual(getNetworkSections(), []);
});

test('con fichero inexistente no hay enlaces y no falla', () => {
  process.env[ENV_NAME] = path.join(tempDir, 'no-existe.json');
  assert.deepEqual(getNetworkLinks(MUNICIPALITY_KEY), []);
  assert.deepEqual(getNetworkSections(), []);
});

test('JSON roto lanza un error claro en español', () => {
  process.env[ENV_NAME] = writeNetworkFile('{ no es json');
  assert.throws(() => getNetworkLinks(MUNICIPALITY_KEY), /no es un JSON válido/);
});

test('versión distinta de 1 lanza un error claro en español', () => {
  process.env[ENV_NAME] = writeNetworkFile(JSON.stringify({ version: 2, secciones: [], enlaces: {} }));
  assert.throws(() => getNetworkSections(), /versión 2/);
});

test('estructura sin secciones o enlaces lanza un error', () => {
  process.env[ENV_NAME] = writeNetworkFile(JSON.stringify({ version: 1 }));
  assert.throws(() => getNetworkSections(), /secciones/);
});

test('devuelve los enlaces de una ruta y [] si la ruta no está', () => {
  process.env[ENV_NAME] = writeNetworkFile(validNetwork());
  assert.deepEqual(getNetworkLinks(MUNICIPALITY_KEY), [NETWORK_LINK]);
  assert.deepEqual(getNetworkLinks('/es/puntos-recarga/provincia/madrid/otro'), []);
});

test('las secciones excluyen la propia', () => {
  process.env[ENV_NAME] = writeNetworkFile(validNetwork());
  assert.deepEqual(getNetworkSections().map((section) => section.ruta), ['/es/multas']);
});

test('la clave de municipio coincide con la del fichero de red', () => {
  assert.equal(municipalityNetworkKey('madrid', 'madrid'), MUNICIPALITY_KEY);
});
