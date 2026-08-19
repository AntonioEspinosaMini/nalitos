import { cn } from '@/lib/utils';

interface ProgressProps {
  /** Tramo principal, 0–100. */
  value: number;
  /** Tramo secundario que se pinta detrás (p. ej. comprometido pero sin pagar). */
  secondary?: number;
  className?: string;
  barClassName?: string;
  secondaryClassName?: string;
}

/**
 * Barra de progreso de uno o dos tramos. El segundo tramo va detrás del
 * primero, así que se pasa el total acumulado (no la diferencia).
 */
export function Progress({
  value,
  secondary,
  className,
  barClassName,
  secondaryClassName,
}: ProgressProps) {
  const main = Math.min(100, Math.max(0, value));
  const back = secondary == null ? null : Math.min(100, Math.max(0, secondary));

  return (
    <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-ink-100', className)}>
      {back != null && (
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full bg-blush-200 transition-[width] duration-500', secondaryClassName)}
          style={{ width: `${back}%` }}
        />
      )}
      <div
        className={cn('absolute inset-y-0 left-0 rounded-full bg-blush-500 transition-[width] duration-500', barClassName)}
        style={{ width: `${main}%` }}
      />
    </div>
  );
}
