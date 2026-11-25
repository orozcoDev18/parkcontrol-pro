import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function diaLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function clave(d: Date) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todo lo que pinta el tablero, en una sola llamada. */
  async overview(days = 7) {
    const dias = Math.min(Math.max(days, 1), 31);
    const hoy = diaLocal(new Date());
    const desde = new Date(hoy.getTime() - (dias - 1) * 86400000);
    const manana = new Date(hoy.getTime() + 86400000);
    const ahora = new Date();

    const [adentro, cerrados, suscripciones, clientes, vehiculos, planesVigentes, ultimos] =
      await Promise.all([
        this.prisma.movement.findMany({
          where: { status: 'INSIDE' },
          include: { vehicle: true, client: true },
          orderBy: { entryAt: 'asc' },
          take: 50,
        }),
        this.prisma.movement.findMany({
          where: { status: 'CLOSED', exitAt: { gte: desde, lt: manana } },
          select: { exitAt: true, amount: true, coveredByPlan: true, paymentMethod: true },
        }),
        this.prisma.subscription.findMany({
          where: { createdAt: { gte: desde, lt: manana } },
          include: { plan: true },
        }),
        this.prisma.client.count(),
        this.prisma.vehicle.count(),
        this.prisma.subscription.count({
          where: { status: 'ACTIVE', startsAt: { lte: ahora }, endsAt: { gte: ahora } },
        }),
        this.prisma.movement.findMany({
          include: { vehicle: true, client: true },
          orderBy: { entryAt: 'desc' },
          take: 8,
        }),
      ]);

    // Un punto por dia, aunque ese dia no haya pasado nada.
    const serie = Array.from({ length: dias }, (_, i) => {
      const d = new Date(desde.getTime() + i * 86400000);
      return { fecha: clave(d), salidas: 0, parqueo: 0, planes: 0, total: 0 };
    });
    const porFecha = new Map(serie.map((p) => [p.fecha, p]));

    for (const m of cerrados) {
      const p = porFecha.get(clave(m.exitAt!));
      if (!p) continue;
      p.salidas += 1;
      p.parqueo += Number(m.amount);
    }
    for (const s of suscripciones) {
      const p = porFecha.get(clave(s.createdAt));
      if (!p) continue;
      p.planes += Number(s.plan.price);
    }
    for (const p of serie) p.total = Math.round((p.parqueo + p.planes) * 100) / 100;

    const deHoy = porFecha.get(clave(hoy))!;
    const metodos: Record<string, number> = {};
    for (const m of cerrados) {
      if (clave(m.exitAt!) !== clave(hoy)) continue;
      const k = m.paymentMethod ?? 'SIN_DEFINIR';
      metodos[k] = (metodos[k] ?? 0) + Number(m.amount);
    }

    return {
      ahora: ahora.toISOString(),
      adentro: {
        total: adentro.length,
        conPlan: adentro.filter((m) => m.coveredByPlan).length,
        vehiculos: adentro.slice(0, 8).map((m) => ({
          id: m.id,
          plate: m.vehicle.plate,
          type: m.vehicle.type,
          cliente: m.client.fullName,
          entryAt: m.entryAt,
          coveredByPlan: m.coveredByPlan,
        })),
      },
      hoy: deHoy,
      metodos,
      totales: { clientes, vehiculos, planesVigentes },
      serie,
      ultimos,
    };
  }
}
