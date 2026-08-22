// Todo lo que se calcula a partir de los datos (no se guarda nunca).
// Manteniéndolo aquí, el dashboard y cada sección enseñan siempre lo mismo.

import { percent } from './utils';
import { todayISO } from './date';
import type {
  AppData,
  Assignee,
  Decision,
  Expense,
  ExpenseStatus,
  Guest,
  GuestMenu,
  Table,
  Task,
  Vendor,
} from './types';

// ─── Presupuesto ─────────────────────────────────────────────────────────────

export function expenseStatus(expense: Expense): ExpenseStatus {
  if (expense.paid_amount <= 0) return 'pendiente';
  if (expense.paid_amount >= expense.total_amount) return 'pagado';
  return 'parcial';
}

export interface BudgetSummary {
  /** Presupuesto previsto. */
  budget: number;
  /** Ya pagado. */
  spent: number;
  /** Comprometido pero todavía sin pagar. */
  pending: number;
  /** Presupuesto sin asignar a ningún gasto. Negativo = te has pasado. */
  available: number;
  /** Total comprometido (pagado + pendiente). */
  committed: number;
  /** % del presupuesto ya pagado. */
  percentSpent: number;
  /** % del presupuesto ya comprometido. */
  percentCommitted: number;
  /** true si lo comprometido supera el presupuesto. */
  overBudget: boolean;
}

export function budgetSummary(data: AppData): BudgetSummary {
  const budget = data.wedding.total_budget;
  const spent = data.expenses.reduce((acc, e) => acc + e.paid_amount, 0);
  const committed = data.expenses.reduce((acc, e) => acc + e.total_amount, 0);
  const pending = Math.max(0, committed - spent);
  return {
    budget,
    spent,
    pending,
    committed,
    available: budget - committed,
    percentSpent: percent(spent, budget),
    percentCommitted: percent(committed, budget),
    overBudget: budget > 0 && committed > budget,
  };
}

export interface CategoryTotal {
  id: string;
  name: string;
  total: number;
  paid: number;
  pending: number;
  /** % que representa esta categoría sobre el total comprometido. */
  share: number;
  count: number;
}

/** Gasto agrupado por categoría, de mayor a menor. Sin categorías vacías. */
export function totalsByCategory(data: AppData): CategoryTotal[] {
  const committed = data.expenses.reduce((acc, e) => acc + e.total_amount, 0);
  return data.budget_categories
    .map((category) => {
      const expenses = data.expenses.filter((e) => e.category_id === category.id);
      const total = expenses.reduce((acc, e) => acc + e.total_amount, 0);
      const paid = expenses.reduce((acc, e) => acc + e.paid_amount, 0);
      return {
        id: category.id,
        name: category.name,
        total,
        paid,
        pending: Math.max(0, total - paid),
        share: percent(total, committed),
        count: expenses.length,
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

export interface VendorMoney {
  /** Precio acordado con el proveedor. */
  price: number;
  /** Suma de lo pagado en los gastos asociados. */
  paid: number;
  /** Lo que queda por pagar. */
  pending: number;
  percentPaid: number;
}

/**
 * El dinero de un proveedor sale de sus gastos asociados: así el presupuesto
 * y la ficha del proveedor nunca se contradicen ni se cuenta nada dos veces.
 */
export function vendorMoney(data: AppData, vendor: Vendor): VendorMoney {
  const linked = data.expenses.filter((e) => e.vendor_id === vendor.id);
  const paid = linked.reduce((acc, e) => acc + e.paid_amount, 0);
  // Si hay gastos apuntados por encima del precio acordado, manda el gasto real.
  const price = Math.max(
    vendor.price,
    linked.reduce((acc, e) => acc + e.total_amount, 0)
  );
  return {
    price,
    paid,
    pending: Math.max(0, price - paid),
    percentPaid: percent(paid, price),
  };
}

export function vendorTasks(data: AppData, vendorId: string): Task[] {
  return data.tasks.filter((t) => t.vendor_id === vendorId);
}

export function vendorExpenses(data: AppData, vendorId: string): Expense[] {
  return data.expenses.filter((e) => e.vendor_id === vendorId);
}

export function vendorDecisions(data: AppData, vendorId: string): Decision[] {
  return data.decisions.filter((d) => d.vendor_id === vendorId);
}

// ─── Invitados ───────────────────────────────────────────────────────────────

export interface GuestStats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  withTransport: number;
}

export function guestStats(guests: Guest[]): GuestStats {
  return {
    total: guests.length,
    confirmed: guests.filter((g) => g.status === 'confirmado').length,
    pending: guests.filter((g) => g.status === 'pendiente').length,
    declined: guests.filter((g) => g.status === 'no_viene').length,
    // Solo cuentan los que vienen: un "no viene" no ocupa asiento en el bus.
    withTransport: guests.filter((g) => g.transport && g.status !== 'no_viene').length,
  };
}

export function guestFullName(guest: Guest): string {
  return `${guest.first_name} ${guest.last_name}`.trim() || 'Sin nombre';
}

/** Agrupa invitados por familia/grupo, con los que no tienen grupo al final. */
export function guestsByGroup(guests: Guest[]): { group: string; guests: Guest[] }[] {
  const map = new Map<string, Guest[]>();
  for (const guest of guests) {
    const key = guest.group.trim() || 'Sin grupo';
    const list = map.get(key);
    if (list) list.push(guest);
    else map.set(key, [guest]);
  }
  return [...map.entries()]
    .map(([group, list]) => ({ group, guests: list }))
    .sort((a, b) => {
      if (a.group === 'Sin grupo') return 1;
      if (b.group === 'Sin grupo') return -1;
      return a.group.localeCompare(b.group, 'es');
    });
}

// ─── Mesas ───────────────────────────────────────────────────────────────────
// La silla manda: quién se sienta dónde vive en `Table.seats`. Todo lo que se
// enseña del invitado (su mesa, su número de silla) se deriva de aquí, igual
// que el dinero de un proveedor sale de sus gastos. Así el plano y la ficha del
// invitado no pueden contradecirse.

export interface GuestSeat {
  table: Table;
  /** Índice en `Table.seats`. La silla que se enseña es este número más uno. */
  index: number;
}

/**
 * Dónde está sentado cada invitado, indexado por su id. Se construye una vez y
 * se reutiliza: mirar mesa por mesa en cada fila de la lista sería tirar el
 * tiempo. Si un invitado apareciese en dos sillas, manda la primera.
 */
export function seatMap(tables: Table[]): Map<string, GuestSeat> {
  const map = new Map<string, GuestSeat>();
  for (const table of tables) {
    table.seats.forEach((guestId, index) => {
      if (guestId && !map.has(guestId)) map.set(guestId, { table, index });
    });
  }
  return map;
}

/** "Mesa 4 · silla 3". El número de silla se enseña empezando en 1. */
export function seatLabel(table: Table, index: number): string {
  return `${table.name} · silla ${index + 1}`;
}

/** Las mesas en el orden en el que se leen: la de los novios primero. */
export function sortedTables(tables: Table[]): Table[] {
  return [...tables].sort((a, b) => {
    if (a.is_head !== b.is_head) return a.is_head ? -1 : 1;
    return a.name.localeCompare(b.name, 'es', { numeric: true });
  });
}

export interface MenuCount {
  menu: GuestMenu;
  count: number;
}

export interface TableSummary {
  table: Table;
  /** Sillas que tiene la mesa. */
  capacity: number;
  seated: number;
  free: number;
  /** Quién ocupa cada silla, por índice. null = silla libre o invitado borrado. */
  occupants: (Guest | null)[];
  /** Menús especiales de los que están sentados. El normal no se lista. */
  menus: MenuCount[];
  /** Sentados con alguna alergia apuntada. */
  allergies: number;
  /** Sentados que han dicho que no vienen: hay que sacarlos de la mesa. */
  declined: number;
  /** Sentados que todavía no han confirmado. */
  unconfirmed: number;
  percentFull: number;
}

export function tableSummary(guests: Guest[], table: Table): TableSummary {
  const byId = new Map(guests.map((guest) => [guest.id, guest]));
  const occupants = table.seats.map((id) => (id ? byId.get(id) ?? null : null));
  const sitting = occupants.filter((guest): guest is Guest => guest != null);

  const menuCounts = new Map<GuestMenu, number>();
  for (const guest of sitting) {
    if (guest.menu === 'normal') continue;
    menuCounts.set(guest.menu, (menuCounts.get(guest.menu) ?? 0) + 1);
  }

  return {
    table,
    capacity: table.seats.length,
    seated: sitting.length,
    free: table.seats.length - sitting.length,
    occupants,
    menus: [...menuCounts.entries()]
      .map(([menu, count]) => ({ menu, count }))
      .sort((a, b) => b.count - a.count),
    allergies: sitting.filter((guest) => guest.allergies != null).length,
    declined: sitting.filter((guest) => guest.status === 'no_viene').length,
    unconfirmed: sitting.filter((guest) => guest.status === 'pendiente').length,
    percentFull: percent(sitting.length, table.seats.length),
  };
}

export interface SeatingStats {
  tables: number;
  /** Sillas puestas en total. */
  capacity: number;
  seated: number;
  /** Sillas libres. */
  free: number;
  /** Invitados que vienen (o pueden venir) y siguen sin silla. */
  unseated: number;
  /** Sentados que ya han dicho que no vienen. */
  declinedSeated: number;
  percentSeated: number;
}

/**
 * El resumen del plano. `unseated` es la cifra que importa de verdad cuando se
 * acerca la fecha: cuánta gente sigue de pie.
 */
export function seatingStats(data: AppData): SeatingStats {
  const seated = seatMap(data.tables);
  const capacity = data.tables.reduce((acc, table) => acc + table.seats.length, 0);
  // Un "no viene" no cuenta como pendiente de sentar: no hay que buscarle sitio.
  const coming = data.guests.filter((guest) => guest.status !== 'no_viene');
  const occupied = data.guests.filter((guest) => seated.has(guest.id)).length;

  return {
    tables: data.tables.length,
    capacity,
    seated: occupied,
    free: Math.max(0, capacity - occupied),
    unseated: coming.filter((guest) => !seated.has(guest.id)).length,
    declinedSeated: data.guests.filter((guest) => guest.status === 'no_viene' && seated.has(guest.id)).length,
    percentSeated: percent(occupied, coming.length),
  };
}

/**
 * Los que todavía no tienen silla, agrupados igual que en la lista de
 * invitados: por familia. Es como se sienta a la gente de verdad, por grupos.
 */
export function unseatedGuests(data: AppData): Guest[] {
  const seated = seatMap(data.tables);
  return data.guests
    .filter((guest) => guest.status !== 'no_viene' && !seated.has(guest.id))
    .sort((a, b) => {
      const byGroup = (a.group || 'zzz').localeCompare(b.group || 'zzz', 'es');
      if (byGroup !== 0) return byGroup;
      return guestFullName(a).localeCompare(guestFullName(b), 'es');
    });
}

// ─── Tareas ──────────────────────────────────────────────────────────────────

export interface TaskProgress {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
  percent: number;
}

export function taskProgress(tasks: Task[]): TaskProgress {
  const done = tasks.filter((t) => t.status === 'completada').length;
  return {
    total: tasks.length,
    done,
    inProgress: tasks.filter((t) => t.status === 'en_progreso').length,
    pending: tasks.filter((t) => t.status === 'pendiente').length,
    percent: percent(done, tasks.length),
  };
}

export function tasksFor(tasks: Task[], assignee: Assignee): Task[] {
  return tasks.filter((t) => t.assigned_to === assignee);
}

// ─── Próximos vencimientos ───────────────────────────────────────────────────

export type DeadlineKind = 'tarea' | 'pago' | 'decision';

export interface Deadline {
  id: string;
  kind: DeadlineKind;
  title: string;
  date: string;
  /** Importe, solo en los pagos. */
  amount: number | null;
  overdue: boolean;
}

/**
 * Une en una sola lista lo que tiene fecha y sigue abierto: tareas sin
 * completar, gastos sin pagar del todo y decisiones sin decidir.
 */
export function upcomingDeadlines(data: AppData, limit = 5, today = todayISO()): Deadline[] {
  const items: Deadline[] = [];

  for (const task of data.tasks) {
    if (task.status === 'completada' || !task.due_date) continue;
    items.push({
      id: `task-${task.id}`,
      kind: 'tarea',
      title: task.title,
      date: task.due_date,
      amount: null,
      overdue: task.due_date < today,
    });
  }

  for (const expense of data.expenses) {
    if (!expense.due_date || expenseStatus(expense) === 'pagado') continue;
    items.push({
      id: `expense-${expense.id}`,
      kind: 'pago',
      title: expense.concept,
      date: expense.due_date,
      amount: Math.max(0, expense.total_amount - expense.paid_amount),
      overdue: expense.due_date < today,
    });
  }

  for (const decision of data.decisions) {
    if (decision.status === 'decidida' || !decision.due_date) continue;
    items.push({
      id: `decision-${decision.id}`,
      kind: 'decision',
      title: decision.title,
      date: decision.due_date,
      amount: null,
      overdue: decision.due_date < today,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}
