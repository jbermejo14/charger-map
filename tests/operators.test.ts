import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOperator } from '../src/lib/operators';

describe('Normalización de Operadores (lib/operators.ts)', () => {
  it('NO debe mezclar BP Pulse con Iberdrola', () => {
    const bp1 = normalizeOperator('BP PULSE ESPAÑA');
    const bp2 = normalizeOperator('BRITISH PETROLEUM');
    const ibe = normalizeOperator('IBERDROLA CLIENTES S.A.U');

    assert.equal(bp1, 'BP Pulse');
    assert.equal(bp2, 'BP Pulse');
    assert.equal(ibe, 'Iberdrola');
    assert.notEqual(bp1, ibe, 'BP Pulse e Iberdrola deben ser operadores distintos e independientes');
  });

  it('debe normalizar correctamente los grandes operadores españoles', () => {
    assert.equal(normalizeOperator('ENDESA X WAY, S.L.'), 'Endesa X Way');
    assert.equal(normalizeOperator('REPSOL COMERCIAL DE PRODUCTOS PETROLÍFEROS'), 'Repsol');
    assert.equal(normalizeOperator('TESLA SPAIN S.L.'), 'Tesla');
    assert.equal(normalizeOperator('IONITY GMBH'), 'Ionity');
    assert.equal(normalizeOperator('WENEA INTERMOVILIDAD'), 'Wenea');
    assert.equal(normalizeOperator('(ZUNDER) Grupo Easychargar SA'), 'Zunder');
    assert.equal(normalizeOperator('TOTALENERGIES CHARGING SERVICES'), 'TotalEnergies');
    assert.equal(normalizeOperator('EDP CLIENTES SAU'), 'EDP');
    assert.equal(normalizeOperator('PLENOIL, S.L.'), 'Plenoil');
    assert.equal(normalizeOperator('ACCIONA RECARGA'), 'Acciona Recarga');
  });

  it('debe limpiar sufijos societarios en operadores no catalogados', () => {
    const res = normalizeOperator('ElectroGas Levante S.L.U.');
    assert.equal(res, 'ElectroGas Levante');
  });

  it('debe devolver Desconocido para cadenas vacías o nulas', () => {
    assert.equal(normalizeOperator(''), 'Desconocido');
    assert.equal(normalizeOperator('   '), 'Desconocido');
  });
});
