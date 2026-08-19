'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/lib/data-context';
import type { DecisionOption } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { ConfirmButton } from './ui/confirm-button';
import { Field, Input, ListInput, MoneyInput, StarRating, Textarea } from './ui/form';

interface OptionSheetProps {
  open: boolean;
  onClose: () => void;
  decisionId: string | null;
  /** null = opción nueva. */
  option: DecisionOption | null;
}

export function OptionSheet({ open, onClose, decisionId, option }: OptionSheetProps) {
  const { saveOption, deleteOption } = useData();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [ratingAntonio, setRatingAntonio] = useState(0);
  const [ratingCarmen, setRatingCarmen] = useState(0);

  useEffect(() => {
    if (!open) return;
    setName(option?.name ?? '');
    setPrice(option && option.price > 0 ? String(option.price) : '');
    setPros(option?.pros ?? []);
    setCons(option?.cons ?? []);
    setNotes(option?.notes ?? '');
    setRatingAntonio(option?.rating_antonio ?? 0);
    setRatingCarmen(option?.rating_carmen ?? 0);
  }, [open, option]);

  async function submit() {
    if (!decisionId || !name.trim()) return;
    await saveOption(decisionId, {
      id: option?.id,
      name,
      price: Number.parseFloat(price) || 0,
      pros,
      cons,
      notes: notes || null,
      rating_antonio: ratingAntonio,
      rating_carmen: ratingCarmen,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={option ? 'Editar opción' : 'Nueva opción'}
      footer={
        <div className="flex gap-2">
          {option && decisionId && (
            <ConfirmButton
              onConfirm={() => {
                void deleteOption(decisionId, option.id);
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
            autoFocus={!option}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Estudio Luz"
          />
        </Field>

        <Field label="Precio">
          <MoneyInput value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </Field>

        <Field label="Pros" hint="Enter para añadir cada línea">
          <ListInput value={pros} onChange={setPros} placeholder="Álbum incluido" />
        </Field>

        <Field label="Contras" hint="Enter para añadir cada línea">
          <ListInput value={cons} onChange={setCons} placeholder="Solo 8 horas" />
        </Field>

        <Field label="Valoraciones">
          <div className="space-y-2 rounded-xl border border-ink-200 bg-white px-3.5 py-3">
            <StarRating label="Antonio" value={ratingAntonio} onChange={setRatingAntonio} />
            <StarRating label="Carmen" value={ratingCarmen} onChange={setRatingCarmen} />
          </div>
        </Field>

        <Field label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Lo que haga falta recordar de esta opción…"
          />
        </Field>
      </div>
    </Sheet>
  );
}
