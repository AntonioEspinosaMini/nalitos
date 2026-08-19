import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  /** Clases de color: vienen de los mapas de lib/labels.ts. */
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        'bg-ink-100 text-ink-600 ring-ink-200',
        className
      )}
    >
      {children}
    </span>
  );
}

interface BadgeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/** Badge que además es un botón: tocarlo cambia el estado en un toque. */
export function BadgeButton({ children, className, ...props }: BadgeButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-transform active:scale-95',
        'bg-ink-100 text-ink-600 ring-ink-200',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
