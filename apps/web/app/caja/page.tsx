'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEMO, getOrDemo, money } from '../../lib/api';

type Summary = typeof DEMO.summary;

export default function CajaPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<Summary>(DEMO.summary);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, demo: isDemo } = await getOrDemo<Summary>(
        '/cash-register/summary?date=' + date,
        { ...DEMO.summary, date },
      );
      setSummary(data);
      setDemo(isDemo);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const methods = Object.entries(summary.byPaymentMethod ?? {});

  return (
    <>
      <h1>Caja</h1>
      <p className="subtitle">Recaudo del dia por salidas y por venta de planes.</p>

      {demo && <div className="alert warn">Modo demo: la API no responde, datos de prueba.</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <div className="row">
          <div className="field" style={{ flex: '0 1 220px' }}>
            <label>Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button onClick={() => load()}>Actualizar</button>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <span className="muted">Total recaudado</span>
          <div className="kpi">{money(summary.total)}</div>
        </div>
        <div className="card">
          <span className="muted">Parqueo por horas</span>
          <div className="kpi">{money(summary.parkingTotal)}</div>
        </div>
        <div className="card">
          <span className="muted">Planes vendidos</span>
          <div className="kpi">{money(summary.plansTotal)}</div>
          <span className="muted">{summary.plansSold} plan(es)</span>
        </div>
        <div className="card">
          <span className="muted">Salidas del dia</span>
          <div className="kpi">{summary.exits}</div>
          <span className="muted">{summary.coveredByPlan} cubiertas por plan</span>
        </div>
        <div className="card">
          <span className="muted">Vehiculos adentro</span>
          <div className="kpi">{summary.insideNow}</div>
        </div>
      </div>

      <div className="card">
        <h2>Por metodo de pago</h2>
        <div className="table-wrap">
<table>
          <thead>
            <tr>
              <th>Metodo</th>
              <th>Salidas</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {methods.map(([method, value]) => (
              <tr key={method}>
                <td>{method}</td>
                <td>{value.count}</td>
                <td>{money(value.total)}</td>
              </tr>
            ))}
            {!methods.length && (
              <tr>
                <td colSpan={3} className="empty">
                  Sin movimientos cerrados ese dia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
</div>
      </div>
    </>
  );
}
