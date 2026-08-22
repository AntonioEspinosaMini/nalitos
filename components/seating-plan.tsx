'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import {
  PLAN_HEIGHT,
  PLAN_WIDTH,
  SEAT_RADIUS,
  planBounds,
  seatOffsets,
  tableSize,
} from '@/lib/seating';
import { guestFullName } from '@/lib/selectors';
import { cn } from '@/lib/utils';
import type { Guest, Table } from '@/lib/types';

/**
 * El plano del banquete: un SVG con pan y zoom sobre el que se arrastran las
 * mesas y se tocan las sillas.
 *
 * SVG y no <canvas> a propósito: cada silla es un elemento de verdad, con su
 * área de toque y su aria-label, y se ve nítido a cualquier zoom sin escribir
 * una línea de repintado.
 *
 * Regla dura: arrastrar NO guarda. La posición vive en estado local mientras
 * el dedo está abajo y solo se llama a onMoveTable al soltar. Cada escritura
 * reescribe el JSON entero en JSONBin; guardar en cada pointermove serían
 * cientos de escrituras por arrastre.
 */

/**
 * Ancho de cámara (en cm de plano) por debajo del cual las sillas se pueden
 * tocar. A este zoom el área de toque de una silla ronda los 34 px en un móvil,
 * que es lo mínimo para acertar con el dedo. Más lejos se apagan.
 */
const SEAT_TAP_ZOOM = 1300;
/** Límites del zoom, en cm de ancho visible. */
const MIN_CAMERA_WIDTH = 400;
const MAX_CAMERA_WIDTH = PLAN_WIDTH * 1.5;
/** Píxeles que hay que mover el dedo para que deje de ser un toque. */
const TAP_SLOP = 6;

interface Camera {
  x: number;
  y: number;
  /** Ancho visible en cm. El alto sale de la proporción del contenedor. */
  width: number;
}

interface SeatingPlanProps {
  tables: Table[];
  guests: Guest[];
  /** Mesa resaltada (la que está abierta o recién tocada). */
  selectedId?: string | null;
  /** Silla en la que se va a sentar al invitado que se está colocando. */
  highlightUnseated?: boolean;
  onOpenTable: (table: Table) => void;
  onSeatTap: (table: Table, seatIndex: number) => void;
  onMoveTable: (id: string, x: number, y: number) => void;
  className?: string;
}

type Gesture =
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'pinch'; distance: number; width: number; midX: number; midY: number }
  | { kind: 'table'; id: string; startX: number; startY: number; originX: number; originY: number; moved: boolean };

export function SeatingPlan({
  tables,
  guests,
  selectedId,
  highlightUnseated = false,
  onOpenTable,
  onSeatTap,
  onMoveTable,
  className,
}: SeatingPlanProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);

  // Tamaño del contenedor en píxeles. La cámara mantiene siempre esta misma
  // proporción, para que un centímetro de plano ocupe lo mismo a lo ancho que
  // a lo alto y las mesas redondas salgan redondas.
  const [box, setBox] = useState({ w: 1, h: 1 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, width: PLAN_WIDTH });
  const [dragging, setDragging] = useState<{ id: string; x: number; y: number } | null>(null);

  const byId = new Map(guests.map((guest) => [guest.id, guest]));

  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBox({ w: width, h: height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const cameraHeight = camera.width * (box.h / box.w);
  const unitsPerPx = camera.width / box.w;
  const seatsInteractive = camera.width <= SEAT_TAP_ZOOM;

  /** Encuadra todas las mesas (o el salón entero si no hay ninguna). */
  const fit = useCallback(() => {
    const bounds = planBounds(tables);
    const aspect = box.h / box.w;
    // Se coge el ancho que haga falta para que quepa también de alto.
    const width = Math.max(bounds.width, bounds.height / aspect);
    setCamera({
      x: bounds.x + bounds.width / 2 - width / 2,
      y: bounds.y + bounds.height / 2 - (width * aspect) / 2,
      width: Math.min(MAX_CAMERA_WIDTH, Math.max(MIN_CAMERA_WIDTH, width)),
    });
    // tables cambia en cada render de la página; encuadrar solo se pide a mano
    // o al montar, así que basta con la longitud para el primer encuadre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.h, box.w, tables.length]);

  // Primer encuadre en cuanto hay algo que encuadrar. Se espera a que exista
  // la primera mesa: si no, al crearla se quedaría perdida en un salón vacío y
  // con las sillas demasiado pequeñas para tocarlas. A partir de ahí el
  // encuadre es cosa del usuario, que la vista no salte mientras trabaja.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || box.w <= 1 || tables.length === 0) return;
    fitted.current = true;
    fit();
  }, [box.w, fit, tables.length]);

  /** Zoom manteniendo quieto el punto del plano que hay bajo el dedo. */
  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      setCamera((prev) => {
        const width = Math.min(MAX_CAMERA_WIDTH, Math.max(MIN_CAMERA_WIDTH, prev.width * factor));
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || clientX == null || clientY == null) {
          const height = prev.width * (box.h / box.w);
          const newHeight = width * (box.h / box.w);
          return {
            x: prev.x + (prev.width - width) / 2,
            y: prev.y + (height - newHeight) / 2,
            width,
          };
        }
        const ratioX = (clientX - rect.left) / rect.width;
        const ratioY = (clientY - rect.top) / rect.height;
        const aspect = box.h / box.w;
        return {
          x: prev.x + ratioX * (prev.width - width),
          y: prev.y + ratioY * (prev.width * aspect - width * aspect),
          width,
        };
      });
    },
    [box.h, box.w]
  );

  // ─── Gestos ────────────────────────────────────────────────────────────────

  function onSurfacePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    // Si se está arrastrando una mesa, los dedos de más no molestan.
    if (gesture.current?.kind === 'table') return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    svgRef.current?.setPointerCapture(event.pointerId);

    const points = [...pointers.current.values()];
    if (points.length >= 2) {
      const [a, b] = points;
      gesture.current = {
        kind: 'pinch',
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        width: camera.width,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      return;
    }
    gesture.current = { kind: 'pan', lastX: event.clientX, lastY: event.clientY };
  }

  function onTablePointerDown(event: React.PointerEvent, table: Table) {
    // Sin stopPropagation el <svg> lo tomaría por un pan del fondo.
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current = {
      kind: 'table',
      id: table.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: table.x,
      originY: table.y,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const active = gesture.current;
    if (!active) return;
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (active.kind === 'table') {
      const dx = (event.clientX - active.startX) * unitsPerPx;
      const dy = (event.clientY - active.startY) * unitsPerPx;
      if (!active.moved && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > TAP_SLOP) {
        active.moved = true;
      }
      if (active.moved) {
        setDragging({ id: active.id, x: active.originX + dx, y: active.originY + dy });
      }
      return;
    }

    if (active.kind === 'pinch') {
      const points = [...pointers.current.values()];
      if (points.length < 2) return;
      const [a, b] = points;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance <= 0) return;
      const factor = active.distance / distance;
      const width = Math.min(MAX_CAMERA_WIDTH, Math.max(MIN_CAMERA_WIDTH, active.width * factor));
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ratioX = (active.midX - rect.left) / rect.width;
      const ratioY = (active.midY - rect.top) / rect.height;
      const aspect = box.h / box.w;
      setCamera((prev) => ({
        x: prev.x + ratioX * (prev.width - width),
        y: prev.y + ratioY * (prev.width * aspect - width * aspect),
        width,
      }));
      return;
    }

    const dx = (event.clientX - active.lastX) * unitsPerPx;
    const dy = (event.clientY - active.lastY) * unitsPerPx;
    active.lastX = event.clientX;
    active.lastY = event.clientY;
    setCamera((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
  }

  function endGesture(event: React.PointerEvent<SVGSVGElement>) {
    const active = gesture.current;
    pointers.current.delete(event.pointerId);
    if (!active) return;

    if (active.kind === 'table') {
      const table = tables.find((t) => t.id === active.id);
      if (active.moved && dragging) {
        // Aquí, y solo aquí, se guarda la posición.
        onMoveTable(active.id, dragging.x, dragging.y);
      } else if (table) {
        // No se movió: era un toque, así que se abre la mesa.
        onOpenTable(table);
      }
      setDragging(null);
      gesture.current = null;
      return;
    }

    gesture.current = pointers.current.size > 0 ? { kind: 'pan', lastX: event.clientX, lastY: event.clientY } : null;
  }

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    zoomAt(event.deltaY > 0 ? 1.12 : 1 / 1.12, event.clientX, event.clientY);
  }

  // ─── Pintura ───────────────────────────────────────────────────────────────

  const hairline = 1.5 * unitsPerPx;
  const labelSize = Math.min(44, Math.max(20, 13 * unitsPerPx));
  const seatLabelSize = Math.min(26, Math.max(11, 9 * unitsPerPx));
  const seatPixelRadius = SEAT_RADIUS / unitsPerPx;

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white', className)}>
      <svg
        ref={svgRef}
        viewBox={`${camera.x} ${camera.y} ${camera.width} ${cameraHeight}`}
        className="h-full w-full select-none"
        // Sin esto, arrastrar por el plano haría scroll de la página en móvil.
        style={{ touchAction: 'none' }}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onWheel={onWheel}
      >
        <defs>
          <pattern id="plan-grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e7e3dc" strokeWidth={hairline} />
          </pattern>
        </defs>

        {/* El salón: una cuadrícula de un metro para hacerse a la escala. */}
        <rect x={0} y={0} width={PLAN_WIDTH} height={PLAN_HEIGHT} fill="url(#plan-grid)" />
        <rect
          x={0}
          y={0}
          width={PLAN_WIDTH}
          height={PLAN_HEIGHT}
          fill="none"
          stroke="#d4cec4"
          strokeWidth={hairline * 2}
          strokeDasharray={`${hairline * 8} ${hairline * 6}`}
        />

        {tables.map((table) => {
          const live = dragging?.id === table.id ? dragging : null;
          const x = live ? live.x : table.x;
          const y = live ? live.y : table.y;
          const size = tableSize(table.shape, table.seats.length);
          const seats = seatOffsets(table.shape, table.seats.length, table.rotation);
          const taken = table.seats.filter(Boolean).length;
          const selected = selectedId === table.id;

          return (
            <g key={table.id} transform={`translate(${x} ${y})`} className={live ? 'opacity-90' : undefined}>
              {/* Cuerpo de la mesa: es lo que se arrastra y lo que se toca. */}
              <g
                onPointerDown={(event) => onTablePointerDown(event, table)}
                style={{ cursor: live ? 'grabbing' : 'grab' }}
              >
                {size.shape === 'redonda' ? (
                  <circle
                    r={size.radius}
                    fill={table.is_head ? '#f8ece7' : '#faf9f7'}
                    stroke={selected ? '#b97a63' : table.is_head ? '#e2bcae' : '#d4cec4'}
                    strokeWidth={selected ? hairline * 3 : hairline * 2}
                  />
                ) : (
                  <rect
                    x={-size.length / 2}
                    y={-size.width / 2}
                    width={size.length}
                    height={size.width}
                    rx={14}
                    transform={`rotate(${table.rotation})`}
                    fill={table.is_head ? '#f8ece7' : '#faf9f7'}
                    stroke={selected ? '#b97a63' : table.is_head ? '#e2bcae' : '#d4cec4'}
                    strokeWidth={selected ? hairline * 3 : hairline * 2}
                  />
                )}

                <text
                  textAnchor="middle"
                  y={-labelSize * 0.1}
                  fontSize={labelSize}
                  fontWeight={600}
                  fill="#2b2723"
                  className="pointer-events-none"
                >
                  {table.name}
                </text>
                <text
                  textAnchor="middle"
                  y={labelSize}
                  fontSize={labelSize * 0.8}
                  fill={taken === table.seats.length ? '#5f855f' : '#a9a196'}
                  className="pointer-events-none tabular-nums"
                >
                  {taken}/{table.seats.length}
                </text>
              </g>

              {seats.map((seat) => {
                const guestId = table.seats[seat.index];
                const guest = guestId ? byId.get(guestId) ?? null : null;
                const declined = guest?.status === 'no_viene';
                const free = guest == null;

                return (
                  <g
                    key={seat.index}
                    transform={`translate(${seat.x} ${seat.y})`}
                    // Con el plano alejado las sillas son puntos: se apagan para
                    // que un toque torpe no siente a nadie por accidente.
                    style={{
                      pointerEvents: seatsInteractive ? 'auto' : 'none',
                      cursor: seatsInteractive ? 'pointer' : 'default',
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onSeatTap(table, seat.index)}
                  >
                    {/* Área de toque generosa, invisible. */}
                    <circle r={SEAT_RADIUS * 1.9} fill="transparent" />
                    <circle
                      r={SEAT_RADIUS}
                      fill={declined ? '#fecdd3' : free ? '#ffffff' : '#e6ede6'}
                      stroke={
                        declined
                          ? '#e11d48'
                          : free
                            ? highlightUnseated
                              ? '#b97a63'
                              : '#d4cec4'
                            : '#7fa37f'
                      }
                      // Al colocar a alguien, las sillas libres se marcan con un
                      // aro más grueso. Nada de líneas discontinuas: a este
                      // tamaño una silla da para cuatro guiones y se lee como
                      // suciedad, no como "aquí cabe alguien".
                      strokeWidth={free && highlightUnseated ? hairline * 4 : hairline * 2}
                    />
                    {guest && seatPixelRadius >= 9 && (
                      <text
                        textAnchor="middle"
                        y={seatLabelSize * 0.36}
                        fontSize={seatLabelSize}
                        fontWeight={600}
                        fill={declined ? '#9f1239' : '#3d553d'}
                        className="pointer-events-none"
                      >
                        {initials(guest)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Controles del plano. Flotan encima, no entran en los gestos. */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <PlanButton label="Acercar" onClick={() => zoomAt(1 / 1.3)}>
          <ZoomIn className="h-4 w-4" />
        </PlanButton>
        <PlanButton label="Alejar" onClick={() => zoomAt(1.3)}>
          <ZoomOut className="h-4 w-4" />
        </PlanButton>
        <PlanButton label="Encuadrar" onClick={fit}>
          <Maximize2 className="h-4 w-4" />
        </PlanButton>
      </div>

      {!seatsInteractive && tables.length > 0 && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-ink-900/70 px-3 py-1 text-[11px] text-white">
          Acerca el plano para tocar las sillas
        </p>
      )}
    </div>
  );
}

function PlanButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-ink-600 shadow-sm ring-1 ring-ink-200 transition-colors hover:bg-ink-50"
    >
      {children}
    </button>
  );
}

/** Iniciales para caber dentro de una silla: "Lucía Ruiz" → "LR". */
function initials(guest: Guest): string {
  const name = guestFullName(guest);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
