import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { normalizePlate } from '../common/normalize';
import { CreateVehicleDto, TransferVehicleDto } from './vehicles.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  list(clientId?: string) {
    return this.prisma.vehicle.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: true },
      orderBy: { plate: 'asc' },
      take: 200,
    });
  }

  async get(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { client: true, history: { orderBy: { changedAt: 'desc' } } },
    });
    if (!vehicle) throw new NotFoundException('Vehiculo no encontrado');
    return vehicle;
  }

  // Un cliente puede tener varios vehiculos, pero una placa no puede tener dos duenos.
  async create(dto: CreateVehicleDto) {
    const plate = normalizePlate(dto.plate);
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const existing = await this.prisma.vehicle.findUnique({
      where: { plate },
      include: { client: true },
    });
    if (existing) {
      const sameOwner = existing.clientId === dto.clientId;
      throw new ConflictException({
        message: sameOwner
          ? 'La placa ' + plate + ' ya esta registrada a este cliente'
          : 'La placa ' +
            plate +
            ' ya pertenece a ' +
            existing.client.fullName +
            '. Use la transferencia de propietario.',
        code: sameOwner ? 'VEHICLE_ALREADY_OWNED' : 'PLATE_TAKEN',
        vehicle: existing,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: { ...dto, plate },
        include: { client: true },
      });
      await tx.vehicleOwnershipHistory.create({
        data: { vehicleId: vehicle.id, toClientId: vehicle.clientId, reason: 'Registro inicial' },
      });
      return vehicle;
    });
  }

  // Cambia de dueno conservando el historial de entradas y salidas del vehiculo.
  async transfer(id: string, dto: TransferVehicleDto) {
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id } });
      if (!vehicle) throw new NotFoundException('Vehiculo no encontrado');
      if (vehicle.clientId === dto.toClientId) {
        throw new ConflictException('El vehiculo ya pertenece a ese cliente');
      }

      const target = await tx.client.findUnique({ where: { id: dto.toClientId } });
      if (!target) throw new NotFoundException('Cliente destino no encontrado');

      const inside = await tx.movement.findFirst({ where: { vehicleId: id, status: 'INSIDE' } });
      if (inside) {
        throw new ConflictException(
          'El vehiculo esta adentro: registre la salida antes de transferirlo',
        );
      }

      const updated = await tx.vehicle.update({
        where: { id },
        data: { clientId: dto.toClientId },
        include: { client: true },
      });
      await tx.vehicleOwnershipHistory.create({
        data: {
          vehicleId: id,
          fromClientId: vehicle.clientId,
          toClientId: dto.toClientId,
          reason: dto.reason,
        },
      });
      return updated;
    });
  }
}
