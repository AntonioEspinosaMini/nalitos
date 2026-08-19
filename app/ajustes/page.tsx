'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Settings2 } from 'lucide-react';
import { useAppData, useData } from '@/lib/data-context';
import { useUser } from '@/lib/user-context';
import { countdownLabel } from '@/lib/date';
import { PageHeader } from '@/components/page-header';
import { CategoriesSheet } from '@/components/categories-sheet';
import { Card, SectionTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, FieldRow, Input, MoneyInput } from '@/components/ui/form';

export default function SettingsPage() {
  const data = useAppData();
  const { updateWedding, configured, lastSyncAt } = useData();
  const { user, clearUser } = useUser();

  const [name, setName] = useState(data.wedding.name);
  const [date, setDate] = useState(data.wedding.date ?? '');
  const [venue, setVenue] = useState(data.wedding.venue ?? '');
  const [budget, setBudget] = useState(data.wedding.total_budget ? String(data.wedding.total_budget) : '');
  const [saved, setSaved] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Si los datos cambian desde el otro móvil, el formulario se pone al día.
  useEffect(() => {
    setName(data.wedding.name);
    setDate(data.wedding.date ?? '');
    setVenue(data.wedding.venue ?? '');
    setBudget(data.wedding.total_budget ? String(data.wedding.total_budget) : '');
  }, [data.wedding]);

  const usage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const expense of data.expenses) {
      counts[expense.category_id] = (counts[expense.category_id] ?? 0) + 1;
    }
    return counts;
  }, [data.expenses]);

  async function save() {
    await updateWedding({
      name,
      date: date || null,
      venue: venue || null,
      total_budget: Number.parseFloat(budget) || 0,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" />

      <section>
        <SectionTitle>Nuestra boda</SectionTitle>
        <Card className="space-y-4">
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Antonio & Carmen" />
          </Field>

          <FieldRow>
            <Field label="Fecha" hint={date ? countdownLabel(date) : undefined}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Presupuesto total">
              <MoneyInput value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="40000" />
            </Field>
          </FieldRow>

          <Field label="Lugar">
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Finca La Alameda" />
          </Field>

          <Button className="w-full" onClick={() => void save()}>
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Guardado
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Presupuesto</SectionTitle>
        <Card>
          <button
            type="button"
            onClick={() => setCategoriesOpen(true)}
            className="flex w-full items-center gap-3 text-left"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-blush-50 text-blush-600">
              <Settings2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink-800">Categorías</span>
              <span className="block text-xs text-ink-400">
                {data.budget_categories.length} categorías de gasto
              </span>
            </span>
          </button>
        </Card>
      </section>

      <section>
        <SectionTitle>Este dispositivo</SectionTitle>
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-800">{user}</p>
              <p className="text-xs text-ink-400">Quién usa la app en este móvil</p>
            </div>
            <Button variant="secondary" size="sm" onClick={clearUser}>
              Cambiar
            </Button>
          </div>

          <div className="border-t border-ink-100 pt-3 text-xs text-ink-400">
            <p>
              Datos: {configured ? 'JSONBin conectado' : 'JSONBin sin configurar (revisa .env.local)'}
            </p>
            {lastSyncAt && (
              <p className="mt-0.5">
                Último guardado: {new Date(lastSyncAt).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </Card>
      </section>

      <CategoriesSheet
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={data.budget_categories}
        usage={usage}
      />
    </div>
  );
}
