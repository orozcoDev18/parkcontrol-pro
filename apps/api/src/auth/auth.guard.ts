import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC } from './public.decorator';
import { ROLES } from './roles.decorator';
import { COOKIE_NAME, Role, readSession } from './token';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const session = readSession(req.cookies?.[COOKIE_NAME]);
    if (!session) throw new UnauthorizedException('Sesion no iniciada o vencida');
    req.user = session;

    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(session.role)) {
      throw new ForbiddenException('Esta accion es solo para ' + roles.join(' o '));
    }
    return true;
  }
}
