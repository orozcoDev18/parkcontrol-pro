import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Roles } from '../auth/roles.decorator';
import { CreatePlanDto, CreateSubscriptionDto, UpdatePlanDto } from './plans.dto';

// La porteria consulta planes y suscripciones; venderlos y cambiarlos es de administracion.
@Controller()
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get('plans')
  listPlans(@Query('active') active?: string) {
    return this.plans.listPlans(active === 'true');
  }

  @Roles('ADMIN')
  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.plans.createPlan(dto);
  }

  @Roles('ADMIN')
  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.updatePlan(id, dto);
  }

  @Get('subscriptions')
  listSubscriptions(@Query('clientId') clientId?: string) {
    return this.plans.listSubscriptions(clientId);
  }

  @Roles('ADMIN')
  @Post('subscriptions')
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.plans.createSubscription(dto);
  }

  @Roles('ADMIN')
  @Post('subscriptions/:id/cancel')
  cancelSubscription(@Param('id') id: string) {
    return this.plans.cancelSubscription(id);
  }
}
