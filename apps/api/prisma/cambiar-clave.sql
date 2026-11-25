-- Cambiar la contraseña de un usuario desde el SQL Editor de Supabase.
--
-- Reemplaza SOLO lo que está entre comillas simples y ejecuta. La clave no se
-- guarda tal cual: crypt() la cifra con bcrypt, igual que lo hace la API.
--
-- Mínimo 8 caracteres: con menos, el login la rechaza antes de mirar la base.
--
-- Comprobado el 2026-11-24: pgcrypto genera un hash $2a$ y la API lo acepta.

create extension if not exists pgcrypto;

-- Administrador
update "User"
set "passwordHash" = crypt('PON-AQUI-LA-CLAVE', gen_salt('bf', 10)),
    active = true
where email = 'admin@parkcontrol.com';

-- Portería
update "User"
set "passwordHash" = crypt('PON-AQUI-LA-CLAVE', gen_salt('bf', 10)),
    active = true
where email = 'porteria@parkcontrol.com';

-- Para ver quién hay (nunca devuelve la clave, solo su cifrado):
-- select email, role, active from "User" order by role;


-- Dos avisos:
--
-- 1. El SQL Editor de Supabase guarda el historial de consultas, así que la
--    clave en claro queda ahí. Bórrala de la consulta después de ejecutarla.
--
-- 2. Si luego corres `npm run db:seed`, la clave vuelve a ser la de
--    ADMIN_PASSWORD / PORTERO_PASSWORD en apps/api/.env. Cambia también esas
--    líneas, o no corras la semilla.
