import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { normalizeDocument, normalizePlate } from '../common/normalize';
import { durationMinutes, movementCharge } from '../common/billing';
import { CheckInDto, CheckOutDto } from './gate.dto';

type ActiveSub = Prisma.SubscriptionGetPayload<{ include: { plan: true } }>;

@Injectable()
export class GateService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tarifa por hora del parqueadero: la del plan marcado como ocasional. */
  private async occasionalRate(tx: Prisma.TransactionClient) {
    const plan = await tx.plan.findFirst({ where: { isOccasional: true, active: true } });
    return { rate: plan ? Number(plan.hourlyRate) : 0, plan };
  }

  /** Busca por placa, documento o nombre del conductor. */
  async lookup(query: string) {
    const q = query?.trim() ?? '';
    if (q.length < 2) return { query: q, results: [] };
    const normalized = normalizeDocument(q);

    const byPlate = await this.prisma.vehicle.findMany({
      where: { plate: { contains: normalizePlate(q) } },
      select: { clientId: true },
      take: 20,
    });
    const byClient = await this.prisma.client.findMany({
      where: {
        OR: [
          { documentNumber: { contains: normalized } },
          { fullName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      take: 20,
    });

    const ids = [...new Set([...byPlate.map((v) => v.clientId), ...byClient.map((c) => c.id)])];
    if (!ids.length) return { query: q, results: [] };

    const now = new Date();
    const clients = await this.prisma.client.findMany({
      where: { id: { in: ids } },
      include: {
        vehicles: { orderBy: { plate: 'asc' } },
        subscriptions: {
          where: { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gte: now } },
          include: { plan: true },
          orderBy: { endsAt: 'desc' },
        },
        movements: { where: { status: 'INSIDE' }, include: { vehicle: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    return {
      query: q,
      results: clients.map((client) => {
        const subscription = client.subscriptions[0] ?? null;
        const insideVehicleIds = new Set(client.movements.map((m) => m.vehicleId));
        return {
          client: {
            id: client.id,
            fullName: client.fullName,
            documentType: client.documentType,
            documentNumber: client.documentNumber,
            phone: client.phone,
          },
          subscription,
          spotsUsed: client.movements.length,
          maxSpots: subscription ? subscription.plan.maxSimultaneousSpots : 0,
          vehicles: client.vehicles.map((v) => ({
            ...v,
            inside: insideVehicleIds.has(v.id),
            movementId: client.movements.find((m) => m.vehicleId === v.id)?.id ?? null,
          })),
        };
      }),
    };
  }

  async checkIn(dto: CheckInDto) {
    const plate = normalizePlate(dto.plate);

    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { plate },
        include: { client: true },
      });
      if (!vehicle) {
        throw new NotFoundException({
          message: 'La placa ' + plate + ' no esta registrada',
          code: 'VEHICLE_NOT_FOUND',
          plate,
        });
      }

      const open = await tx.movement.findFirst({ where: { vehicleId: vehicle.id, status: 'INSIDE' } });
      if (open) {
        throw new ConflictException({
          message: 'La placa ' + plate + ' ya esta adentro desde ' + open.entryAt.toISOString(),
          code: 'ALREADY_INSIDE',
          movement: open,
        });
      }

      const now = new Date();
      const subs = await tx.subscription.findMany({
        where: {
          clientId: vehicle.clientId,
          status: 'ACTIVE',
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        include: { plan: true },
        orderBy: { endsAt: 'desc' },
      });
      // Sirve el plan sin tipo de vehiculo o el que coincide con el tipo que entra.
      const subscription: ActiveSub | undefined = subs.find(
        (s) => s.plan.vehicleType === null || s.plan.vehicleType === vehicle.type,
      );

      const spotsUsed = await tx.movement.count({
        where: { clientId: vehicle.clientId, status: 'INSIDE' },
      });

      let coveredByPlan = false;
      let warning: string | null = null;

      if (subscription) {
        if (spotsUsed < subscription.plan.maxSimultaneousSpots) {
          coveredByPlan = true;
        } else if (subscription.plan.overflowPolicy === 'BLOCK') {
          throw new ConflictException({
            message:
              'El plan ' +
              subscription.plan.name +
              ' permite ' +
              subscription.plan.maxSimultaneousSpots +
              ' vehiculo(s) a la vez y ya estan adentro. Ingreso bloqueado.',
            code: 'PLAN_SPOTS_FULL_BLOCKED',
            spotsUsed,
            maxSpots: subscription.plan.maxSimultaneousSpots,
          });
        } else if (!dto.force) {
          const { rate } = await this.occasionalRate(tx);
          throw new ConflictException({
            message:
              'El plan ' +
              subscription.plan.name +
              ' ya tiene sus ' +
              subscription.plan.maxSimultaneousSpots +
              ' cupo(s) ocupado(s). Este ingreso se cobrara por horas.',
            code: 'PLAN_SPOTS_FULL_CONFIRM',
            spotsUsed,
            maxSpots: subscription.plan.maxSimultaneousSpots,
            hourlyRate: rate,
          });
        } else {
          warning = 'Ingreso fuera de cupo: se cobra por horas';
        }
      }

      const movement = await tx.movement.create({
        data: {
          vehicleId: vehicle.id,
          clientId: vehicle.clientId,
          subscriptionId: coveredByPlan ? subscription!.id : null,
          coveredByPlan,
          entryAt: now,
          status: 'INSIDE',
          activeVehicle: vehicle.id,
          note: dto.note,
        },
        include: { vehicle: true, client: true, subscription: { include: { plan: true } } },
      });

      return { movement, coveredByPlan, warning, spotsUsed: spotsUsed + 1 };
    });
  }

  async checkOut(dto: CheckOutDto) {
    const plate = normalizePlate(dto.plate);

    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { plate } });
      if (!vehicle) throw new NotFoundException('La placa ' + plate + ' no esta registrada');

      const movement = await tx.movement.findFirst({
        where: { vehicleId: vehicle.id, status: 'INSIDE' },
      });
      if (!movement) {
        throw new ConflictException({
          message: 'La placa ' + plate + ' no tiene una entrada abierta',
          code: 'NOT_INSIDE',
        });
      }

      const exitAt = new Date();
      const minutes = durationMinutes(movement.entryAt, exitAt);
      const { rate } = await this.occasionalRate(tx);
      const amount = movementCharge({
        coveredByPlan: movement.coveredByPlan,
        minutes,
        hourlyRate: rate,
      });

      return tx.movement.update({
        where: { id: movement.id },
        data: {
          exitAt,
          status: 'CLOSED',
          durationMin: minutes,
          amount,
          paymentMethod: movement.coveredByPlan ? 'PLAN' : (dto.paymentMethod ?? 'EFECTIVO'),
          activeVehicle: null,
          note: dto.note ?? movement.note,
        },
        include: { vehicle: true, client: true, subscription: { include: { plan: true } } },
      });
    });
  }

  movements(status?: 'INSIDE' | 'CLOSED', limit = 100) {
    return this.prisma.movement.findMany({
      where: status ? { status } : undefined,
      include: { vehicle: true, client: true, subscription: { include: { plan: true } } },
      orderBy: { entryAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }
}
