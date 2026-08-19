'use client';

import { Heart } from 'lucide-react';
import { useUser } from '@/lib/user-context';
import type { PersonName } from '@/lib/types';

const PEOPLE: PersonName[] = ['Antonio', 'Carmen'];

/**
 * Primera pantalla en un dispositivo nuevo. No es un login: solo sirve para
 * saber de quién son "mis tareas" y quién apunta cada cosa.
 */
export function UserPicker() {
  const { setUser } = useUser();

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-blush-50 px-6">
      <Heart className="h-7 w-7 text-blush-400" strokeWidth={1.5} />
      <h1 className="mt-4 text-center font-display text-4xl text-ink-900">Nuestra boda</h1>
      <p className="mt-2 text-center text-sm text-ink-500">¿Quién eres?</p>

      <div className="mt-8 grid w-full max-w-xs gap-3">
        {PEOPLE.map((person) => (
          <button
            key={person}
            type="button"
            onClick={() => setUser(person)}
            className="rounded-2xl border border-ink-200/70 bg-white py-4 font-display text-2xl text-ink-800 shadow-sm transition-transform active:scale-[0.98]"
          >
            {person}
          </button>
        ))}
      </div>
    </main>
  );
}
