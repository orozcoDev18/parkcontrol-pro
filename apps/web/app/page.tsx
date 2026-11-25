'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  DEMO_OVERVIEW,
  Overview,
  VEHICLE_LABEL,
  dateTime,
  duration,
  getOrDemo,
  money,
} from '../lib/api';

const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

function etiquetaDia(fecha: string) {
  const d = new Date(fecha + 'T12:00:00');
  return DIAS[d.getDay()] + ' ' + d.getDate();
}

function desde(iso: string) {
  return duration(Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function TableroPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, demo } = await getOrDemo<Overview>('/reports/overview?days=7', DEMO_OVERVIEW);
      setData(data);
      setDemo(demo);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    // La porteria cambia sola mientras el tablero esta abierto.
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) {
    return (
      <div className="skeleton-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    );
  }

  const tope = Math.max(...data.serie.map((p) => p.total), 1);
  const semana = data.serie.reduce((s, p) => s + p.total, 0);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Tablero</h1>
          <p className="subtitle">
            Al dia de hoy, {new Date(data.ahora).toLocaleDateString('es-CO', { dateStyle: 'full' })}
          </p>
        </div>
        <Link className="btn-primary" href="/porteria">
          Ir a porteria
        </Link>
      </header>

      {demo && <div className="alert warn">Modo demo: la API no responde, datos de prueba.</div>}
      {error && <div className="alert error">{error}</div>}

      <section className="kpis">
        <article className="kpi-card acento">
          <span className="kpi-label">Adentro ahora</span>
          <strong className="kpi-value">{data.adentro.total}</strong>
          <span className="kpi-foot">{data.adentro.conPlan} con plan vigente</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Recaudo de hoy</span>
          <strong className="kpi-value">{money(data.hoy.total)}</strong>
          <span className="kpi-foot">
            {money(data.hoy.parqueo)} por horas · {money(data.hoy.planes)} en planes
          </span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Salidas de hoy</span>
          <strong className="kpi-value">{data.hoy.salidas}</strong>
          <span className="kpi-foot">{money(semana)} en los ultimos 7 dias</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Planes vigentes</span>
          <strong className="kpi-value">{data.totales.planesVigentes}</strong>
          <span className="kpi-foot">
            {data.totales.clientes} clientes · {data.totales.vehiculos} vehiculos
          </span>
        </article>
      </section>

      <section className="card chart-card">
        <div className="card-head">
          <h2>Recaudo de los ultimos 7 dias</h2>
          <span className="muted">{money(semana)} en total</span>
        </div>
        <div className="chart">
          {data.serie.map((p) => (
            <div className="chart-col" key={p.fecha} title={etiquetaDia(p.fecha)}>
              <span className="chart-amount">{p.total ? money(p.total) : ''}</span>
              <div className="chart-track">
                <div
                  className="chart-bar"
                  style={{ height: Math.max(3, Math.round((p.total / tope) * 100)) + '%' }}
                />
              </div>
              <span className="chart-day">{etiquetaDia(p.fecha)}</span>
              <span className="chart-exits">{p.salidas} sal.</span>
            </div>
          ))}
        </div>
      </section>

      <div className="split">
        <section className="card">
          <div className="card-head">
            <h2>Adentro ahora</h2>
            <Link className="link" href="/movimientos">
              Ver movimientos
            </Link>
          </div>
          {data.adentro.vehiculos.length ? (
            <ul className="lista">
              {data.adentro.vehiculos.map((v) => (
                <li key={v.id}>
                  <span className="mono placa">{v.plate}</span>
                  <span className="lista-texto">
                    <strong>{v.cliente}</strong>
                    {VEHICLE_LABEL[v.type]} · lleva {desde(v.entryAt)}
                  </span>
                  <span className={'badge ' + (v.coveredByPlan ? 'ok' : '')}>
                    {v.coveredByPlan ? 'Plan' : 'Por horas'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No hay vehiculos adentro.</p>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Ultimos movimientos</h2>
            <Link className="link" href="/caja">
              Ver caja
            </Link>
          </div>
          {data.ultimos.length ? (
            <ul className="lista">
              {data.ultimos.map((m) => (
                <li key={m.id}>
                  <span className="mono placa">{m.vehicle.plate}</span>
                  <span className="lista-texto">
                    <strong>{m.client.fullName}</strong>
                    {m.status === 'INSIDE' ? 'Entro ' : 'Salio '}
                    {dateTime(m.status === 'INSIDE' ? m.entryAt : m.exitAt)}
                  </span>
                  <span className="lista-valor">
                    {m.status === 'INSIDE' ? (
                      <span className="badge inside">Adentro</span>
                    ) : m.coveredByPlan ? (
                      <span className="badge ok">Plan</span>
                    ) : (
                      money(m.amount)
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Todavia no hay movimientos.</p>
          )}
        </section>
      </div>
    </>
  );
}
