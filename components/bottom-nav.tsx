'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  // "Más" se enciende también cuando estás dentro de una de sus secciones.
  const inMore = pathname === '/mas' || SECONDARY_NAV.some((item) => isActive(pathname, item.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/70 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
                active ? 'text-blush-600' : 'text-ink-400'
              )}
            >
              <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.6} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/mas"
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
            inMore ? 'text-blush-600' : 'text-ink-400'
          )}
        >
          <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={inMore ? 2 : 1.6} />
          Más
        </Link>
      </div>
    </nav>
  );
}
