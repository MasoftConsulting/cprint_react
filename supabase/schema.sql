-- ---------------------------------------------------------------------------
-- Campus Print — schéma Supabase (installation neuve)
-- À coller dans Supabase Studio > SQL Editor, puis exécuter une fois.
--
-- Pour une base déjà en service, n'utilisez PAS ce fichier :
-- exécutez supabase/migrations/001_machines_et_sites.sql, qui convertit
-- l'ancienne structure sans perdre les données.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Sites d'impression
-- ---------------------------------------------------------------------------
create table if not exists public.print_points (
  id_site       bigint generated always as identity primary key,
  site_name     text not null unique,
  site_address  text,
  city          text,
  country       text not null,
  latitude      numeric(10, 7),
  longitude     numeric(10, 7),
  actif         boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Machines (photocopieurs)
-- ---------------------------------------------------------------------------
create table if not exists public.machine (
  id_machine        bigint generated always as identity primary key,
  serial_number     text not null unique,
  machine_name      text,
  mac_address       text,
  ip_address        text,
  date_acquisition  date,
  date_mise_service date,
  actif             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Affectation d'une machine à un site
-- Table de jonction : le diagramme place 1..* de chaque côté, donc une même
-- machine peut être rattachée à plusieurs sites. La contrainte d'unicité
-- empêche seulement d'enregistrer deux fois le même couple.
-- ---------------------------------------------------------------------------
create table if not exists public.affectation (
  id_affectation bigint generated always as identity primary key,
  id_machine     bigint not null references public.machine (id_machine) on delete cascade,
  id_site        bigint not null references public.print_points (id_site) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id_machine, id_site)
);

create index if not exists affectation_id_site_idx on public.affectation (id_site);
create index if not exists affectation_id_machine_idx on public.affectation (id_machine);

-- ---------------------------------------------------------------------------
-- Paramètres du site (tarifs, coordonnées de contact, stats du hero)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id          bigint generated always as identity primary key,
  key         text not null unique,
  value       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- `updated_at` tenu à jour automatiquement
-- ---------------------------------------------------------------------------
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

drop trigger if exists machine_touch_updated_at on public.machine;
create trigger machine_touch_updated_at
  before update on public.machine
  for each row execute function public.touch_updated_at();

drop trigger if exists affectation_touch_updated_at on public.affectation;
create trigger affectation_touch_updated_at
  before update on public.affectation
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Les sites sont publics (site vitrine). Le parc de machines et les
-- affectations ne concernent que l'administration : lecture authentifiée
-- uniquement — un numéro de série, une adresse MAC ou une IP n'ont rien à
-- faire dans une réponse publique.
-- ---------------------------------------------------------------------------
alter table public.print_points enable row level security;
alter table public.machine enable row level security;
alter table public.affectation enable row level security;
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

drop policy if exists "machine accès authentifié" on public.machine;
create policy "machine accès authentifié"
  on public.machine for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "affectation accès authentifié" on public.affectation;
create policy "affectation accès authentifié"
  on public.affectation for all
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
-- Nombre de machines actives par site
-- La page publique doit pouvoir afficher « N machines » sans lire la table
-- `machine`, qui reste privée. La vue est en security_invoker = off pour
-- qu'elle traverse la RLS de `machine`, et n'expose qu'un compteur agrégé.
-- ---------------------------------------------------------------------------
create or replace view public.site_machine_counts
with (security_invoker = off) as
  select p.id_site,
         count(m.id_machine) filter (where m.actif) as machines_actives
    from public.print_points p
    left join public.affectation a on a.id_site = p.id_site
    left join public.machine m on m.id_machine = a.id_machine
   group by p.id_site;

grant select on public.site_machine_counts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Valeurs par défaut des paramètres (reprises des View Composers Laravel)
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
