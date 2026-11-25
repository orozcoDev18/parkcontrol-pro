'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { OfflineError, SessionUser, UNAUTHORIZED_EVENT, api } from '../lib/api';

const links = [
  { href: '/', label: 'Porteria' },
  { href: '/clientes', label: 'Clientes y vehiculos' },
  { href: '/planes', label: 'Planes' },
  { href: '/movimientos', label: 'Movimientos' },
  { href: '/caja', label: 'Caja' },
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

  const check = useCallback(async () => {
    try {
      setState({ kind: 'in', user: await api.get<SessionUser>('/auth/me') });
    } catch (e) {
      setState({ kind: e instanceof OfflineError ? 'offline' : 'out' });
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
      <main className="container" style={{ maxWidth: 420 }}>
        <h1>ParkControl Pro</h1>
        <p className="subtitle">Inicia sesion para operar la porteria.</p>
        <div className="card">
          {error && <div className="alert error">{error}</div>}
          <form onSubmit={login}>
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <div style={{ height: 12 }} />
            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div style={{ height: 16 }} />
            <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="topbar">
        <span className="brand">ParkControl Pro</span>
        <nav className="nav">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="row" style={{ marginLeft: 'auto', alignItems: 'center', gap: 12 }}>
          {state.kind === 'in' ? (
            <>
              <span className="muted">{state.user.name}</span>
              <button className="ghost" onClick={logout}>
                Salir
              </button>
            </>
          ) : (
            <span className="badge warn">Modo demo</span>
          )}
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
