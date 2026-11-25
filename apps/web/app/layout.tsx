import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParkControl Pro',
  description: 'Control de entrada y salida vehicular, clientes, planes y cupos simultaneos',
};

const links = [
  { href: '/', label: 'Porteria' },
  { href: '/clientes', label: 'Clientes y vehiculos' },
  { href: '/planes', label: 'Planes' },
  { href: '/movimientos', label: 'Movimientos' },
  { href: '/caja', label: 'Caja' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <span className="brand">ParkControl Pro</span>
          <nav className="nav">
            {links.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
