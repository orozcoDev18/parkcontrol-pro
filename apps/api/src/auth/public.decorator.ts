import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Marca una ruta que se puede usar sin sesion (solo el login). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
