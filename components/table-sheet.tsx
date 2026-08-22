'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useData } from '@/lib/data-context';
import {
  DEFAULT_SEAT_COUNT,
  MAX_SEAT_COUNT,
  MIN_SEAT_COUNT,
  TABLE_SHAPE_LABEL,
} from '@/lib/labels';
import type { Table, TableShape } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { Segmented } from './ui/segmented';
import { ConfirmButton } from './ui/confirm-button';
import { Checkbox, Field, Input, Textarea } from './ui/form';

interface TableSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = mesa nueva. */
  table: Table | null;
  /** Para proponer un nombre que no esté cogido. */
  existingNames: string[];
}

/** "Mesa 1", "Mesa 2"… el primer número que quede libre. */
function suggestName(existing: string[]): string {
  const taken = new Set(existing.map((name) => name.trim().toLowerCase()));
  for (let i = 1; i <= 99; i += 1) {
    const candidate = `Mesa ${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return 'Mesa';
}

export function TableSheet({ open, onClose, table, existingNames }: TableSheetProps) {
  const { saveTable, deleteTable } = useData();

  const [name, setName] = useState('');
  const [shape, setShape] = useState<TableShape>('redonda');
  const [seatCount, setSeatCount] = useState(DEFAULT_SEAT_COUNT);
  const [isHead, setIsHead] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (table) {
      setName(table.name);
      setShape(table.shape);
      setSeatCount(table.seats.length);
      setIsHead(table.is_head);
      setNotes(table.notes ?? '');
    } else {
      setName(suggestName(existingNames));
      setShape('redonda');
      setSeatCount(DEFAULT_SEAT_COUNT);
      setIsHead(false);
      setNotes('');
    }
  }, [open, table, existingNames]);

  // Quitar sillas no borra a nadie, pero conviene decirlo antes de guardar.
  // Al encoger, los que caían fuera se recolocan en los huecos que queden, así
  // que solo pierden la silla los que ya no caben por número.
  const seated = table?.seats.filter(Boolean).length ?? 0;
  const wouldUnseat = table ? Math.max(0, seated - seatCount) : 0;

  async function submit() {
    if (!name.trim()) return;
    await saveTable({
      id: table?.id,
      name,
      shape,
      seat_count: seatCount,
      is_head: isHead,
      notes: notes || null,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={table ? 'Editar mesa' : 'Nueva mesa'}
      description={table ? undefined : 'Se coloca sola en un hueco libre del plano.'}
      footer={
        <div className="flex gap-2">
          {table && (
            <ConfirmButton
              onConfirm={() => {
                void deleteTable(table.id);
                onClose();
              }}
            />
          )}
          <Button className="flex-1" disabled={!name.trim()} onClick={() => void submit()}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre">
          <Input
            autoFocus={!table}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mesa 4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) void submit();
            }}
          />
        </Field>

        <Field label="Forma">
          <Segmented
            value={shape}
            onChange={setShape}
            options={[
              { value: 'redonda', label: TABLE_SHAPE_LABEL.redonda },
              { value: 'rectangular', label: TABLE_SHAPE_LABEL.rectangular },
            ]}
          />
        </Field>

        <Field
          label="Sillas"
          hint={
            wouldUnseat > 0
              ? `Se quedan sin silla ${wouldUnseat} invitado${wouldUnseat > 1 ? 's' : ''}. No se borran: vuelven a la lista de sin sentar.`
              : 'La mesa crece o encoge sola según las sillas que tenga.'
          }
        >
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="secondary"
              aria-label="Quitar una silla"
              disabled={seatCount <= MIN_SEAT_COUNT}
              onClick={() => setSeatCount((n) => Math.max(MIN_SEAT_COUNT, n - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <p className="flex-1 text-center font-display text-3xl tabular-nums text-ink-900">{seatCount}</p>
            <Button
              size="icon"
              variant="secondary"
              aria-label="Añadir una silla"
              disabled={seatCount >= MAX_SEAT_COUNT}
              onClick={() => setSeatCount((n) => Math.min(MAX_SEAT_COUNT, n + 1))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Field>

        <Checkbox
          checked={isHead}
          onChange={setIsHead}
          label="Es la mesa de los novios"
          description="Se pinta distinta y sale siempre la primera"
        />

        <Field label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Junto al ventanal, lejos de los altavoces…"
          />
        </Field>
      </div>
    </Sheet>
  );
}
