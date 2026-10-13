-- Limpia los intentos de QA del 13-oct-2026 (números de control C9999xxxx)
-- que se escribieron en la base de producción al probar en localhost con .env.local.
-- Correr en Supabase -> SQL Editor DESPUÉS de terminar todas las pruebas y ANTES de la clase (13:00),
-- con las pestañas de QA cerradas (ed:queue reintenta envíos pendientes).

-- 1) Revisión: ver qué controles hay y confirmar que no queden otros de prueba
select control, count(*) as intentos, max(created_at) as ultimo
from public.ed_attempts
group by control
order by control;

-- 2) Limpieza de QA
delete from public.ed_attempts where control like 'C9999%';
