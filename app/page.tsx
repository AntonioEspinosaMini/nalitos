'use client';

import Link from 'next/link';
import { ArrowRight, CalendarClock, Check, Heart, Scale, Users, Wallet } from 'lucide-react';
import { useAppData, useData } from '@/lib/data-context';
import { useCurrentUser, partnerOf } from '@/lib/user-context';
import { countdownLabel, formatFullDate, formatShortDate } from '@/lib/date';
import {
  budgetSummary,
  guestStats,
  taskProgress,
  tasksFor,
  upcomingDeadlines,
  type Deadline,
} from '@/lib/selectors';
import { TASK_PRIORITY_STYLE, TASK_PRIORITY_WEIGHT } from '@/lib/labels';
import { cn, formatMoney } from '@/lib/utils';
import type { Assignee, Task } from '@/lib/types';
import { Card, SectionTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SyncIndicator } from '@/components/sync-indicator';

const DEADLINE_ICON: Record<Deadline['kind'], typeof CalendarClock> = {
  tarea: Check,
  pago: Wallet,
  decision: Scale,
};

export default function DashboardPage() {
  const data = useAppData();
  const { toggleTask } = useData();
  const user = useCurrentUser();
  const partner = partnerOf(user);

  const budget = budgetSummary(data);
  const guests = guestStats(data.guests);
  const tasks = taskProgress(data.tasks);
  const deadlines = upcomingDeadlines(data, 5);

  // Lo pendiente, lo más urgente primero: primero por prioridad y luego por fecha.
  const openTasks = data.tasks
    .filter((t) => t.status !== 'completada')
    .sort((a, b) => {
      const byPriority = TASK_PRIORITY_WEIGHT[a.priority] - TASK_PRIORITY_WEIGHT[b.priority];
      if (byPriority !== 0) return byPriority;
      return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
    });

  return (
    <div className="space-y-6">
      {/* ── Nuestra boda ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-white px-6 py-8 text-center shadow-sm ring-1 ring-ink-200/60">
        <div className="absolute right-3 top-3">
          <SyncIndicator />
        </div>
        <Heart className="mx-auto h-5 w-5 text-blush-400" strokeWidth={1.5} />
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-ink-400">Nuestra boda</p>
        <h1 className="mt-1 font-display text-4xl leading-tight text-ink-900">{data.wedding.name}</h1>

        {data.wedding.date ? (
          <>
            <p className="mt-2 text-sm text-ink-500">{formatFullDate(data.wedding.date)}</p>
            <p className="mt-4 font-display text-3xl text-blush-600">
              {countdownLabel(data.wedding.date)}
            </p>
          </>
        ) : (
          <Link
            href="/ajustes"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blush-600 hover:underline"
          >
            Poner la fecha de la boda
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        {data.wedding.venue && <p className="mt-2 text-sm text-ink-400">{data.wedding.venue}</p>}
      </section>

      {/* ── Presupuesto ──────────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          action={
            <Link href="/presupuesto" className="text-xs font-medium text-blush-600 hover:underline">
              Ver detalle
            </Link>
          }
        >
          Presupuesto
        </SectionTitle>
        <Card>
          {budget.budget > 0 ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <p className="font-display text-3xl tabular-nums text-ink-900">
                  {formatMoney(budget.spent)}
                  <span className="text-lg text-ink-400"> / {formatMoney(budget.budget)}</span>
                </p>
                <p
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    budget.overBudget ? 'text-rose-600' : 'text-ink-400'
                  )}
                >
                  {budget.percentSpent}%
                </p>
              </div>
              <Progress className="mt-3" value={budget.percentSpent} secondary={budget.percentCommitted} />
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-400">Gastado</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink-800">{formatMoney(budget.spent)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-400">Pendiente</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink-800">{formatMoney(budget.pending)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-ink-400">Disponible</dt>
                  <dd
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      budget.available < 0 ? 'text-rose-600' : 'text-sage-600'
                    )}
                  >
                    {formatMoney(budget.available)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <Link href="/ajustes" className="flex items-center justify-between gap-3 text-sm text-ink-500">
              Fija el presupuesto total para empezar a controlar los gastos.
              <ArrowRight className="h-4 w-4 flex-none text-blush-500" />
            </Link>
          )}
        </Card>
      </section>

      {/* ── Invitados y preparación ──────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <SectionTitle
            action={
              <Link href="/invitados" className="text-xs font-medium text-blush-600 hover:underline">
                Ver
              </Link>
            }
          >
            Invitados
          </SectionTitle>
          <Card className="h-[calc(100%-2rem)]">
            {guests.total > 0 ? (
              <>
                <p className="font-display text-3xl tabular-nums text-ink-900">
                  {guests.confirmed}
                  <span className="text-lg text-ink-400"> / {guests.total} confirmados</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge className="bg-amber-50 text-amber-700 ring-amber-200">
                    {guests.pending} pendientes
                  </Badge>
                  <Badge className="bg-ink-100 text-ink-500 ring-ink-200">{guests.declined} no vienen</Badge>
                  {guests.withTransport > 0 && (
                    <Badge className="bg-sky-50 text-sky-700 ring-sky-200">
                      {guests.withTransport} con transporte
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <Link href="/invitados" className="flex items-center gap-2 text-sm text-ink-500">
                <Users className="h-4 w-4 flex-none text-blush-500" />
                Añade a los primeros invitados
              </Link>
            )}
          </Card>
        </div>

        <div>
          <SectionTitle
            action={
              <Link href="/tareas" className="text-xs font-medium text-blush-600 hover:underline">
                Ver
              </Link>
            }
          >
            Preparación
          </SectionTitle>
          <Card className="h-[calc(100%-2rem)]">
            {tasks.total > 0 ? (
              <>
                <p className="font-display text-3xl tabular-nums text-ink-900">
                  {tasks.percent}%<span className="text-lg text-ink-400"> completado</span>
                </p>
                <Progress
                  className="mt-3"
                  value={tasks.percent}
                  barClassName="bg-sage-500"
                />
                <p className="mt-2 text-xs text-ink-400">
                  {tasks.done} de {tasks.total} tareas · {tasks.pending} pendientes
                </p>
              </>
            ) : (
              <Link href="/tareas" className="flex items-center gap-2 text-sm text-ink-500">
                <Check className="h-4 w-4 flex-none text-blush-500" />
                Apunta la primera tarea
              </Link>
            )}
          </Card>
        </div>
      </section>

      {/* ── Próximos vencimientos ────────────────────────────────────────── */}
      {deadlines.length > 0 && (
        <section>
          <SectionTitle>Próximos vencimientos</SectionTitle>
          <Card className="divide-y divide-ink-100 p-0">
            {deadlines.map((item) => {
              const Icon = DEADLINE_ICON[item.kind];
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 flex-none items-center justify-center rounded-lg',
                      item.overdue ? 'bg-rose-50 text-rose-600' : 'bg-ink-100 text-ink-500'
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-800">{item.title}</p>
                    {item.amount != null && (
                      <p className="text-xs tabular-nums text-ink-400">{formatMoney(item.amount)} pendientes</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'flex-none text-xs font-medium tabular-nums',
                      item.overdue ? 'text-rose-600' : 'text-ink-500'
                    )}
                  >
                    {formatShortDate(item.date)}
                  </span>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* ── Tareas pendientes ────────────────────────────────────────────── */}
      {openTasks.length > 0 && (
        <section className="space-y-4">
          <SectionTitle
            action={
              <Link href="/tareas" className="text-xs font-medium text-blush-600 hover:underline">
                Todas
              </Link>
            }
          >
            Tareas pendientes
          </SectionTitle>

          <TaskGroup
            title={`${user} (tú)`}
            tasks={tasksFor(openTasks, user)}
            onToggle={(id) => void toggleTask(id)}
          />
          <TaskGroup
            title={partner}
            tasks={tasksFor(openTasks, partner)}
            onToggle={(id) => void toggleTask(id)}
          />
          <TaskGroup
            title="Ambos"
            tasks={tasksFor(openTasks, 'Ambos' as Assignee)}
            onToggle={(id) => void toggleTask(id)}
          />
        </section>
      )}
    </div>
  );
}

/** Bloque de tareas de una persona. No se pinta si no tiene nada pendiente. */
function TaskGroup({
  title,
  tasks,
  onToggle,
}: {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-500">{title}</p>
      <Card className="divide-y divide-ink-100 p-0">
        {tasks.slice(0, 4).map((task) => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              aria-label={`Completar ${task.title}`}
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-ink-300 text-transparent transition-colors hover:border-sage-500 hover:bg-sage-50 hover:text-sage-600 active:scale-95"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
            <p className="min-w-0 flex-1 truncate text-sm text-ink-800">{task.title}</p>
            {task.priority === 'alta' && (
              <Badge className={TASK_PRIORITY_STYLE.alta}>Alta</Badge>
            )}
            {task.due_date && (
              <span className="flex-none text-xs tabular-nums text-ink-400">
                {formatShortDate(task.due_date)}
              </span>
            )}
          </div>
        ))}
        {tasks.length > 4 && (
          <Link
            href="/tareas"
            className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-medium text-ink-400 hover:text-blush-600"
          >
            +{tasks.length - 4} más
          </Link>
        )}
      </Card>
    </div>
  );
}
