'use client';

import type { ReactNode } from 'react';
import { SyncIndicator } from './sync-indicator';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Botón principal de la página (normalmente "Añadir"). */
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      <div className="flex flex-none items-center gap-2">
        <SyncIndicator />
        {action}
      </div>
    </header>
  );
}
