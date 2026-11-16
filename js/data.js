// Base de datos de vehículos y carga de estaciones reales de España
const EV_DATABASE = {
  vehicles: [
    {
      id: 'tesla_m3_rwd',
      name: 'Tesla Model 3 RWD',
      brand: 'Tesla',
      batteryCapacity: 60, // kWh netos
      maxDcPower: 170, // kW
      maxAcPower: 11, // kW
      avgConsumption: 14.5 // kWh/100km
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
      name: 'Personalizado (Especificar datos)',
      brand: 'Personalizado',
      batteryCapacity: 65,
      maxDcPower: 150,
      maxAcPower: 11,
      avgConsumption: 16.0
    }
  ],

  stations: [],

  async loadStations() {
    try {
      const response = await fetch('data/chargers.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.stations = await response.json();
      console.log(`Loaded ${this.stations.length} real stations from data/chargers.json`);
      return this.stations;
    } catch (error) {
      console.error('Error loading data/chargers.json:', error);
      return [];
    }
  }
};
