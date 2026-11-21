import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNetworkLinksForRoute, getNetworkData } from '../src/lib/network';

test('network: lee los datos de la red de enlaces si existen', () => {
  const data = getNetworkData();
  if (data) {
    assert.equal(data.version, 1);
    assert.ok(Array.isArray(data.secciones));
    assert.ok(data.secciones.some((s) => s.ruta === '/es/gasolineras'));
  }
});

test('network: devuelve enlaces cruzados para rutas conocidas', () => {
  const links = getNetworkLinksForRoute('/es/puntos-recarga/provincia/madrid/alcala-de-henares');
  if (links.length > 0) {
    assert.ok(links.some((l) => l.seccion === '/es/gasolineras'));
  }
});

test('network: ruta inexistente devuelve array vacío', () => {
  const links = getNetworkLinksForRoute('/ruta/totalmente/inexistente');
  assert.deepEqual(links, []);
});
