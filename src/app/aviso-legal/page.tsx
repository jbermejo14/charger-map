import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getTitular, valorOPendiente, FECHA_TEXTOS_LEGALES, type Titular } from '@/lib/legal';
import { absoluteUrl, SITE_NAME } from '@/lib/site';

const RUTA = '/aviso-legal';

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: `Aviso legal e información del titular de ${SITE_NAME} conforme al artículo 10 de la LSSI.`,
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl(RUTA) }
};

export default function AvisoLegalPage() {
  const titular = getTitular();
  const dato = (campo: keyof Titular) => valorOPendiente(titular, campo);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <Breadcrumbs
        items={[
          { name: 'Aviso legal', url: RUTA }
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">Aviso legal</h1>
      <div className="card legal-text">
        <h2>Datos del titular</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), se informa de que el titular de este sitio web es:
        </p>
        <ul>
          <li>Titular: {dato('nombre')}</li>
          <li>NIF: {dato('nif')}</li>
          <li>Domicilio: {dato('domicilio')}</li>
          <li>Correo electrónico de contacto: {dato('email')}</li>
          {titular.tipo === 'empresa' && <li>Datos del Registro Mercantil: {dato('registroMercantil')}</li>}
        </ul>

        <h2>Objeto del sitio</h2>
        <p>
          {SITE_NAME} ofrece un mapa y un buscador de los puntos de recarga para vehículos eléctricos del registro RIPREE del Ministerio para la Transición Ecológica y el Reto Demográfico, con páginas por provincia, municipio, operador y punto, y una calculadora de tiempo y coste de recarga.
        </p>

        <h2>Carácter no oficial y orientativo</h2>
        <p>
          Este sitio es independiente. No es una web oficial del Ministerio para la Transición Ecológica y el Reto Demográfico, de ninguna otra administración pública ni de ningún operador de recarga. Los datos proceden del registro RIPREE y pueden no estar al día ni reflejar si un punto funciona, su disponibilidad o su tarifa en cada momento. El resultado de la calculadora es orientativo.
        </p>

        <h2>Limitación de responsabilidad</h2>
        <p>
          El titular procura que los datos y cálculos sean correctos y estén actualizados, pero no garantiza su exactitud ni su vigencia. No se responsabiliza de las decisiones tomadas ni de los perjuicios derivados del uso de los datos o de los cálculos. Antes de desplazarte a un punto de recarga, confirma con su operador que está operativo y cuál es su tarifa.
        </p>

        <h2>Propiedad intelectual</h2>
        <p>
          Los textos, el diseño, el código, el logotipo y demás contenidos del sitio son propiedad del titular o se usan con autorización, y están protegidos por la normativa de propiedad intelectual. No se permite su reproducción, distribución o transformación sin permiso expreso, salvo para uso personal y citando la fuente.
        </p>

        <h2>Enlaces a terceros</h2>
        <p>
          El sitio puede enlazar a páginas de terceros, como el registro RIPREE, OpenStreetMap o los servicios de mapas de Esri. El titular no controla esos sitios ni responde de su contenido o de sus políticas.
        </p>

        <h2>Legislación aplicable</h2>
        <p>
          Este aviso se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a la normativa aplicable.
        </p>

        <p className="text-xs text-muted">Última revisión: {FECHA_TEXTOS_LEGALES}</p>
      </div>
    </div>
  );
}
