import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@parkcontrol.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  // Sin contrasena en el entorno no se crea nada: una clave por defecto en un repo
  // publico es una puerta abierta.
  if (!password) {
    const existing = await prisma.user.count();
    console.log(
      existing
        ? 'Usuarios: ya hay ' + existing + ', no se toca ninguno.'
        : 'Usuarios: define ADMIN_EMAIL y ADMIN_PASSWORD en apps/api/.env y vuelve a correr la semilla.',
    );
    return;
  }
  if (password.length < 8) throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, active: true },
    create: { email, name: process.env.ADMIN_NAME ?? 'Administrador', passwordHash },
  });
  console.log('Usuario de acceso listo: ' + email);
}

async function main() {
  await seedAdmin();
  const plans = [
    {
      name: 'Ocasional por horas',
      vehicleType: null,
      maxSimultaneousSpots: 1,
      price: 0,
      durationDays: 1,
      hourlyRate: 3000,
      isOccasional: true,
    },
    {
      name: 'Mensual Carro',
      vehicleType: 'CAR' as const,
      maxSimultaneousSpots: 1,
      price: 180000,
      durationDays: 30,
      hourlyRate: 3000,
    },
    {
      name: 'Mensual Moto',
      vehicleType: 'MOTORCYCLE' as const,
      maxSimultaneousSpots: 1,
      price: 90000,
      durationDays: 30,
      hourlyRate: 1500,
    },
    {
      name: 'Multi-Vehiculo 2 cupos',
      vehicleType: null,
      maxSimultaneousSpots: 2,
      price: 320000,
      durationDays: 30,
      hourlyRate: 3000,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { name: plan.name }, update: plan, create: plan });
  }

  const client = await prisma.client.upsert({
    where: { documentNumber: '1012345678' },
    update: {},
    create: {
      documentNumber: '1012345678',
      fullName: 'Jose Orozco',
      phone: '3001234567',
    },
  });

  for (const vehicle of [
    { plate: 'ABC123', type: 'CAR' as const, brand: 'Mazda', color: 'Gris' },
    { plate: 'XYZ45D', type: 'MOTORCYCLE' as const, brand: 'Yamaha', color: 'Azul' },
  ]) {
    await prisma.vehicle.upsert({
      where: { plate: vehicle.plate },
      update: {},
      create: { ...vehicle, clientId: client.id },
    });
  }

  const multi = await prisma.plan.findUniqueOrThrow({ where: { name: 'Multi-Vehiculo 2 cupos' } });
  const hasActive = await prisma.subscription.findFirst({
    where: { clientId: client.id, status: 'ACTIVE', endsAt: { gte: new Date() } },
  });
  if (!hasActive) {
    await prisma.subscription.create({
      data: {
        clientId: client.id,
        planId: multi.id,
        endsAt: new Date(Date.now() + multi.durationDays * 86400000),
      },
    });
  }

  console.log('Semilla lista: planes, 1 cliente, 2 vehiculos y 1 suscripcion activa.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
