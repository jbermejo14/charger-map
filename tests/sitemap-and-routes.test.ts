import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../src/app/sitemap';
import { absoluteUrl } from '../src/lib/site';
import { getProvinciaBySlug, getStationBySlug } from '../src/lib/data';

describe('Sitemap y Rutas Canónicas (src/app/sitemap.ts)', () => {
  it('el sitemap debe generar una lista completa de URLs con protocolo absoluto', () => {
    const urls = sitemap();
    assert.ok(urls.length > 100, 'El sitemap debe contener cientos de URLs indexables');

    // Comprobar URLs raíz
    const home = urls.find((u) => u.url === absoluteUrl('/'));
    assert.ok(home, 'Debe incluir la home');

    const calc = urls.find((u) => u.url.includes('/calculadora'));
    assert.ok(calc, 'Debe incluir /calculadora');

    // Comprobar que todas tienen URL absoluta válida
    for (const entry of urls.slice(0, 50)) {
      assert.ok(entry.url.startsWith('http://') || entry.url.startsWith('https://'));
      assert.ok(entry.lastModified instanceof Date);
    }
  });

  it('debe devolver null para provincias inexistentes (disparador de 404 notFound)', () => {
    const invalid = getProvinciaBySlug('provincia-inventada-inexistente');
    assert.equal(invalid, null, 'Slug inexistente debe devolver null para disparar 404');
  });

  it('debe devolver null para estaciones inexistentes (disparador de 404 notFound)', () => {
    const invalid = getStationBySlug('99999999-punto-fantasma');
    assert.equal(invalid, null, 'Slug inexistente debe devolver null para disparar 404');
  });
});
