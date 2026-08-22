'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Armchair, ChevronDown } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { GUEST_MENUS, GUEST_MENU_LABEL, GUEST_STATUS_LABEL } from '@/lib/labels';
import type { GuestSeat } from '@/lib/selectors';
import type { Assignee, Guest, GuestMenu, GuestStatus } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { Segmented } from './ui/segmented';
import { ConfirmButton } from './ui/confirm-button';
import { Checkbox, Field, FieldRow, Input, Select, Textarea } from './ui/form';

interface GuestSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = alta nueva. */
  guest: Guest | null;
  /** Grupos que ya existen, para reutilizarlos sin volver a escribirlos. */
  groups: string[];
  /** Dónde está sentado, derivado del plano. Aquí solo se enseña. */
  seat?: GuestSeat | null;
}

const EMPTY = {
  first_name: '',
  last_name: '',
  group: '',
  side: 'Ambos' as Assignee,
  status: 'pendiente' as GuestStatus,
  menu: 'normal' as GuestMenu,
  allergies: '',
  transport: false,
  notes: '',
};

/**
 * Alta y edición de invitados. Al dar de alta solo se piden nombre y estado
 * (lo demás se despliega si hace falta); al editar se abre todo.
 */
export function GuestSheet({ open, onClose, guest, groups, seat = null }: GuestSheetProps) {
  const { saveGuest, deleteGuest } = useData();
  const [form, setForm] = useState(EMPTY);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (guest) {
      setForm({
        first_name: guest.first_name,
        last_name: guest.last_name,
        group: guest.group,
        side: guest.side,
        status: guest.status,
        menu: guest.menu,
        allergies: guest.allergies ?? '',
        transport: guest.transport,
        notes: guest.notes ?? '',
      });
      setShowAll(true);
    } else {
      setForm(EMPTY);
      setShowAll(false);
    }
  }, [open, guest]);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!form.first_name.trim()) return;
    await saveGuest({
      id: guest?.id,
      first_name: form.first_name,
      last_name: form.last_name,
      group: form.group,
      side: form.side,
      status: form.status,
      menu: form.menu,
      allergies: form.allergies || null,
      transport: form.transport,
      notes: form.notes || null,
    });
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={guest ? 'Editar invitado' : 'Nuevo invitado'}
      footer={
        <div className="flex gap-2">
          {guest && (
            <ConfirmButton
              onConfirm={() => {
                void deleteGuest(guest.id);
                onClose();
              }}
            />
          )}
          <Button className="flex-1" disabled={!form.first_name.trim()} onClick={() => void submit()}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FieldRow>
          <Field label="Nombre">
            <Input
              autoFocus={!guest}
              value={form.first_name}
              onChange={(e) => set('first_name', e.target.value)}
              placeholder="Lucía"
            />
          </Field>
          <Field label="Apellidos">
            <Input
              value={form.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              placeholder="Ruiz Gómez"
            />
          </Field>
        </FieldRow>

        <Field label="Estado">
          <Segmented
            value={form.status}
            onChange={(value) => set('status', value)}
            options={[
              { value: 'pendiente', label: GUEST_STATUS_LABEL.pendiente },
              { value: 'confirmado', label: GUEST_STATUS_LABEL.confirmado },
              { value: 'no_viene', label: GUEST_STATUS_LABEL.no_viene },
            ]}
          />
        </Field>

        {!showAll ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            Más datos
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : (
          <div className="space-y-4 animate-in-up">
            <Field label="Grupo o familia">
              <Input
                list="grupos-invitados"
                value={form.group}
                onChange={(e) => set('group', e.target.value)}
                placeholder="Familia Ruiz"
              />
              <datalist id="grupos-invitados">
                {groups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
            </Field>

            <Field label="De parte de">
              <Segmented
                value={form.side}
                onChange={(value) => set('side', value)}
                options={[
                  { value: 'Antonio', label: 'Antonio' },
                  { value: 'Carmen', label: 'Carmen' },
                  { value: 'Ambos', label: 'Ambos' },
                ]}
              />
            </Field>

            <Field label="Menú">
              <Select value={form.menu} onChange={(e) => set('menu', e.target.value as GuestMenu)}>
                {GUEST_MENUS.map((menu) => (
                  <option key={menu} value={menu}>
                    {GUEST_MENU_LABEL[menu]}
                  </option>
                ))}
              </Select>
            </Field>

            {/* La mesa no se escribe aquí: manda la silla del plano. Esto solo
                enseña dónde está sentado y lleva allí. */}
            {guest && (
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-ink-400">
                  Mesa
                </span>
                <Link
                  href="/mesas"
                  onClick={onClose}
                  className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-[15px] transition-colors hover:bg-ink-100"
                >
                  <Armchair className="h-4 w-4 flex-none text-ink-400" />
                  <span className="min-w-0 flex-1 truncate text-ink-800">
                    {seat ? `${seat.table.name} · silla ${seat.index + 1}` : 'Sin sentar'}
                  </span>
                  <span className="flex-none text-xs text-ink-400">Ver plano</span>
                </Link>
                <span className="mt-1 block text-xs text-ink-400">Se sienta desde el plano de mesas.</span>
              </div>
            )}

            <Field label="Alergias o intolerancias">
              <Input
                value={form.allergies}
                onChange={(e) => set('allergies', e.target.value)}
                placeholder="Sin lactosa"
              />
            </Field>

            <Checkbox
              checked={form.transport}
              onChange={(value) => set('transport', value)}
              label="Necesita transporte"
              description="Cuenta para las plazas del autobús"
            />

            <Field label="Notas">
              <Textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Viene con niño pequeño…"
              />
            </Field>
          </div>
        )}
      </div>
    </Sheet>
  );
}
