export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'OTHER';

export type Vehicle = {
  id: string;
  plate: string;
  type: VehicleType;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  clientId: string;
  inside?: boolean;
  movementId?: string | null;
};

export type Plan = {
  id: string;
  name: string;
  vehicleType: VehicleType | null;
  maxSimultaneousSpots: number;
  price: string | number;
  durationDays: number;
  hourlyRate: string | number;
  overflowPolicy: 'CHARGE_HOURLY' | 'BLOCK';
  isOccasional: boolean;
  active: boolean;
};

export type Subscription = {
  id: string;
  clientId: string;
  planId: string;
  startsAt: string;
  endsAt: string;
  status: 'ACTIVE' | 'CANCELLED';
  plan: Plan;
  client?: Client;
};

export type Client = {
  id: string;
  documentType: string;
  documentNumber: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  vehicles?: Vehicle[];
  subscriptions?: Subscription[];
};

export type Movement = {
  id: string;
  entryAt: string;
  exitAt: string | null;
  status: 'INSIDE' | 'CLOSED';
  durationMin: number | null;
  coveredByPlan: boolean;
  amount: string | number;
  paymentMethod: string | null;
  vehicle: Vehicle;
  client: Client;
  subscription?: Subscription | null;
};

export type LookupResult = {
  client: Client;
  subscription: Subscription | null;
  spotsUsed: number;
  maxSpots: number;
  vehicles: Vehicle[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: any,
  ) {
    super(message);
  }
}

export class OfflineError extends Error {
  constructor() {
    super('No hay conexion con la API. Levanta apps/api para guardar cambios.');
  }
}

export const UNAUTHORIZED_EVENT = 'parkcontrol:unauthorized';

export type Role = 'ADMIN' | 'PORTERO';

export type SessionUser = { id: string; email: string; name: string; role: Role };

export const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Administracion', PORTERO: 'Porteria' };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    throw new OfflineError();
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    // Sesion vencida a mitad de trabajo: el gate vuelve a pedir el acceso.
    if (res.status === 401 && typeof window !== 'undefined' && path !== '/auth/me') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const payload = body?.message ?? body;
    const message =
      typeof payload === 'string'
        ? payload
        : (payload?.message ?? 'Error ' + res.status + ' en ' + path);
    throw new ApiError(message, res.status, payload);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

/** Lectura con datos de prueba cuando la API aun no esta levantada. */
export async function getOrDemo<T>(path: string, demo: T): Promise<{ data: T; demo: boolean }> {
  try {
    return { data: await request<T>(path), demo: false };
  } catch (error) {
    if (error instanceof OfflineError) return { data: demo, demo: true };
    throw error;
  }
}

export function money(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export function dateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

export function duration(min?: number | null) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  return (h ? h + 'h ' : '') + (min % 60) + 'm';
}

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  CAR: 'Carro',
  MOTORCYCLE: 'Moto',
  OTHER: 'Otro',
};

// ---------- Datos de prueba (solo cuando la API no responde) ----------
const demoPlan: Plan = {
  id: 'demo-plan',
  name: 'Multi-Vehiculo 2 cupos',
  vehicleType: null,
  maxSimultaneousSpots: 2,
  price: 320000,
  durationDays: 30,
  hourlyRate: 3000,
  overflowPolicy: 'CHARGE_HOURLY',
  isOccasional: false,
  active: true,
};

export const DEMO = {
  plans: [
    {
      ...demoPlan,
      id: 'demo-ocasional',
      name: 'Ocasional por horas',
      maxSimultaneousSpots: 1,
      price: 0,
      durationDays: 1,
      isOccasional: true,
    },
    demoPlan,
  ] as Plan[],
  clients: [
    {
      id: 'demo-client',
      documentType: 'CC',
      documentNumber: '1012345678',
      fullName: 'Jose Orozco (demo)',
      phone: '3001234567',
      vehicles: [
        { id: 'demo-v1', plate: 'ABC123', type: 'CAR', clientId: 'demo-client', brand: 'Mazda' },
        {
          id: 'demo-v2',
          plate: 'XYZ45D',
          type: 'MOTORCYCLE',
          clientId: 'demo-client',
          brand: 'Yamaha',
        },
      ],
      subscriptions: [
        {
          id: 'demo-sub',
          clientId: 'demo-client',
          planId: demoPlan.id,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 20 * 86400000).toISOString(),
          status: 'ACTIVE',
          plan: demoPlan,
        },
      ],
    },
  ] as Client[],
  movements: [] as Movement[],
  summary: {
    date: new Date().toISOString().slice(0, 10),
    exits: 0,
    coveredByPlan: 0,
    insideNow: 0,
    parkingTotal: 0,
    plansSold: 0,
    plansTotal: 0,
    total: 0,
    byPaymentMethod: {} as Record<string, { count: number; total: number }>,
  },
};
