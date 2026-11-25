import { Controller, Get, Query } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { ReportsService } from './reports.service';

@Controller()
export class CashRegisterController {
  constructor(
    private readonly cash: CashRegisterService,
    private readonly reports: ReportsService,
  ) {}

  @Get('cash-register/summary')
  summary(@Query('date') date?: string) {
    return this.cash.summary(date);
  }

  @Get('reports/overview')
  overview(@Query('days') days?: string) {
    return this.reports.overview(days ? Number(days) : undefined);
  }
}
