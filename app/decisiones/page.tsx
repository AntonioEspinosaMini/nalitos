'use client';

import { useMemo, useState } from 'react';
import { Plus, Scale, Trophy } from 'lucide-react';
import { useAppData } from '@/lib/data-context';
import { DECISION_STATUS_LABEL, DECISION_STATUS_STYLE } from '@/lib/labels';
import { formatShortDate, todayISO } from '@/lib/date';
import { cn, formatMoney } from '@/lib/utils';
import type { Decision, DecisionOption } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { DecisionSheet } from '@/components/decision-sheet';
import { DecisionDetail } from '@/components/decision-detail';
import { OptionSheet } from '@/components/option-sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';

type Filter = 'pendientes' | 'decididas' | 'todas';

export default function DecisionsPage() {
  const data = useAppData();

  const [filter, setFilter] = useState<Filter>('pendientes');
  const [detail, setDetail] = useState<Decision | null>(null);
  const [editing, setEditing] = useState<Decision | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [optionTarget, setOptionTarget] = useState<{ decisionId: string; option: DecisionOption | null } | null>(
    null
  );

  const counts = useMemo(
    () => ({
      pendientes: data.decisions.filter((d) => d.status === 'pendiente').length,
      decididas: data.decisions.filter((d) => d.status === 'decidida').length,
    }),
    [data.decisions]
  );

  const visible = useMemo(
    () =>
      data.decisions
        .filter((decision) => {
          if (filter === 'pendientes') return decision.status === 'pendiente';
          if (filter === 'decididas') return decision.status === 'decidida';
          return true;
        })
        .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')),
    [data.decisions, filter]
  );

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Decisiones"
        subtitle={
          data.decisions.length > 0
            ? `${counts.pendientes} por decidir · ${counts.decididas} cerradas`
            : 'Todavía sin decisiones'
        }
        action={
          <Button size="icon" onClick={openNew} aria-label="Nueva decisión">
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {data.decisions.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Todavía no hay decisiones"
          description="Crea una para comparar opciones con sus pros, contras y precios."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              Nueva decisión
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'pendientes', label: 'Por decidir', count: counts.pendientes },
              { value: 'decididas', label: 'Decididas', count: counts.decididas },
              { value: 'todas', label: 'Todas' },
            ]}
          />

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">Nada en este filtro.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((decision) => {
                const winner = decision.options.find((o) => o.winner);
                const overdue =
                  decision.status === 'pendiente' &&
                  decision.due_date != null &&
                  decision.due_date < todayISO();
                return (
                  <Card
                    key={decision.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetail(decision)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setDetail(decision);
                    }}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-medium text-ink-800">{decision.title}</p>
                      <Badge className={DECISION_STATUS_STYLE[decision.status]}>
                        {DECISION_STATUS_LABEL[decision.status]}
                      </Badge>
                    </div>

                    <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-ink-400">
                      <span>
                        {decision.options.length}{' '}
                        {decision.options.length === 1 ? 'opción' : 'opciones'}
                      </span>
                      {decision.due_date && (
                        <span className={cn(overdue && 'font-medium text-rose-600')}>
                          · {formatShortDate(decision.due_date)}
                        </span>
                      )}
                    </p>

                    {winner && (
                      <p className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-sage-50 px-3 py-1.5 text-sm text-sage-700">
                        <Trophy className="h-3.5 w-3.5 flex-none" />
                        <span className="min-w-0 truncate">{winner.name}</span>
                        {winner.price > 0 && (
                          <span className="ml-auto flex-none tabular-nums">{formatMoney(winner.price)}</span>
                        )}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <DecisionDetail
        open={detail != null}
        onClose={() => setDetail(null)}
        decision={detail}
        onEdit={(decision) => {
          setDetail(null);
          setEditing(decision);
          setFormOpen(true);
        }}
        onAddOption={(decision) => {
          setDetail(null);
          setOptionTarget({ decisionId: decision.id, option: null });
        }}
        onEditOption={(decision, option) => {
          setDetail(null);
          setOptionTarget({ decisionId: decision.id, option });
        }}
      />

      <DecisionSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        decision={editing}
        vendors={data.vendors}
      />

      <OptionSheet
        open={optionTarget != null}
        onClose={() => setOptionTarget(null)}
        decisionId={optionTarget?.decisionId ?? null}
        option={optionTarget?.option ?? null}
      />
    </div>
  );
}
