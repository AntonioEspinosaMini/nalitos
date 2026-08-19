'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useUser } from '@/lib/user-context';
import { SECONDARY_NAV } from '@/lib/nav';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

/**
 * Cajón de lo que no va en la barra inferior. El presupuesto vive aquí a
 * propósito: no queremos cifras a la vista nada más abrir la app.
 */
export default function MorePage() {
  const { user, clearUser } = useUser();

  return (
    <div>
      <PageHeader title="Más" />

      <Card className="divide-y divide-ink-100 p-0">
        {SECONDARY_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink-50"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-blush-50 text-blush-600">
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <span className="flex-1 text-sm font-medium text-ink-800">{item.label}</span>
            <ChevronRight className="h-4 w-4 flex-none text-ink-300" />
          </Link>
        ))}
      </Card>

      <div className="mt-6 px-1">
        <p className="text-xs text-ink-400">Estás como</p>
        <button
          type="button"
          onClick={clearUser}
          className="mt-0.5 text-sm font-medium text-ink-700 underline decoration-ink-200 underline-offset-4"
        >
          {user} · cambiar
        </button>
      </div>
    </div>
  );
}
