'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEMO, Movement, dateTime, duration, getOrDemo, money } from '../../lib/api';

export default function MovimientosPage() {
  const [filter, setFilter] = useState<'' | 'INSIDE' | 'CLOSED'>('');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, demo: isDemo } = await getOrDemo<Movement[]>(
        '/movements' + (filter ? '?status=' + filter : ''),
        DEMO.movements,
      );
      setMovements(data);
      setDemo(isDemo);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <h1>Movimientos</h1>
      <p className="subtitle">Entradas y salidas registradas en porteria.</p>

      {demo && <div className="alert warn">Modo demo: la API no responde, datos de prueba.</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <div className="row">
          <div className="field" style={{ flex: '0 1 220px' }}>
            <label>Estado</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="">Todos</option>
              <option value="INSIDE">Adentro</option>
              <option value="CLOSED">Cerrados</option>
            </select>
          </div>
          <button onClick={() => load()}>Actualizar</button>
        </div>
      </div>

      <div className="card">
        <h2>{movements.length} movimiento(s)</h2>
        <div className="table-wrap">
<table className="cards-sm">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Conductor</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Tiempo</th>
              <th>Cobro</th>
              <th>Pago</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td className="mono" data-label="Placa">
                  {m.vehicle.plate}
                </td>
                <td data-label="Conductor">{m.client.fullName}</td>
                <td data-label="Entrada">{dateTime(m.entryAt)}</td>
                <td data-label="Salida">{dateTime(m.exitAt)}</td>
                <td data-label="Tiempo">{duration(m.durationMin)}</td>
                <td data-label="Cobro">
                  {m.coveredByPlan ? <span className="badge ok">Plan</span> : money(m.amount)}
                </td>
                <td data-label="Pago">{m.paymentMethod ?? '—'}</td>
                <td data-label="Estado">
                  {m.status === 'INSIDE' ? (
                    <span className="badge inside">Adentro</span>
                  ) : (
                    <span className="badge">Cerrado</span>
                  )}
                </td>
              </tr>
            ))}
            {!movements.length && (
              <tr>
                <td colSpan={8} className="empty">
                  Sin movimientos.
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
