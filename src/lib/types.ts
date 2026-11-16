export interface StationRecord {
  id: string;
  nombre: string;
  operador: string;
  operador_original: string;
  comunidad: string;
  provincia: string;
  municipio: string;
  direccion: string;
  codigo_postal: string;
  horario: string;
  lat: number;
  lng: number;
  potencia_max_kw: number;
  num_conectores: number;
  conectores: string[];
  tipos_carga: string[];
  slug: string;
}

export interface MetadataRecord {
  fuente: string;
  fecha_datos: string;
  url_oficial: string;
  total_estaciones: number;
  total_descartados: number;
  motivos_descarte: Record<string, number>;
}

export interface MunicipioCount {
  municipio: string;
  slug: string;
  count: number;
}

export interface OperatorCount {
  operador: string;
  slug: string;
  count: number;
}

export interface ProvinciaSummary {
  provincia: string;
  slug: string;
  comunidad: string;
  total_puntos: number;
  potencia_ultra: number; // > 100 kW
  potencia_rapida: number; // 50 a 100 kW
  potencia_normal: number; // <= 22 kW
  conectores: Record<string, number>;
  operadores_principales: OperatorCount[];
  municipios: MunicipioCount[];
}

export interface GlobalSummary {
  metadata: MetadataRecord;
  provincias: ProvinciaSummary[];
  operadores: {
    operador: string;
    slug: string;
    total_puntos: number;
    provincias_cobertura: { provincia: string; slug: string; count: number }[];
  }[];
}
