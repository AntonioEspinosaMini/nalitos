'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eraser, Pencil, RotateCw, Search, TriangleAlert, UserMinus } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { SEAT_RADIUS, seatOffsets, tableRadius, tableSize } from '@/lib/seating';
import { guestFullName, seatMap, tableSummary } from '@/lib/selectors';
import { GUEST_MENU_LABEL, GUEST_STATUS_LABEL, GUEST_STATUS_STYLE } from '@/lib/labels';
import { cn, foldText } from '@/lib/utils';
import type { Guest, Table } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/form';

interface TableDetailProps {
  open: boolean;
  onClose: () => void;
  table: Table | null;
  guests: Guest[];
  tables: Table[];
  /** Si viene una silla, el panel se abre directamente a elegir invitado. */
  initialSeat?: number | null;
  onEdit: (table: Table) => void;
}

/**
 * Una mesa a tamaño grande. Aquí es donde se sienta de verdad a la gente: en el
 * plano las sillas son puntos, y en el sofá con el móvil hay que poder darle a
 * la silla a la primera.
 */
export function TableDetail({
  open,
  onClose,
  table,
  guests,
  tables,
  initialSeat = null,
  onEdit,
}: TableDetailProps) {
  const { assignSeat, clearSeat, clearTable, rotateTable } = useData();
  const [picking, setPicking] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setPicking(initialSeat);
    setQuery('');
  }, [open, initialSeat, table?.id]);

  const seated = useMemo(() => seatMap(tables), [tables]);
  const summary = useMemo(() => (table ? tableSummary(guests, table) : null), [guests, table]);

  if (!table || !summary) return null;

  const size = tableSize(table.shape, table.seats.length);
  const radius = tableRadius(table);
  const seats = seatOffsets(table.shape, table.seats.length, table.rotation);
  const isPicking = picking != null;
  const occupantId = isPicking ? table.seats[picking] : null;
  const occupant = occupantId ? guests.find((g) => g.id === occupantId) ?? null : null;

  async function sit(guest: Guest) {
    if (picking == null || !table) return;
    await assignSeat(table.id, picking, guest.id);
    setPicking(null);
    setQuery('');
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isPicking ? `Silla ${picking + 1}` : table.name}
      description={
        isPicking
          ? occupant
            ? `Ahora está ${guestFullName(occupant)}. Elige a otra persona para cambiarlos.`
            : `${table.name} · elige a quién sentar aquí`
          : `${summary.seated} de ${summary.capacity} sillas ocupadas`
      }
      footer={
        isPicking ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPicking(null)}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            {occupant && (
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  if (picking == null) return;
                  void clearSeat(table.id, picking);
                  setPicking(null);
                }}
              >
                <UserMinus className="h-4 w-4" />
                Vaciar silla
              </Button>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onEdit(table)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            {table.shape === 'rectangular' && (
              <Button
                variant="secondary"
                aria-label="Girar la mesa"
                size="icon"
                onClick={() => void rotateTable(table.id, table.rotation + 45)}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              className="flex-1"
              disabled={summary.seated === 0}
              onClick={() => void clearTable(table.id)}
            >
              <Eraser className="h-4 w-4" />
              Vaciar mesa
            </Button>
          </div>
        )
      }
    >
      {isPicking ? (
        <GuestPicker
          guests={guests}
          seated={seated}
          currentId={occupantId}
          query={query}
          onQuery={setQuery}
          onPick={(guest) => void sit(guest)}
        />
      ) : (
        <div className="space-y-4">
          {/* La mesa, grande. Tocar una silla abre el buscador de invitados. */}
          <svg
            viewBox={`${-radius} ${-radius} ${radius * 2} ${radius * 2}`}
            className="mx-auto block h-56 w-full max-w-xs"
            role="group"
            aria-label={`Sillas de ${table.name}`}
          >
            {size.shape === 'redonda' ? (
              <circle
                r={size.radius}
                fill={table.is_head ? '#f8ece7' : '#faf9f7'}
                stroke={table.is_head ? '#e2bcae' : '#d4cec4'}
                strokeWidth={3}
              />
            ) : (
              <rect
                x={-size.length / 2}
                y={-size.width / 2}
                width={size.length}
                height={size.width}
                rx={14}
                transform={`rotate(${table.rotation})`}
                fill={table.is_head ? '#f8ece7' : '#faf9f7'}
                stroke={table.is_head ? '#e2bcae' : '#d4cec4'}
                strokeWidth={3}
              />
            )}

            {seats.map((seat) => {
              const guestId = table.seats[seat.index];
              const guest = guestId ? guests.find((g) => g.id === guestId) ?? null : null;
              const declined = guest?.status === 'no_viene';
              return (
                <g
                  key={seat.index}
                  transform={`translate(${seat.x} ${seat.y})`}
                  className="cursor-pointer"
                  onClick={() => setPicking(seat.index)}
                  role="button"
                  aria-label={
                    guest ? `Silla ${seat.index + 1}: ${guestFullName(guest)}` : `Silla ${seat.index + 1}, libre`
                  }
                >
                  <circle r={SEAT_RADIUS * 1.7} fill="transparent" />
                  <circle
                    r={SEAT_RADIUS}
                    fill={declined ? '#fecdd3' : guest ? '#e6ede6' : '#ffffff'}
                    stroke={declined ? '#e11d48' : guest ? '#7fa37f' : '#d4cec4'}
                    strokeWidth={2.5}
                    strokeDasharray={guest ? undefined : '5 4'}
                  />
                  <text
                    textAnchor="middle"
                    y={5}
                    fontSize={14}
                    fontWeight={600}
                    fill={declined ? '#9f1239' : guest ? '#3d553d' : '#a9a196'}
                    className="pointer-events-none"
                  >
                    {guest ? initials(guest) : seat.index + 1}
                  </text>
                </g>
              );
            })}
          </svg>

          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-ink-500">
                {summary.free > 0 ? `${summary.free} sillas libres` : 'Mesa completa'}
              </p>
              <p className="text-xs tabular-nums text-ink-400">
                {summary.seated} / {summary.capacity}
              </p>
            </div>
            <Progress className="mt-2" value={summary.percentFull} barClassName="bg-sage-500" />
          </div>

          {(summary.menus.length > 0 || summary.allergies > 0 || summary.unconfirmed > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {summary.menus.map(({ menu, count }) => (
                <Badge key={menu}>
                  {count} {GUEST_MENU_LABEL[menu].toLowerCase()}
                </Badge>
              ))}
              {summary.allergies > 0 && (
                <Badge className="bg-rose-50 text-rose-600 ring-rose-200">
                  {summary.allergies} con alergias
                </Badge>
              )}
              {summary.unconfirmed > 0 && (
                <Badge className={GUEST_STATUS_STYLE.pendiente}>
                  {summary.unconfirmed} sin confirmar
                </Badge>
              )}
            </div>
          )}

          {summary.declined > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-none" />
              Hay {summary.declined} sentado{summary.declined > 1 ? 's' : ''} que ha{summary.declined > 1 ? 'n' : ''}{' '}
              dicho que no viene{summary.declined > 1 ? 'n' : ''}. Toca su silla para dejarla libre.
            </p>
          )}

          {table.notes && <p className="text-sm leading-relaxed text-ink-500">{table.notes}</p>}

          {/* La lista, porque en las sillas solo caben las iniciales. */}
          <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200">
            {summary.occupants.map((guest, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPicking(index)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-ink-50"
              >
                <span className="w-5 flex-none text-center text-xs tabular-nums text-ink-300">{index + 1}</span>
                {guest ? (
                  <>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm text-ink-800',
                        guest.status === 'no_viene' && 'text-rose-500 line-through'
                      )}
                    >
                      {guestFullName(guest)}
                    </span>
                    {guest.menu !== 'normal' && (
                      <span className="flex-none text-[11px] text-ink-400">{GUEST_MENU_LABEL[guest.menu]}</span>
                    )}
                    {guest.allergies && (
                      <span className="flex-none text-[11px] text-rose-500">Alergias</span>
                    )}
                  </>
                ) : (
                  <span className="flex-1 text-sm text-ink-300">Libre</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ─── Elegir invitado ─────────────────────────────────────────────────────────

function GuestPicker({
  guests,
  seated,
  currentId,
  query,
  onQuery,
  onPick,
}: {
  guests: Guest[];
  seated: Map<string, { table: Table; index: number }>;
  currentId: string | null;
  query: string;
  onQuery: (value: string) => void;
  onPick: (guest: Guest) => void;
}) {
  const { free, elsewhere } = useMemo(() => {
    const needle = foldText(query);
    const matches = guests
      .filter((guest) => guest.id !== currentId)
      .filter((guest) => !needle || foldText(`${guestFullName(guest)} ${guest.group}`).includes(needle))
      .sort((a, b) => {
        const byGroup = (a.group || 'zzz').localeCompare(b.group || 'zzz', 'es');
        if (byGroup !== 0) return byGroup;
        return guestFullName(a).localeCompare(guestFullName(b), 'es');
      });
    return {
      free: matches.filter((guest) => !seated.has(guest.id)),
      elsewhere: matches.filter((guest) => seated.has(guest.id)),
    };
  }, [currentId, guests, query, seated]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar por nombre o grupo"
          className="pl-10"
        />
      </div>

      {free.length === 0 && elsewhere.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-400">Nadie coincide con la búsqueda.</p>
      )}

      {free.length > 0 && (
        <div>
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            Sin sentar
          </p>
          <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200">
            {free.map((guest) => (
              <GuestOption key={guest.id} guest={guest} onPick={() => onPick(guest)} />
            ))}
          </div>
        </div>
      )}

      {elsewhere.length > 0 && (
        <div>
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            Ya sentados · se cambian de sitio
          </p>
          <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200">
            {elsewhere.map((guest) => {
              const where = seated.get(guest.id);
              return (
                <GuestOption
                  key={guest.id}
                  guest={guest}
                  hint={where ? `${where.table.name} · silla ${where.index + 1}` : undefined}
                  onPick={() => onPick(guest)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GuestOption({
  guest,
  hint,
  onPick,
}: {
  guest: Guest;
  hint?: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-ink-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-800">{guestFullName(guest)}</span>
        <span className="mt-0.5 block truncate text-xs text-ink-400">
          {[guest.group, hint].filter(Boolean).join(' · ') || 'Sin grupo'}
        </span>
      </span>
      {guest.status !== 'confirmado' && (
        <Badge className={GUEST_STATUS_STYLE[guest.status]}>{GUEST_STATUS_LABEL[guest.status]}</Badge>
      )}
    </button>
  );
}

function initials(guest: Guest): string {
  const parts = guestFullName(guest).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
