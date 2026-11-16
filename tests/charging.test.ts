import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCharge, PRECONFIGURED_VEHICLES } from '../src/lib/charging';

describe('Calculadora de Carga EV (lib/charging.ts)', () => {
  it('debe devolver error si el porcentaje inicial es mayor o igual al objetivo', () => {
    const res = calculateCharge({
      batteryCapacity: 60,
      startSoc: 80,
      targetSoc: 20,
      chargerPower: 150,
      vehicleMaxPower: 170,
      userPricePerKwh: 0.45
    });

    assert.ok(res.error, 'Debe devolver propiedad error');
    assert.equal(res.totalMinutes, 0);
    assert.equal(res.totalCost, 0);
  });

  it('debe calcular correctamente la energía neta y el coste para una carga estándar 10% -> 80%', () => {
    const res = calculateCharge({
      batteryCapacity: 70, // 70 kWh
      startSoc: 10,
      targetSoc: 80, // diferencia = 70% -> 49 kWh netos
      chargerPower: 150,
      vehicleMaxPower: 150,
      userPricePerKwh: 0.40,
      avgConsumption: 16.0,
      isAC: false
    });

    assert.equal(res.error, undefined);
    assert.equal(res.netKwhNeeded, 49); // 70 * 0.70
    assert.ok(res.grossKwhSupplied > 49, 'La energía bruta debe incluir pérdidas de eficiencia');
    assert.ok(res.totalCost > 0);
    assert.ok(res.gainedRangeKm > 0);
    assert.equal(res.warning80, false, 'No debe advertir si el objetivo es 80%');
  });

  it('debe activar la advertencia warning80 si el objetivo supera el 80% en carga rápida DC', () => {
    const res = calculateCharge({
      batteryCapacity: 60,
      startSoc: 20,
      targetSoc: 100, // supera el 80%
      chargerPower: 150,
      vehicleMaxPower: 150,
      userPricePerKwh: 0.45,
      isAC: false
    });

    assert.equal(res.warning80, true, 'Debe activar aviso de ralentización >80%');
    assert.ok(res.phases.length >= 2, 'Debe incluir desglose de fases');
  });

  it('no debe activar warning80 en carga lenta AC aunque supere el 80%', () => {
    const res = calculateCharge({
      batteryCapacity: 50,
      startSoc: 20,
      targetSoc: 90,
      chargerPower: 11,
      vehicleMaxPower: 11,
      userPricePerKwh: 0.25,
      isAC: true
    });

    assert.equal(res.warning80, false);
  });

  it('debe contener vehículos preconfigurados válidos', () => {
    assert.ok(PRECONFIGURED_VEHICLES.length >= 10);
    const tesla = PRECONFIGURED_VEHICLES.find((v) => v.id === 'tesla_m3_rwd');
    assert.ok(tesla);
    assert.equal(tesla?.batteryCapacity, 60);
  });
});
