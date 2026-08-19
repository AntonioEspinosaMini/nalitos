'use client';

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const FIELD_BASE =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-800 placeholder:text-ink-300 ' +
  'transition-colors focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-100 disabled:opacity-50';

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}

export function Field({ label, children, hint, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-ink-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

/** Dos campos en la misma fila a partir de móvil grande. */
export function FieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3', className)}>{children}</div>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD_BASE, className)} {...props} />;
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(FIELD_BASE, 'resize-none', className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(FIELD_BASE, 'appearance-none bg-white pr-9', className)} {...props}>
        {children}
      </select>
    );
  }
);

/** Campo de importe con el € pegado dentro. */
export const MoneyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function MoneyInput({ className, ...props }, ref) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-400">
          €
        </span>
        <input
          ref={ref}
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          className={cn(FIELD_BASE, 'pl-7 tabular-nums', className)}
          {...props}
        />
      </div>
    );
  }
);

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Checkbox({ checked, onChange, label, description }: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-ink-50"
    >
      <span
        className={cn(
          'flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-colors',
          checked ? 'border-sage-500 bg-sage-500 text-white' : 'border-ink-300 bg-white'
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] text-ink-800">{label}</span>
        {description && <span className="block text-xs text-ink-400">{description}</span>}
      </span>
    </button>
  );
}

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  /** Etiqueta a la izquierda ("Antonio", "Carmen"). */
  label?: string;
  readOnly?: boolean;
}

/** Valoración de 0 a 5. Tocar la estrella ya puesta la quita. */
export function StarRating({ value, onChange, label, readOnly = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-16 flex-none text-xs font-medium text-ink-500">{label}</span>}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            aria-label={`${star} de 5`}
            onClick={() => onChange?.(value === star ? 0 : star)}
            className={cn(
              'rounded p-0.5 transition-transform',
              !readOnly && 'hover:scale-110 active:scale-95',
              readOnly && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                'h-4 w-4',
                star <= value ? 'fill-amber-400 text-amber-400' : 'text-ink-300'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface ListInputProps {
  /** Líneas ya añadidas (pros o contras). */
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}

/** Lista de líneas sueltas: se escribe y se añade con Enter. */
export function ListInput({ value, onChange, placeholder }: ListInputProps) {
  const [draft, setDraft] = useState('');

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft('');
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-1.5 text-sm text-ink-700"
            >
              <span className="min-w-0 break-words">{item}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="flex-none text-xs text-ink-400 hover:text-rose-600"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder}
      />
    </div>
  );
}
