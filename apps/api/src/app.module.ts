import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';
import { PlansController } from './plans/plans.controller';
import { PlansService } from './plans/plans.service';
import { GateController } from './gate/gate.controller';
import { GateService } from './gate/gate.service';
import { CashRegisterController } from './cash-register/cash-register.controller';
import { CashRegisterService } from './cash-register/cash-register.service';

@Module({
  controllers: [
    ClientsController,
    VehiclesController,
    PlansController,
    GateController,
    CashRegisterController,
  ],
  providers: [
    PrismaService,
    ClientsService,
    VehiclesService,
    PlansService,
    GateService,
    CashRegisterService,
  ],
})
export class AppModule {}
