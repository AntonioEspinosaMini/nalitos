'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './button';

interface ConfirmButtonProps {
  onConfirm: () => void;
  label?: string;
  confirmLabel?: string;
  className?: string;
}

/**
 * Borrado en dos toques: el primero pide confirmación, el segundo borra.
 * Evita los diálogos nativos del navegador y no molesta en móvil.
 */
export function ConfirmButton({
  onConfirm,
  label = 'Eliminar',
  confirmLabel = '¿Seguro?',
  className,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  // Si no se confirma en unos segundos, vuelve solo a su estado normal.
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      variant="danger"
      className={className}
      onClick={() => {
        if (armed) onConfirm();
        else setArmed(true);
      }}
    >
      <Trash2 className="h-4 w-4" />
      {armed ? confirmLabel : label}
    </Button>
  );
}
