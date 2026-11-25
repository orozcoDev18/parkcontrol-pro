import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto, CreateSubscriptionDto, UpdatePlanDto } from './plans.dto';

@Controller()
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get('plans')
  listPlans(@Query('active') active?: string) {
    return this.plans.listPlans(active === 'true');
  }

  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.plans.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plans.updatePlan(id, dto);
  }

  @Get('subscriptions')
  listSubscriptions(@Query('clientId') clientId?: string) {
    return this.plans.listSubscriptions(clientId);
  }

  @Post('subscriptions')
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.plans.createSubscription(dto);
  }

  @Post('subscriptions/:id/cancel')
  cancelSubscription(@Param('id') id: string) {
    return this.plans.cancelSubscription(id);
  }
}
