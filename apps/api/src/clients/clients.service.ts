import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { normalizeDocument } from '../common/normalize';
import { CreateClientDto, UpdateClientDto } from './clients.dto';

const withDetail = {
  vehicles: { orderBy: { plate: 'asc' } },
  subscriptions: { include: { plan: true }, orderBy: { endsAt: 'desc' } },
} as const;

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  list(search?: string) {
    const q = search?.trim();
    return this.prisma.client.findMany({
      where: q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { documentNumber: { contains: normalizeDocument(q) } },
              { vehicles: { some: { plate: { contains: normalizeDocument(q) } } } },
            ],
          }
        : undefined,
      include: withDetail,
      orderBy: { fullName: 'asc' },
      take: 100,
    });
  }

  async get(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id }, include: withDetail });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async getByDocument(documentNumber: string) {
    const client = await this.prisma.client.findUnique({
      where: { documentNumber: normalizeDocument(documentNumber) },
      include: withDetail,
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  // Si el documento ya existe no se duplica: el error trae el cliente existente
  // para que la UI cargue su perfil en lugar de crear otro.
  async create(dto: CreateClientDto) {
    const documentNumber = normalizeDocument(dto.documentNumber);
    const existing = await this.prisma.client.findUnique({
      where: { documentNumber },
      include: withDetail,
    });
    if (existing) {
      throw new ConflictException({
        message: existing.fullName + ' ya esta registrado con ese documento',
        code: 'CLIENT_ALREADY_EXISTS',
        client: existing,
      });
    }
    return this.prisma.client.create({
      data: { ...dto, documentNumber, documentType: dto.documentType ?? 'CC' },
      include: withDetail,
    });
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.get(id);
    return this.prisma.client.update({ where: { id }, data: dto, include: withDetail });
  }
}
