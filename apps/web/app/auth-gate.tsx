'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ROLE_LABEL, SessionUser, UNAUTHORIZED_EVENT, api, apiCaida } from '../lib/api';

const SessionContext = createContext<SessionUser | null>(null);

// Iconos en linea: nada que descargar, nada que se quede en blanco si falla.
const FEATURES = [
  {
    title: 'Entrada y salida en segundos. ',
    detail: 'Busca por placa, documento o nombre del conductor.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13v5h-2.5v-2h-9v2H5v-5z" />
        <circle cx="7.5" cy="15" r="0.6" fill="currentColor" />
        <circle cx="16.5" cy="15" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Un cliente, varios vehiculos. ',
    detail: 'Placa unica: nunca dos duenos a la vez.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 19c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
      </svg>
    ),
  },
  {
    title: 'Planes con cupos. ',
    detail: 'Si el cupo esta lleno, cobra por horas o bloquea.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8.5A1.5 1.5 0 015.5 7h13A1.5 1.5 0 0120 8.5v2a2 2 0 000 4v2a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 16.5v-2a2 2 0 000-4v-2z" />
        <path d="M14 7v10" strokeDasharray="2 2.5" />
      </svg>
    ),
  },
];

const DEMO_SESSION: SessionUser = {
  id: 'demo',
  email: 'demo@parkcontrol.local',
  name: 'Demo',
  role: 'ADMIN',
};

/** La sesion abierta, o null en modo demo. `esAdmin` decide que se muestra. */
export function useSession() {
  const user = useContext(SessionContext);
  return { user, esAdmin: user?.role === 'ADMIN' };
}

const svg = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    {d}
  </svg>
);

const iconoTablero = svg(
  <>
    <rect x="3.5" y="3.5" width="7" height="8.5" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="3.5" y="15" width="7" height="5.5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
  </>,
);
const iconoPorteria = svg(
  <>
    <path d="M4 13l1.4-4.3A2 2 0 017.3 7h9.4a2 2 0 011.9 1.7L20 13v5.5h-2.5v-2h-11v2H4V13z" />
    <path d="M6.5 16h11" strokeDasharray="1 3" />
  </>,
);
const iconoClientes = svg(
  <>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 19.5c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6" />
  </>,
);
const iconoPlanes = svg(
  <>
    <path d="M4 8.5A1.5 1.5 0 015.5 7h13A1.5 1.5 0 0120 8.5v2a2 2 0 000 4v2a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 16.5v-2a2 2 0 000-4v-2z" />
    <path d="M14 7v10" strokeDasharray="2 2.5" />
  </>,
);
const iconoMovimientos = svg(
  <>
    <path d="M4 8h12M13 5l3 3-3 3" />
    <path d="M20 16H8M11 13l-3 3 3 3" />
  </>,
);
const iconoCaja = svg(
  <>
    <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
    <circle cx="12" cy="12" r="2.4" />
  </>,
);

// `corta` es la etiqueta de la barra inferior del celular, donde no cabe mas.
// `barra: false` queda fuera de esa barra: son cinco destinos, no seis, para
// que cada uno siga siendo comodo con el pulgar.
const links = [
  { href: '/', label: 'Tablero', corta: 'Tablero', barra: true, icon: iconoTablero },
  { href: '/porteria', label: 'Porteria', corta: 'Porteria', barra: true, icon: iconoPorteria },
  { href: '/clientes', label: 'Clientes y vehiculos', corta: 'Clientes', barra: true, icon: iconoClientes },
  { href: '/planes', label: 'Planes', corta: 'Planes', barra: false, icon: iconoPlanes },
  { href: '/movimientos', label: 'Movimientos', corta: 'Movim.', barra: true, icon: iconoMovimientos },
  { href: '/caja', label: 'Caja', corta: 'Caja', barra: true, icon: iconoCaja },
];

type State =
  | { kind: 'loading' }
  | { kind: 'in'; user: SessionUser }
  | { kind: 'out' }
  // La API no responde: se deja ver la web en modo demo, que no guarda nada.
  | { kind: 'offline' };

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ruta = usePathname();
  const activo = (href: string) => (href === '/' ? ruta === '/' : ruta.startsWith(href));

  const check = useCallback(async () => {
    try {
      setState({ kind: 'in', user: await api.get<SessionUser>('/auth/me') });
    } catch (e) {
      setState({ kind: apiCaida(e) ? 'offline' : 'out' });
    }
  }, []);

  useEffect(() => {
    check();
    const onUnauthorized = () => setState({ kind: 'out' });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [check]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await api.post<SessionUser>('/auth/login', form);
      setForm({ email: '', password: '' });
      setState({ kind: 'in', user });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setState({ kind: 'out' });
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="container">
        <p className="muted">Cargando…</p>
      </main>
    );
  }

  if (state.kind === 'out') {
    return (
      <main className="login">
        <div className="login-bg" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
          <div className="login-grid" />
          <div className="scanline" />
        </div>

        <div className="login-inner">
          <section className="login-intro">
            <span className="login-chip">
              <i className="dot" /> Control vehicular
            </span>
            <h1 className="login-title">
              ParkControl <span>Pro</span>
            </h1>
            <p className="login-lead">
              La porteria en una pantalla: entrada y salida por placa, documento o nombre, con los
              cupos y el cobro ya resueltos.
            </p>
            <ul className="login-features">
              {FEATURES.map((f, i) => (
                <li key={f.title} style={{ ['--i' as string]: i }}>
                  <span className="icon">{f.icon}</span>
                  <span>
                    <strong>{f.title}</strong>
                    {f.detail}
                  </span>
                </li>
              ))}
            </ul>
            <div className="plate" aria-hidden="true">
              <span className="plate-text">ABC123</span>
              <span className="plate-beam" />
            </div>
          </section>

          <form className="login-card" onSubmit={login}>
            <h2>Entrar</h2>
            <p className="login-card-sub">Acceso del personal del parqueadero.</p>
            {error && <div className="alert error">{error}</div>}

            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              placeholder="tu@parqueadero.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <button className="login-submit" type="submit" disabled={busy}>
              <span>{busy ? 'Entrando…' : 'Entrar'}</span>
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/">
          ParkControl <span>Pro</span>
        </Link>
        <nav className="nav">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={activo(l.href) ? 'activo' : undefined}
              aria-current={activo(l.href) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="session">
          {state.kind === 'in' ? (
            <>
              <span className="muted">{state.user.name}</span>
              <span className="badge">{ROLE_LABEL[state.user.role]}</span>
              <button className="ghost" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <span className="badge warn">Modo demo</span>
          )}
        </div>
      </header>
      <main className="container">
        {/* En modo demo no hay sesion, pero se enseña la interfaz completa. */}
        <SessionContext.Provider value={state.kind === 'in' ? state.user : DEMO_SESSION}>
          {children}
        </SessionContext.Provider>
      </main>

      {/* Barra inferior del celular: al alcance del pulgar, no arriba. */}
      <nav className="barra-inferior">
        {links
          .filter((l) => l.barra)
          .map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={activo(l.href) ? 'activo' : undefined}
              aria-current={activo(l.href) ? 'page' : undefined}
            >
              <span className="barra-icono">{l.icon}</span>
              {l.corta}
            </Link>
          ))}
      </nav>
    </>
  );
}
