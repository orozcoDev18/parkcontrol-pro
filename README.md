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

Edita `apps/api/.env` con tu `DATABASE_URL` y `DIRECT_URL` de PostgreSQL y luego:

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

### Con Supabase en vez de PostgreSQL local

1. supabase.com → **New project**, elige región y guarda la contraseña de la base (no se vuelve a mostrar).
2. En el proyecto, botón **Connect** → **ORMs** → **Prisma**: copia las dos cadenas a `apps/api/.env`
   (`DATABASE_URL` el pooler de transacciones con `?pgbouncer=true`, `DIRECT_URL` el de sesión en el
   puerto 5432) y reemplaza `[YOUR-PASSWORD]` por la contraseña del paso 1.
3. `npm run db:push` y `npm run db:seed` crean las tablas y los datos de ejemplo.

Si prefieres no conectar Prisma a la base, pega
[`apps/api/prisma/schema.sql`](apps/api/prisma/schema.sql) en el **SQL Editor** de Supabase: trae el
esquema completo con sus restricciones y los planes de ejemplo. El usuario de acceso no sale de ahí
(la contraseña va cifrada): sigue siendo `npm run db:seed` con `ADMIN_PASSWORD` en el entorno.

Las tablas quedan en el esquema `public`, visibles en el **Table editor** de Supabase. La API se
conecta como `postgres`, así que las políticas RLS de Supabase no la afectan; si publicas la base a
clientes directos, actívalas antes.

## Acceso

La web no deja hacer nada sin sesión: todas las rutas de la API exigen la cookie de sesión salvo
`POST /auth/login`, porque el guard es global (`APP_GUARD`) y sólo se abre con `@Public()`, así que
una ruta nueva nace protegida.

- Pon `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `apps/api/.env` y corre `npm run db:seed`:
  esa es la única forma en que se crea el primer usuario. Sin `ADMIN_PASSWORD` la semilla no crea
  ninguno, a propósito: este repo es público y una clave por defecto sería una puerta abierta.
- La sesión es una cookie `httpOnly` con un JWT de 12 horas; al vencer, la web vuelve a pedir acceso.
- Para dar de alta porteros, ya con la sesión abierta:

```powershell
curl.exe -X POST http://localhost:3001/auth/users -H "Content-Type: application/json" -b cookies.txt --data-raw '{\"email\":\"portero@tuparqueadero.com\",\"name\":\"Portero\",\"password\":\"una-clave-larga\"}'
```

### Roles

| | `PORTERO` | `ADMIN` |
| --- | --- | --- |
| Portería: buscar, entrada, salida | sí | sí |
| Clientes y vehículos: ver, registrar, agregar vehículo | sí | sí |
| Movimientos y caja | sí | sí |
| Planes: ver | sí | sí |
| Planes: crear, modificar, activar | **no** | sí |
| Vender o cancelar una suscripción | **no** | sí |
| Transferir el propietario de un vehículo | **no** | sí |
| Ver y crear usuarios | **no** | sí |

Lo decide el guard por la ruta (`@Roles('ADMIN')`), no la pantalla: la web esconde lo que el portero
no puede hacer, pero aunque alguien llame la API a mano recibe un `403`. Quien no lleva decorador
vale para cualquier sesión, y un usuario nuevo nace `PORTERO` salvo que se le pida otro rol.

El usuario de la semilla es `ADMIN`; para crear un portero, `"role": "PORTERO"` (o nada) en el
cuerpo de `POST /auth/users`.

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
| POST | `/auth/login` (público) · `/auth/logout` | abrir y cerrar sesión |
| GET | `/auth/me` · `/auth/users` · POST `/auth/users` | sesión actual y usuarios del sistema |

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
