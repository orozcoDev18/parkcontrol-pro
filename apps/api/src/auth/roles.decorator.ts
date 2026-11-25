import { SetMetadata } from '@nestjs/common';
import { Role } from './token';

export const ROLES = 'roles';

/** Limita la ruta a ciertos roles. Sin este decorador vale cualquier sesion. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
