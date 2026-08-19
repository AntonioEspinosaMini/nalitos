'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useData } from '@/lib/data-context';
import type { BudgetCategory } from '@/lib/types';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/form';

interface CategoriesSheetProps {
  open: boolean;
  onClose: () => void;
  categories: BudgetCategory[];
  /** Cuántos gastos cuelgan de cada categoría, para avisar antes de borrar. */
  usage: Record<string, number>;
}

/** Gestión de las categorías del presupuesto: renombrar, añadir y quitar. */
export function CategoriesSheet({ open, onClose, categories, usage }: CategoriesSheetProps) {
  const { addCategory, renameCategory, deleteCategory } = useData();
  const [draft, setDraft] = useState('');

  async function add() {
    const name = draft.trim();
    if (!name) return;
    setDraft('');
    await addCategory(name);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Categorías"
      description="Los gastos de una categoría borrada pasan a «Otros»."
      footer={
        <Button className="w-full" variant="secondary" onClick={onClose}>
          Listo
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add();
            }}
            placeholder="Nueva categoría"
          />
          <Button size="icon" disabled={!draft.trim()} onClick={() => void add()} aria-label="Añadir categoría">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-2">
              <Input
                defaultValue={category.name}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== category.name) {
                    void renameCategory(category.id, e.target.value);
                  }
                }}
              />
              <span className="w-8 flex-none text-center text-xs tabular-nums text-ink-400">
                {usage[category.id] ?? 0}
              </span>
              <button
                type="button"
                onClick={() => void deleteCategory(category.id)}
                aria-label={`Quitar ${category.name}`}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
