import type { Metadata } from 'next';
import AuthGate from './auth-gate';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParkControl Pro',
  description: 'Control de entrada y salida vehicular, clientes, planes y cupos simultaneos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
