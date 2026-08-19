# Nuestra boda — Antonio & Carmen

Aplicación web privada para organizar la boda: dashboard, presupuesto, invitados,
tareas, proveedores y decisiones. Pensada para el móvil, pero funciona igual de
bien en escritorio.

Misma arquitectura que la app de casa: **Next.js exportado como sitio estático**,
desplegado en **GitHub Pages**, con **JSONBin.io** como almacén de datos. Sin
backend propio, sin login y sin base de datos.

---

## Stack

- Next.js 14 (App Router, `output: 'export'`)
- React 18 + TypeScript
- Tailwind CSS
- Lucide React (iconos)
- SWR (carga, revalidado y actualizaciones optimistas)
- JSONBin.io (persistencia)

## Cómo funciona la persistencia

El JSON completo de la boda es la fuente de verdad. Se lee entero al arrancar,
se muta en memoria y se vuelve a escribir completo.

La UI **nunca** habla con JSONBin directamente. Todo pasa por una capa de
abstracción:

```text
componentes  →  lib/data-context.tsx  →  lib/storage/index.ts  →  WeddingStore
                                                                  └─ jsonbin-store.ts
```

`WeddingStore` (`lib/storage/store.ts`) es un contrato de tres cosas:
`isConfigured`, `load()` y `save()`. Para migrar a Supabase o Firebase basta con
escribir otra implementación y cambiar **una línea** en `lib/storage/index.ts`.
Ningún componente se entera.

Cada escritura vuelve a leer la copia más reciente antes de mutar, para
minimizar colisiones cuando Antonio y Carmen tocan la app a la vez, y las
escrituras se encadenan en una cola para que dos toques seguidos no se pisen.

### Estados

- **Cargando**: «Cargando nuestra boda…» solo mientras no hay nada que enseñar.
- **Error sin datos**: pantalla con botón «Reintentar».
- **Error con datos en memoria**: aviso discreto arriba; los datos cargados
  **no se pierden** y se puede seguir trabajando.
- **Vacío**: cada sección tiene su propio estado vacío con acción directa.

---

## Configurar JSONBin

1. Crea una cuenta en [jsonbin.io](https://jsonbin.io).
2. Crea el bin de la boda. Si tienes la Master Key a mano:

   ```bash
   # rellena JSONBIN_MASTER_KEY en .env.local
   npm run init-bin
   ```

   El script imprime el `BIN_ID`. También vale crear el bin desde el panel de
   JSONBin y copiar el id de la URL.

3. Crea una **Access Key** (no la Master Key) en
   [jsonbin.io/api-keys](https://jsonbin.io/api-keys), restringida a ese bin y
   con permisos de lectura y escritura.
4. Rellena `.env.local` (copia de `.env.local.example`):

   ```text
   NEXT_PUBLIC_JSONBIN_BIN_ID=...
   NEXT_PUBLIC_JSONBIN_API_KEY=\$2a\$10\$...
   ```

> ⚠️ **Los `$` van escapados con `\` en `.env.local`.** Next.js expande las
> variables de los `.env`, y como las claves de JSONBin empiezan por `$2a$10$`,
> sin escapar llegan vacías y la app dice «Falta configurar JSONBin».
> En los **Secrets de GitHub** NO se escapa nada: se pegan tal cual.

> ⚠️ Una app estática en GitHub Pages **no puede guardar un secreto**: la Access
> Key queda visible en el bundle público. Por eso tiene que ser una Access Key
> acotada a un único bin, nunca la Master Key.

---

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # genera /out (sitio estático)
```

---

## Despliegue en GitHub Pages

Repositorio: <https://github.com/AntonioEspinosaMini/nalitos>

1. En **Settings → Secrets and variables → Actions**, crea:
   - `NEXT_PUBLIC_JSONBIN_BIN_ID`
   - `NEXT_PUBLIC_JSONBIN_API_KEY` (sin escapar los `$`)
2. En **Settings → Pages**, pon *Source* en **GitHub Actions**.
3. Haz push a `main`. El workflow `.github/workflows/deploy.yml` construye y
   publica.

El `basePath` se deduce solo del nombre del repositorio (`GITHUB_REPOSITORY`),
así que no hay que tocar `next.config.js` si algún día se renombra.

---

## Estructura

```text
app/
  page.tsx            Dashboard
  invitados/          Gestión de invitados
  tareas/             Tareas repartidas entre los dos
  proveedores/        Directorio de proveedores
  mas/                Cajón de secciones secundarias (móvil)
  presupuesto/        Presupuesto y gastos
  decisiones/         Comparativa de opciones
  ajustes/            Fecha, presupuesto total, categorías

components/
  ui/                 Piezas básicas (botón, card, sheet, formularios…)
  *-sheet.tsx         Paneles de alta y edición
  app-shell.tsx       Carga, errores, navegación

lib/
  types.ts            Modelo de datos
  schema.ts           Valores por defecto y normalización
  selectors.ts        Todo lo calculado (resúmenes, estadísticas)
  data-context.tsx    Estado global y mutaciones
  storage/            Capa de persistencia intercambiable
```

## Privacidad del presupuesto

El presupuesto no aparece en la navegación principal: vive dentro de **Más** en
móvil y del bloque **Más** del sidebar en escritorio. En el dashboard sí sale
resumido, pero ya dentro de la aplicación.

## Qué no hay (a propósito)

Login, registro, backend propio, documentos, timeline del día de la boda, chat,
notificaciones push, integraciones e IA. La V0 es exactamente:
**Dashboard + Presupuesto + Invitados + Tareas + Proveedores + Decisiones**.
