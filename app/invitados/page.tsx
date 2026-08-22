'use client';

import { useMemo, useState } from 'react';
import { Armchair, Bus, List, Plus, Search, Users, UtensilsCrossed } from 'lucide-react';
import { useAppData, useData } from '@/lib/data-context';
import { guestFullName, guestStats, guestsByGroup, seatMap, type GuestSeat } from '@/lib/selectors';
import { GUEST_MENU_LABEL, GUEST_STATUS_LABEL, GUEST_STATUS_STYLE } from '@/lib/labels';
import { cn, foldText } from '@/lib/utils';
import type { Guest, GuestStatus } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { GuestSheet } from '@/components/guest-sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, BadgeButton } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Stat, StatGrid } from '@/components/ui/stat';
import { Input } from '@/components/ui/form';

type StatusFilter = 'todos' | GuestStatus;
type SideFilter = 'todos' | 'Antonio' | 'Carmen';
type GroupMode = 'lista' | 'grupo';

export default function GuestsPage() {
  const data = useAppData();
  const { cycleGuestStatus } = useData();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [side, setSide] = useState<SideFilter>('todos');
  const [mode, setMode] = useState<GroupMode>('lista');
  const [editing, setEditing] = useState<Guest | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const stats = guestStats(data.guests);
  // Dónde está sentado cada uno: se saca una vez del plano y se reparte por
  // las filas. La mesa no se guarda en el invitado, se deriva de la silla.
  const seats = useMemo(() => seatMap(data.tables), [data.tables]);
  const groups = useMemo(
    () => [...new Set(data.guests.map((g) => g.group.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [data.guests]
  );

  const visible = useMemo(() => {
    const needle = foldText(query);
    return data.guests
      .filter((guest) => {
        if (status !== 'todos' && guest.status !== status) return false;
        // "De parte de Antonio" incluye a los que vienen por los dos.
        if (side !== 'todos' && guest.side !== side && guest.side !== 'Ambos') return false;
        if (!needle) return true;
        return foldText(`${guestFullName(guest)} ${guest.group}`).includes(needle);
      })
      .sort((a, b) => guestFullName(a).localeCompare(guestFullName(b), 'es'));
  }, [data.guests, query, side, status]);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(guest: Guest) {
    setEditing(guest);
    setSheetOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Invitados"
        subtitle={
          stats.total > 0 ? `${stats.confirmed} de ${stats.total} confirmados` : 'Todavía sin invitados'
        }
        action={
          <Button size="icon" onClick={openNew} aria-label="Añadir invitado">
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {data.guests.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no hay invitados"
          description="Añade al primero para empezar a llevar la cuenta de quién viene."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              Añadir invitado
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <StatGrid>
              <Stat label="Total" value={stats.total} />
              <Stat label="Confirmados" value={stats.confirmed} valueClassName="text-sage-600" />
              <Stat label="Pendientes" value={stats.pending} valueClassName="text-amber-600" />
              <Stat label="No vienen" value={stats.declined} valueClassName="text-ink-400" />
            </StatGrid>
            {stats.withTransport > 0 && (
              <p className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3 text-xs text-ink-500">
                <Bus className="h-3.5 w-3.5" />
                {stats.withTransport} necesitan transporte
              </p>
            )}
          </Card>

          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o grupo"
                className="pl-10"
              />
            </div>

            <Segmented
              scrollable
              value={status}
              onChange={setStatus}
              options={[
                { value: 'todos', label: 'Todos', count: stats.total },
                { value: 'confirmado', label: 'Confirmados', count: stats.confirmed },
                { value: 'pendiente', label: 'Pendientes', count: stats.pending },
                { value: 'no_viene', label: 'No vienen', count: stats.declined },
              ]}
            />

            {/* El carril de lados se desplaza si no cabe; el de vista se queda fijo
                en iconos para que la fila nunca desborde la pantalla. */}
            <div className="flex min-w-0 gap-2">
              <Segmented
                scrollable
                bleed={false}
                className="min-w-0 flex-1"
                value={side}
                onChange={setSide}
                options={[
                  { value: 'todos', label: 'Todos' },
                  { value: 'Antonio', label: 'Antonio' },
                  { value: 'Carmen', label: 'Carmen' },
                ]}
              />
              <Segmented
                iconOnly
                className="flex-none"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'lista', label: 'Lista', icon: List },
                  { value: 'grupo', label: 'Grupos', icon: Users },
                ]}
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">
              Ningún invitado coincide con la búsqueda.
            </p>
          ) : mode === 'lista' ? (
            <Card className="divide-y divide-ink-100 p-0">
              {visible.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  seat={seats.get(guest.id) ?? null}
                  onEdit={() => openEdit(guest)}
                  onCycle={() => void cycleGuestStatus(guest.id)}
                />
              ))}
            </Card>
          ) : (
            <div className="space-y-4">
              {guestsByGroup(visible).map(({ group, guests }) => (
                <div key={group}>
                  <p className="mb-1.5 flex items-baseline justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">
                      {group}
                    </span>
                    <span className="text-xs tabular-nums text-ink-300">{guests.length}</span>
                  </p>
                  <Card className="divide-y divide-ink-100 p-0">
                    {guests.map((guest) => (
                      <GuestRow
                        key={guest.id}
                        guest={guest}
                        seat={seats.get(guest.id) ?? null}
                        onEdit={() => openEdit(guest)}
                        onCycle={() => void cycleGuestStatus(guest.id)}
                      />
                    ))}
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <GuestSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        guest={editing}
        groups={groups}
        seat={editing ? seats.get(editing.id) ?? null : null}
      />
    </div>
  );
}

function GuestRow({
  guest,
  seat,
  onEdit,
  onCycle,
}: {
  guest: Guest;
  /** Su sitio en el plano, si lo tiene. */
  seat: GuestSeat | null;
  onEdit: () => void;
  onCycle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            'truncate text-sm font-medium text-ink-800',
            guest.status === 'no_viene' && 'text-ink-400'
          )}
        >
          {guestFullName(guest)}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-400">
          {guest.group && <span className="truncate">{guest.group}</span>}
          {guest.side !== 'Ambos' && <span>· {guest.side}</span>}
          {guest.menu !== 'normal' && (
            <span className="inline-flex items-center gap-1">
              <UtensilsCrossed className="h-3 w-3" />
              {GUEST_MENU_LABEL[guest.menu]}
            </span>
          )}
          {guest.transport && (
            <span className="inline-flex items-center gap-1">
              <Bus className="h-3 w-3" />
              Bus
            </span>
          )}
          {seat && (
            <span className="inline-flex items-center gap-1">
              <Armchair className="h-3 w-3" />
              {seat.table.name}
            </span>
          )}
        </p>
      </button>

      {guest.allergies && (
        <Badge className="bg-rose-50 text-rose-600 ring-rose-200">Alergias</Badge>
      )}

      {/* Un toque cambia el estado: pendiente → confirmado → no viene. */}
      <BadgeButton
        onClick={onCycle}
        className={GUEST_STATUS_STYLE[guest.status]}
        aria-label={`Cambiar estado de ${guestFullName(guest)}`}
      >
        {GUEST_STATUS_LABEL[guest.status]}
      </BadgeButton>
    </div>
  );
}
