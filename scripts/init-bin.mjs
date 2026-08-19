#!/usr/bin/env node
// Crea el bin de JSONBin.io que actúa como "base de datos" de la boda.
//
// Uso:
//   1. Rellena JSONBIN_MASTER_KEY en .env.local con tu Master Key de
//      https://jsonbin.io/api-keys (ese archivo no se sube a git).
//   2. Ejecuta: npm run init-bin
//   3. Copia el BIN_ID que imprime al final en NEXT_PUBLIC_JSONBIN_BIN_ID
//      (en .env.local y en los Secrets de GitHub Actions).
//
// La Master Key solo se usa aquí, en tu máquina. La app publicada usa una
// Access Key limitada a este bin (NEXT_PUBLIC_JSONBIN_API_KEY), porque esa sí
// queda visible en el sitio de GitHub Pages.

import { readFileSync, existsSync } from 'node:fs';

function loadEnvLocal() {
  const path = new URL('../.env.local', import.meta.url);
  if (!existsSync(path)) return {};
  const content = readFileSync(path, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    // En .env.local los $ van escapados (\$) por cómo Next expande variables;
    // aquí hay que devolverlos a su forma original.
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/\\\$/g, '$');
  }
  return env;
}

const env = { ...loadEnvLocal(), ...process.env };
const masterKey = env.JSONBIN_MASTER_KEY;

if (!masterKey) {
  console.error('Falta JSONBIN_MASTER_KEY en .env.local (o como variable de entorno).');
  process.exit(1);
}

const CATEGORIES = [
  'Finca', 'Catering', 'Fotógrafo', 'Vídeo', 'Música / DJ', 'Flores',
  'Decoración', 'Vestido', 'Traje', 'Invitaciones', 'Transporte',
  'Papelería', 'Regalos', 'Viaje', 'Otros',
];

const slug = (name) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const seed = {
  wedding: {
    id: 'boda-antonio-carmen',
    name: 'Antonio & Carmen',
    date: null,
    venue: null,
    total_budget: 0,
    created_at: new Date().toISOString(),
  },
  budget_categories: CATEGORIES.map((name) => ({ id: slug(name), name })),
  expenses: [],
  guests: [],
  tasks: [],
  vendors: [],
  decisions: [],
};

const res = await fetch('https://api.jsonbin.io/v3/b', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Master-Key': masterKey,
    'X-Bin-Name': 'wedding-manager-data',
    'X-Bin-Private': 'true',
  },
  body: JSON.stringify(seed),
});

if (!res.ok) {
  console.error(`Error creando el bin (HTTP ${res.status}):`, await res.text());
  process.exit(1);
}

const json = await res.json();
console.log('\n✅ Bin creado correctamente.\n');
console.log(`BIN_ID: ${json.metadata.id}\n`);
console.log('Añade esto a tu .env.local:');
console.log(`  NEXT_PUBLIC_JSONBIN_BIN_ID=${json.metadata.id}`);
console.log('\nY crea una Access Key (no la Master Key) restringida a este bin en');
console.log('https://jsonbin.io/api-keys para usar como NEXT_PUBLIC_JSONBIN_API_KEY.');
