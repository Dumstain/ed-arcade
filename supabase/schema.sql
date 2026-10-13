-- ED Arcade — tablas con prefijo ed_ (pueden vivir en un proyecto de Supabase que YA tengas).
-- Pégalo completo en Supabase → SQL Editor → Run. Es idempotente (se puede correr varias veces).

create table if not exists public.ed_attempts (
  id bigint generated always as identity primary key,
  control text not null check (control ~ '^[A-Z]?[0-9]{8}$'),
  day smallint not null check (day between 1 and 5),
  exercise_id text not null,
  tier smallint not null check (tier between 1 and 4),
  correct boolean not null,
  score integer not null check (score between 0 and 2000),
  stars smallint not null check (stars between 0 and 3),
  mistakes smallint not null default 0,
  used_hint boolean not null default false,
  time_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ed_attempts_control_idx on public.ed_attempts (control);
create index if not exists ed_attempts_day_idx on public.ed_attempts (day);

create table if not exists public.ed_config (
  key text primary key,
  value jsonb not null
);
-- Día máximo desbloqueado (además del calendario). Cámbialo aquí para abrir días antes.
insert into public.ed_config (key, value) values ('unlocked_day', '2') on conflict (key) do nothing;

alter table public.ed_attempts enable row level security;
alter table public.ed_config enable row level security;

-- Los alumnos (anon) solo pueden INSERTAR intentos; no pueden leer la tabla cruda.
drop policy if exists "ed anon insert" on public.ed_attempts;
create policy "ed anon insert" on public.ed_attempts for insert to anon with check (true);
drop policy if exists "ed anon read config" on public.ed_config;
create policy "ed anon read config" on public.ed_config for select to anon using (true);

-- Progreso propio (mejor resultado por ejercicio) para continuar en otra computadora.
create or replace function public.ed_progress(p_control text)
returns table (exercise_id text, day smallint, tier smallint, best_score integer, best_stars smallint, solved boolean)
language sql stable security definer set search_path = public as $$
  select exercise_id, max(day)::smallint, max(tier)::smallint, max(score), max(stars)::smallint, bool_or(correct)
  from ed_attempts where control = upper(p_control)
  group by exercise_id;
$$;

-- Ranking del día: suma de mejores puntajes por alumno, con número de control completo.
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

revoke all on function public.ed_progress(text) from public;
revoke all on function public.ed_leaderboard(int, int) from public;
grant execute on function public.ed_progress(text) to anon, authenticated;
grant execute on function public.ed_leaderboard(int, int) to anon, authenticated;

-- Para el profesor (Table Editor / SQL del dashboard): resumen por alumno y día.
-- security_invoker => los alumnos (anon) NO pueden leerla por la API.
create or replace view public.ed_resumen with (security_invoker = true) as
  with best as (
    select control, day, exercise_id, max(score) s, bool_or(correct) ok, max(stars) st
    from ed_attempts group by control, day, exercise_id
  )
  select control, day, count(*) as ejercicios, count(*) filter (where ok) as resueltos,
         sum(s) as puntos, sum(st) as estrellas
  from best group by control, day order by day, puntos desc;
revoke all on public.ed_resumen from anon, authenticated;
