'use client';

import { useMemo, useState } from 'react';
import { Armchair, Plus, TriangleAlert, X } from 'lucide-react';
import { useAppData, useData } from '@/lib/data-context';
import {
  guestFullName,
  seatingStats,
  sortedTables,
  tableSummary,
  unseatedGuests,
} from '@/lib/selectors';
import { GUEST_MENU_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { Guest, Table } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { SeatingPlan } from '@/components/seating-plan';
import { TableSheet } from '@/components/table-sheet';
import { TableDetail } from '@/components/table-detail';
import { Card, SectionTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Stat, StatGrid } from '@/components/ui/stat';

/**
 * El plano del banquete. La silla manda: sentar a alguien aquí es lo que hace
 * que su mesa aparezca en su ficha de invitado, y no al revés.
 */
export default function TablesPage() {
  const data = useAppData();
  const { moveTable, assignSeat } = useData();

  const [editing, setEditing] = useState<Table | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openTable, setOpenTable] = useState<Table | null>(null);
  const [openSeat, setOpenSeat] = useState<number | null>(null);
  // Invitado que se está colocando: mientras dura, tocar una mesa lo sienta.
  const [placing, setPlacing] = useState<Guest | null>(null);

  const stats = seatingStats(data);
  const waiting = useMemo(() => unseatedGuests(data), [data]);
  const tables = useMemo(() => sortedTables(data.tables), [data.tables]);
  const names = useMemo(() => data.tables.map((table) => table.name), [data.tables]);

  // La mesa abierta se vuelve a buscar en los datos para que el panel se
  // refresque solo cuando alguien se sienta o se levanta.
  const current = openTable ? data.tables.find((t) => t.id === openTable.id) ?? null : null;

  function newTable() {
    setEditing(null);
    setSheetOpen(true);
  }

  /** Toque en una mesa: si hay alguien esperando sitio, se le sienta ahí. */
  async function handleOpenTable(table: Table) {
    if (placing) {
      const free = table.seats.indexOf(null);
      if (free === -1) return;
      await assignSeat(table.id, free, placing.id);
      setPlacing(null);
      return;
    }
    setOpenSeat(null);
    setOpenTable(table);
  }

  async function handleSeatTap(table: Table, seatIndex: number) {
    if (placing) {
      await assignSeat(table.id, seatIndex, placing.id);
      setPlacing(null);
      return;
    }
    setOpenSeat(seatIndex);
    setOpenTable(table);
  }

  return (
    <div>
      <PageHeader
        title="Mesas"
        subtitle={
          data.tables.length === 0
            ? 'Todavía sin plano'
            : stats.unseated > 0
              ? `${stats.unseated} sin sentar de ${stats.seated + stats.unseated}`
              : 'Todo el mundo tiene su sitio'
        }
        action={
          <Button size="icon" onClick={newTable} aria-label="Nueva mesa">
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {data.tables.length === 0 ? (
        <EmptyState
          icon={Armchair}
          title="Todavía no hay mesas"
          description="Empieza por la mesa de los novios y ve añadiendo el resto. Cada una se coloca sola en un hueco del plano y luego la mueves donde quieras."
          action={
            <Button onClick={newTable}>
              <Plus className="h-4 w-4" />
              Añadir mesa
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <StatGrid>
              <Stat label="Mesas" value={stats.tables} />
              <Stat label="Sillas" value={stats.capacity} hint={`${stats.free} libres`} />
              <Stat label="Sentados" value={stats.seated} valueClassName="text-sage-600" />
              <Stat
                label="Sin sentar"
                value={stats.unseated}
                valueClassName={stats.unseated > 0 ? 'text-amber-600' : 'text-ink-400'}
              />
            </StatGrid>
            <Progress className="mt-3" value={stats.percentSeated} barClassName="bg-sage-500" />
          </Card>

          {stats.declinedSeated > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-none" />
              {stats.declinedSeated} sentado{stats.declinedSeated > 1 ? 's' : ''} ha
              {stats.declinedSeated > 1 ? 'n' : ''} dicho que no viene
              {stats.declinedSeated > 1 ? 'n' : ''}. Están marcados en rojo en el plano.
            </p>
          )}

          {placing && (
            <div className="flex items-center gap-3 rounded-xl bg-blush-50 px-3 py-2.5 text-sm text-blush-700 animate-in-up">
              <span className="min-w-0 flex-1">
                Toca una mesa para sentar a <strong className="font-semibold">{guestFullName(placing)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPlacing(null)}
                aria-label="Cancelar"
                className="flex-none rounded-lg p-1 text-blush-600 hover:bg-blush-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <SeatingPlan
            tables={data.tables}
            guests={data.guests}
            selectedId={current?.id ?? null}
            highlightUnseated={placing != null}
            onOpenTable={(table) => void handleOpenTable(table)}
            onSeatTap={(table, index) => void handleSeatTap(table, index)}
            onMoveTable={(id, x, y) => void moveTable(id, x, y)}
            className="h-[58dvh] min-h-[320px]"
          />

          <p className="px-1 text-xs leading-relaxed text-ink-400">
            Arrastra las mesas para colocarlas y tócalas para abrirlas. Se guarda al soltar.
          </p>

          {waiting.length > 0 && (
            <section>
              <SectionTitle>Sin sentar · {waiting.length}</SectionTitle>
              <Card>
                <div className="flex flex-wrap gap-1.5">
                  {waiting.map((guest) => (
                    <button
                      key={guest.id}
                      type="button"
                      onClick={() => setPlacing(placing?.id === guest.id ? null : guest)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors',
                        placing?.id === guest.id
                          ? 'bg-blush-500 text-white ring-blush-500'
                          : 'bg-white text-ink-600 ring-ink-200 hover:bg-ink-50'
                      )}
                    >
                      {guestFullName(guest)}
                    </button>
                  ))}
                </div>
                <p className="mt-3 border-t border-ink-100 pt-2.5 text-xs text-ink-400">
                  Toca a alguien y después la mesa donde quieras sentarlo.
                </p>
              </Card>
            </section>
          )}

          <section>
            <SectionTitle>Las mesas</SectionTitle>
            <Card className="divide-y divide-ink-100 p-0">
              {tables.map((table) => (
                <TableRow
                  key={table.id}
                  table={table}
                  guests={data.guests}
                  onOpen={() => {
                    setOpenSeat(null);
                    setOpenTable(table);
                  }}
                />
              ))}
            </Card>
          </section>
        </div>
      )}

      <TableSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        table={editing}
        existingNames={names}
      />

      <TableDetail
        open={current != null}
        onClose={() => setOpenTable(null)}
        table={current}
        guests={data.guests}
        tables={data.tables}
        initialSeat={openSeat}
        onEdit={(table) => {
          setOpenTable(null);
          setEditing(table);
          setSheetOpen(true);
        }}
      />
    </div>
  );
}

function TableRow({
  table,
  guests,
  onOpen,
}: {
  table: Table;
  guests: Guest[];
  onOpen: () => void;
}) {
  const summary = tableSummary(guests, table);
  const full = summary.free === 0;

  return (
    <button type="button" onClick={onOpen} className="w-full px-4 py-3 text-left transition-colors hover:bg-ink-50">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-ink-800">{table.name}</span>
            {table.is_head && <Badge className="bg-blush-100 text-blush-700 ring-blush-200">Novios</Badge>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-400">
            {summary.menus.map(({ menu, count }) => (
              <span key={menu}>
                {count} {GUEST_MENU_LABEL[menu].toLowerCase()}
              </span>
            ))}
            {summary.allergies > 0 && <span className="text-rose-500">{summary.allergies} con alergias</span>}
            {summary.declined > 0 && <span className="text-rose-500">{summary.declined} no viene</span>}
            {summary.menus.length === 0 && summary.allergies === 0 && summary.declined === 0 && (
              <span>{full ? 'Completa' : `${summary.free} libres`}</span>
            )}
          </span>
        </span>
        <span className={cn('flex-none text-xs tabular-nums', full ? 'text-sage-600' : 'text-ink-400')}>
          {summary.seated}/{summary.capacity}
        </span>
      </div>
      <Progress
        className="mt-2 h-1.5"
        value={summary.percentFull}
        barClassName={full ? 'bg-sage-500' : 'bg-blush-400'}
      />
    </button>
  );
}
