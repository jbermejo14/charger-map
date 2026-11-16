import { NextResponse } from 'next/server';
import { getStationsByProvincia, getAllProvincias } from '@/lib/data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provinciaSlug = searchParams.get('provincia');

  if (provinciaSlug && provinciaSlug !== 'all') {
    const stations = getStationsByProvincia(provinciaSlug);
    return NextResponse.json(stations);
  }

  // Si no se pide provincia específica, cargamos todas las estaciones de todas las provincias
  // para alimentar el mapa completo con clustering de España
  const allProvincias = getAllProvincias();
  const allStations = allProvincias.flatMap((prov) => getStationsByProvincia(prov.slug));

  return NextResponse.json(allStations);
}
