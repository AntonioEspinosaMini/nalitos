'use client';

import useSWR from 'swr';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { store } from './storage';
import { categoryId as slugify } from './schema';
import { newId, nowISO } from './date';
import type {
  AppData,
  Assignee,
  Decision,
  DecisionOption,
  DecisionStatus,
  Expense,
  Guest,
  GuestMenu,
  GuestStatus,
  PersonName,
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  Vendor,
  VendorStatus,
} from './types';

const SWR_KEY = 'wedding-app-data';

/** Estado de la sincronización con el almacén remoto. */
export type SyncState = 'idle' | 'saving' | 'error';

// ─── Formularios ─────────────────────────────────────────────────────────────
// Lo que la UI envía al guardar. Sin `id` se crea; con `id` se edita.

export interface WeddingInput {
  name: string;
  date: string | null;
  venue: string | null;
  total_budget: number;
}

export interface ExpenseInput {
  id?: string;
  concept: string;
  category_id: string;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  notes: string | null;
  vendor_id?: string | null;
}

export interface GuestInput {
  id?: string;
  first_name: string;
  last_name: string;
  group: string;
  side: Assignee;
  status: GuestStatus;
  menu: GuestMenu;
  allergies: string | null;
  transport: boolean;
  table: string | null;
  notes: string | null;
}

export interface TaskInput {
  id?: string;
  title: string;
  description: string | null;
  assigned_to: Assignee;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  vendor_id: string | null;
}

export interface VendorInput {
  id?: string;
  name: string;
  category_id: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  web: string | null;
  price: number;
  status: VendorStatus;
  hired_date: string | null;
  notes: string | null;
}

export interface DecisionInput {
  id?: string;
  title: string;
  description: string | null;
  due_date: string | null;
  vendor_id: string | null;
}

export interface OptionInput {
  id?: string;
  name: string;
  price: number;
  pros: string[];
  cons: string[];
  notes: string | null;
  rating_antonio: number;
  rating_carmen: number;
}

interface DataContextValue {
  data: AppData | undefined;
  isLoading: boolean;
  error: unknown;
  /** false si faltan las credenciales del almacén remoto. */
  configured: boolean;
  syncState: SyncState;
  /** Momento del último guardado correcto. */
  lastSyncAt: string | null;
  refresh: () => Promise<void>;

  updateWedding: (input: WeddingInput) => Promise<void>;

  addCategory: (name: string) => Promise<void>;
  renameCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  saveExpense: (input: ExpenseInput, user: PersonName) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /** Suma un importe a lo ya pagado de un gasto. */
  addExpensePayment: (id: string, amount: number) => Promise<void>;

  addGuest: (input: { first_name: string; last_name: string; status: GuestStatus; group?: string; side?: Assignee }) => Promise<void>;
  saveGuest: (input: GuestInput) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;
  /** Un toque: pendiente → confirmado → no viene → pendiente. */
  cycleGuestStatus: (id: string) => Promise<void>;

  addTask: (input: { title: string; assigned_to: Assignee; due_date?: string | null; priority?: TaskPriority; category?: TaskCategory }, user: PersonName) => Promise<void>;
  saveTask: (input: TaskInput, user: PersonName) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  /** Un toque: completada ↔ pendiente. */
  toggleTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;

  saveVendor: (input: VendorInput) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  setVendorStatus: (id: string, status: VendorStatus) => Promise<void>;
  /** Registra un pago al proveedor sobre su gasto asociado (lo crea si no existe). */
  registerVendorPayment: (vendorId: string, amount: number, date: string | null, user: PersonName) => Promise<void>;

  saveDecision: (input: DecisionInput) => Promise<void>;
  deleteDecision: (id: string) => Promise<void>;
  setDecisionStatus: (id: string, status: DecisionStatus) => Promise<void>;
  saveOption: (decisionId: string, input: OptionInput) => Promise<void>;
  deleteOption: (decisionId: string, optionId: string) => Promise<void>;
  /** Marca la opción ganadora (y da la decisión por decidida). */
  setWinner: (decisionId: string, optionId: string) => Promise<void>;
  rateOption: (decisionId: string, optionId: string, person: PersonName, rating: number) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading, mutate } = useSWR<AppData>(SWR_KEY, () => store.load(), {
    refreshInterval: 8000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 1500,
    shouldRetryOnError: true,
    // Si falla una recarga, la UI se queda con lo último bueno que tenía.
    keepPreviousData: true,
  });

  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  // Las escrituras se encadenan: dos toques rápidos no pueden pisarse.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /**
   * Aplica una mutación sobre la copia más reciente posible de los datos
   * (para minimizar colisiones entre Antonio y Carmen escribiendo a la vez)
   * y actualiza la UI de forma optimista mientras se guarda de verdad.
   */
  const applyUpdate = useCallback(
    async (updater: (current: AppData) => AppData) => {
      const run = queue.current.then(async () => {
        const base = await store.load().catch(() => data);
        if (!base) return;
        const next = updater(base);
        // Si el updater decide que no hay nada que cambiar, no se escribe.
        if (next === base) return;
        setSyncState('saving');
        try {
          await mutate(store.save(next).then(() => next), {
            optimisticData: next,
            rollbackOnError: true,
            revalidate: false,
          });
          setSyncState('idle');
          setLastSyncAt(nowISO());
        } catch (err) {
          setSyncState('error');
          throw err;
        }
      });
      // La cola no debe romperse aunque una escritura falle.
      queue.current = run.catch(() => undefined);
      return run;
    },
    [data, mutate]
  );

  const refresh = useCallback(async () => {
    await mutate();
    setSyncState('idle');
  }, [mutate]);

  // ─── Boda ──────────────────────────────────────────────────────────────────

  const updateWedding = useCallback<DataContextValue['updateWedding']>(
    async (input) => {
      await applyUpdate((current) => ({
        ...current,
        wedding: {
          ...current.wedding,
          name: input.name.trim() || current.wedding.name,
          date: input.date || null,
          venue: input.venue?.trim() || null,
          total_budget: Math.max(0, input.total_budget),
        },
      }));
    },
    [applyUpdate]
  );

  // ─── Categorías ────────────────────────────────────────────────────────────

  const addCategory = useCallback<DataContextValue['addCategory']>(
    async (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      await applyUpdate((current) => {
        const id = slugify(trimmed);
        if (current.budget_categories.some((c) => c.id === id)) return current;
        return { ...current, budget_categories: [...current.budget_categories, { id, name: trimmed }] };
      });
    },
    [applyUpdate]
  );

  const renameCategory = useCallback<DataContextValue['renameCategory']>(
    async (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      // Se cambia solo el nombre: el id se conserva para no romper los enlaces.
      await applyUpdate((current) => ({
        ...current,
        budget_categories: current.budget_categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
      }));
    },
    [applyUpdate]
  );

  const deleteCategory = useCallback<DataContextValue['deleteCategory']>(
    async (id) => {
      await applyUpdate((current) => {
        if (current.budget_categories.length <= 1) return current;
        const rest = current.budget_categories.filter((c) => c.id !== id);
        // Lo que colgaba de la categoría borrada se recoloca en la primera:
        // nunca se pierde un gasto por quitar una categoría.
        const fallback = rest.find((c) => c.id === slugify('Otros'))?.id ?? rest[0].id;
        return {
          ...current,
          budget_categories: rest,
          expenses: current.expenses.map((e) => (e.category_id === id ? { ...e, category_id: fallback } : e)),
          vendors: current.vendors.map((v) => (v.category_id === id ? { ...v, category_id: fallback } : v)),
        };
      });
    },
    [applyUpdate]
  );

  // ─── Gastos ────────────────────────────────────────────────────────────────

  const saveExpense = useCallback<DataContextValue['saveExpense']>(
    async (input, user) => {
      const concept = input.concept.trim();
      if (!concept) return;
      const total = Math.max(0, input.total_amount);
      const fields = {
        concept,
        category_id: input.category_id,
        total_amount: total,
        paid_amount: Math.min(total, Math.max(0, input.paid_amount)),
        due_date: input.due_date || null,
        notes: input.notes?.trim() || null,
        vendor_id: input.vendor_id ?? null,
      };
      await applyUpdate((current) => {
        if (input.id) {
          return {
            ...current,
            expenses: current.expenses.map((e) => (e.id === input.id ? { ...e, ...fields } : e)),
          };
        }
        const expense: Expense = {
          id: newId(),
          ...fields,
          created_at: nowISO(),
          created_by: user,
        };
        return { ...current, expenses: [expense, ...current.expenses] };
      });
    },
    [applyUpdate]
  );

  const deleteExpense = useCallback<DataContextValue['deleteExpense']>(
    async (id) => {
      await applyUpdate((current) => ({
        ...current,
        expenses: current.expenses.filter((e) => e.id !== id),
      }));
    },
    [applyUpdate]
  );

  const addExpensePayment = useCallback<DataContextValue['addExpensePayment']>(
    async (id, amount) => {
      if (amount <= 0) return;
      await applyUpdate((current) => ({
        ...current,
        expenses: current.expenses.map((e) =>
          e.id === id
            ? {
                ...e,
                // Un pago puede subir el total si al final costó más de lo previsto.
                total_amount: Math.max(e.total_amount, e.paid_amount + amount),
                paid_amount: e.paid_amount + amount,
              }
            : e
        ),
      }));
    },
    [applyUpdate]
  );

  // ─── Invitados ─────────────────────────────────────────────────────────────

  const addGuest = useCallback<DataContextValue['addGuest']>(
    async (input) => {
      const first = input.first_name.trim();
      if (!first) return;
      const guest: Guest = {
        id: newId(),
        first_name: first,
        last_name: input.last_name.trim(),
        group: input.group?.trim() ?? '',
        side: input.side ?? 'Ambos',
        status: input.status,
        menu: 'normal',
        allergies: null,
        transport: false,
        table: null,
        notes: null,
        created_at: nowISO(),
      };
      await applyUpdate((current) => ({ ...current, guests: [guest, ...current.guests] }));
    },
    [applyUpdate]
  );

  const saveGuest = useCallback<DataContextValue['saveGuest']>(
    async (input) => {
      const first = input.first_name.trim();
      if (!first) return;
      const fields = {
        first_name: first,
        last_name: input.last_name.trim(),
        group: input.group.trim(),
        side: input.side,
        status: input.status,
        menu: input.menu,
        allergies: input.allergies?.trim() || null,
        transport: input.transport,
        table: input.table?.trim() || null,
        notes: input.notes?.trim() || null,
      };
      await applyUpdate((current) => {
        if (input.id) {
          return {
            ...current,
            guests: current.guests.map((g) => (g.id === input.id ? { ...g, ...fields } : g)),
          };
        }
        return {
          ...current,
          guests: [{ id: newId(), ...fields, created_at: nowISO() }, ...current.guests],
        };
      });
    },
    [applyUpdate]
  );

  const deleteGuest = useCallback<DataContextValue['deleteGuest']>(
    async (id) => {
      await applyUpdate((current) => ({ ...current, guests: current.guests.filter((g) => g.id !== id) }));
    },
    [applyUpdate]
  );

  const cycleGuestStatus = useCallback<DataContextValue['cycleGuestStatus']>(
    async (id) => {
      const order: GuestStatus[] = ['pendiente', 'confirmado', 'no_viene'];
      await applyUpdate((current) => ({
        ...current,
        guests: current.guests.map((g) =>
          g.id === id ? { ...g, status: order[(order.indexOf(g.status) + 1) % order.length] } : g
        ),
      }));
    },
    [applyUpdate]
  );

  // ─── Tareas ────────────────────────────────────────────────────────────────

  const addTask = useCallback<DataContextValue['addTask']>(
    async (input, user) => {
      const title = input.title.trim();
      if (!title) return;
      const task: Task = {
        id: newId(),
        title,
        description: null,
        assigned_to: input.assigned_to,
        due_date: input.due_date ?? null,
        priority: input.priority ?? 'media',
        status: 'pendiente',
        category: input.category ?? 'otros',
        vendor_id: null,
        created_at: nowISO(),
        created_by: user,
        completed_at: null,
      };
      await applyUpdate((current) => ({ ...current, tasks: [task, ...current.tasks] }));
    },
    [applyUpdate]
  );

  const saveTask = useCallback<DataContextValue['saveTask']>(
    async (input, user) => {
      const title = input.title.trim();
      if (!title) return;
      const fields = {
        title,
        description: input.description?.trim() || null,
        assigned_to: input.assigned_to,
        due_date: input.due_date || null,
        priority: input.priority,
        status: input.status,
        category: input.category,
        vendor_id: input.vendor_id,
      };
      await applyUpdate((current) => {
        if (input.id) {
          return {
            ...current,
            tasks: current.tasks.map((t) =>
              t.id === input.id
                ? {
                    ...t,
                    ...fields,
                    // La fecha de finalización sigue al estado, no al formulario.
                    completed_at:
                      fields.status === 'completada' ? t.completed_at ?? nowISO() : null,
                  }
                : t
            ),
          };
        }
        return {
          ...current,
          tasks: [
            {
              id: newId(),
              ...fields,
              created_at: nowISO(),
              created_by: user,
              completed_at: fields.status === 'completada' ? nowISO() : null,
            },
            ...current.tasks,
          ],
        };
      });
    },
    [applyUpdate]
  );

  const deleteTask = useCallback<DataContextValue['deleteTask']>(
    async (id) => {
      await applyUpdate((current) => ({ ...current, tasks: current.tasks.filter((t) => t.id !== id) }));
    },
    [applyUpdate]
  );

  const toggleTask = useCallback<DataContextValue['toggleTask']>(
    async (id) => {
      await applyUpdate((current) => ({
        ...current,
        tasks: current.tasks.map((t) => {
          if (t.id !== id) return t;
          const done = t.status === 'completada';
          return {
            ...t,
            status: done ? 'pendiente' : 'completada',
            completed_at: done ? null : nowISO(),
          };
        }),
      }));
    },
    [applyUpdate]
  );

  const setTaskStatus = useCallback<DataContextValue['setTaskStatus']>(
    async (id, status) => {
      await applyUpdate((current) => ({
        ...current,
        tasks: current.tasks.map((t) =>
          t.id === id
            ? { ...t, status, completed_at: status === 'completada' ? t.completed_at ?? nowISO() : null }
            : t
        ),
      }));
    },
    [applyUpdate]
  );

  // ─── Proveedores ───────────────────────────────────────────────────────────

  const saveVendor = useCallback<DataContextValue['saveVendor']>(
    async (input) => {
      const name = input.name.trim();
      if (!name) return;
      const fields = {
        name,
        category_id: input.category_id,
        contact_name: input.contact_name?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        web: input.web?.trim() || null,
        price: Math.max(0, input.price),
        status: input.status,
        hired_date: input.hired_date || null,
        notes: input.notes?.trim() || null,
      };
      await applyUpdate((current) => {
        if (input.id) {
          const id = input.id;
          return {
            ...current,
            vendors: current.vendors.map((v) => (v.id === id ? { ...v, ...fields } : v)),
            // El gasto asociado sigue al proveedor: mismo nombre y categoría.
            expenses: current.expenses.map((e) =>
              e.vendor_id === id
                ? {
                    ...e,
                    concept: fields.name,
                    category_id: fields.category_id,
                    total_amount: Math.max(e.paid_amount, fields.price),
                  }
                : e
            ),
          };
        }
        const vendor: Vendor = { id: newId(), ...fields, created_at: nowISO() };
        return { ...current, vendors: [vendor, ...current.vendors] };
      });
    },
    [applyUpdate]
  );

  const deleteVendor = useCallback<DataContextValue['deleteVendor']>(
    async (id) => {
      await applyUpdate((current) => ({
        ...current,
        vendors: current.vendors.filter((v) => v.id !== id),
        // Los gastos y tareas del proveedor no se borran: se desvinculan, para
        // no perder de golpe pagos ya registrados.
        expenses: current.expenses.map((e) => (e.vendor_id === id ? { ...e, vendor_id: null } : e)),
        tasks: current.tasks.map((t) => (t.vendor_id === id ? { ...t, vendor_id: null } : t)),
        decisions: current.decisions.map((d) => (d.vendor_id === id ? { ...d, vendor_id: null } : d)),
      }));
    },
    [applyUpdate]
  );

  const setVendorStatus = useCallback<DataContextValue['setVendorStatus']>(
    async (id, status) => {
      await applyUpdate((current) => ({
        ...current,
        vendors: current.vendors.map((v) => (v.id === id ? { ...v, status } : v)),
      }));
    },
    [applyUpdate]
  );

  const registerVendorPayment = useCallback<DataContextValue['registerVendorPayment']>(
    async (vendorId, amount, date, user) => {
      if (amount <= 0) return;
      await applyUpdate((current) => {
        const vendor = current.vendors.find((v) => v.id === vendorId);
        if (!vendor) return current;
        const linked = current.expenses.find((e) => e.vendor_id === vendorId);
        // Si el proveedor todavía no tenía gasto en el presupuesto, se crea
        // ahora: registrar un pago es lo que lo mete en las cuentas.
        if (!linked) {
          const expense: Expense = {
            id: newId(),
            concept: vendor.name,
            category_id: vendor.category_id,
            total_amount: Math.max(vendor.price, amount),
            paid_amount: amount,
            due_date: date,
            notes: null,
            vendor_id: vendorId,
            created_at: nowISO(),
            created_by: user,
          };
          return { ...current, expenses: [expense, ...current.expenses] };
        }
        return {
          ...current,
          expenses: current.expenses.map((e) =>
            e.id === linked.id
              ? {
                  ...e,
                  total_amount: Math.max(e.total_amount, e.paid_amount + amount),
                  paid_amount: e.paid_amount + amount,
                }
              : e
          ),
        };
      });
    },
    [applyUpdate]
  );

  // ─── Decisiones ────────────────────────────────────────────────────────────

  const saveDecision = useCallback<DataContextValue['saveDecision']>(
    async (input) => {
      const title = input.title.trim();
      if (!title) return;
      const fields = {
        title,
        description: input.description?.trim() || null,
        due_date: input.due_date || null,
        vendor_id: input.vendor_id,
      };
      await applyUpdate((current) => {
        if (input.id) {
          return {
            ...current,
            decisions: current.decisions.map((d) => (d.id === input.id ? { ...d, ...fields } : d)),
          };
        }
        const decision: Decision = {
          id: newId(),
          ...fields,
          status: 'pendiente',
          options: [],
          created_at: nowISO(),
        };
        return { ...current, decisions: [decision, ...current.decisions] };
      });
    },
    [applyUpdate]
  );

  const deleteDecision = useCallback<DataContextValue['deleteDecision']>(
    async (id) => {
      await applyUpdate((current) => ({
        ...current,
        decisions: current.decisions.filter((d) => d.id !== id),
      }));
    },
    [applyUpdate]
  );

  const setDecisionStatus = useCallback<DataContextValue['setDecisionStatus']>(
    async (id, status) => {
      await applyUpdate((current) => ({
        ...current,
        decisions: current.decisions.map((d) =>
          d.id === id
            ? {
                ...d,
                status,
                // Volver a "pendiente" reabre la comparación: ya no hay ganadora.
                options: status === 'pendiente' ? d.options.map((o) => ({ ...o, winner: false })) : d.options,
              }
            : d
        ),
      }));
    },
    [applyUpdate]
  );

  const saveOption = useCallback<DataContextValue['saveOption']>(
    async (decisionId, input) => {
      const name = input.name.trim();
      if (!name) return;
      const fields = {
        name,
        price: Math.max(0, input.price),
        pros: input.pros.map((p) => p.trim()).filter(Boolean),
        cons: input.cons.map((c) => c.trim()).filter(Boolean),
        notes: input.notes?.trim() || null,
        rating_antonio: Math.min(5, Math.max(0, Math.round(input.rating_antonio))),
        rating_carmen: Math.min(5, Math.max(0, Math.round(input.rating_carmen))),
      };
      await applyUpdate((current) => ({
        ...current,
        decisions: current.decisions.map((d) => {
          if (d.id !== decisionId) return d;
          if (input.id) {
            return {
              ...d,
              options: d.options.map((o) => (o.id === input.id ? { ...o, ...fields } : o)),
            };
          }
          const option: DecisionOption = { id: newId(), ...fields, winner: false };
          return { ...d, options: [...d.options, option] };
        }),
      }));
    },
    [applyUpdate]
  );

  const deleteOption = useCallback<DataContextValue['deleteOption']>(
    async (decisionId, optionId) => {
      await applyUpdate((current) => ({
        ...current,
        decisions: current.decisions.map((d) =>
          d.id === decisionId ? { ...d, options: d.options.filter((o) => o.id !== optionId) } : d
        ),
      }));
    },
    [applyUpdate]
  );

  const setWinner = useCallback<DataContextValue['setWinner']>(
    async (decisionId, optionId) => {
      await applyUpdate((current) => ({
        ...current,
        decisions: current.decisions.map((d) => {
          if (d.id !== decisionId) return d;
          // Volver a tocar la ganadora la desmarca y deja la decisión abierta.
          const already = d.options.find((o) => o.id === optionId)?.winner ?? false;
          return {
            ...d,
            status: already ? 'pendiente' : 'decidida',
            options: d.options.map((o) => ({ ...o, winner: !already && o.id === optionId })),
          };
        }),
      }));
    },
    [applyUpdate]
  );

  const rateOption = useCallback<DataContextValue['rateOption']>(
    async (decisionId, optionId, person, rating) => {
      const value = Math.min(5, Math.max(0, Math.round(rating)));
      await applyUpdate((current) => ({
        ...current,
        decisions: current.decisions.map((d) =>
          d.id === decisionId
            ? {
                ...d,
                options: d.options.map((o) =>
                  o.id === optionId
                    ? {
                        ...o,
                        ...(person === 'Antonio' ? { rating_antonio: value } : { rating_carmen: value }),
                      }
                    : o
                ),
              }
            : d
        ),
      }));
    },
    [applyUpdate]
  );

  return (
    <DataContext.Provider
      value={{
        data,
        isLoading,
        error,
        configured: store.isConfigured,
        syncState,
        lastSyncAt,
        refresh,
        updateWedding,
        addCategory,
        renameCategory,
        deleteCategory,
        saveExpense,
        deleteExpense,
        addExpensePayment,
        addGuest,
        saveGuest,
        deleteGuest,
        cycleGuestStatus,
        addTask,
        saveTask,
        deleteTask,
        toggleTask,
        setTaskStatus,
        saveVendor,
        deleteVendor,
        setVendorStatus,
        registerVendorPayment,
        saveDecision,
        deleteDecision,
        setDecisionStatus,
        saveOption,
        deleteOption,
        setWinner,
        rateOption,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>');
  return ctx;
}

/**
 * Los datos ya cargados. Para usar dentro de páginas que se pintan solo
 * cuando AppShell ha confirmado que hay datos.
 */
export function useAppData(): AppData {
  const { data } = useData();
  if (!data) throw new Error('useAppData necesita datos ya cargados');
  return data;
}
