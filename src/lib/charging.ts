/**
 * Módulo puro de cálculo de recarga para vehículos eléctricos.
 * Sin efectos secundarios ni dependencias externas.
 */

export interface EVModel {
  id: string;
  name: string;
  brand: string;
  batteryCapacity: number; // kWh útiles
  maxDcPower: number; // kW
  maxAcPower: number; // kW
  avgConsumption: number; // kWh/100km
}

export const PRECONFIGURED_VEHICLES: EVModel[] = [
  {
    id: 'tesla_m3_rwd',
    name: 'Tesla Model 3 RWD',
    brand: 'Tesla',
    batteryCapacity: 60,
    maxDcPower: 170,
    maxAcPower: 11,
    avgConsumption: 14.5
  },
  {
    id: 'tesla_my_lr',
    name: 'Tesla Model Y Long Range',
    brand: 'Tesla',
    batteryCapacity: 78,
    maxDcPower: 250,
    maxAcPower: 11,
    avgConsumption: 16.5
  },
  {
    id: 'hyundai_ioniq5',
    name: 'Hyundai Ioniq 5 (77 kWh)',
    brand: 'Hyundai',
    batteryCapacity: 77.4,
    maxDcPower: 240,
    maxAcPower: 11,
    avgConsumption: 17.0
  },
  {
    id: 'kia_ev6',
    name: 'Kia EV6 Long Range',
    brand: 'Kia',
    batteryCapacity: 77.4,
    maxDcPower: 235,
    maxAcPower: 11,
    avgConsumption: 16.8
  },
  {
    id: 'mg4_standard',
    name: 'MG4 Electric Standard',
    brand: 'MG',
    batteryCapacity: 51,
    maxDcPower: 88,
    maxAcPower: 6.6,
    avgConsumption: 15.0
  },
  {
    id: 'renault_megane_etech',
    name: 'Renault Megane E-Tech EV60',
    brand: 'Renault',
    batteryCapacity: 60,
    maxDcPower: 130,
    maxAcPower: 22,
    avgConsumption: 15.8
  },
  {
    id: 'peugeot_e208',
    name: 'Peugeot e-208 GT',
    brand: 'Peugeot',
    batteryCapacity: 51,
    maxDcPower: 100,
    maxAcPower: 11,
    avgConsumption: 14.5
  },
  {
    id: 'vw_id4',
    name: 'Volkswagen ID.4 Pro',
    brand: 'Volkswagen',
    batteryCapacity: 77,
    maxDcPower: 135,
    maxAcPower: 11,
    avgConsumption: 17.2
  },
  {
    id: 'cupra_born',
    name: 'Cupra Born e-Boost',
    brand: 'Cupra',
    batteryCapacity: 58,
    maxDcPower: 120,
    maxAcPower: 11,
    avgConsumption: 15.5
  },
  {
    id: 'byd_atto3',
    name: 'BYD Atto 3 Design',
    brand: 'BYD',
    batteryCapacity: 60.5,
    maxDcPower: 88,
    maxAcPower: 11,
    avgConsumption: 15.6
  },
  {
    id: 'porsche_taycan',
    name: 'Porsche Taycan Plus',
    brand: 'Porsche',
    batteryCapacity: 93.4,
    maxDcPower: 270,
    maxAcPower: 22,
    avgConsumption: 20.5
  },
  {
    id: 'custom',
    name: 'Personalizado (Indicar especificaciones)',
    brand: 'Personalizado',
    batteryCapacity: 60,
    maxDcPower: 150,
    maxAcPower: 11,
    avgConsumption: 16.0
  }
];

export const DEFAULT_EXAMPLE_PRICE_PER_KWH = 0.45; // Tarifa de ejemplo documentada (€/kWh)

export interface CalculationInput {
  batteryCapacity: number; // kWh
  startSoc: number; // 0 a 100%
  targetSoc: number; // 0 a 100%
  chargerPower: number; // kW
  vehicleMaxPower: number; // kW
  userPricePerKwh: number; // €/kWh introducido por el usuario
  avgConsumption?: number; // kWh/100km
  isAC?: boolean;
}

export interface PhaseBreakdown {
  label: string;
  avgPower: number;
  minutes: number;
}

export interface CalculationResult {
  error?: string;
  hours: number;
  minutes: number;
  totalMinutes: number;
  netKwhNeeded: number;
  grossKwhSupplied: number;
  totalCost: number;
  costPer100km: number;
  gainedRangeKm: number;
  effectivePeakPower: number;
  phases: PhaseBreakdown[];
  warning80: boolean;
}

const EFFICIENCY_DC = 0.93; // 93% en corriente continua
const EFFICIENCY_AC = 0.89; // 89% en alterna por conversor inversor

/**
 * Calcula el tiempo y coste de recarga simulando la curva de carga física
 */
export function calculateCharge(input: CalculationInput): CalculationResult {
  const {
    batteryCapacity,
    startSoc,
    targetSoc,
    chargerPower,
    vehicleMaxPower,
    userPricePerKwh,
    avgConsumption = 16.0,
    isAC = false
  } = input;

  if (startSoc >= targetSoc) {
    return {
      error: 'El porcentaje objetivo debe ser mayor que el porcentaje inicial.',
      hours: 0,
      minutes: 0,
      totalMinutes: 0,
      netKwhNeeded: 0,
      grossKwhSupplied: 0,
      totalCost: 0,
      costPer100km: 0,
      gainedRangeKm: 0,
      effectivePeakPower: 0,
      phases: [],
      warning80: false
    };
  }

  const socDiff = targetSoc - startSoc;
  const netKwhNeeded = batteryCapacity * (socDiff / 100);
  const efficiency = isAC ? EFFICIENCY_AC : EFFICIENCY_DC;
  const grossKwhSupplied = netKwhNeeded / efficiency;
  const totalCost = grossKwhSupplied * userPricePerKwh;
  const gainedRangeKm = (netKwhNeeded / avgConsumption) * 100;
  const costPer100km = (avgConsumption * userPricePerKwh) / efficiency;

  const effectivePeakPower = Math.min(chargerPower, vehicleMaxPower);

  let totalMinutes = 0;
  const phases: PhaseBreakdown[] = [];

  if (isAC || effectivePeakPower <= 22) {
    const avgPower = effectivePeakPower * 0.95;
    const hours = netKwhNeeded / (avgPower * efficiency);
    totalMinutes = hours * 60;
    phases.push({
      label: `${startSoc}% a ${targetSoc}% (Carga constante AC)`,
      avgPower: Math.round(effectivePeakPower),
      minutes: Math.round(totalMinutes)
    });
  } else {
    // Modelado de curva de carga rápida DC
    let currentSoc = startSoc;

    // Tramo 1: hasta 75%
    if (currentSoc < 75 && targetSoc > currentSoc) {
      const nextSoc = Math.min(targetSoc, 75);
      const kwh = batteryCapacity * ((nextSoc - currentSoc) / 100);
      const avgPwr = Math.max(25, effectivePeakPower * 0.85);
      const mins = (kwh / (avgPwr * efficiency)) * 60;
      totalMinutes += mins;
      phases.push({
        label: `${currentSoc}% a ${nextSoc}% (Potencia alta)`,
        avgPower: Math.round(avgPwr),
        minutes: Math.round(mins)
      });
      currentSoc = nextSoc;
    }

    // Tramo 2: 75% a 85%
    if (currentSoc < 85 && targetSoc > currentSoc) {
      const nextSoc = Math.min(targetSoc, 85);
      const kwh = batteryCapacity * ((nextSoc - currentSoc) / 100);
      const avgPwr = Math.max(20, Math.min(effectivePeakPower * 0.55, 75));
      const mins = (kwh / (avgPwr * efficiency)) * 60;
      totalMinutes += mins;
      phases.push({
        label: `${currentSoc}% a ${nextSoc}% (Curva descendente)`,
        avgPower: Math.round(avgPwr),
        minutes: Math.round(mins)
      });
      currentSoc = nextSoc;
    }

    // Tramo 3: 85% a 100%
    if (targetSoc > currentSoc) {
      const nextSoc = targetSoc;
      const kwh = batteryCapacity * ((nextSoc - currentSoc) / 100);
      const avgPwr = Math.max(12, Math.min(effectivePeakPower * 0.25, 30));
      const mins = (kwh / (avgPwr * efficiency)) * 60;
      totalMinutes += mins;
      phases.push({
        label: `${currentSoc}% a ${nextSoc}% (Protección celdas)`,
        avgPower: Math.round(avgPwr),
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
    costPer100km: Number(costPer100km.toFixed(2)),
    gainedRangeKm: Math.round(gainedRangeKm),
    effectivePeakPower: Number(effectivePeakPower.toFixed(1)),
    phases,
    warning80: targetSoc > 80 && !isAC && effectivePeakPower > 22
  };
}
