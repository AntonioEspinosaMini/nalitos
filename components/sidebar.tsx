'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useData } from '@/lib/data-context';
import { useUser } from '@/lib/user-context';
import { PRIMARY_NAV, SECONDARY_NAV, isActive, type NavItem } from '@/lib/nav';
import { countdownLabel } from '@/lib/date';
import { cn } from '@/lib/utils';

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-blush-50 text-blush-700' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800'
      )}
    >
      <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.6} />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useData();
  const { user, clearUser } = useUser();
  const weddingDate = data?.wedding.date ?? null;

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ink-200/70 bg-white px-4 py-6 lg:flex">
      <div className="px-3">
        <p className="font-display text-2xl leading-tight text-ink-900">
          {data?.wedding.name ?? 'Nuestra boda'}
        </p>
        <p className="mt-0.5 text-xs text-ink-400">
          {weddingDate ? countdownLabel(weddingDate) : 'Sin fecha todavía'}
        </p>
      </div>

      <nav className="mt-8 space-y-6">
        <div>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-300">
            Principal
          </p>
          <div className="space-y-0.5">
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-300">
            Más
          </p>
          <div className="space-y-0.5">
            {SECONDARY_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </div>
        </div>
      </nav>

      <div className="mt-auto px-3 pt-6">
        <p className="text-xs text-ink-400">Estás como</p>
        <button
          type="button"
          onClick={clearUser}
          className="mt-0.5 text-sm font-medium text-ink-700 underline decoration-ink-200 underline-offset-4 hover:decoration-ink-400"
        >
          {user} · cambiar
        </button>
      </div>
    </aside>
  );
}
