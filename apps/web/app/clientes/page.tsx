'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  Client,
  DEMO,
  Plan,
  VEHICLE_LABEL,
  VehicleType,
  api,
  dateTime,
  getOrDemo,
  money,
} from '../../lib/api';
import { useSession } from '../auth-gate';

type Note = { kind: 'ok' | 'error' | 'warn'; text: string } | null;

const emptyClient = { documentType: 'CC', documentNumber: '', fullName: '', phone: '', email: '' };
const emptyVehicle = { plate: '', type: 'CAR' as VehicleType, brand: '', model: '', color: '' };

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [demo, setDemo] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [form, setForm] = useState(emptyClient);
  const [vehicle, setVehicle] = useState(emptyVehicle);
  const [planId, setPlanId] = useState('');
  const [transfer, setTransfer] = useState({ vehicleId: '', document: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const { esAdmin } = useSession();

  async function load(term = search) {
    const path = '/clients' + (term.trim() ? '?search=' + encodeURIComponent(term.trim()) : '');
    const [c, p] = await Promise.all([
      getOrDemo<Client[]>(path, DEMO.clients),
      getOrDemo<Plan[]>('/plans?active=true', DEMO.plans),
    ]);
    setClients(c.data);
    setPlans(p.data);
    setDemo(c.demo);
    if (!planId && p.data.length) setPlanId(p.data[0].id);
    if (selected) setSelected(c.data.find((x) => x.id === selected.id) ?? selected);
  }

  useEffect(() => {
    load().catch((e) => setNote({ kind: 'error', text: (e as Error).message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      if (error instanceof ApiError && error.payload?.client) {
        // El documento ya existe: en lugar de duplicar, se abre el perfil existente.
        setSelected(error.payload.client);
        setNote({ kind: 'warn', text: error.message + ' Se abrio su perfil.' });
        await load();
      } else {
        setNote({ kind: 'error', text: (error as Error).message });
      }
    } finally {
      setBusy(false);
    }
  }

  const createClient = () =>
    run(async () => {
      const created = await api.post<Client>('/clients', {
        ...form,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      setForm(emptyClient);
      setSelected(created);
      setNote({ kind: 'ok', text: 'Cliente ' + created.fullName + ' registrado.' });
      await load();
    });

  const addVehicle = () =>
    run(async () => {
      if (!selected) return;
      await api.post('/vehicles', {
        ...vehicle,
        clientId: selected.id,
        brand: vehicle.brand || undefined,
        model: vehicle.model || undefined,
        color: vehicle.color || undefined,
      });
      setVehicle(emptyVehicle);
      setNote({ kind: 'ok', text: 'Vehiculo agregado a ' + selected.fullName + '.' });
      await load();
    });

  const transferVehicle = () =>
    run(async () => {
      const target = await api.get<Client>(
        '/clients/by-document/' + encodeURIComponent(transfer.document),
      );
      await api.post('/vehicles/' + transfer.vehicleId + '/transfer', {
        toClientId: target.id,
        reason: transfer.reason || undefined,
      });
      setTransfer({ vehicleId: '', document: '', reason: '' });
      setNote({ kind: 'ok', text: 'Vehiculo transferido a ' + target.fullName + '.' });
      await load();
    });

  const assignPlan = () =>
    run(async () => {
      if (!selected) return;
      await api.post('/subscriptions', { clientId: selected.id, planId });
      setNote({ kind: 'ok', text: 'Plan asignado a ' + selected.fullName + '.' });
      await load();
    });

  return (
    <>
      <h1>Clientes y vehiculos</h1>
      <p className="subtitle">
        Un conductor por documento. Un cliente puede tener varios vehiculos; una placa, un solo dueno.
      </p>

      {demo && <div className="alert warn">Modo demo: la API no responde, datos de prueba.</div>}
      {note && <div className={'alert ' + (note.kind === 'ok' ? 'ok' : note.kind)}>{note.text}</div>}

      <div className="card">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => load());
          }}
        >
          <div className="field" style={{ flex: '2 1 280px' }}>
            <label>Buscar por nombre, documento o placa</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="primary" type="submit" disabled={busy}>
            Buscar
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Registrar cliente</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createClient();
          }}
        >
          <div className="row">
            <div className="field" style={{ flex: '0 0 110px' }}>
              <label>Tipo</label>
              <select
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
              >
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="NIT">NIT</option>
                <option value="PAS">PAS</option>
              </select>
            </div>
            <div className="field">
              <label>Documento</label>
              <input
                required
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: '2 1 220px' }}>
              <label>Nombre completo</label>
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Telefono</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <button className="primary" type="submit" disabled={busy}>
              Registrar
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Clientes ({clients.length})</h2>
        <div className="table-wrap">
<table className="cards-sm">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Documento</th>
              <th>Vehiculos</th>
              <th>Plan vigente</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const active = (c.subscriptions ?? []).find(
                (s) => s.status === 'ACTIVE' && new Date(s.endsAt) >= new Date(),
              );
              return (
                <tr key={c.id}>
                  <td data-label="Nombre">{c.fullName}</td>
                  <td className="mono" data-label="Documento">
                    {c.documentNumber}
                  </td>
                  <td data-label="Vehiculos">
                    {(c.vehicles ?? []).map((v) => v.plate).join(', ') || '—'}
                  </td>
                  <td data-label="Plan">
                    {active ? (
                      <span className="badge ok">{active.plan.name}</span>
                    ) : (
                      <span className="badge">Ocasional</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setSelected(c)}>Abrir</button>
                  </td>
                </tr>
              );
            })}
            {!clients.length && (
              <tr>
                <td colSpan={5} className="empty">
                  Sin clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
</div>
      </div>

      {selected && (
        <div className="card">
          <h2>
            {selected.fullName}{' '}
            <span className="muted">
              · {selected.documentType} {selected.documentNumber}
            </span>
          </h2>

          <div className="table-wrap">
<table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Tipo</th>
                <th>Marca</th>
                <th>Color</th>
              </tr>
            </thead>
            <tbody>
              {(selected.vehicles ?? []).map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.plate}</td>
                  <td>{VEHICLE_LABEL[v.type]}</td>
                  <td>{v.brand || '—'}</td>
                  <td>{v.color || '—'}</td>
                </tr>
              ))}
              {!(selected.vehicles ?? []).length && (
                <tr>
                  <td colSpan={4} className="empty">
                    Este cliente aun no tiene vehiculos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
</div>

          <h2 style={{ marginTop: 20 }}>Agregar vehiculo</h2>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              addVehicle();
            }}
          >
            <div className="field">
              <label>Placa</label>
              <input
                required
                value={vehicle.plate}
                onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select
                value={vehicle.type}
                onChange={(e) => setVehicle({ ...vehicle, type: e.target.value as VehicleType })}
              >
                <option value="CAR">Carro</option>
                <option value="MOTORCYCLE">Moto</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
            <div className="field">
              <label>Marca</label>
              <input
                value={vehicle.brand}
                onChange={(e) => setVehicle({ ...vehicle, brand: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Color</label>
              <input
                value={vehicle.color}
                onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
              />
            </div>
            <button className="primary" type="submit" disabled={busy}>
              Agregar
            </button>
          </form>

          {esAdmin && (
          <>
          <h2 style={{ marginTop: 20 }}>Transferir propietario</h2>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              transferVehicle();
            }}
          >
            <div className="field">
              <label>Vehiculo</label>
              <select
                required
                value={transfer.vehicleId}
                onChange={(e) => setTransfer({ ...transfer, vehicleId: e.target.value })}
              >
                <option value="">Seleccione</option>
                {(selected.vehicles ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Documento del nuevo dueno</label>
              <input
                required
                value={transfer.document}
                onChange={(e) => setTransfer({ ...transfer, document: e.target.value })}
              />
            </div>
            <div className="field" style={{ flex: '2 1 200px' }}>
              <label>Motivo</label>
              <input
                value={transfer.reason}
                onChange={(e) => setTransfer({ ...transfer, reason: e.target.value })}
              />
            </div>
            <button type="submit" disabled={busy}>
              Transferir
            </button>
          </form>
          </>
          )}

          <h2 style={{ marginTop: 20 }}>Planes del cliente</h2>
          <div className="table-wrap">
<table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Cupos</th>
                <th>Vigencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(selected.subscriptions ?? []).map((s) => (
                <tr key={s.id}>
                  <td>{s.plan.name}</td>
                  <td>{s.plan.maxSimultaneousSpots}</td>
                  <td>
                    {dateTime(s.startsAt)} → {dateTime(s.endsAt)}
                  </td>
                  <td>
                    {s.status === 'ACTIVE' && new Date(s.endsAt) >= new Date() ? (
                      <span className="badge ok">Vigente</span>
                    ) : (
                      <span className="badge">{s.status === 'CANCELLED' ? 'Cancelado' : 'Vencido'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!(selected.subscriptions ?? []).length && (
                <tr>
                  <td colSpan={4} className="empty">
                    Sin planes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
</div>
          {esAdmin && (
          <form
            className="row"
            style={{ marginTop: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              assignPlan();
            }}
          >
            <div className="field" style={{ flex: '2 1 240px' }}>
              <label>Asignar plan</label>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)} · {p.maxSimultaneousSpots} cupo(s)
                  </option>
                ))}
              </select>
            </div>
            <button className="primary" type="submit" disabled={busy || !plans.length}>
              Asignar
            </button>
          </form>
          )}
        </div>
      )}
    </>
  );
}
