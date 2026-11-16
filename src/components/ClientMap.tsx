'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type Map from './Map';

const DynamicMap = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-surface)] text-xs text-[var(--text-muted)] min-h-[350px] border border-[var(--border-color)] rounded-2xl">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        <span>Cargando mapa interactivo...</span>
      </div>
    </div>
  ),
});

export default function ClientMap(props: ComponentProps<typeof Map>) {
  return <DynamicMap {...props} />;
}
