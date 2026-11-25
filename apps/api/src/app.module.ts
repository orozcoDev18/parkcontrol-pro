import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
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
import { ReportsService } from './cash-register/reports.service';

@Module({
  controllers: [
    AuthController,
    ClientsController,
    VehiclesController,
    PlansController,
    GateController,
    CashRegisterController,
  ],
  providers: [
    // Todo exige sesion salvo lo marcado con @Public(): no se olvida ninguna ruta nueva.
    { provide: APP_GUARD, useClass: AuthGuard },
    PrismaService,
    AuthService,
    ClientsService,
    VehiclesService,
    PlansService,
    GateService,
    CashRegisterService,
    ReportsService,
  ],
})
export class AppModule {}
