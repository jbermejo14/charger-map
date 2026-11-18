import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, createStationSlug } from '../src/lib/slugs';

describe('Generador de Slugs (lib/slugs.ts)', () => {
  it('debe generar slugs limpios sin tildes, eñes ni caracteres especiales', () => {
    assert.equal(slugify('Málaga'), 'malaga');
    assert.equal(slugify('A Coruña'), 'a-coruna');
    assert.equal(slugify('Castellón / Castelló'), 'castellon-castello');
    assert.equal(slugify('Alcalá de Henares (Madrid)'), 'alcala-de-henares-madrid');
    assert.equal(slugify('Estación Repsol "El Toro"'), 'estacion-repsol-el-toro');
  });

  it('debe colapsar guiones múltiples y recortar extremos', () => {
    assert.equal(slugify('---Madrid---Centro---'), 'madrid-centro');
    assert.equal(slugify('Endesa   X   Way'), 'endesa-x-way');
  });

  it('debe generar slugs de estación {id}-{slug}', () => {
    const slug = createStationSlug('2023004120', 'Langreo - Dolores Ibarruri');
    assert.equal(slug, '2023004120-langreo-dolores-ibarruri');
  });
});
