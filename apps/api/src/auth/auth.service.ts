import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { signSession } from './token';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // El mismo mensaje para usuario inexistente y clave mala: no se regala informacion.
    const ok = user?.active && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) throw new UnauthorizedException('Correo o contrasena incorrectos');

    const token = signSession({ sub: user!.id, email: user!.email, name: user!.name });
    return { user: { id: user!.id, email: user!.email, name: user!.name }, token };
  }

  async createUser(dto: { email: string; name: string; password: string }) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Ya hay un usuario con ese correo');

    const user = await this.prisma.user.create({
      data: { email, name: dto.name, passwordHash: await bcrypt.hash(dto.password, 10) },
    });
    return { id: user.id, email: user.email, name: user.name };
  }

  listUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }
}
