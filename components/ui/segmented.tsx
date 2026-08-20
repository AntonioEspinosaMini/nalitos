'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Contador opcional a la derecha de la etiqueta. */
  count?: number;
  /** Icono opcional. Con iconOnly sustituye al texto. */
  icon?: LucideIcon;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Con muchas opciones, deja que se desplacen en horizontal en móvil. */
  scrollable?: boolean;
  /**
   * Saca el carril unos píxeles a los lados para alinearlo con el borde de la
   * pantalla. Estorba cuando el selector va dentro de una fila junto a otro.
   */
  bleed?: boolean;
  /** Solo iconos: la etiqueta pasa a aria-label. Para cuando sobra poco ancho. */
  iconOnly?: boolean;
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
  bleed = true,
  iconOnly = false,
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        // min-w-0 para que pueda encogerse dentro de una fila en vez de desbordarla.
        'flex min-w-0 gap-1 rounded-xl bg-ink-100 p-1',
        scrollable && 'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        scrollable && bleed && '-mx-1 px-1',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={iconOnly ? option.label : undefined}
            title={iconOnly ? option.label : undefined}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg py-1.5 text-sm font-medium transition-colors',
              iconOnly ? 'px-2.5' : 'px-3',
              scrollable && 'flex-none',
              active ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {!iconOnly && option.label}
            {!iconOnly && option.count != null && (
              <span className="text-xs tabular-nums text-ink-400">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
