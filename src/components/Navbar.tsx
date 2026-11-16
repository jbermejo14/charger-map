'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Zap, Sun, Moon, MapPin, Calculator, Building2 } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('ev_theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    if (initial === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('ev_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navLinks = [
    { href: '/', label: 'Buscador & Mapa', icon: MapPin },
    { href: '/provincia/madrid', label: 'Provincias', icon: MapPin },
    { href: '/operador/iberdrola', label: 'Operadores', icon: Building2 },
    { href: '/calculadora', label: 'Calculadora de Carga', icon: Calculator },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-[var(--border-color)] bg-[var(--bg-surface)]/95 backdrop-blur-md px-4 sm:px-6">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black tracking-tight text-[var(--text-primary)]">
              Electro<span className="text-orange-500">Charge</span>
            </span>
          </div>
        </Link>

        {/* Links de navegación */}
        <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-page)] p-1 rounded-xl border border-[var(--border-color)]">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href.split('/')[1] ? `/${link.href.split('/')[1]}` : 'none'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Acciones y Toggle de Modo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Cambiar tema claro u oscuro"
            className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-page)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:border-orange-500 transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-orange-500" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-orange-500" />
                <span className="hidden sm:inline">Modo Oscuro</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
