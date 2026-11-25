// Autocomprobacion del acceso: levanta la API con un Prisma falso y verifica que
// sin sesion no se pueda hacer nada. `npm run check`.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma.service';

process.env.JWT_SECRET = 'secreto-de-prueba-suficientemente-largo';

const PASSWORD = 'clave-de-prueba';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = {
    id: 'u1',
    email: 'portero@parkcontrol.local',
    name: 'Portero',
    role: 'PORTERO',
    passwordHash,
    active: true,
  };
  const admin = { ...user, id: 'u2', email: 'admin@parkcontrol.local', name: 'Admin', role: 'ADMIN' };
  const usuarios = [user, admin];

  const prismaFake = {
    $connect: async () => {},
    user: { findUnique: async ({ where }: any) => usuarios.find((u) => u.email === where.email) ?? null },
    client: { findMany: async () => [] },
    plan: {
      findMany: async () => [],
      create: async ({ data }: any) => ({ id: 'p1', ...data }),
    },
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaFake)
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  const http = app.getHttpServer();

  await request(http).get('/clients').expect(401);
  await request(http).get('/gate/lookup?q=ABC123').expect(401);
  await request(http).post('/gate/check-in').send({ plate: 'ABC123' }).expect(401);
  await request(http).get('/auth/me').expect(401);

  await request(http)
    .post('/auth/login')
    .send({ email: user.email, password: 'otra-cosa-distinta' })
    .expect(401);

  const ok = await request(http)
    .post('/auth/login')
    .send({ email: user.email, password: PASSWORD })
    .expect(200);

  const cookie = ok.headers['set-cookie'][0];
  assert.match(cookie, /^pc_session=/);
  assert.match(cookie, /HttpOnly/i, 'la cookie de sesion no puede leerse desde JavaScript');

  await request(http).get('/clients').set('Cookie', cookie).expect(200);
  const me = await request(http).get('/auth/me').set('Cookie', cookie).expect(200);
  assert.equal(me.body.email, user.email);
  assert.equal(me.body.passwordHash, undefined, 'la sesion no devuelve el hash');

  // Una cookie manipulada no sirve.
  await request(http)
    .get('/clients')
    .set('Cookie', cookie.replace(/^pc_session=.{6}/, 'pc_session=aaaaaa'))
    .expect(401);

  // El portero opera la porteria pero no administra.
  assert.equal(me.body.role, 'PORTERO');
  await request(http).get('/plans').set('Cookie', cookie).expect(200);
  const nuevoPlan = {
    name: 'Plan de prueba',
    maxSimultaneousSpots: 1,
    price: 1000,
    durationDays: 30,
    hourlyRate: 500,
  };
  await request(http).post('/plans').set('Cookie', cookie).send(nuevoPlan).expect(403);
  await request(http)
    .post('/subscriptions')
    .set('Cookie', cookie)
    .send({ clientId: crypto.randomUUID(), planId: crypto.randomUUID() })
    .expect(403);
  await request(http)
    .post('/vehicles/' + crypto.randomUUID() + '/transfer')
    .set('Cookie', cookie)
    .send({ toClientId: crypto.randomUUID() })
    .expect(403);
  await request(http).get('/auth/users').set('Cookie', cookie).expect(403);

  // La administracion si puede.
  const loginAdmin = await request(http)
    .post('/auth/login')
    .send({ email: admin.email, password: PASSWORD })
    .expect(200);
  assert.equal(loginAdmin.body.role, 'ADMIN');
  const cookieAdmin = loginAdmin.headers['set-cookie'][0];
  await request(http).post('/plans').set('Cookie', cookieAdmin).send(nuevoPlan).expect(201);

  await app.close();
  console.log('acceso OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
