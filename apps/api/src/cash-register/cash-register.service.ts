import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(date?: string) {
    const day = date ? new Date(date + 'T00:00:00') : new Date();
    if (Number.isNaN(day.getTime())) throw new BadRequestException('Fecha invalida');
    const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const to = new Date(from.getTime() + 86400000);

    const [closed, subscriptions, insideNow] = await Promise.all([
      this.prisma.movement.findMany({
        where: { status: 'CLOSED', exitAt: { gte: from, lt: to } },
        select: { amount: true, paymentMethod: true, coveredByPlan: true },
      }),
      this.prisma.subscription.findMany({
        where: { createdAt: { gte: from, lt: to } },
        include: { plan: true },
      }),
      this.prisma.movement.count({ where: { status: 'INSIDE' } }),
    ]);

    const byPaymentMethod: Record<string, { count: number; total: number }> = {};
    let parkingTotal = 0;
    for (const m of closed) {
      const key = m.paymentMethod ?? 'SIN_DEFINIR';
      const amount = Number(m.amount);
      parkingTotal += amount;
      byPaymentMethod[key] ??= { count: 0, total: 0 };
      byPaymentMethod[key].count += 1;
      byPaymentMethod[key].total += amount;
    }

    const plansTotal = subscriptions.reduce((sum, s) => sum + Number(s.plan.price), 0);

    return {
      date: from.toISOString().slice(0, 10),
      exits: closed.length,
      coveredByPlan: closed.filter((m) => m.coveredByPlan).length,
      insideNow,
      parkingTotal: Math.round(parkingTotal * 100) / 100,
      plansSold: subscriptions.length,
      plansTotal: Math.round(plansTotal * 100) / 100,
      total: Math.round((parkingTotal + plansTotal) * 100) / 100,
      byPaymentMethod,
    };
  }
}
