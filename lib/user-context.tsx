'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PersonName } from './types';

const STORAGE_KEY = 'boda-user';

interface UserContextValue {
  /** Quién está usando la app en este dispositivo. */
  user: PersonName | null;
  /** false mientras se lee localStorage (evita parpadeos). */
  ready: boolean;
  setUser: (user: PersonName) => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<PersonName | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'Antonio' || stored === 'Carmen') setUserState(stored);
    setReady(true);
  }, []);

  const setUser = useCallback((next: PersonName) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setUserState(next);
  }, []);

  const clearUser = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUserState(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, ready, setUser, clearUser }}>{children}</UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser debe usarse dentro de <UserProvider>');
  return ctx;
}

/** El usuario actual dando por hecho que ya se ha elegido. */
export function useCurrentUser(): PersonName {
  const { user } = useUser();
  return user ?? 'Antonio';
}

/** La otra mitad de la pareja. */
export function partnerOf(user: PersonName): PersonName {
  return user === 'Antonio' ? 'Carmen' : 'Antonio';
}
