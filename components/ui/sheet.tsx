'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Acciones fijas abajo (guardar, borrar…). No hacen scroll con el contenido. */
  footer?: ReactNode;
}

/**
 * Panel para crear y editar: bottom sheet en móvil, modal centrado en
 * escritorio. Se cierra con Escape, tocando fuera o con la X.
 */
export function Sheet({ open, onClose, title, description, children, footer }: SheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    // Se bloquea el scroll del fondo mientras el panel está abierto.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px] animate-in-fade"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-xl',
          'rounded-t-3xl animate-sheet-up',
          'sm:max-h-[85dvh] sm:max-w-lg sm:rounded-3xl sm:animate-modal-in'
        )}
      >
        <header className="flex items-start gap-3 border-b border-ink-100 px-5 pb-3.5 pt-4">
          {/* Asa visual del bottom sheet, solo en móvil. */}
          <span className="absolute inset-x-0 top-2 mx-auto h-1 w-10 rounded-full bg-ink-200 sm:hidden" />
          <div className="min-w-0 flex-1 pt-1 sm:pt-0">
            <h2 className="font-display text-xl leading-tight text-ink-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1.5 -mt-0.5 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer && (
          <footer className="border-t border-ink-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
