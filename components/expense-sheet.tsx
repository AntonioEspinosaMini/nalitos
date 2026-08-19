'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/lib/data-context';
import { useCurrentUser } from '@/lib/user-context';
import type { BudgetCategory, Expense, Vendor } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { ConfirmButton } from './ui/confirm-button';
import { Field, FieldRow, Input, MoneyInput, Select, Textarea } from './ui/form';

interface ExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = alta nueva. */
  expense: Expense | null;
  categories: BudgetCategory[];
  vendors: Vendor[];
  /** Categoría preseleccionada al crear desde una categoría concreta. */
  defaultCategoryId?: string;
}

export function ExpenseSheet({
  open,
  onClose,
  expense,
  categories,
  vendors,
  defaultCategoryId,
}: ExpenseSheetProps) {
  const { saveExpense, deleteExpense } = useData();
  const user = useCurrentUser();

  const [concept, setConcept] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [total, setTotal] = useState('');
  const [paid, setPaid] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setConcept(expense?.concept ?? '');
    setCategoryId(expense?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '');
    setTotal(expense && expense.total_amount > 0 ? String(expense.total_amount) : '');
    setPaid(expense && expense.paid_amount > 0 ? String(expense.paid_amount) : '');
    setDueDate(expense?.due_date ?? '');
    setVendorId(expense?.vendor_id ?? '');
    setNotes(expense?.notes ?? '');
  }, [open, expense, categories, defaultCategoryId]);

  async function submit() {
    if (!concept.trim()) return;
    await saveExpense(
      {
        id: expense?.id,
        concept,
        category_id: categoryId,
        total_amount: Number.parseFloat(total) || 0,
        paid_amount: Number.parseFloat(paid) || 0,
        due_date: dueDate || null,
        notes: notes || null,
        vendor_id: vendorId || null,
      },
      user
    );
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={expense ? 'Editar gasto' : 'Nuevo gasto'}
      footer={
        <div className="flex gap-2">
          {expense && (
            <ConfirmButton
              onConfirm={() => {
                void deleteExpense(expense.id);
                onClose();
              }}
            />
          )}
          <Button className="flex-1" disabled={!concept.trim()} onClick={() => void submit()}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Concepto">
          <Input
            autoFocus={!expense}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Señal del catering"
          />
        </Field>

        <Field label="Categoría">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <FieldRow>
          <Field label="Importe total">
            <MoneyInput value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Ya pagado" hint="El estado se calcula solo">
            <MoneyInput value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
          </Field>
        </FieldRow>

        <Field label="Fecha de pago">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>

        {vendors.length > 0 && (
          <Field label="Proveedor">
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Sin proveedor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Forma de pago, qué incluye…"
          />
        </Field>
      </div>
    </Sheet>
  );
}
