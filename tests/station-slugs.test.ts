import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAllStationSlugs, getStationBySlug } from '../src/lib/data';

describe('slugs de estaciones con los datos reales', () => {
  const slugs = getAllStationSlugs().map((entry) => entry.slug);

  it('no hay slugs duplicados', () => {
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it('todos los slugs resuelven a una estación', () => {
    const missing = slugs.filter((slug) => getStationBySlug(slug) === null);
    assert.deepEqual(missing, []);
  });

  it('un id en mayúsculas genera un slug en minúsculas que resuelve', () => {
    const slug = '6hrioijsipnfin1ereg1-e-b-santcugatdelvalles-003';
    const station = getStationBySlug(slug);
    assert.ok(station);
    assert.equal(station.id, '6HRIOIJSIPNFIN1EREG1');
    assert.equal(station.slug, slug);
  });
});
