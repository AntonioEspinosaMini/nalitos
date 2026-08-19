'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, Check, ListChecks, Plus, Search } from 'lucide-react';
import { useAppData, useData } from '@/lib/data-context';
import { partnerOf, useCurrentUser } from '@/lib/user-context';
import { taskProgress } from '@/lib/selectors';
import {
  TASK_CATEGORY_LABEL,
  TASK_PRIORITY_STYLE,
  TASK_PRIORITY_WEIGHT,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLE,
} from '@/lib/labels';
import { formatShortDate, todayISO } from '@/lib/date';
import { cn, foldText } from '@/lib/utils';
import type { Assignee, Task } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { TaskSheet } from '@/components/task-sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/form';

type Who = 'mias' | 'pareja' | 'ambos' | 'todas';
type SortBy = 'fecha' | 'prioridad';

export default function TasksPage() {
  const data = useAppData();
  const { toggleTask, addTask } = useData();
  const user = useCurrentUser();
  const partner = partnerOf(user);

  const [who, setWho] = useState<Who>('todas');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('fecha');
  const [draft, setDraft] = useState('');
  const [draftAssignee, setDraftAssignee] = useState<Assignee>(user);
  const [editing, setEditing] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const progress = taskProgress(data.tasks);

  const counts = useMemo(
    () => ({
      mias: data.tasks.filter((t) => t.assigned_to === user && t.status !== 'completada').length,
      pareja: data.tasks.filter((t) => t.assigned_to === partner && t.status !== 'completada').length,
      ambos: data.tasks.filter((t) => t.assigned_to === 'Ambos' && t.status !== 'completada').length,
    }),
    [data.tasks, partner, user]
  );

  const visible = useMemo(() => {
    const needle = foldText(query);
    const owner: Record<Who, (task: Task) => boolean> = {
      mias: (t) => t.assigned_to === user,
      pareja: (t) => t.assigned_to === partner,
      ambos: (t) => t.assigned_to === 'Ambos',
      todas: () => true,
    };
    return data.tasks
      .filter((task) => {
        if (!owner[who](task)) return false;
        if (onlyOpen && task.status === 'completada') return false;
        if (!needle) return true;
        return foldText(`${task.title} ${task.description ?? ''}`).includes(needle);
      })
      .sort((a, b) => {
        // Lo completado siempre al final, se ordene como se ordene.
        if ((a.status === 'completada') !== (b.status === 'completada')) {
          return a.status === 'completada' ? 1 : -1;
        }
        if (sortBy === 'prioridad') {
          const byPriority = TASK_PRIORITY_WEIGHT[a.priority] - TASK_PRIORITY_WEIGHT[b.priority];
          if (byPriority !== 0) return byPriority;
        }
        // Sin fecha va después de cualquier fecha.
        return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999');
      });
  }, [data.tasks, onlyOpen, partner, query, sortBy, user, who]);

  async function quickAdd() {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    await addTask({ title, assigned_to: draftAssignee }, user);
  }

  return (
    <div>
      <PageHeader
        title="Tareas"
        subtitle={
          progress.total > 0
            ? `${progress.percent}% completado · ${progress.pending + progress.inProgress} pendientes`
            : 'Todavía sin tareas'
        }
        action={
          <Button
            size="icon"
            aria-label="Nueva tarea"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {/* Alta rápida: escribir, elegir responsable y Enter. */}
      <Card className="mb-4">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void quickAdd();
            }}
            placeholder="Añadir tarea rápida…"
          />
          <Button size="icon" disabled={!draft.trim()} onClick={() => void quickAdd()} aria-label="Añadir">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <Segmented
          className="mt-2"
          value={draftAssignee}
          onChange={setDraftAssignee}
          options={[
            { value: 'Antonio', label: 'Antonio' },
            { value: 'Carmen', label: 'Carmen' },
            { value: 'Ambos', label: 'Ambos' },
          ]}
        />
      </Card>

      {data.tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Todavía no hay tareas"
          description="Apunta lo que haya que hacer y repártelo entre los dos."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setSheetOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Añadir tarea
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex items-end justify-between">
              <p className="font-display text-2xl tabular-nums text-ink-900">
                {progress.percent}%<span className="text-base text-ink-400"> completado</span>
              </p>
              <p className="text-xs tabular-nums text-ink-400">
                {progress.done} / {progress.total}
              </p>
            </div>
            <Progress className="mt-2.5" value={progress.percent} barClassName="bg-sage-500" />
          </Card>

          <div className="space-y-2">
            <Segmented
              scrollable
              value={who}
              onChange={setWho}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'mias', label: 'Mis tareas', count: counts.mias },
                { value: 'pareja', label: partner, count: counts.pareja },
                { value: 'ambos', label: 'Ambos', count: counts.ambos },
              ]}
            />

            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar tarea"
                className="pl-10"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Segmented
                value={onlyOpen ? 'abiertas' : 'todas'}
                onChange={(value) => setOnlyOpen(value === 'abiertas')}
                options={[
                  { value: 'abiertas', label: 'Pendientes' },
                  { value: 'todas', label: 'Con hechas' },
                ]}
              />
              <button
                type="button"
                onClick={() => setSortBy(sortBy === 'fecha' ? 'prioridad' : 'fecha')}
                className="flex flex-none items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-ink-500 hover:bg-ink-100"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortBy === 'fecha' ? 'Fecha' : 'Prioridad'}
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">
              Nada por aquí. {onlyOpen && '¿Ves las completadas?'}
            </p>
          ) : (
            <Card className="divide-y divide-ink-100 p-0">
              {visible.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => void toggleTask(task.id)}
                  onEdit={() => {
                    setEditing(task);
                    setSheetOpen(true);
                  }}
                />
              ))}
            </Card>
          )}
        </div>
      )}

      <TaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        task={editing}
        vendors={data.vendors}
        defaultAssignee={who === 'mias' ? user : who === 'pareja' ? partner : who === 'ambos' ? 'Ambos' : undefined}
      />
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const done = task.status === 'completada';
  const overdue = !done && task.due_date != null && task.due_date < todayISO();

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? `Reabrir ${task.title}` : `Completar ${task.title}`}
        className={cn(
          'flex h-6 w-6 flex-none items-center justify-center rounded-full border transition-colors active:scale-95',
          done
            ? 'check-pop border-sage-500 bg-sage-500 text-white'
            : 'border-ink-300 text-transparent hover:border-sage-500 hover:bg-sage-50 hover:text-sage-600'
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </button>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className={cn('truncate text-sm font-medium text-ink-800', done && 'text-ink-400 line-through')}>
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-400">
          <span>{task.assigned_to}</span>
          <span>· {TASK_CATEGORY_LABEL[task.category]}</span>
          {task.due_date && (
            <span className={cn(overdue && 'font-medium text-rose-600')}>
              · {formatShortDate(task.due_date)}
            </span>
          )}
        </p>
      </button>

      <div className="flex flex-none items-center gap-1.5">
        {task.status === 'en_progreso' && (
          <Badge className={TASK_STATUS_STYLE.en_progreso}>{TASK_STATUS_LABEL.en_progreso}</Badge>
        )}
        {!done && task.priority !== 'media' && (
          <Badge className={TASK_PRIORITY_STYLE[task.priority]}>
            {task.priority === 'alta' ? 'Alta' : 'Baja'}
          </Badge>
        )}
      </div>
    </div>
  );
}
