// Forma canónica de los datos: valores por defecto y "normalización" de lo que
// llega de remoto. Un bin creado con una versión anterior del esquema puede no
// traer algún campo: aquí se completa para que la UI nunca vea undefined.

import { DEFAULT_BUDGET_CATEGORIES, MAX_SEAT_COUNT, MIN_SEAT_COUNT } from './labels';
import { PLAN_HEIGHT, PLAN_WIDTH } from './seating';
import { newId, nowISO } from './date';
import type {
  AppData,
  BudgetCategory,
  Decision,
  DecisionOption,
  Expense,
  Guest,
  Table,
  Task,
  Vendor,
} from './types';

/** id estable y legible a partir del nombre de la categoría. */
export function categoryId(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || newId()
  );
}

export function defaultCategories(): BudgetCategory[] {
  return DEFAULT_BUDGET_CATEGORIES.map((name) => ({ id: categoryId(name), name }));
}

export function emptyAppData(): AppData {
  return {
    wedding: {
      id: 'boda-antonio-carmen',
      name: 'Antonio & Carmen',
      date: null,
      venue: null,
      total_budget: 0,
      created_at: nowISO(),
    },
    budget_categories: defaultCategories(),
    expenses: [],
    guests: [],
    tasks: [],
    vendors: [],
    decisions: [],
    tables: [],
  };
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

function text(value: unknown): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
}

function normalizeExpense(raw: Partial<Expense>): Expense {
  const total = Math.max(0, num(raw.total_amount));
  return {
    id: raw.id ?? newId(),
    concept: raw.concept ?? 'Sin concepto',
    category_id: raw.category_id ?? categoryId('Otros'),
    total_amount: total,
    // Nunca se guarda más pagado que el total: rompería los porcentajes.
    paid_amount: Math.min(total, Math.max(0, num(raw.paid_amount))),
    due_date: text(raw.due_date),
    notes: text(raw.notes),
    vendor_id: raw.vendor_id ?? null,
    created_at: raw.created_at ?? nowISO(),
    created_by: raw.created_by ?? 'Antonio',
  };
}

function normalizeGuest(raw: Partial<Guest>): Guest {
  return {
    id: raw.id ?? newId(),
    first_name: raw.first_name ?? '',
    last_name: raw.last_name ?? '',
    group: raw.group ?? '',
    side: raw.side ?? 'Ambos',
    status: raw.status ?? 'pendiente',
    menu: raw.menu ?? 'normal',
    allergies: text(raw.allergies),
    transport: Boolean(raw.transport),
    notes: text(raw.notes),
    created_at: raw.created_at ?? nowISO(),
  };
}

function normalizeTask(raw: Partial<Task>): Task {
  const status = raw.status ?? 'pendiente';
  return {
    id: raw.id ?? newId(),
    title: raw.title ?? '',
    description: text(raw.description),
    assigned_to: raw.assigned_to ?? 'Ambos',
    due_date: text(raw.due_date),
    priority: raw.priority ?? 'media',
    status,
    category: raw.category ?? 'otros',
    vendor_id: raw.vendor_id ?? null,
    created_at: raw.created_at ?? nowISO(),
    created_by: raw.created_by ?? 'Antonio',
    completed_at: status === 'completada' ? raw.completed_at ?? nowISO() : null,
  };
}

function normalizeVendor(raw: Partial<Vendor>): Vendor {
  return {
    id: raw.id ?? newId(),
    name: raw.name ?? '',
    category_id: raw.category_id ?? categoryId('Otros'),
    contact_name: text(raw.contact_name),
    phone: text(raw.phone),
    email: text(raw.email),
    web: text(raw.web),
    price: Math.max(0, num(raw.price)),
    status: raw.status ?? 'por_contactar',
    hired_date: text(raw.hired_date),
    notes: text(raw.notes),
    created_at: raw.created_at ?? nowISO(),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeTable(raw: Partial<Table>): Table {
  // La capacidad es la longitud del array de sillas, así que se acota aquí:
  // una mesa de 0 sillas no se puede dibujar y una de 200 no existe.
  const seats = Array.isArray(raw.seats) ? raw.seats : [];
  const count = clamp(seats.length || MIN_SEAT_COUNT, MIN_SEAT_COUNT, MAX_SEAT_COUNT);
  return {
    id: raw.id ?? newId(),
    name: raw.name?.trim() || 'Mesa',
    shape: raw.shape === 'rectangular' ? 'rectangular' : 'redonda',
    x: clamp(num(raw.x, PLAN_WIDTH / 2), 0, PLAN_WIDTH),
    y: clamp(num(raw.y, PLAN_HEIGHT / 2), 0, PLAN_HEIGHT),
    rotation: ((Math.round(num(raw.rotation)) % 360) + 360) % 360,
    seats: Array.from({ length: count }, (_, i) => {
      const value = seats[i];
      return typeof value === 'string' && value ? value : null;
    }),
    is_head: Boolean(raw.is_head),
    notes: text(raw.notes),
    created_at: raw.created_at ?? nowISO(),
  };
}

/**
 * Deja las sillas coherentes con la lista de invitados: vacía las que apuntan
 * a alguien que ya no existe y, si un invitado apareciese sentado dos veces
 * (dos escrituras que se cruzaron), le deja solo la primera silla. La regla
 * "un invitado, una silla" tiene que aguantar aunque el bin venga tocado.
 */
function reconcileSeats(tables: Table[], guests: Guest[]): Table[] {
  const known = new Set(guests.map((guest) => guest.id));
  const used = new Set<string>();
  return tables.map((table) => ({
    ...table,
    seats: table.seats.map((guestId) => {
      if (!guestId || !known.has(guestId) || used.has(guestId)) return null;
      used.add(guestId);
      return guestId;
    }),
  }));
}

function normalizeOption(raw: Partial<DecisionOption>): DecisionOption {
  return {
    id: raw.id ?? newId(),
    name: raw.name ?? '',
    price: Math.max(0, num(raw.price)),
    pros: stringList(raw.pros),
    cons: stringList(raw.cons),
    notes: text(raw.notes),
    rating_antonio: Math.min(5, Math.max(0, Math.round(num(raw.rating_antonio)))),
    rating_carmen: Math.min(5, Math.max(0, Math.round(num(raw.rating_carmen)))),
    winner: Boolean(raw.winner),
  };
}

function normalizeDecision(raw: Partial<Decision>): Decision {
  const options = Array.isArray(raw.options) ? raw.options.map(normalizeOption) : [];
  // Solo puede haber una ganadora: si el bin trae varias, gana la primera.
  const firstWinner = options.findIndex((o) => o.winner);
  return {
    id: raw.id ?? newId(),
    title: raw.title ?? '',
    description: text(raw.description),
    status: raw.status ?? 'pendiente',
    due_date: text(raw.due_date),
    options: options.map((o, i) => ({ ...o, winner: i === firstWinner })),
    vendor_id: raw.vendor_id ?? null,
    created_at: raw.created_at ?? nowISO(),
  };
}

/** Rellena lo que falte y deja los datos listos para la UI. */
export function normalizeAppData(data: Partial<AppData> | null | undefined): AppData {
  const base = emptyAppData();
  if (!data) return base;

  const categories =
    Array.isArray(data.budget_categories) && data.budget_categories.length > 0
      ? data.budget_categories.map((c) => ({ id: c.id ?? categoryId(c.name), name: c.name }))
      : base.budget_categories;

  const known = new Set(categories.map((c) => c.id));
  const expenses = (data.expenses ?? []).map(normalizeExpense);
  const vendors = (data.vendors ?? []).map(normalizeVendor);

  // Si algo apunta a una categoría que ya no existe, se recoloca en "Otros"
  // en vez de desaparecer del reparto por categorías.
  const otros = categoryId('Otros');
  const fallback = known.has(otros) ? otros : categories[0].id;

  const guests = (data.guests ?? []).map(normalizeGuest);
  const tables = (data.tables ?? []).map(normalizeTable);

  return {
    wedding: { ...base.wedding, ...data.wedding, total_budget: Math.max(0, num(data.wedding?.total_budget)) },
    budget_categories: categories,
    expenses: expenses.map((e) => (known.has(e.category_id) ? e : { ...e, category_id: fallback })),
    guests,
    tasks: (data.tasks ?? []).map(normalizeTask),
    vendors: vendors.map((v) => (known.has(v.category_id) ? v : { ...v, category_id: fallback })),
    decisions: (data.decisions ?? []).map(normalizeDecision),
    tables: reconcileSeats(tables, guests),
  };
}
