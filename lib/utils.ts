import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normaliza texto para buscar sin acentos ni mayúsculas. */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// El español no separa los millares en números de cuatro cifras (3000, no
// 3.000), pero en una lista de importes eso se ve descuadrado: los agrupamos
// siempre para que €3.000 y €12.000 se lean igual.
const GROUPING = { useGrouping: 'always' } as Intl.NumberFormatOptions;

/** Importe en euros, sin céntimos: "€2.000". */
export function formatMoney(amount: number): string {
  return `€${Math.round(amount).toLocaleString('es-ES', GROUPING)}`;
}

/** Importe con céntimos solo si los tiene: "€2.000" / "€2.000,50". */
export function formatMoneyExact(amount: number): string {
  const hasCents = Math.abs(amount % 1) > 0.004;
  return `€${amount.toLocaleString('es-ES', {
    ...GROUPING,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Convierte lo que se escribe en un input de importe a número. */
export function parseMoney(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Porcentaje entero acotado a 0–100 (0 si el total es 0). */
export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}
