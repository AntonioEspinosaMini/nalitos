'use client';

import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { cn } from '@/lib/utils';

/**
 * Estado de la sincronización, siempre visible pero discreto: solo llama la
 * atención cuando algo va mal.
 */
export function SyncIndicator() {
  const { syncState, error, configured, refresh } = useData();

  if (!configured) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl text-amber-600" title="JSONBin sin configurar">
        <CloudOff className="h-[18px] w-[18px]" />
      </span>
    );
  }

  const failing = syncState === 'error' || error != null;

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      title={failing ? 'Error de sincronización — toca para reintentar' : 'Datos sincronizados'}
      aria-label="Estado de sincronización"
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
        failing ? 'text-rose-600 hover:bg-rose-50' : 'text-ink-300 hover:bg-ink-100 hover:text-ink-500'
      )}
    >
      {syncState === 'saving' ? (
        <RefreshCw className="h-[18px] w-[18px] animate-spin" />
      ) : failing ? (
        <CloudOff className="h-[18px] w-[18px]" />
      ) : (
        <Cloud className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
