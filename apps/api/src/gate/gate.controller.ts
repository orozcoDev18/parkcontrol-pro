import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GateService } from './gate.service';
import { CheckInDto, CheckOutDto } from './gate.dto';

@Controller()
export class GateController {
  constructor(private readonly gate: GateService) {}

  @Get('gate/lookup')
  lookup(@Query('q') q = '') {
    return this.gate.lookup(q);
  }

  @Post('gate/check-in')
  checkIn(@Body() dto: CheckInDto) {
    return this.gate.checkIn(dto);
  }

  @Post('gate/check-out')
  checkOut(@Body() dto: CheckOutDto) {
    return this.gate.checkOut(dto);
  }

  @Get('movements')
  movements(@Query('status') status?: 'INSIDE' | 'CLOSED', @Query('limit') limit?: string) {
    return this.gate.movements(status, limit ? Number(limit) : undefined);
  }
}
