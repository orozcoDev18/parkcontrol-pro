// Autocomprobacion del acceso: levanta la API con un Prisma falso y verifica que
// sin sesion no se pueda hacer nada. `npm run check`.
import assert from 'node:assert/strict';
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
  const user = {
    id: 'u1',
    email: 'portero@parkcontrol.local',
    name: 'Portero',
    passwordHash: await bcrypt.hash(PASSWORD, 10),
    active: true,
  };

  const prismaFake = {
    $connect: async () => {},
    user: { findUnique: async ({ where }: any) => (where.email === user.email ? user : null) },
    client: { findMany: async () => [] },
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

  await app.close();
  console.log('acceso OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
