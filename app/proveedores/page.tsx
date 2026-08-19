'use client';

import { useMemo, useState } from 'react';
import { Handshake, Plus, Search } from 'lucide-react';
import { useAppData } from '@/lib/data-context';
import { vendorMoney } from '@/lib/selectors';
import { VENDOR_STATUS_LABEL, VENDOR_STATUS_STYLE, VENDOR_STATUS_WEIGHT } from '@/lib/labels';
import { cn, foldText, formatMoney } from '@/lib/utils';
import type { Vendor, VendorStatus } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { VendorSheet } from '@/components/vendor-sheet';
import { VendorDetail } from '@/components/vendor-detail';
import { TaskSheet } from '@/components/task-sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/form';

type Filter = 'todos' | 'activos' | VendorStatus;

export default function VendorsPage() {
  const data = useAppData();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('activos');
  const [detail, setDetail] = useState<Vendor | null>(null);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [taskVendor, setTaskVendor] = useState<Vendor | null>(null);

  const counts = useMemo(
    () => ({
      total: data.vendors.length,
      contratado: data.vendors.filter((v) => v.status === 'contratado').length,
      comparando: data.vendors.filter((v) => v.status === 'comparando').length,
    }),
    [data.vendors]
  );

  const visible = useMemo(() => {
    const needle = foldText(query);
    return data.vendors
      .filter((vendor) => {
        // "Activos" esconde lo descartado, que es ruido el 99% del tiempo.
        if (filter === 'activos' && vendor.status === 'descartado') return false;
        if (filter !== 'todos' && filter !== 'activos' && vendor.status !== filter) return false;
        if (!needle) return true;
        return foldText(`${vendor.name} ${vendor.contact_name ?? ''}`).includes(needle);
      })
      .sort((a, b) => {
        const byStatus = VENDOR_STATUS_WEIGHT[a.status] - VENDOR_STATUS_WEIGHT[b.status];
        if (byStatus !== 0) return byStatus;
        return a.name.localeCompare(b.name, 'es');
      });
  }, [data.vendors, filter, query]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Proveedores"
        subtitle={
          counts.total > 0 ? `${counts.contratado} contratados de ${counts.total}` : 'Todavía sin proveedores'
        }
        action={
          <Button size="icon" onClick={openNew} aria-label="Añadir proveedor">
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      {data.vendors.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Todavía no tienes proveedores"
          description="Añade tu primer proveedor para empezar a organizar la boda."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              Añadir proveedor
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar proveedor"
                className="pl-10"
              />
            </div>
            <Segmented
              scrollable
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'activos', label: 'Activos' },
                { value: 'contratado', label: 'Contratados', count: counts.contratado },
                { value: 'comparando', label: 'Comparando', count: counts.comparando },
                { value: 'todos', label: 'Todos', count: counts.total },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">Ningún proveedor coincide.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((vendor) => {
                const money = vendorMoney(data, vendor);
                const category = data.budget_categories.find((c) => c.id === vendor.category_id);
                return (
                  <Card
                    key={vendor.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetail(vendor)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setDetail(vendor);
                    }}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'truncate font-medium text-ink-800',
                            vendor.status === 'descartado' && 'text-ink-400'
                          )}
                        >
                          {vendor.name}
                        </p>
                        <p className="truncate text-xs text-ink-400">{category?.name}</p>
                      </div>
                      <Badge className={VENDOR_STATUS_STYLE[vendor.status]}>
                        {VENDOR_STATUS_LABEL[vendor.status]}
                      </Badge>
                    </div>

                    {money.price > 0 && (
                      <div className="mt-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-semibold tabular-nums text-ink-800">
                            {formatMoney(money.price)}
                          </span>
                          <span className="text-xs tabular-nums text-ink-400">
                            {formatMoney(money.pending)} pendiente
                          </span>
                        </div>
                        <Progress className="mt-1.5" value={money.percentPaid} barClassName="bg-sage-500" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <VendorDetail
        open={detail != null}
        onClose={() => setDetail(null)}
        vendor={detail}
        onEdit={(vendor) => {
          setDetail(null);
          setEditing(vendor);
          setFormOpen(true);
        }}
        onAddTask={(vendor) => {
          setDetail(null);
          setTaskVendor(vendor);
        }}
      />

      <VendorSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        vendor={editing}
        categories={data.budget_categories}
      />

      <TaskSheet
        open={taskVendor != null}
        onClose={() => setTaskVendor(null)}
        task={null}
        vendors={data.vendors}
        defaultVendorId={taskVendor?.id ?? null}
      />
    </div>
  );
}
