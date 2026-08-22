import { Home, Users, ListChecks, Handshake, Armchair, Wallet, Scale, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Lo del día a día: barra inferior en móvil, bloque "Principal" en escritorio. */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/invitados', label: 'Invitados', icon: Users },
  { href: '/tareas', label: 'Tareas', icon: ListChecks },
  { href: '/proveedores', label: 'Proveedores', icon: Handshake },
];

/**
 * Lo que vive dentro de "Más". El presupuesto está aquí a propósito: lleva
 * cifras que no queremos enseñar de un vistazo si alguien mira el móvil.
 */
export const SECONDARY_NAV: NavItem[] = [
  { href: '/mesas', label: 'Mesas', icon: Armchair },
  { href: '/presupuesto', label: 'Presupuesto', icon: Wallet },
  { href: '/decisiones', label: 'Decisiones', icon: Scale },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
];

export function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
