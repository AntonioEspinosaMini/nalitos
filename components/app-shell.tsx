'use client';

import type { ReactNode } from 'react';
import { Heart, CloudOff } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useUser } from '@/lib/user-context';
import { UserPicker } from './user-picker';
import { BottomNav } from './bottom-nav';
import { Sidebar } from './sidebar';
import { Button } from './ui/button';

/** Pantalla de carga inicial: solo se ve mientras no hay nada que enseñar. */
function LoadingScreen() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-blush-50 px-6">
      <Heart className="h-7 w-7 animate-pulse text-blush-400" strokeWidth={1.5} />
      <p className="mt-4 font-display text-2xl text-ink-800">Cargando nuestra boda…</p>
    </main>
  );
}

/** Error sin datos en memoria: no hay nada que enseñar, así que se ofrece reintentar. */
function ErrorScreen({ configured, onRetry }: { configured: boolean; onRetry: () => void }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-blush-50 px-6 text-center">
      <CloudOff className="h-7 w-7 text-ink-400" strokeWidth={1.5} />
      <p className="mt-4 max-w-xs font-display text-2xl leading-snug text-ink-800">
        No hemos podido sincronizar los datos.
      </p>
      {!configured && (
        <p className="mt-2 max-w-xs text-sm text-ink-500">
          Falta configurar JSONBin: revisa <code className="text-ink-700">.env.local</code> y el README.
        </p>
      )}
      <Button className="mt-6" onClick={onRetry}>
        Reintentar
      </Button>
    </main>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready } = useUser();
  const { data, isLoading, error, configured, refresh } = useData();

  // Evita un parpadeo del selector de usuario mientras se lee localStorage.
  if (!ready) return <div className="min-h-[100dvh] bg-blush-50" />;
  if (!user) return <UserPicker />;

  if (!data) {
    if (isLoading) return <LoadingScreen />;
    return <ErrorScreen configured={configured} onRetry={() => void refresh()} />;
  }

  return (
    <div className="min-h-[100dvh] bg-ink-50">
      <Sidebar />
      {/* Con datos ya cargados el fallo no bloquea: se avisa y se sigue trabajando. */}
      {error != null && (
        <div className="fixed inset-x-0 top-0 z-30 bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-800 lg:left-64">
          Sin conexión con los datos — se ve la última versión guardada.
        </div>
      )}
      <main className="mx-auto max-w-lg px-4 pb-28 pt-5 lg:ml-64 lg:max-w-3xl lg:px-10 lg:pb-16 lg:pt-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
