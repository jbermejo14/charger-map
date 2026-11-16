import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConnector } from '../src/lib/connectors';

describe('Normalización de Conectores (lib/connectors.ts)', () => {
  it('debe normalizar conectores CCS2 Combo', () => {
    assert.equal(normalizeConnector('IEC_62196_T2_COMBO'), 'CCS2 (Combo)');
    assert.equal(normalizeConnector('CCS Combo 2'), 'CCS2 (Combo)');
    assert.equal(normalizeConnector('CCS2'), 'CCS2 (Combo)');
  });

  it('debe normalizar Tipo 2 Mennekes', () => {
    assert.equal(normalizeConnector('IEC_62196_T2'), 'Tipo 2 (Mennekes)');
    assert.equal(normalizeConnector('Type 2'), 'Tipo 2 (Mennekes)');
    assert.equal(normalizeConnector('Mennekes'), 'Tipo 2 (Mennekes)');
  });

  it('debe normalizar CHAdeMO', () => {
    assert.equal(normalizeConnector('CHAdeMO'), 'CHAdeMO');
    assert.equal(normalizeConnector('IEC_62196_CHA_DE_MO'), 'CHAdeMO');
  });

  it('debe normalizar Schuko doméstico', () => {
    assert.equal(normalizeConnector('DOMESTIC_F'), 'Schuko (Doméstico)');
    assert.equal(normalizeConnector('Schuko'), 'Schuko (Doméstico)');
  });

  it('debe devolver desconocido si falta el conector o es irreconocible (NO inventar Tipo 2)', () => {
    assert.equal(normalizeConnector(''), 'desconocido');
    assert.equal(normalizeConnector(undefined), 'desconocido');
    assert.equal(normalizeConnector(null), 'desconocido');
    assert.equal(normalizeConnector('-'), 'desconocido');
    assert.equal(normalizeConnector('desconocido'), 'desconocido');
  });
});
