'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/lib/data-context';
import type { Decision, Vendor } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { ConfirmButton } from './ui/confirm-button';
import { Field, Input, Select, Textarea } from './ui/form';

interface DecisionSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = alta nueva. */
  decision: Decision | null;
  vendors: Vendor[];
}

export function DecisionSheet({ open, onClose, decision, vendors }: DecisionSheetProps) {
  const { saveDecision, deleteDecision } = useData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [vendorId, setVendorId] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(decision?.title ?? '');
    setDescription(decision?.description ?? '');
    setDueDate(decision?.due_date ?? '');
    setVendorId(decision?.vendor_id ?? '');
  }, [open, decision]);

  async function submit() {
    if (!title.trim()) return;
    await saveDecision({
      id: decision?.id,
      title,
      description: description || null,
      due_date: dueDate || null,
      vendor_id: vendorId || null,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={decision ? 'Editar decisión' : 'Nueva decisión'}
      footer={
        <div className="flex gap-2">
          {decision && (
            <ConfirmButton
              onConfirm={() => {
                void deleteDecision(decision.id);
                onClose();
              }}
            />
          )}
          <Button className="flex-1" disabled={!title.trim()} onClick={() => void submit()}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Qué hay que decidir">
          <Input
            autoFocus={!decision}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="¿Qué fotógrafo contratamos?"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) void submit();
            }}
          />
        </Field>

        <Field label="Fecha límite">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>

        {vendors.length > 0 && (
          <Field label="Proveedor relacionado">
            <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Ninguno</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Descripción">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto, qué buscamos, condiciones…"
          />
        </Field>
      </div>
    </Sheet>
  );
}
