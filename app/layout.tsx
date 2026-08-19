import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { DataProvider } from '@/lib/data-context';
import { UserProvider } from '@/lib/user-context';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: 'Nuestra boda',
  description: 'Organización de la boda de Antonio y Carmen',
};

export const viewport: Viewport = {
  themeColor: '#fdf8f6',
  width: 'device-width',
  initialScale: 1,
  // Sin zoom al enfocar inputs en iOS.
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <UserProvider>
          <DataProvider>
            <AppShell>{children}</AppShell>
          </DataProvider>
        </UserProvider>
      </body>
    </html>
  );
}
