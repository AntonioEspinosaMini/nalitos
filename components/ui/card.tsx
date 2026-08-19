import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm', className)}
      {...props}
    />
  );
}

interface SectionTitleProps {
  children: ReactNode;
  /** Acción a la derecha del título (un enlace, un botón pequeño…). */
  action?: ReactNode;
  className?: string;
}

export function SectionTitle({ children, action, className }: SectionTitleProps) {
  return (
    <div className={cn('mb-2.5 flex items-baseline justify-between gap-3', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-400">{children}</h2>
      {action}
    </div>
  );
}
