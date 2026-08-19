'use client';

import { useState } from 'react';
import { Check, Globe, Mail, Pencil, Phone, Plus, Scale, Wallet } from 'lucide-react';
import { useAppData, useData } from '@/lib/data-context';
import { useCurrentUser } from '@/lib/user-context';
import { vendorDecisions, vendorExpenses, vendorMoney, vendorTasks } from '@/lib/selectors';
import { VENDOR_STATUSES, VENDOR_STATUS_LABEL, VENDOR_STATUS_STYLE } from '@/lib/labels';
import { formatShortDate, todayISO } from '@/lib/date';
import { cn, formatMoney } from '@/lib/utils';
import type { Vendor } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { BadgeButton } from './ui/badge';
import { Progress } from './ui/progress';
import { ConfirmButton } from './ui/confirm-button';
import { Field, FieldRow, Input, MoneyInput } from './ui/form';

interface VendorDetailProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onEdit: (vendor: Vendor) => void;
  onAddTask: (vendor: Vendor) => void;
}

/** Ficha del proveedor: contacto, dinero y todo lo que cuelga de él. */
export function VendorDetail({ open, onClose, vendor, onEdit, onAddTask }: VendorDetailProps) {
  const data = useAppData();
  const { setVendorStatus, deleteVendor, registerVendorPayment, toggleTask } = useData();
  const user = useCurrentUser();

  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());

  if (!vendor) return null;

  // Se relee del store para que la ficha se actualice al registrar un pago.
  const current = data.vendors.find((v) => v.id === vendor.id) ?? vendor;
  const money = vendorMoney(data, current);
  const category = data.budget_categories.find((c) => c.id === current.category_id);
  const tasks = vendorTasks(data, current.id);
  const expenses = vendorExpenses(data, current.id);
  const decisions = vendorDecisions(data, current.id);

  async function pay() {
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    await registerVendorPayment(current.id, value, date || null, user);
    setAmount('');
    setPaying(false);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={current.name}
      description={category?.name}
      footer={
        <div className="flex gap-2">
          <ConfirmButton
            onConfirm={() => {
              void deleteVendor(current.id);
              onClose();
            }}
          />
          <Button variant="secondary" className="flex-1" onClick={() => onEdit(current)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button className="flex-1" onClick={() => setPaying((v) => !v)}>
            <Wallet className="h-4 w-4" />
            Registrar pago
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Estado: un toque para moverlo por el embudo. */}
        <div className="flex flex-wrap gap-1.5">
          {VENDOR_STATUSES.map((status) => (
            <BadgeButton
              key={status}
              onClick={() => void setVendorStatus(current.id, status)}
              className={cn(
                current.status === status
                  ? VENDOR_STATUS_STYLE[status]
                  : 'bg-white text-ink-400 ring-ink-200'
              )}
            >
              {VENDOR_STATUS_LABEL[status]}
            </BadgeButton>
          ))}
        </div>

        {/* Registrar pago */}
        {paying && (
          <div className="space-y-3 rounded-2xl bg-blush-50 p-4 animate-in-up">
            <FieldRow>
              <Field label="Importe">
                <MoneyInput
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void pay();
                  }}
                />
              </Field>
              <Field label="Fecha">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </FieldRow>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPaying(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!(Number.parseFloat(amount) > 0)}
                onClick={() => void pay()}
              >
                Guardar pago
              </Button>
            </div>
            <p className="text-xs text-blush-700">
              El pago entra directamente en el presupuesto, en la categoría del proveedor.
            </p>
          </div>
        )}

        {/* Dinero */}
        {money.price > 0 && (
          <div>
            <div className="flex items-end justify-between">
              <p className="font-display text-3xl tabular-nums text-ink-900">{formatMoney(money.price)}</p>
              <p className="text-xs tabular-nums text-ink-400">{money.percentPaid}% pagado</p>
            </div>
            <Progress className="mt-2" value={money.percentPaid} barClassName="bg-sage-500" />
            <div className="mt-2 flex justify-between text-xs">
              <span className="tabular-nums text-sage-600">Pagado {formatMoney(money.paid)}</span>
              <span className="tabular-nums text-ink-500">Pendiente {formatMoney(money.pending)}</span>
            </div>
          </div>
        )}

        {/* Contacto */}
        {(current.contact_name || current.phone || current.email || current.web) && (
          <div className="space-y-1.5">
            {current.contact_name && (
              <p className="text-sm text-ink-600">Contacto: {current.contact_name}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {current.phone && (
                <a
                  href={`tel:${current.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-200"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {current.phone}
                </a>
              )}
              {current.email && (
                <a
                  href={`mailto:${current.email}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-200"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              )}
              {current.web && (
                <a
                  href={current.web.startsWith('http') ? current.web : `https://${current.web}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-200"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Web
                </a>
              )}
            </div>
          </div>
        )}

        {current.hired_date && (
          <p className="text-sm text-ink-500">Contratado el {formatShortDate(current.hired_date)}</p>
        )}

        {current.notes && (
          <p className="whitespace-pre-line rounded-xl bg-ink-50 p-3 text-sm leading-relaxed text-ink-600">
            {current.notes}
          </p>
        )}

        {/* Tareas del proveedor */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">Tareas</h3>
            <button
              type="button"
              onClick={() => onAddTask(current)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blush-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir
            </button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-400">Sin tareas asociadas.</p>
          ) : (
            <ul className="space-y-1">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => void toggleTask(task.id)}
                    aria-label={`Completar ${task.title}`}
                    className={cn(
                      'flex h-5 w-5 flex-none items-center justify-center rounded-full border transition-colors',
                      task.status === 'completada'
                        ? 'border-sage-500 bg-sage-500 text-white'
                        : 'border-ink-300 text-transparent hover:border-sage-500'
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </button>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm text-ink-700',
                      task.status === 'completada' && 'text-ink-400 line-through'
                    )}
                  >
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gastos asociados */}
        {expenses.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">Gastos</h3>
            <ul className="space-y-1">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink-700">{expense.concept}</span>
                  <span className="flex-none tabular-nums text-ink-500">
                    {formatMoney(expense.paid_amount)} / {formatMoney(expense.total_amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Decisiones relacionadas */}
        {decisions.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">
              Decisiones
            </h3>
            <ul className="space-y-1">
              {decisions.map((decision) => (
                <li key={decision.id} className="flex items-center gap-2 text-sm text-ink-700">
                  <Scale className="h-3.5 w-3.5 flex-none text-ink-400" />
                  <span className="min-w-0 truncate">{decision.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Sheet>
  );
}
