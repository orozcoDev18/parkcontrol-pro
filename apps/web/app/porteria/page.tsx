'use client';

import { useState } from 'react';
import {
  ApiError,
  DEMO,
  LookupResult,
  Movement,
  OfflineError,
  VEHICLE_LABEL,
  api,
  dateTime,
  duration,
  getOrDemo,
  money,
} from '../../lib/api';

type Note = { kind: 'ok' | 'error' | 'warn'; text: string } | null;

export default function PorteriaPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<LookupResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [demo, setDemo] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [payment, setPayment] = useState('EFECTIVO');
  const [confirm, setConfirm] = useState<{ plate: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(term = q) {
    const value = term.trim();
    if (value.length < 2) {
      setNote({ kind: 'warn', text: 'Escribe al menos 2 caracteres.' });
      return;
    }
    setBusy(true);
    try {
      const demoResults: LookupResult[] = DEMO.clients
        .filter(
          (c) =>
            c.fullName.toLowerCase().includes(value.toLowerCase()) ||
            c.documentNumber.includes(value) ||
            (c.vehicles ?? []).some((v) => v.plate.includes(value.toUpperCase())),
        )
        .map((c) => ({
          client: c,
          subscription: c.subscriptions?.[0] ?? null,
          spotsUsed: 0,
          maxSpots: c.subscriptions?.[0]?.plan.maxSimultaneousSpots ?? 0,
          vehicles: c.vehicles ?? [],
        }));
      const { data, demo: isDemo } = await getOrDemo<{ results: LookupResult[] }>(
        '/gate/lookup?q=' + encodeURIComponent(value),
        { results: demoResults },
      );
      setResults(data.results);
      setDemo(isDemo);
      setSearched(true);
      if (!data.results.length) setNote({ kind: 'warn', text: 'Sin resultados para "' + value + '".' });
      else setNote(null);
    } catch (error) {
      setNote({ kind: 'error', text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function checkIn(plate: string, force = false) {
    setBusy(true);
    setConfirm(null);
    try {
      const res = await api.post<{ movement: Movement; coveredByPlan: boolean; warning: string | null }>(
        '/gate/check-in',
        { plate, force },
      );
      setNote({
        kind: res.warning ? 'warn' : 'ok',
        text:
          'Entrada registrada: ' +
          res.movement.vehicle.plate +
          ' a las ' +
          dateTime(res.movement.entryAt) +
          (res.coveredByPlan ? ' (cubierto por el plan)' : ' (se cobra por horas)') +
          (res.warning ? ' — ' + res.warning : ''),
      });
      await search();
    } catch (error) {
      if (error instanceof ApiError && error.payload?.code === 'PLAN_SPOTS_FULL_CONFIRM') {
        setConfirm({ plate, text: error.message });
      } else if (error instanceof OfflineError) {
        setNote({ kind: 'error', text: error.message });
      } else {
        setNote({ kind: 'error', text: (error as Error).message });
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkOut(plate: string) {
    setBusy(true);
    try {
      const m = await api.post<Movement>('/gate/check-out', { plate, paymentMethod: payment });
      setNote({
        kind: 'ok',
        text:
          'Salida registrada: ' +
          m.vehicle.plate +
          ' · ' +
          duration(m.durationMin) +
          ' · ' +
          money(m.amount) +
          ' · ' +
          (m.paymentMethod ?? ''),
      });
      await search();
    } catch (error) {
      setNote({ kind: 'error', text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Porteria</h1>
      <p className="subtitle">Busca por placa, documento o nombre del conductor.</p>

      {demo && (
        <div className="alert warn">
          Modo demo: la API no responde, se muestran datos de prueba. Los registros no se guardan.
        </div>
      )}
      {note && <div className={'alert ' + (note.kind === 'ok' ? 'ok' : note.kind)}>{note.text}</div>}
      {confirm && (
        <div className="alert warn">
          <div>{confirm.text}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="primary" onClick={() => checkIn(confirm.plate, true)} disabled={busy}>
              Ingresar y cobrar por horas
            </button>
            <button className="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <div className="field" style={{ flex: '2 1 280px' }}>
            <label>Placa, documento o nombre</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ABC123" autoFocus />
          </div>
          <div className="field">
            <label>Metodo de pago (salida)</label>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>
          <button className="primary" type="submit" disabled={busy}>
            Buscar
          </button>
        </form>
      </div>

      {results.map((r) => (
        <div className="card" key={r.client.id}>
          <h2>
            {r.client.fullName}{' '}
            <span className="muted">
              · {r.client.documentType} {r.client.documentNumber}
            </span>
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {r.subscription ? (
              <>
                Plan <strong>{r.subscription.plan.name}</strong> vigente hasta{' '}
                {dateTime(r.subscription.endsAt)} · cupos {r.spotsUsed}/{r.maxSpots}
              </>
            ) : (
              <>Sin plan vigente: se cobra tarifa ocasional por horas.</>
            )}
          </p>
          <div className="table-wrap">
<table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {r.vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.plate}</td>
                  <td>{VEHICLE_LABEL[v.type]}</td>
                  <td>
                    {v.inside ? (
                      <span className="badge inside">Adentro</span>
                    ) : (
                      <span className="badge">Afuera</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {v.inside ? (
                      <button onClick={() => checkOut(v.plate)} disabled={busy}>
                        Salida
                      </button>
                    ) : (
                      <button className="primary" onClick={() => checkIn(v.plate)} disabled={busy}>
                        Entrada
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</div>
        </div>
      ))}

      {searched && !results.length && <div className="card empty">Sin resultados.</div>}
    </>
  );
}
