import { normalizeAppData } from '../schema';
import type { AppData } from '../types';
import { StoreError, type WeddingStore } from './store';

const BASE_URL = 'https://api.jsonbin.io/v3/b';

interface JsonBinConfig {
  binId: string;
  apiKey: string;
}

/**
 * Implementación de WeddingStore sobre JSONBin.io.
 *
 * El bin guarda el AppData completo: cada guardado reescribe el JSON entero
 * (PUT), que es justo lo que necesita una app de dos personas.
 */
export function createJsonBinStore({ binId, apiKey }: JsonBinConfig): WeddingStore {
  const isConfigured = Boolean(binId && apiKey);

  function assertConfigured() {
    if (!isConfigured) {
      throw new StoreError(
        'Falta configurar JSONBin. Revisa .env.local (ver README.md).',
        'config'
      );
    }
  }

  return {
    name: 'JSONBin.io',
    isConfigured,

    async load() {
      assertConfigured();
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/${binId}/latest`, {
          method: 'GET',
          headers: { 'X-Access-Key': apiKey },
          cache: 'no-store',
        });
      } catch {
        throw new StoreError('No hay conexión con el servidor de datos.', 'network');
      }
      if (!res.ok) {
        throw new StoreError(`No se pudieron leer los datos (HTTP ${res.status}).`, 'server', res.status);
      }
      const json = await res.json();
      return normalizeAppData(json.record);
    },

    async save(data: AppData) {
      assertConfigured();
      let res: Response;
      try {
        res = await fetch(`${BASE_URL}/${binId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Access-Key': apiKey,
          },
          body: JSON.stringify(data),
        });
      } catch {
        throw new StoreError('No hay conexión con el servidor de datos.', 'network');
      }
      if (!res.ok) {
        throw new StoreError(`No se pudieron guardar los datos (HTTP ${res.status}).`, 'server', res.status);
      }
    },
  };
}
