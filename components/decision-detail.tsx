'use client';

import { Minus, Pencil, Plus, Trophy } from 'lucide-react';
import { useAppData, useData } from '@/lib/data-context';
import { DECISION_STATUS_LABEL, DECISION_STATUS_STYLE } from '@/lib/labels';
import { formatLongDate } from '@/lib/date';
import { cn, formatMoney } from '@/lib/utils';
import type { Decision, DecisionOption } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { StarRating } from './ui/form';

interface DecisionDetailProps {
  open: boolean;
  onClose: () => void;
  decision: Decision | null;
  onEdit: (decision: Decision) => void;
  onAddOption: (decision: Decision) => void;
  onEditOption: (decision: Decision, option: DecisionOption) => void;
}

/** Comparativa de opciones de una decisión, con valoraciones y ganadora. */
export function DecisionDetail({
  open,
  onClose,
  decision,
  onEdit,
  onAddOption,
  onEditOption,
}: DecisionDetailProps) {
  const data = useAppData();
  const { setWinner, rateOption } = useData();

  if (!decision) return null;

  // Se relee del store para reflejar valoraciones y ganadora al vuelo.
  const current = data.decisions.find((d) => d.id === decision.id) ?? decision;
  const vendor = data.vendors.find((v) => v.id === current.vendor_id);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={current.title}
      description={current.due_date ? `Decidir antes del ${formatLongDate(current.due_date)}` : undefined}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => onEdit(current)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button className="flex-1" onClick={() => onAddOption(current)}>
            <Plus className="h-4 w-4" />
            Añadir opción
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={DECISION_STATUS_STYLE[current.status]}>
            {DECISION_STATUS_LABEL[current.status]}
          </Badge>
          {vendor && <Badge>{vendor.name}</Badge>}
        </div>

        {current.description && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{current.description}</p>
        )}

        {current.options.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-400">
            Añade las opciones que queréis comparar.
          </p>
        ) : (
          <div className="space-y-3">
            {current.options.map((option) => (
              <article
                key={option.id}
                className={cn(
                  'rounded-2xl border p-4 transition-colors',
                  option.winner ? 'border-sage-300 bg-sage-50' : 'border-ink-200 bg-white'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-ink-900">
                      <span className="truncate">{option.name}</span>
                      {option.winner && <Trophy className="h-4 w-4 flex-none text-sage-600" />}
                    </p>
                    {option.price > 0 && (
                      <p className="font-display text-2xl tabular-nums text-ink-800">
                        {formatMoney(option.price)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditOption(current, option)}
                    aria-label={`Editar ${option.name}`}
                    className="flex-none rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {(option.pros.length > 0 || option.cons.length > 0) && (
                  <div className="mt-3 space-y-1">
                    {option.pros.map((pro, index) => (
                      <p key={`pro-${index}`} className="flex items-start gap-1.5 text-sm text-ink-600">
                        <Plus className="mt-0.5 h-3.5 w-3.5 flex-none text-sage-600" />
                        {pro}
                      </p>
                    ))}
                    {option.cons.map((con, index) => (
                      <p key={`con-${index}`} className="flex items-start gap-1.5 text-sm text-ink-600">
                        <Minus className="mt-0.5 h-3.5 w-3.5 flex-none text-rose-500" />
                        {con}
                      </p>
                    ))}
                  </div>
                )}

                {option.notes && <p className="mt-2 text-sm text-ink-500">{option.notes}</p>}

                {/* Valorar aquí mismo: un toque por estrella. */}
                <div className="mt-3 space-y-1 border-t border-ink-100 pt-3">
                  <StarRating
                    label="Antonio"
                    value={option.rating_antonio}
                    onChange={(value) => void rateOption(current.id, option.id, 'Antonio', value)}
                  />
                  <StarRating
                    label="Carmen"
                    value={option.rating_carmen}
                    onChange={(value) => void rateOption(current.id, option.id, 'Carmen', value)}
                  />
                </div>

                <Button
                  variant={option.winner ? 'primary' : 'secondary'}
                  className="mt-3 w-full"
                  onClick={() => void setWinner(current.id, option.id)}
                >
                  <Trophy className="h-4 w-4" />
                  {option.winner ? 'Es la elegida' : 'Elegir esta'}
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
