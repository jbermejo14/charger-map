import Link from 'next/link';
import { MapPin, Search, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-5 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/30">
          <MapPin className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">Error 404</span>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            Página o Punto No Encontrado
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            La provincia, municipio o punto de recarga que buscas no existe en el registro RIPREE o ha sido actualizado recientemente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-on-accent px-4 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity"
          >
            <Home className="h-3.5 w-3.5" /> Volver al Inicio
          </Link>
          <Link
            href="/provincia/madrid"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-body)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:border-accent transition-colors"
          >
            <Search className="h-3.5 w-3.5" /> Ver Provincias
          </Link>
        </div>
      </div>
    </div>
  );
}
