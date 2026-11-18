import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CHARGER_POWER_KW,
  MAX_STATION_NAME_LENGTH,
  parseInitialName,
  parseInitialPower,
} from '../src/components/CalculatorFromQuery';

describe('parámetros de la calculadora (CalculatorFromQuery)', () => {
  it('acepta una potencia válida', () => {
    assert.equal(parseInitialPower('22'), 22);
    assert.equal(parseInitialPower('7.4'), 7.4);
    assert.equal(parseInitialPower(String(MAX_CHARGER_POWER_KW)), MAX_CHARGER_POWER_KW);
  });

  it('descarta negativos, cero, texto mezclado, vacío, nulo e infinito', () => {
    for (const raw of ['-5', '0', '12abc', '', '  ', null, 'Infinity', 'NaN', String(MAX_CHARGER_POWER_KW + 1)]) {
      assert.equal(parseInitialPower(raw), undefined, `debería descartar ${String(raw)}`);
    }
  });

  it('recorta el nombre de la estación', () => {
    assert.equal(parseInitialName(null), undefined);
    assert.equal(parseInitialName('Punto'), 'Punto');
    assert.equal(parseInitialName('x'.repeat(MAX_STATION_NAME_LENGTH + 50))?.length, MAX_STATION_NAME_LENGTH);
  });
});
