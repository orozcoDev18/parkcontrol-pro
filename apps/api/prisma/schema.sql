-- ParkControl Pro — esquema completo para PostgreSQL / Supabase.
-- Generado desde prisma/schema.prisma; para regenerarlo:
--   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- En Supabase: SQL Editor > New query > pegar > Run. Alternativa sin pegar nada: npm run db:push.
-- El usuario de acceso NO se crea aqui (la contrasena va cifrada): eso lo hace `npm run db:seed`.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "OverflowPolicy" AS ENUM ('CHARGE_HOURLY', 'BLOCK');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('INSIDE', 'CLOSED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PORTERO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PORTERO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'CC',
    "documentNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL DEFAULT 'CAR',
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleOwnershipHistory" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fromClientId" TEXT,
    "toClientId" TEXT NOT NULL,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleOwnershipHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" "VehicleType",
    "maxSimultaneousSpots" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "hourlyRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overflowPolicy" "OverflowPolicy" NOT NULL DEFAULT 'CHARGE_HOURLY',
    "isOccasional" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "entryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitAt" TIMESTAMP(3),
    "status" "MovementStatus" NOT NULL DEFAULT 'INSIDE',
    "durationMin" INTEGER,
    "coveredByPlan" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "note" TEXT,
    "activeVehicle" TEXT,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_documentNumber_key" ON "Client"("documentNumber");

-- CreateIndex
CREATE INDEX "Client_fullName_idx" ON "Client"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_clientId_idx" ON "Vehicle"("clientId");

-- CreateIndex
CREATE INDEX "VehicleOwnershipHistory_vehicleId_idx" ON "VehicleOwnershipHistory"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE INDEX "Subscription_clientId_status_endsAt_idx" ON "Subscription"("clientId", "status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Movement_activeVehicle_key" ON "Movement"("activeVehicle");

-- CreateIndex
CREATE INDEX "Movement_clientId_status_idx" ON "Movement"("clientId", "status");

-- CreateIndex
CREATE INDEX "Movement_entryAt_idx" ON "Movement"("entryAt");

-- CreateIndex
CREATE INDEX "Movement_exitAt_idx" ON "Movement"("exitAt");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwnershipHistory" ADD CONSTRAINT "VehicleOwnershipHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwnershipHistory" ADD CONSTRAINT "VehicleOwnershipHistory_fromClientId_fkey" FOREIGN KEY ("fromClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwnershipHistory" ADD CONSTRAINT "VehicleOwnershipHistory_toClientId_fkey" FOREIGN KEY ("toClientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Planes de ejemplo (opcional). "Ocasional por horas" es el que fija la tarifa
-- por hora que se cobra a quien no tiene plan vigente o se pasa de cupos.
-- ---------------------------------------------------------------------------
INSERT INTO "Plan" ("id", "name", "vehicleType", "maxSimultaneousSpots", "price", "durationDays", "hourlyRate", "isOccasional")
VALUES
  (gen_random_uuid(), 'Ocasional por horas', NULL, 1, 0, 1, 3000, true),
  (gen_random_uuid(), 'Mensual Carro', 'CAR', 1, 180000, 30, 3000, false),
  (gen_random_uuid(), 'Mensual Moto', 'MOTORCYCLE', 1, 90000, 30, 1500, false),
  (gen_random_uuid(), 'Multi-Vehiculo 2 cupos', NULL, 2, 320000, 30, 3000, false)
ON CONFLICT ("name") DO NOTHING;
