import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC } from './public.decorator';
import { COOKIE_NAME, readSession } from './token';

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
    return true;
  }
}
