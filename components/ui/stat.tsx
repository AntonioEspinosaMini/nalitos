import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
}

/** Cifra suelta con su etiqueta. La unidad mínima de todos los resúmenes. */
export function Stat({ label, value, hint, className, valueClassName }: StatProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">{label}</p>
      <p className={cn('mt-0.5 truncate text-xl font-semibold tabular-nums text-ink-800', valueClassName)}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

/** Rejilla de cifras: 2 columnas en móvil, 4 en escritorio. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-4', className)}>{children}</div>;
}
