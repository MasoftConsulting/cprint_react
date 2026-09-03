-- ---------------------------------------------------------------------------
-- Migration 001 — passage au modèle machine / print_points / affectation
--
-- À coller dans Supabase Studio > SQL Editor sur une base DÉJÀ en service.
-- Conserve les lignes existantes de print_points.
--
-- ⚠️ Cette migration SUPPRIME deux colonnes absentes du nouveau modèle :
--    `hours`    (horaires d'ouverture affichés sur la page publique)
--    `position` (ordre d'affichage manuel)
--    Sauvegardez-les avant si vous souhaitez les conserver :
--        select id, name, hours, position from public.print_points;
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- 1. print_points : renommage des colonnes
-- ---------------------------------------------------------------------------
alter table public.print_points rename column id to id_site;
alter table public.print_points rename column name to site_name;
alter table public.print_points rename column location to site_address;

-- `site_address` devient facultatif (0..1 dans le diagramme).
alter table public.print_points alter column site_address drop not null;

-- ---------------------------------------------------------------------------
-- 2. print_points : nouvelles colonnes ville / pays
-- ---------------------------------------------------------------------------
alter table public.print_points add column if not exists city text;
alter table public.print_points add column if not exists country text;

-- Le pays est obligatoire : on renseigne les lignes existantes avant de
-- poser la contrainte, sinon l'ALTER échoue.
update public.print_points set country = 'Togo' where country is null;
alter table public.print_points alter column country set not null;

-- ---------------------------------------------------------------------------
-- 3. print_points : status (enum) -> actif (booléen)
-- ---------------------------------------------------------------------------
alter table public.print_points add column if not exists actif boolean;
update public.print_points set actif = (status = 'actif') where actif is null;
alter table public.print_points
  alter column actif set not null,
  alter column actif set default false;

alter table public.print_points drop column if exists status;
drop type if exists public.print_point_status;

-- ---------------------------------------------------------------------------
-- 4. print_points : colonnes absentes du nouveau modèle
-- ---------------------------------------------------------------------------
alter table public.print_points drop column if exists hours;
alter table public.print_points drop column if exists position;

-- ---------------------------------------------------------------------------
-- 5. Parc de machines
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
-- 6. Affectation machine <-> site
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
-- 7. Triggers updated_at
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

drop trigger if exists machine_touch_updated_at on public.machine;
create trigger machine_touch_updated_at
  before update on public.machine
  for each row execute function public.touch_updated_at();

drop trigger if exists affectation_touch_updated_at on public.affectation;
create trigger affectation_touch_updated_at
  before update on public.affectation
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Row Level Security des nouvelles tables
-- Le parc et les affectations restent privés : un numéro de série, une
-- adresse MAC ou une IP n'ont rien à faire dans une réponse publique.
-- ---------------------------------------------------------------------------
alter table public.machine enable row level security;
alter table public.affectation enable row level security;

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

-- ---------------------------------------------------------------------------
-- 9. Compteur public de machines par site
-- La page publique affiche « N machines » sans pouvoir lire la table
-- `machine` : la vue traverse la RLS (security_invoker = off) et n'expose
-- qu'un agrégat.
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

commit;
