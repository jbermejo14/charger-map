import Link from 'next/link';
import { ShieldCheck, Info, ExternalLink } from 'lucide-react';
import { getGlobalSummary } from '@/lib/data';

export default function Footer() {
  const summary = getGlobalSummary();
  const date = summary.metadata.fecha_datos || '16 de noviembre de 2026';
  const total = summary.metadata.total_estaciones.toLocaleString('es-ES');

  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] mt-auto py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Banner de fuente de los datos */}
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 sm:p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-orange-500/20 p-2 text-orange-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Datos del Censo Público de Recarga (RIPREE)
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Fuente: <strong>Registro RIPREE</strong> del Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO) / Secretaría de Estado de Energía catalogado en <strong>datos.gob.es</strong>. Fecha de los datos: <strong>{date}</strong>. Total censado: <strong>{total} estaciones públicas</strong>.
              </p>
            </div>
          </div>
          <a
            href="https://energia.serviciosmin.gob.es/Ripree/ExportarInstalaciones/Export"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-orange-500 transition-colors"
          >
            Exportación del registro <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Aviso de Transparencia de Tarifas y Disponibilidad */}
        <div className="flex items-start gap-2.5 text-xs text-[var(--text-muted)] mb-8 bg-[var(--bg-page)] p-3.5 rounded-xl border border-[var(--border-color)]">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
          <p>
            <strong>Transparencia:</strong> Este catálogo no inventa tarifas ni simula disponibilidad en tiempo real no confirmada. Las tarifas son dinámicas según cada operador y contrato, por lo que en la calculadora de recarga el precio es siempre configurable por el usuario.
          </p>
        </div>

        {/* Links útiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs text-[var(--text-secondary)] mb-8">
          <div>
            <h5 className="font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 text-[11px]">
              Comunidades
            </h5>
            <ul className="space-y-1.5">
              <li><Link href="/provincia/madrid" className="hover:text-orange-500">Madrid</Link></li>
              <li><Link href="/provincia/barcelona" className="hover:text-orange-500">Barcelona</Link></li>
              <li><Link href="/provincia/valencia-valencia" className="hover:text-orange-500">Valencia</Link></li>
              <li><Link href="/provincia/sevilla" className="hover:text-orange-500">Sevilla</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 text-[11px]">
              Operadores
            </h5>
            <ul className="space-y-1.5">
              <li><Link href="/operador/iberdrola" className="hover:text-orange-500">Iberdrola</Link></li>
              <li><Link href="/operador/endesa-x-way" className="hover:text-orange-500">Endesa X Way</Link></li>
              <li><Link href="/operador/repsol" className="hover:text-orange-500">Repsol</Link></li>
              <li><Link href="/operador/tesla" className="hover:text-orange-500">Tesla</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 text-[11px]">
              Herramientas
            </h5>
            <ul className="space-y-1.5">
              <li><Link href="/" className="hover:text-orange-500">Mapa de Recarga</Link></li>
              <li><Link href="/calculadora" className="hover:text-orange-500">Calculadora de Carga</Link></li>
              <li><Link href="/sitemap.xml" className="hover:text-orange-500">Mapa del Sitio (Sitemap)</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 text-[11px]">
              Regulación & Afir
            </h5>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              Portal de acceso a infraestructuras de combustible alternativo conforme al reglamento europeo AFIR y registro RIPREE.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-3">
          <p>© {new Date().getFullYear()} ElectroCharge. Infraestructura de recarga en España.</p>
          <p className="text-orange-500 font-medium">Diseño Naranja y Negro · Datos RIPREE</p>
        </div>
      </div>
    </footer>
  );
}
