// Modelo de datos de la boda. El JSON completo (AppData) es la fuente de
// verdad: se lee entero de JSONBin, se muta en memoria y se vuelve a escribir.

export type PersonName = 'Antonio' | 'Carmen';
/** A quién corresponde algo: uno de los dos, o los dos. */
export type Assignee = 'Antonio' | 'Carmen' | 'Ambos';

// ─── Boda ────────────────────────────────────────────────────────────────────

export interface Wedding {
  id: string;
  /** Nombre que se muestra en la cabecera. */
  name: string;
  /** Fecha de la boda, YYYY-MM-DD. Vacío = todavía sin fecha. */
  date: string | null;
  /** Dónde se celebra (opcional, solo informativo). */
  venue: string | null;
  /** Presupuesto total previsto, en euros. */
  total_budget: number;
  created_at: string;
}

// ─── Presupuesto ─────────────────────────────────────────────────────────────

export interface BudgetCategory {
  id: string;
  name: string;
}

/** Estado de un gasto: se deduce siempre de pagado vs. total. */
export type ExpenseStatus = 'pendiente' | 'parcial' | 'pagado';

export interface Expense {
  id: string;
  concept: string;
  /** id de BudgetCategory. */
  category_id: string;
  total_amount: number;
  paid_amount: number;
  /** Fecha de pago prevista, YYYY-MM-DD. */
  due_date: string | null;
  notes: string | null;
  /** Proveedor asociado, si el gasto viene de uno. */
  vendor_id: string | null;
  created_at: string;
  created_by: PersonName;
}

// ─── Invitados ───────────────────────────────────────────────────────────────

export type GuestStatus = 'pendiente' | 'confirmado' | 'no_viene';
export type GuestMenu = 'normal' | 'vegetariano' | 'vegano' | 'sin_gluten' | 'infantil' | 'otro';

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  /** Familia o grupo al que pertenece ("Familia Ruiz", "Amigos uni"…). */
  group: string;
  /** De parte de quién viene. */
  side: Assignee;
  status: GuestStatus;
  menu: GuestMenu;
  allergies: string | null;
  /** Si necesita autobús / transporte. */
  transport: boolean;
  /**
   * Aquí no hay mesa: quién se sienta dónde lo guarda la silla de la mesa
   * (`Table.seats`), y la ficha del invitado lo deriva con `seatMap()`. Así no
   * pueden contradecirse el plano y el invitado.
   */
  notes: string | null;
  created_at: string;
}

// ─── Tareas ──────────────────────────────────────────────────────────────────

export type TaskPriority = 'baja' | 'media' | 'alta';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';
export type TaskCategory =
  | 'finca'
  | 'invitados'
  | 'proveedores'
  | 'vestuario'
  | 'decoracion'
  | 'papeleria'
  | 'viaje'
  | 'documentacion'
  | 'otros';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: Assignee;
  /** Fecha límite, YYYY-MM-DD. */
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  /** Proveedor al que pertenece la tarea, si aplica. */
  vendor_id: string | null;
  created_at: string;
  created_by: PersonName;
  completed_at: string | null;
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

export type VendorStatus = 'por_contactar' | 'contactado' | 'comparando' | 'contratado' | 'descartado';

export interface Vendor {
  id: string;
  name: string;
  /** id de BudgetCategory: así el gasto del proveedor cae en su categoría. */
  category_id: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  web: string | null;
  /** Precio acordado (o presupuestado) con el proveedor. */
  price: number;
  status: VendorStatus;
  /** Fecha de contratación, YYYY-MM-DD. */
  hired_date: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Mesas ───────────────────────────────────────────────────────────────────

export type TableShape = 'redonda' | 'rectangular';

export interface Table {
  id: string;
  /** Cómo se llama en el plano: "Novios", "Mesa 4", "Amigos uni". */
  name: string;
  shape: TableShape;
  /**
   * Centro de la mesa en el plano, en centímetros dentro de PLAN_SIZE.
   * Se guarda solo al soltar el dedo, nunca durante el arrastre.
   */
  x: number;
  y: number;
  /** Giro en grados. Solo se nota en las rectangulares. */
  rotation: number;
  /**
   * Un hueco por silla: id del invitado sentado, o null si está libre. El
   * índice del array ES el número de silla, y su longitud, la capacidad: no
   * hay un `seat_count` aparte que pudiera discrepar.
   *
   * Esta es la fuente de verdad de quién se sienta dónde. Un invitado no puede
   * aparecer en dos sillas: lo garantizan `assignSeat()` y `normalizeAppData()`.
   */
  seats: (string | null)[];
  /** La mesa de los novios: se pinta distinta y va siempre primera. */
  is_head: boolean;
  notes: string | null;
  created_at: string;
}

// ─── Decisiones ──────────────────────────────────────────────────────────────

export type DecisionStatus = 'pendiente' | 'decidida';

export interface DecisionOption {
  id: string;
  name: string;
  price: number;
  pros: string[];
  cons: string[];
  notes: string | null;
  /** Valoración de 0 (sin valorar) a 5 estrellas. */
  rating_antonio: number;
  rating_carmen: number;
  winner: boolean;
}

export interface Decision {
  id: string;
  title: string;
  description: string | null;
  status: DecisionStatus;
  /** Fecha límite para decidir, YYYY-MM-DD. */
  due_date: string | null;
  options: DecisionOption[];
  /** Proveedor relacionado, si la decisión sale de comparar proveedores. */
  vendor_id: string | null;
  created_at: string;
}

// ─── Raíz ────────────────────────────────────────────────────────────────────

export interface AppData {
  wedding: Wedding;
  budget_categories: BudgetCategory[];
  expenses: Expense[];
  guests: Guest[];
  tasks: Task[];
  vendors: Vendor[];
  decisions: Decision[];
  tables: Table[];
}
