import { Controller, Get, Query } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';

@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cash: CashRegisterService) {}

  @Get('summary')
  summary(@Query('date') date?: string) {
    return this.cash.summary(date);
  }
}
