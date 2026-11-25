import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Roles } from '../auth/roles.decorator';
import { CreateVehicleDto, TransferVehicleDto } from './vehicles.dto';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  list(@Query('clientId') clientId?: string) {
    return this.vehicles.list(clientId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.vehicles.get(id);
  }

  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehicles.create(dto);
  }

  // Cambiar de dueno un vehiculo no es cosa de porteria.
  @Roles('ADMIN')
  @Post(':id/transfer')
  transfer(@Param('id') id: string, @Body() dto: TransferVehicleDto) {
    return this.vehicles.transfer(id, dto);
  }
}
