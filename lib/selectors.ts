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
