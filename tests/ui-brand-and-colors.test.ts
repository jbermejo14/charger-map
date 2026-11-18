import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { BrandLogo } from '../src/components/BrandLogo';
import { Header } from '../src/components/Header';
import { SECTION_NAME, SITE_NAME } from '../src/lib/site';

const SOURCE_DIRECTORY = 'src';
const DATA_DIRECTORY = path.join('src', 'data');
const OLD_BRAND_PATTERN = /ElectroCharge|electrocharge|ev_theme/;
const SECTION_LINKS = ['/', '/#provincias', '/calculadora'];

function brandListFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (fullPath.endsWith(DATA_DIRECTORY)) return [];
    return entry.isDirectory() ? brandListFiles(fullPath) : [fullPath];
  });
}

test('marca: SITE_NAME es Ododex y la sección es Puntos de recarga', () => {
  assert.equal(SITE_NAME, 'Ododex');
  assert.equal(SECTION_NAME, 'Puntos de recarga');
});

test('marca: ningún fichero de src menciona ElectroCharge ni el tema antiguo', () => {
  const offenders = brandListFiles(path.join(process.cwd(), SOURCE_DIRECTORY))
    .filter(file => OLD_BRAND_PATTERN.test(readFileSync(file, 'utf-8')));
  assert.deepEqual(offenders, []);
});

test('BrandLogo: dos variantes del logo con la ruta base', () => {
  const html = renderToStaticMarkup(React.createElement(BrandLogo));
  assert.ok(html.includes('src="/es/puntos-recarga/brand/ododex-logo-light.svg"'));
  assert.ok(html.includes('src="/es/puntos-recarga/brand/ododex-logo-dark.svg"'));
});

test('Header: marca, sección y fila de navegación con tres enlaces', () => {
  const html = renderToStaticMarkup(React.createElement(Header));
  assert.ok(html.includes(SECTION_NAME));
  assert.ok(html.includes('aria-label="Secciones"'));
  for (const href of SECTION_LINKS) {
    assert.ok(html.includes(`href="${href}"`), `Falta el enlace ${href}`);
  }
});

test('Footer: sin enlace al sitemap', () => {
  const footer = readFileSync(path.join('src', 'components', 'Footer.tsx'), 'utf-8');
  assert.ok(!footer.includes('sitemap'));
});
