-- Ranking con el número de control completo (decisión del profesor, 13-oct-2026)
create or replace function public.ed_leaderboard(p_day int, p_limit int default 10)
returns table (alias text, total bigint, solved bigint)
language sql stable security definer set search_path = public as $$
  with best as (
    select control, exercise_id, max(score) as s, bool_or(correct) as ok
    from ed_attempts where day = p_day group by control, exercise_id
  )
  select control as alias, sum(s) as total, count(*) filter (where ok) as solved
  from best group by control order by total desc limit least(greatest(p_limit, 1), 50);
$$;

-- Limpieza total antes de la clase: borra todos los intentos de prueba
truncate table public.ed_attempts restart identity;
