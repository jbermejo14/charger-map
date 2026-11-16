// Lógica de cálculo de carga eléctrica
class EVCalculator {
  constructor() {
    this.efficiencyDC = 0.93; // 93% eficiencia en corriente continua
    this.efficiencyAC = 0.89; // 89% eficiencia en alterna por conversor inversor
  }

  /**
   * Calcula la estimación de carga teniendo en cuenta la curva de carga de vehículos eléctricos
   * @param {Object} params
   * @param {number} params.batteryCapacity - Capacidad neta en kWh
   * @param {number} params.startSoc - Estado de carga inicial (0-100%)
   * @param {number} params.targetSoc - Estado de carga deseado (0-100%)
   * @param {number} params.chargerPower - Potencia del cargador en kW
   * @param {number} params.vehicleMaxPower - Potencia máxima aceptada por el vehículo en kW
   * @param {number} params.pricePerKwh - Precio por kWh en €
   * @param {number} params.consumptionPer100km - Consumo medio del coche kWh/100km
   * @param {boolean} params.isAC - Si es carga en alterna (lenta/semirápida) o continua (rápida)
   */
  calculate(params) {
    const {
      batteryCapacity,
      startSoc,
      targetSoc,
      chargerPower,
      vehicleMaxPower,
      pricePerKwh,
      consumptionPer100km = 16.0,
      isAC = false
    } = params;

    if (startSoc >= targetSoc) {
      return {
        error: 'El porcentaje objetivo debe ser mayor que el porcentaje inicial.'
      };
    }

    const socDifference = targetSoc - startSoc;
    const netKwhNeeded = batteryCapacity * (socDifference / 100);
    const efficiency = isAC ? this.efficiencyAC : this.efficiencyDC;
    const grossKwhSupplied = netKwhNeeded / efficiency;
    const totalCost = grossKwhSupplied * pricePerKwh;
    const gainedRangeKm = (netKwhNeeded / consumptionPer100km) * 100;
    const costPer100km = (consumptionPer100km * pricePerKwh) / efficiency;

    // Potencia máxima efectiva entre lo que da el cargador y lo que soporta el coche
    const effectivePeakPower = Math.min(chargerPower, vehicleMaxPower);

    // Estimación de tiempo con curva de carga
    let totalMinutes = 0;
    const phases = [];

    if (isAC || effectivePeakPower <= 22) {
      // En AC la potencia es constante casi todo el ciclo
      const avgPower = effectivePeakPower * 0.95;
      const hours = netKwhNeeded / (avgPower * efficiency);
      totalMinutes = hours * 60;
      phases.push({
        label: `${startSoc}% a ${targetSoc}% (Carga regular AC)`,
        power: effectivePeakPower,
        minutes: Math.round(totalMinutes)
      });
    } else {
      // En DC rápida existe la famosa curva de carga (desaceleración >80%)
      // Dividimos en tramos:
      // Tramo 1: hasta 75% -> Potencia media ~80-85% del pico
      // Tramo 2: 75% a 85% -> Potencia media cae al 50-60% del pico
      // Tramo 3: 85% a 100% -> Potencia media cae a ~25-30% del pico (mínimo 15-20 kW)

      let currentSoc = startSoc;

      // Tramo 1: startSoc hasta min(targetSoc, 75)
      if (currentSoc < 75 && targetSoc > currentSoc) {
        const nextSoc = Math.min(targetSoc, 75);
        const kwh = batteryCapacity * ((nextSoc - currentSoc) / 100);
        const avgPwr = Math.max(25, effectivePeakPower * 0.85);
        const mins = (kwh / (avgPwr * efficiency)) * 60;
        totalMinutes += mins;
        phases.push({
          label: `${currentSoc}% a ${nextSoc}% (Rango óptimo)`,
          power: Math.round(avgPwr),
          minutes: Math.round(mins)
        });
        currentSoc = nextSoc;
      }

      // Tramo 2: currentSoc hasta min(targetSoc, 85)
      if (currentSoc < 85 && targetSoc > currentSoc) {
        const nextSoc = Math.min(targetSoc, 85);
        const kwh = batteryCapacity * ((nextSoc - currentSoc) / 100);
        const avgPwr = Math.max(20, Math.min(effectivePeakPower * 0.55, 75));
        const mins = (kwh / (avgPwr * efficiency)) * 60;
        totalMinutes += mins;
        phases.push({
          label: `${currentSoc}% a ${nextSoc}% (Ralentización)`,
          power: Math.round(avgPwr),
          minutes: Math.round(mins)
        });
        currentSoc = nextSoc;
      }

      // Tramo 3: currentSoc hasta targetSoc (85% a 100%)
      if (targetSoc > currentSoc) {
        const nextSoc = targetSoc;
        const kwh = batteryCapacity * ((nextSoc - currentSoc) / 100);
        const avgPwr = Math.max(12, Math.min(effectivePeakPower * 0.25, 30));
        const mins = (kwh / (avgPwr * efficiency)) * 60;
        totalMinutes += mins;
        phases.push({
          label: `${currentSoc}% a ${nextSoc}% (Protección y calibración)`,
          power: Math.round(avgPwr),
          minutes: Math.round(mins)
        });
      }
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    return {
      hours,
      minutes,
      totalMinutes: Math.round(totalMinutes),
      netKwhNeeded: Number(netKwhNeeded.toFixed(2)),
      grossKwhSupplied: Number(grossKwhSupplied.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      gainedRangeKm: Math.round(gainedRangeKm),
      costPer100km: Number(costPer100km.toFixed(2)),
      effectivePeakPower: Number(effectivePeakPower.toFixed(1)),
      phases,
      warning80: targetSoc > 80 && !isAC && effectivePeakPower > 22
    };
  }
}

// Instancia global
const evCalculator = new EVCalculator();
