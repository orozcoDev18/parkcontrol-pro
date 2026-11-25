// Autocomprobacion de la sesion: `npm run check`.
import assert from 'node:assert/strict';
import { readSession, signSession } from './token';

// El secreto se lee al firmar, no al importar, por eso basta con ponerlo aqui.
process.env.JWT_SECRET = 'secreto-de-prueba-suficientemente-largo';

const payload = {
  sub: 'u1',
  email: 'admin@parkcontrol.local',
  name: 'Admin',
  role: 'ADMIN' as const,
};
const token = signSession(payload);
const session = readSession(token);
assert.equal(session?.sub, 'u1');
assert.equal(session?.email, payload.email);
assert.equal(session?.role, 'ADMIN', 'el rol viaja en la sesion');

assert.equal(readSession(undefined), null, 'sin cookie no hay sesion');
assert.equal(readSession('no-es-un-token'), null, 'basura no pasa');
assert.equal(readSession(token.slice(0, -2) + 'xx'), null, 'token manipulado no pasa');

// Firmado con otro secreto: no vale.
process.env.JWT_SECRET = 'otro-secreto-distinto-y-largo';
assert.equal(readSession(token), null, 'token de otro secreto no pasa');

process.env.JWT_SECRET = 'corto';
assert.throws(() => signSession(payload), /JWT_SECRET/, 'un secreto debil no deja firmar');

console.log('sesion OK');
