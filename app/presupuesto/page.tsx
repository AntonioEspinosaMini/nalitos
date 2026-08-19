'use client';

import { useMemo, useState } from 'react';
import { Plus, Settings2, Wallet } from 'lucide-react';
import { useAppData, useData } from '@/lib/data-context';
import { budgetSummary, expenseStatus, totalsByCategory } from '@/lib/selectors';
import { EXPENSE_STATUS_LABEL, EXPENSE_STATUS_STYLE } from '@/lib/labels';
import { formatShortDate, todayISO } from '@/lib/date';
import { cn, formatMoney } from '@/lib/utils';
import type { Expense, ExpenseStatus } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { ExpenseSheet } from '@/components/expense-sheet';
import { CategoriesSheet } from '@/components/categories-sheet';
import { Card, SectionTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Progress } from '@/components/ui/progress';
import { Stat, StatGrid } from '@/components/ui/stat';
import { Sheet } from '@/components/ui/sheet';
import { Field, MoneyInput } from '@/components/ui/form';

type Filter = 'todos' | ExpenseStatus;

export default function BudgetPage() {
  const data = useAppData();
  const { updateWedding } = useData();

  const [filter, setFilter] = useState<Filter>('todos');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');

  const summary = budgetSummary(data);
  const categories = totalsByCategory(data);

  const usage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const expense of data.expenses) {
      counts[expense.category_id] = (counts[expense.category_id] ?? 0) + 1;
    }
    return counts;
  }, [data.expenses]);

  const visible = useMemo(
    () =>
      data.expenses
        .filter((expense) => filter === 'todos' || expenseStatus(expense) === filter)
        // Lo que vence antes, primero; lo que no tiene fecha, al final.
        .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')),
    [data.expenses, filter]
  );

  function openNew() {
    setEditing(null);
    setExpenseOpen(true);
  }

  async function saveBudget() {
    await updateWedding({
      name: data.wedding.name,
      date: data.wedding.date,
      venue: data.wedding.venue,
      total_budget: Number.parseFloat(budgetDraft) || 0,
    });
    setBudgetOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Presupuesto"
        subtitle={summary.budget > 0 ? `${summary.percentSpent}% del total pagado` : 'Sin presupuesto fijado'}
        action={
          <Button size="icon" onClick={openNew} aria-label="Añadir gasto">
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      <div className="space-y-6">
        {/* ── Resumen ────────────────────────────────────────────────────── */}
        <Card>
          <button
            type="button"
            onClick={() => {
              setBudgetDraft(summary.budget > 0 ? String(summary.budget) : '');
              setBudgetOpen(true);
            }}
            className="flex w-full items-end justify-between gap-3 text-left"
          >
            <p className="font-display text-3xl tabular-nums text-ink-900">
              {formatMoney(summary.spent)}
              <span className="text-lg text-ink-400"> / {formatMoney(summary.budget)}</span>
            </p>
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                summary.overBudget ? 'text-rose-600' : 'text-ink-400'
              )}
            >
              {summary.percentSpent}%
            </span>
          </button>

          <Progress className="mt-3" value={summary.percentSpent} secondary={summary.percentCommitted} />

          <StatGrid className="mt-4">
            <Stat label="Total" value={formatMoney(summary.budget)} />
            <Stat label="Gastado" value={formatMoney(summary.spent)} valueClassName="text-sage-600" />
            <Stat label="Pendiente" value={formatMoney(summary.pending)} valueClassName="text-amber-600" />
            <Stat
              label="Disponible"
              value={formatMoney(summary.available)}
              valueClassName={summary.available < 0 ? 'text-rose-600' : 'text-ink-800'}
            />
          </StatGrid>

          {summary.overBudget && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              Lo comprometido supera el presupuesto en {formatMoney(Math.abs(summary.available))}.
            </p>
          )}
        </Card>

        {/* ── Por categorías ─────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <section>
            <SectionTitle
              action={
                <button
                  type="button"
                  onClick={() => setCategoriesOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blush-600 hover:underline"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Categorías
                </button>
              }
            >
              Por categorías
            </SectionTitle>
            <Card className="space-y-3">
              {categories.map((category) => (
                <div key={category.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink-700">{category.name}</span>
                    <span className="flex-none tabular-nums text-ink-800">{formatMoney(category.total)}</span>
                  </div>
                  <Progress
                    className="mt-1 h-1.5"
                    value={category.share}
                    barClassName="bg-blush-400"
                  />
                  <p className="mt-0.5 text-xs tabular-nums text-ink-400">
                    {formatMoney(category.paid)} pagado
                    {category.pending > 0 && ` · ${formatMoney(category.pending)} pendiente`}
                  </p>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* ── Gastos ─────────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Gastos</SectionTitle>

          {data.expenses.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Todavía no hay gastos"
              description="Apunta el primer gasto o señal para empezar a controlar el presupuesto."
              action={
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" />
                  Añadir gasto
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              <Segmented
                scrollable
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'todos', label: 'Todos', count: data.expenses.length },
                  { value: 'pendiente', label: 'Pendientes' },
                  { value: 'parcial', label: 'Parciales' },
                  { value: 'pagado', label: 'Pagados' },
                ]}
              />

              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-400">Ningún gasto en este estado.</p>
              ) : (
                <Card className="divide-y divide-ink-100 p-0">
                  {visible.map((expense) => {
                    const status = expenseStatus(expense);
                    const category = data.budget_categories.find((c) => c.id === expense.category_id);
                    const overdue =
                      status !== 'pagado' && expense.due_date != null && expense.due_date < todayISO();
                    return (
                      <button
                        key={expense.id}
                        type="button"
                        onClick={() => {
                          setEditing(expense);
                          setExpenseOpen(true);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-800">{expense.concept}</p>
                          <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-400">
                            <span>{category?.name}</span>
                            {expense.due_date && (
                              <span className={cn(overdue && 'font-medium text-rose-600')}>
                                · {formatShortDate(expense.due_date)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex-none text-right">
                          <p className="text-sm font-semibold tabular-nums text-ink-800">
                            {formatMoney(expense.total_amount)}
                          </p>
                          {status !== 'pagado' && expense.paid_amount > 0 && (
                            <p className="text-xs tabular-nums text-ink-400">
                              {formatMoney(expense.paid_amount)} pagado
                            </p>
                          )}
                        </div>
                        <Badge className={EXPENSE_STATUS_STYLE[status]}>
                          {status === 'parcial' ? 'Parcial' : EXPENSE_STATUS_LABEL[status]}
                        </Badge>
                      </button>
                    );
                  })}
                </Card>
              )}
            </div>
          )}
        </section>
      </div>

      <ExpenseSheet
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        expense={editing}
        categories={data.budget_categories}
        vendors={data.vendors}
      />

      <CategoriesSheet
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={data.budget_categories}
        usage={usage}
      />

      <Sheet
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="Presupuesto total"
        description="Lo que queréis gastaros en total en la boda."
        footer={
          <Button className="w-full" onClick={() => void saveBudget()}>
            Guardar
          </Button>
        }
      >
        <Field label="Importe">
          <MoneyInput
            autoFocus
            value={budgetDraft}
            onChange={(e) => setBudgetDraft(e.target.value)}
            placeholder="40000"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveBudget();
            }}
          />
        </Field>
      </Sheet>
    </div>
  );
}
