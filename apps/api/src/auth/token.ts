import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'pc_session';
export const SESSION_HOURS = 12;

export type SessionPayload = { sub: string; email: string; name: string };

function secret(): string {
  const value = process.env.JWT_SECRET;
  // Sin secreto no hay sesion que valga: mejor no arrancar que firmar con algo adivinable.
  if (!value || value.length < 16) {
    throw new Error('Falta JWT_SECRET (minimo 16 caracteres) en el entorno de la API');
  }
  return value;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: SESSION_HOURS * 3600 });
}

export function readSession(token?: string): SessionPayload | null {
  if (!token) return null;
  try {
    return jwt.verify(token, secret()) as SessionPayload;
  } catch {
    return null;
  }
}
