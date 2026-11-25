'use client';

import { useEffect, useState } from 'react';
import { DEMO, Plan, VehicleType, api, getOrDemo, money } from '../../lib/api';

type Note = { kind: 'ok' | 'error' | 'warn'; text: string } | null;

const empty = {
  name: '',
  vehicleType: '' as '' | VehicleType,
  maxSimultaneousSpots: 1,
  price: 0,
  durationDays: 30,
  hourlyRate: 3000,
  overflowPolicy: 'CHARGE_HOURLY' as 'CHARGE_HOURLY' | 'BLOCK',
};

export default function PlanesPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [demo, setDemo] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, demo: isDemo } = await getOrDemo<Plan[]>('/plans', DEMO.plans);
    setPlans(data);
    setDemo(isDemo);
  }

  useEffect(() => {
    load().catch((e) => setNote({ kind: 'error', text: (e as Error).message }));
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setNote(null);
    } catch (error) {
      setNote({ kind: 'error', text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const createPlan = () =>
    run(async () => {
      await api.post('/plans', {
        ...form,
        vehicleType: form.vehicleType || undefined,
        maxSimultaneousSpots: Number(form.maxSimultaneousSpots),
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        hourlyRate: Number(form.hourlyRate),
      });
      setForm(empty);
      await load();
      setNote({ kind: 'ok', text: 'Plan creado.' });
    });

  const toggle = (plan: Plan) =>
    run(async () => {
      await api.patch('/plans/' + plan.id, { active: !plan.active });
      await load();
    });

  return (
    <>
      <h1>Planes y membresias</h1>
      <p className="subtitle">
        Los cupos simultaneos definen cuantos vehiculos del cliente pueden estar adentro a la vez.
      </p>

      {demo && <div className="alert warn">Modo demo: la API no responde, datos de prueba.</div>}
      {note && <div className={'alert ' + (note.kind === 'ok' ? 'ok' : note.kind)}>{note.text}</div>}

      <div className="card">
        <h2>Nuevo plan</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPlan();
          }}
        >
          <div className="row">
            <div className="field" style={{ flex: '2 1 220px' }}>
              <label>Nombre</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Tipo de vehiculo</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value as VehicleType })}
              >
                <option value="">Cualquiera</option>
                <option value="CAR">Carro</option>
                <option value="MOTORCYCLE">Moto</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div className="field">
              <label>Cupos simultaneos</label>
              <input
                type="number"
                min={1}
                value={form.maxSimultaneousSpots}
                onChange={(e) =>
                  setForm({ ...form, maxSimultaneousSpots: Number(e.target.value) })
                }
              />
            </div>
            <div className="field">
              <label>Precio</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Dias</label>
              <input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Tarifa hora</label>
              <input
                type="number"
                min={0}
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Sin cupo disponible</label>
              <select
                value={form.overflowPolicy}
                onChange={(e) =>
                  setForm({ ...form, overflowPolicy: e.target.value as 'CHARGE_HOURLY' | 'BLOCK' })
                }
              >
                <option value="CHARGE_HOURLY">Cobrar por horas</option>
                <option value="BLOCK">Bloquear ingreso</option>
              </select>
            </div>
            <button className="primary" type="submit" disabled={busy}>
              Crear plan
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Planes ({plans.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Vehiculo</th>
              <th>Cupos</th>
              <th>Precio</th>
              <th>Dias</th>
              <th>Hora</th>
              <th>Sin cupo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.name} {p.isOccasional && <span className="badge">ocasional</span>}
                </td>
                <td>
                  {p.vehicleType === 'CAR'
                    ? 'Carro'
                    : p.vehicleType === 'MOTORCYCLE'
                      ? 'Moto'
                      : p.vehicleType === 'OTHER'
                        ? 'Otro'
                        : 'Cualquiera'}
                </td>
                <td>{p.maxSimultaneousSpots}</td>
                <td>{money(p.price)}</td>
                <td>{p.durationDays}</td>
                <td>{money(p.hourlyRate)}</td>
                <td>{p.overflowPolicy === 'BLOCK' ? 'Bloquea' : 'Cobra por horas'}</td>
                <td>
                  {p.active ? (
                    <span className="badge ok">Activo</span>
                  ) : (
                    <span className="badge">Inactivo</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => toggle(p)} disabled={busy}>
                    {p.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {!plans.length && (
              <tr>
                <td colSpan={9} className="empty">
                  Sin planes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
