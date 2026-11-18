import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absoluteUrl, assetPath, BASE_PATH, getSiteUrl, isHtmlOnlyRoute } from '../src/lib/site';
import nextConfig from '../next.config';

const SITE_ORIGIN = 'https://ododex.com';

function siteConOrigen(origen: string | undefined, prueba: () => void): void {
  const previo = process.env.NEXT_PUBLIC_SITE_URL;
  if (origen === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = origen;
  try {
    prueba();
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previo;
  }
}

test('BASE_PATH es /es/puntos-recarga', () => {
  assert.equal(BASE_PATH, '/es/puntos-recarga');
});

test('absoluteUrl: raíz vacía o con barra devuelve origen + ruta base sin barra final', () => {
  siteConOrigen(SITE_ORIGIN, () => {
    assert.equal(absoluteUrl('/'), `${SITE_ORIGIN}/es/puntos-recarga`);
    assert.equal(absoluteUrl(''), `${SITE_ORIGIN}/es/puntos-recarga`);
  });
});

test('absoluteUrl: ruta con y sin barra inicial', () => {
  siteConOrigen(SITE_ORIGIN, () => {
    assert.equal(absoluteUrl('/provincia/madrid'), `${SITE_ORIGIN}/es/puntos-recarga/provincia/madrid`);
    assert.equal(absoluteUrl('provincia/madrid'), `${SITE_ORIGIN}/es/puntos-recarga/provincia/madrid`);
  });
});

test('getSiteUrl: quita barras finales y usa localhost por defecto', () => {
  siteConOrigen(`${SITE_ORIGIN}/`, () => {
    assert.equal(getSiteUrl(), SITE_ORIGIN);
  });
  siteConOrigen(undefined, () => {
    assert.equal(getSiteUrl(), 'http://localhost:3000');
  });
});

test('assetPath antepone la ruta base', () => {
  assert.equal(assetPath('/datos/mapa.json'), '/es/puntos-recarga/datos/mapa.json');
  assert.equal(assetPath('datos/mapa.json'), '/es/puntos-recarga/datos/mapa.json');
});

test('isHtmlOnlyRoute: punto y municipio sí', () => {
  assert.equal(isHtmlOnlyRoute('/punto/2024000378-ab-villarrobledo-004'), true);
  assert.equal(isHtmlOnlyRoute('/provincia/madrid/alcala-de-henares'), true);
  assert.equal(isHtmlOnlyRoute('/provincia/madrid/alcala-de-henares/'), true);
});

test('isHtmlOnlyRoute: provincia, operador, calculadora, home y otras no', () => {
  assert.equal(isHtmlOnlyRoute('/provincia/madrid'), false);
  assert.equal(isHtmlOnlyRoute('/operador/iberdrola'), false);
  assert.equal(isHtmlOnlyRoute('/calculadora?power=50&name=a/b'), false);
  assert.equal(isHtmlOnlyRoute('/'), false);
  assert.equal(isHtmlOnlyRoute('/punto'), false);
  assert.equal(isHtmlOnlyRoute('/punto/'), false);
});

test('next.config.ts usa la misma ruta base que src/lib/site.ts', () => {
  assert.equal(nextConfig.basePath, BASE_PATH);
});

test('next.config.ts exporta el sitio como ficheros estáticos sin optimizador de imágenes', () => {
  assert.equal(nextConfig.output, 'export');
  assert.equal(nextConfig.images?.unoptimized, true);
});
