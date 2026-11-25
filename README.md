# ParkControl Pro

Control de entrada y salida vehicular: clientes (conductores) únicos, varios vehículos por cliente,
planes/membresías con cupos simultáneos y caja diaria.

- `apps/api` — NestJS 11 + Prisma 6 + PostgreSQL
- `apps/web` — Next.js 15 (App Router), estética **Verde Oficina Profesional**

## Reglas de negocio que el sistema garantiza

| Regla | Dónde se aplica |
| --- | --- |
| Un cliente no se puede registrar dos veces | `documentNumber` normalizado (sin puntos ni espacios) + `UNIQUE` en BD; si existe, la API devuelve `409 CLIENT_ALREADY_EXISTS` **con el cliente existente** y la UI abre su perfil |
| Un cliente puede tener varios vehículos | relación `Client 1:N Vehicle` |
| Una placa, un solo dueño | `plate` normalizada (mayúsculas, sin espacios/guiones) + `UNIQUE`; si ya existe → `409 PLATE_TAKEN` |
| Transferencia de propietario con historial | `POST /vehicles/:id/transfer` en `$transaction`, escribe `vehicle_ownership_history` y conserva los movimientos |
| No hay doble entrada | columna `activeVehicle` con `UNIQUE` (= `vehicleId` mientras está adentro, `null` al salir) + chequeo dentro de la transacción |
| Cupos simultáneos del plan | al entrar se cuentan los movimientos `INSIDE` del cliente; si se agotan: `BLOCK` → `409 PLAN_SPOTS_FULL_BLOCKED`, `CHARGE_HOURLY` → `409 PLAN_SPOTS_FULL_CONFIRM` y la portería confirma el ingreso con cobro por horas (`force: true`) |
| Vigencia de la suscripción | sólo cuenta `status = ACTIVE` y `startsAt <= hoy <= endsAt`, y que el tipo de vehículo del plan coincida |
| Cobro | 10 min de gracia, luego hora empezada se cobra completa, con la tarifa del plan marcado `isOccasional` |

## Puesta en marcha

```powershell
npm install
```

```powershell
cp .env.example apps/api/.env
```

```powershell
cp .env.example apps/web/.env.local
```

Edita `apps/api/.env` con tu `DATABASE_URL` de PostgreSQL y luego:

```powershell
npm run db:push
```

```powershell
npm run db:seed
```

Levanta cada app en una terminal:

```powershell
npm run api
```

```powershell
npm run web
```

API en http://localhost:3001 y web en http://localhost:3000.
Sin base de datos la web igual abre: muestra un aviso de **modo demo** con datos de prueba
(las lecturas usan el fallback, los registros no se guardan).

Autocomprobación del cálculo de cobro:

```powershell
npm run check
```

## Endpoints

| Método | Ruta | Para qué |
| --- | --- | --- |
| GET | `/clients?search=` | buscar por nombre, documento o placa |
| GET | `/clients/:id` · `/clients/by-document/:doc` | perfil con vehículos y planes |
| POST | `/clients` | registrar cliente (bloquea duplicados) |
| PATCH | `/clients/:id` | editar datos |
| GET | `/vehicles?clientId=` · `/vehicles/:id` | vehículos e historial de propietarios |
| POST | `/vehicles` | agregar vehículo a un cliente |
| POST | `/vehicles/:id/transfer` | transferir propietario |
| GET/POST | `/plans` · PATCH `/plans/:id` | planes y membresías |
| GET/POST | `/subscriptions` · POST `/subscriptions/:id/cancel` | suscripciones |
| GET | `/gate/lookup?q=` | búsqueda de portería con cupos y estado |
| POST | `/gate/check-in` | entrada (`{ plate, force? }`) |
| POST | `/gate/check-out` | salida (`{ plate, paymentMethod }`) |
| GET | `/movements?status=INSIDE\|CLOSED` | movimientos |
| GET | `/cash-register/summary?date=YYYY-MM-DD` | caja del día |

## Vistas

`/` Portería · `/clientes` Clientes y vehículos · `/planes` Planes · `/movimientos` Movimientos ·
`/caja` Caja.

## Publicar en GitHub (`orozcoDev18`)

Con GitHub CLI:

```powershell
gh repo create orozcoDev18/parkcontrol-pro --private --source . --remote origin --push
```

A mano:

```powershell
git remote add origin https://github.com/orozcoDev18/parkcontrol-pro.git
```

```powershell
git push -u origin main
```
