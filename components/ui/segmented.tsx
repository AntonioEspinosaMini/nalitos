'use client';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Contador opcional a la derecha de la etiqueta. */
  count?: number;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Con muchas opciones, deja que se desplacen en horizontal en móvil. */
  scrollable?: boolean;
}

/**
 * Selector de una sola línea. Es el atajo de toda la app: elegir responsable,
 * filtrar por estado o cambiar de vista se hace siempre en un toque.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  scrollable = false,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        'flex gap-1 rounded-xl bg-ink-100 p-1',
        scrollable && '-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              scrollable && 'flex-none',
              active ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            )}
          >
            {option.label}
            {option.count != null && (
              <span className={cn('text-xs tabular-nums', active ? 'text-ink-400' : 'text-ink-400')}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
