// La geometría del plano de mesas. Todo se calcula: de una mesa solo se guardan
// su forma, su centro, su giro y sus sillas (lib/types.ts). Ni el tamaño ni la
// posición de cada silla se persisten, así dos mesas de 8 se ven siempre igual
// y el JSON se queda en lo mínimo.
//
// Las medidas van en centímetros, como en un plano de verdad: una redonda de 8
// mide unos 140 cm de diámetro y una rectangular de 10, unos 240 × 100 cm.

import type { Table, TableShape } from './types';

// ─── El plano ────────────────────────────────────────────────────────────────

/** Tamaño del salón, en cm: 20 × 14 m. Da de sobra para una boda grande. */
export const PLAN_WIDTH = 2000;
export const PLAN_HEIGHT = 1400;

/** Las mesas se colocan a saltos de 10 cm: el plano sale ordenado sin esfuerzo. */
export const PLAN_GRID = 10;

// ─── Medidas de una mesa ─────────────────────────────────────────────────────

/** Centímetros de borde de mesa que ocupa una silla. */
const SEAT_PITCH = 60;
/** Lado corto de una mesa rectangular. */
const RECT_WIDTH = 100;
/** Una rectangular nunca baja de esto, aunque lleve dos sillas. */
const MIN_RECT_LENGTH = 120;
/** Del borde de la mesa al centro de la silla. */
const SEAT_GAP = 34;
/** Radio de la silla dibujada. */
export const SEAT_RADIUS = 17;
/** Una redonda nunca baja de esto. */
const MIN_ROUND_RADIUS = 60;

/** Cuántas sillas van en las cabeceras de una rectangular. */
function headSeats(count: number): number {
  return count >= 6 ? 2 : 0;
}

export interface RoundShape {
  shape: 'redonda';
  radius: number;
}

export interface RectShape {
  shape: 'rectangular';
  /** Lado largo, el que crece con las sillas. */
  length: number;
  /** Lado corto, siempre el mismo. */
  width: number;
}

export type TableShapeSize = RoundShape | RectShape;

/**
 * El tamaño de la mesa sale del número de sillas: si añades sillas, la mesa
 * crece. Nadie tiene que dibujar nada a mano.
 */
export function tableSize(shape: TableShape, seatCount: number): TableShapeSize {
  const count = Math.max(1, seatCount);
  if (shape === 'redonda') {
    // El perímetro tiene que dar para todas las sillas: 2πr ≥ sillas × paso.
    return {
      shape: 'redonda',
      radius: Math.max(MIN_ROUND_RADIUS, Math.round((count * SEAT_PITCH) / (2 * Math.PI))),
    };
  }
  const heads = headSeats(count);
  const sides = count - heads;
  const perSide = Math.max(1, Math.ceil(sides / 2));
  return {
    shape: 'rectangular',
    length: Math.max(MIN_RECT_LENGTH, perSide * SEAT_PITCH),
    width: RECT_WIDTH,
  };
}

/**
 * Radio del círculo que envuelve mesa + sillas. Se usa para colocar una mesa
 * nueva sin que pise a las que ya están y para encuadrar el plano.
 */
export function tableRadius(table: Table): number {
  const size = tableSize(table.shape, table.seats.length);
  if (size.shape === 'redonda') return size.radius + SEAT_GAP + SEAT_RADIUS;
  const halfLength = size.length / 2 + SEAT_GAP + SEAT_RADIUS;
  const halfWidth = size.width / 2 + SEAT_GAP + SEAT_RADIUS;
  return Math.hypot(halfLength, halfWidth);
}

// ─── Las sillas ──────────────────────────────────────────────────────────────

export interface SeatPoint {
  /** Índice en `Table.seats`: el número de silla menos uno. */
  index: number;
  /** Centro de la silla, en coordenadas del plano. */
  x: number;
  y: number;
}

function rotate(x: number, y: number, degrees: number): { x: number; y: number } {
  if (!degrees) return { x, y };
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/**
 * Dónde cae cada silla, en orden: se va dando la vuelta a la mesa en el
 * sentido de las agujas del reloj empezando arriba. Así la «silla 3» es
 * siempre la misma silla, se mire el plano o se mire la mesa abierta.
 */
export function seatOffsets(shape: TableShape, seatCount: number, rotation = 0): SeatPoint[] {
  const count = Math.max(0, seatCount);
  if (count === 0) return [];
  const size = tableSize(shape, count);

  if (size.shape === 'redonda') {
    const ring = size.radius + SEAT_GAP;
    return Array.from({ length: count }, (_, index) => {
      // Se arranca arriba (−90°) para que la silla 1 quede al norte.
      const angle = ((-90 + (index * 360) / count) * Math.PI) / 180;
      const point = rotate(ring * Math.cos(angle), ring * Math.sin(angle), rotation);
      return { index, x: point.x, y: point.y };
    });
  }

  const heads = headSeats(count);
  const sides = count - heads;
  const top = Math.ceil(sides / 2);
  const bottom = sides - top;
  const halfLength = size.length / 2;
  const edgeY = size.width / 2 + SEAT_GAP;
  const headX = halfLength + SEAT_GAP;

  // Orden en el que se recorre la mesa: lado de arriba de izquierda a derecha,
  // cabecera derecha, lado de abajo de vuelta, y cabecera izquierda.
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < top; i += 1) {
    raw.push({ x: -halfLength + ((i + 0.5) * size.length) / top, y: -edgeY });
  }
  if (heads > 0) raw.push({ x: headX, y: 0 });
  for (let i = 0; i < bottom; i += 1) {
    raw.push({ x: halfLength - ((i + 0.5) * size.length) / bottom, y: edgeY });
  }
  if (heads > 1) raw.push({ x: -headX, y: 0 });

  return raw.map((point, index) => {
    const turned = rotate(point.x, point.y, rotation);
    return { index, x: turned.x, y: turned.y };
  });
}

// ─── Colocar y encuadrar ─────────────────────────────────────────────────────

export function clampToPlan(x: number, y: number, radius: number): { x: number; y: number } {
  return {
    x: Math.min(PLAN_WIDTH - radius, Math.max(radius, x)),
    y: Math.min(PLAN_HEIGHT - radius, Math.max(radius, y)),
  };
}

export function snapToGrid(value: number): number {
  return Math.round(value / PLAN_GRID) * PLAN_GRID;
}

/**
 * Un sitio libre para una mesa nueva: se recorre el plano en cuadrícula y se
 * coge el primer hueco donde no pise a ninguna de las que ya están. Si el
 * salón está lleno, se coloca en el centro y ya la moverá quien la cree.
 */
export function findFreeSpot(tables: Table[], shape: TableShape, seatCount: number): { x: number; y: number } {
  const radius = tableRadius({ shape, seats: new Array(seatCount).fill(null) } as Table);
  const step = 120;
  const placed = tables.map((table) => ({ x: table.x, y: table.y, r: tableRadius(table) }));

  for (let y = radius; y <= PLAN_HEIGHT - radius; y += step) {
    for (let x = radius; x <= PLAN_WIDTH - radius; x += step) {
      const collides = placed.some(
        (other) => Math.hypot(other.x - x, other.y - y) < other.r + radius + 20
      );
      if (!collides) return { x: snapToGrid(x), y: snapToGrid(y) };
    }
  }
  return { x: snapToGrid(PLAN_WIDTH / 2), y: snapToGrid(PLAN_HEIGHT / 2) };
}

export interface PlanBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Recuadro que contiene todas las mesas, con un margen. Para encuadrar. */
export function planBounds(tables: Table[], margin = 120): PlanBox {
  if (tables.length === 0) return { x: 0, y: 0, width: PLAN_WIDTH, height: PLAN_HEIGHT };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const table of tables) {
    const radius = tableRadius(table);
    minX = Math.min(minX, table.x - radius);
    minY = Math.min(minY, table.y - radius);
    maxX = Math.max(maxX, table.x + radius);
    maxY = Math.max(maxY, table.y + radius);
  }

  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}
