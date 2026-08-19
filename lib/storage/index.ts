// Punto único de acceso a la persistencia.
//
// Para migrar a Supabase/Firebase más adelante: escribe un nuevo módulo que
// devuelva un WeddingStore y cambia solo la línea de abajo. Ningún componente
// de la aplicación necesita enterarse.

import { createJsonBinStore } from './jsonbin-store';
import type { WeddingStore } from './store';

export { StoreError } from './store';
export type { WeddingStore } from './store';

export const store: WeddingStore = createJsonBinStore({
  binId: process.env.NEXT_PUBLIC_JSONBIN_BIN_ID ?? '',
  apiKey: process.env.NEXT_PUBLIC_JSONBIN_API_KEY ?? '',
});
