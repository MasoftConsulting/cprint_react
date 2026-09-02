-- ---------------------------------------------------------------------------
-- Campus Print — schéma Supabase
-- À coller dans Supabase Studio > SQL Editor, puis exécuter une fois.
-- Reproduit les migrations Laravel (print_points, settings).
-- ---------------------------------------------------------------------------

-- Statut d'un point d'impression (équivalent de l'enum Laravel).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'print_point_status') then
    create type public.print_point_status as enum ('actif', 'bientot');
  end if;
end$$;

create table if not exists public.print_points (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  location    text not null,
  hours       text not null,
  status      public.print_point_status not null default 'bientot',
  latitude    numeric(10, 7),
  longitude   numeric(10, 7),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.settings (
  id          bigint generated always as identity primary key,
  key         text not null unique,
  value       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- `updated_at` tenu à jour automatiquement, comme les timestamps Eloquent.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists print_points_touch_updated_at on public.print_points;
create trigger print_points_touch_updated_at
  before update on public.print_points
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Lecture publique (site vitrine), écriture réservée aux comptes authentifiés
-- (l'espace admin). Toute écriture passe par une Server Action qui vérifie
-- elle-même la session : RLS est la seconde ligne de défense.
-- ---------------------------------------------------------------------------
alter table public.print_points enable row level security;
alter table public.settings enable row level security;

drop policy if exists "print_points lecture publique" on public.print_points;
create policy "print_points lecture publique"
  on public.print_points for select
  to anon, authenticated
  using (true);

drop policy if exists "print_points écriture authentifiée" on public.print_points;
create policy "print_points écriture authentifiée"
  on public.print_points for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "settings lecture publique" on public.settings;
create policy "settings lecture publique"
  on public.settings for select
  to anon, authenticated
  using (true);

drop policy if exists "settings écriture authentifiée" on public.settings;
create policy "settings écriture authentifiée"
  on public.settings for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Valeurs par défaut (reprises des View Composers Laravel)
-- ---------------------------------------------------------------------------
insert into public.settings (key, value) values
  ('price_nb', '30'),
  ('price_couleur', '100'),
  ('contact_phone', '+228 91 35 00 00'),
  ('contact_email', 'support@masoft-consulting.com'),
  ('contact_address', 'Lomé, Togo'),
  ('recharge_amounts', '500,1000,2000,5000'),
  ('avg_print_time', '3 min'),
  ('payment_methods_count', '3')
on conflict (key) do nothing;
