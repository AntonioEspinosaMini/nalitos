import type { AppData } from '../types';

/**
 * Contrato de persistencia de la aplicación.
 *
 * La UI solo conoce esta interfaz: nunca hace fetch a JSONBin ni sabe que
 * existe. Para cambiar a Supabase/Firebase basta con escribir otra
 * implementación de WeddingStore y cambiar la que se exporta en `index.ts`.
 */
export interface WeddingStore {
  /** Nombre del backend, para mensajes de error y diagnóstico. */
  readonly name: string;
  /** false cuando faltan credenciales: la app lo avisa en vez de fallar. */
  readonly isConfigured: boolean;
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
}

/** Error de persistencia con la información que la UI necesita mostrar. */
export class StoreError extends Error {
  readonly status?: number;
  readonly kind: 'config' | 'network' | 'server';

  constructor(message: string, kind: StoreError['kind'], status?: number) {
    super(message);
    this.name = 'StoreError';
    this.kind = kind;
    this.status = status;
  }
}
