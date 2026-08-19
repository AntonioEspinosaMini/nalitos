import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Normalmente el botón de "añadir el primero". */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center animate-in-fade',
        className
      )}
    >
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blush-50 text-blush-500">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <p className="font-display text-xl text-ink-800">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
