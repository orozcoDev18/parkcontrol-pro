import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePlanDto, CreateSubscriptionDto, UpdatePlanDto } from './plans.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans(onlyActive = false) {
    return this.prisma.plan.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  createPlan(dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: dto });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  listSubscriptions(clientId?: string) {
    return this.prisma.subscription.findMany({
      where: clientId ? { clientId } : undefined,
      include: { plan: true, client: true },
      orderBy: { endsAt: 'desc' },
      take: 200,
    });
  }

  async createSubscription(dto: CreateSubscriptionDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.active) throw new BadRequestException('El plan esta inactivo');

    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Fecha de inicio invalida');
    const endsAt = new Date(startsAt.getTime() + plan.durationDays * 86400000);

    return this.prisma.subscription.create({
      data: { clientId: dto.clientId, planId: dto.planId, startsAt, endsAt },
      include: { plan: true, client: true },
    });
  }

  async cancelSubscription(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Suscripcion no encontrada');
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { plan: true, client: true },
    });
  }
}
