const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** YYYY-MM-DD a partir de un Date, en hora local (no UTC). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback muy simple para entornos sin crypto.randomUUID.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** "5 de diciembre" / "5 de diciembre de 2027" si no es el año en curso. */
export function formatLongDate(iso: string, today = todayISO()): string {
  const d = parseISODate(iso);
  const sameYear = d.getFullYear() === parseISODate(today).getFullYear();
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}${sameYear ? '' : ` de ${d.getFullYear()}`}`;
}

/** "sábado, 5 de junio de 2027" — para la portada del dashboard. */
export function formatFullDate(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getDay()].toLowerCase()}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "5 dic" — formato corto para listas apretadas. */
export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/** Etiqueta relativa amable: Hoy / Mañana / Ayer / fecha larga. */
export function formatDayLabel(iso: string, today = todayISO()): string {
  if (iso === today) return 'Hoy';
  const base = parseISODate(today);
  if (iso === toISODate(addDays(base, 1))) return 'Mañana';
  if (iso === toISODate(addDays(base, -1))) return 'Ayer';
  return formatLongDate(iso, today);
}

/** Días entre hoy y una fecha. Negativo = ya pasó. */
export function daysUntil(iso: string, today = todayISO()): number {
  const ms = parseISODate(iso).getTime() - parseISODate(today).getTime();
  return Math.round(ms / 86_400_000);
}

export function isPast(iso: string, today = todayISO()): boolean {
  return iso < today;
}

/** "faltan 128 días" / "¡es hoy!" / "hace 3 días". */
export function countdownLabel(iso: string, today = todayISO()): string {
  const days = daysUntil(iso, today);
  if (days === 0) return '¡Es hoy!';
  if (days === 1) return 'Falta 1 día';
  if (days > 1) return `Faltan ${days.toLocaleString('es-ES')} días`;
  if (days === -1) return 'Fue ayer';
  return `Hace ${Math.abs(days).toLocaleString('es-ES')} días`;
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export const MONTH_NAMES = MONTHS;
export const WEEKDAY_NAMES = WEEKDAYS;
