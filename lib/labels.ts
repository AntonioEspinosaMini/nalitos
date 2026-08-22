// Etiquetas en castellano y estilos por estado. Centralizado aquí para que
// la misma tarea/invitado/proveedor se vea igual en toda la aplicación.

import type {
  DecisionStatus,
  ExpenseStatus,
  GuestMenu,
  GuestStatus,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  TableShape,
  VendorStatus,
} from './types';

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  no_viene: 'No viene',
};

export const GUEST_STATUS_STYLE: Record<GuestStatus, string> = {
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmado: 'bg-sage-50 text-sage-700 ring-sage-200',
  no_viene: 'bg-ink-100 text-ink-500 ring-ink-200',
};

/** Orden en el que rota el estado al tocar el chip del invitado. */
export const GUEST_STATUS_CYCLE: GuestStatus[] = ['pendiente', 'confirmado', 'no_viene'];

export const GUEST_MENU_LABEL: Record<GuestMenu, string> = {
  normal: 'Normal',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  sin_gluten: 'Sin gluten',
  infantil: 'Infantil',
  otro: 'Otro',
};

export const GUEST_MENUS: GuestMenu[] = ['normal', 'vegetariano', 'vegano', 'sin_gluten', 'infantil', 'otro'];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
};

export const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  pendiente: 'bg-ink-100 text-ink-600 ring-ink-200',
  en_progreso: 'bg-blush-100 text-blush-700 ring-blush-200',
  completada: 'bg-sage-50 text-sage-700 ring-sage-200',
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

export const TASK_PRIORITY_STYLE: Record<TaskPriority, string> = {
  baja: 'bg-ink-100 text-ink-500 ring-ink-200',
  media: 'bg-amber-50 text-amber-700 ring-amber-200',
  alta: 'bg-rose-50 text-rose-700 ring-rose-200',
};

/** Para ordenar por prioridad de más a menos urgente. */
export const TASK_PRIORITY_WEIGHT: Record<TaskPriority, number> = { alta: 0, media: 1, baja: 2 };

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  finca: 'Finca',
  invitados: 'Invitados',
  proveedores: 'Proveedores',
  vestuario: 'Vestuario',
  decoracion: 'Decoración',
  papeleria: 'Papelería',
  viaje: 'Viaje',
  documentacion: 'Documentación',
  otros: 'Otros',
};

export const TASK_CATEGORIES: TaskCategory[] = [
  'finca', 'invitados', 'proveedores', 'vestuario', 'decoracion',
  'papeleria', 'viaje', 'documentacion', 'otros',
];

export const VENDOR_STATUS_LABEL: Record<VendorStatus, string> = {
  por_contactar: 'Por contactar',
  contactado: 'Contactado',
  comparando: 'Comparando',
  contratado: 'Contratado',
  descartado: 'Descartado',
};

export const VENDOR_STATUS_STYLE: Record<VendorStatus, string> = {
  por_contactar: 'bg-ink-100 text-ink-600 ring-ink-200',
  contactado: 'bg-sky-50 text-sky-700 ring-sky-200',
  comparando: 'bg-amber-50 text-amber-700 ring-amber-200',
  contratado: 'bg-sage-50 text-sage-700 ring-sage-200',
  descartado: 'bg-ink-100 text-ink-400 ring-ink-200 line-through',
};

export const VENDOR_STATUSES: VendorStatus[] = [
  'por_contactar', 'contactado', 'comparando', 'contratado', 'descartado',
];

/** Orden de trabajo: lo que está vivo arriba, lo descartado al final. */
export const VENDOR_STATUS_WEIGHT: Record<VendorStatus, number> = {
  contratado: 0,
  comparando: 1,
  contactado: 2,
  por_contactar: 3,
  descartado: 4,
};

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcialmente pagado',
  pagado: 'Pagado',
};

export const EXPENSE_STATUS_STYLE: Record<ExpenseStatus, string> = {
  pendiente: 'bg-ink-100 text-ink-600 ring-ink-200',
  parcial: 'bg-amber-50 text-amber-700 ring-amber-200',
  pagado: 'bg-sage-50 text-sage-700 ring-sage-200',
};

export const DECISION_STATUS_LABEL: Record<DecisionStatus, string> = {
  pendiente: 'Pendiente',
  decidida: 'Decidida',
};

export const DECISION_STATUS_STYLE: Record<DecisionStatus, string> = {
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  decidida: 'bg-sage-50 text-sage-700 ring-sage-200',
};

export const TABLE_SHAPE_LABEL: Record<TableShape, string> = {
  redonda: 'Redonda',
  rectangular: 'Rectangular',
};

export const TABLE_SHAPES: TableShape[] = ['redonda', 'rectangular'];

/** Sillas con las que se crea una mesa nueva. */
export const DEFAULT_SEAT_COUNT = 8;

/** Mínimo y máximo de sillas por mesa. Más de 20 no cabe en una mesa real. */
export const MIN_SEAT_COUNT = 2;
export const MAX_SEAT_COUNT = 20;

/** Categorías de presupuesto con las que arranca una boda nueva. */
export const DEFAULT_BUDGET_CATEGORIES = [
  'Finca', 'Catering', 'Fotógrafo', 'Vídeo', 'Música / DJ', 'Flores',
  'Decoración', 'Vestido', 'Traje', 'Invitaciones', 'Transporte',
  'Papelería', 'Regalos', 'Viaje', 'Otros',
] as const;
