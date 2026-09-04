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
  -- Format de papier pris en charge et rendu d'impression. Une contrainte
  -- CHECK plutôt qu'un type enum : ajouter une valeur plus tard ne demandera
  -- qu'un ALTER de la contrainte.
  type              text not null default 'A4' check (type in ('A4', 'A3')),
  fonction          text not null default 'mono' check (fonction in ('mono', 'couleur')),
  date_acquisition  date,
  date_mise_service date,
  actif             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Affectation d'une machine à un site
-- Table de jonction. Un site accueille plusieurs machines, mais une machine
-- n'est installée que sur un seul site : dès qu'elle est affectée, elle n'est
-- plus disponible. C'est la contrainte d'unicité sur `id_machine` qui le
-- garantit, plutôt que le seul formulaire.
-- ---------------------------------------------------------------------------
create table if not exists public.affectation (
  id_affectation bigint generated always as identity primary key,
  id_machine     bigint not null references public.machine (id_machine) on delete cascade,
  id_site        bigint not null references public.print_points (id_site) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Une machine n'est installee que sur un site a la fois : une fois affectee,
  -- elle n'est plus disponible pour un autre site.
  unique (id_machine)
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
-- FAQ affichée sur le site public
-- `page` désigne la page qui montre la question. Contrainte CHECK plutôt qu'un
-- type enum : ajouter une page plus tard ne demandera qu'un ALTER.
-- ---------------------------------------------------------------------------
create table if not exists public.faq (
  id_faq     bigint generated always as identity primary key,
  page       text not null check (page in ('comment-ca-marche', 'tarifs')),
  question   text not null,
  reponse    text not null,
  position   integer not null default 0,
  actif      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faq_page_position_idx on public.faq (page, position);

-- ---------------------------------------------------------------------------
-- Messages déposés par le formulaire de contact
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id_message bigint generated always as identity primary key,
  nom        text not null,
  email      text not null,
  telephone  text,
  message    text not null,
  lu         boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

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

drop trigger if exists faq_touch_updated_at on public.faq;
create trigger faq_touch_updated_at
  before update on public.faq
  for each row execute function public.touch_updated_at();

drop trigger if exists contact_messages_touch_updated_at on public.contact_messages;
create trigger contact_messages_touch_updated_at
  before update on public.contact_messages
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
alter table public.faq enable row level security;
alter table public.contact_messages enable row level security;

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

drop policy if exists "faq lecture publique" on public.faq;
create policy "faq lecture publique"
  on public.faq for select
  to anon, authenticated
  using (true);

drop policy if exists "faq écriture authentifiée" on public.faq;
create policy "faq écriture authentifiée"
  on public.faq for all
  to authenticated
  using (true)
  with check (true);

-- Le formulaire public doit pouvoir déposer un message, mais un visiteur ne
-- doit jamais pouvoir lire ceux des autres : insertion seule pour `anon`.
drop policy if exists "contact_messages dépôt public" on public.contact_messages;
create policy "contact_messages dépôt public"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

drop policy if exists "contact_messages lecture authentifiée" on public.contact_messages;
create policy "contact_messages lecture authentifiée"
  on public.contact_messages for select
  to authenticated
  using (true);

drop policy if exists "contact_messages gestion authentifiée" on public.contact_messages;
create policy "contact_messages gestion authentifiée"
  on public.contact_messages for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "contact_messages suppression authentifiée" on public.contact_messages;
create policy "contact_messages suppression authentifiée"
  on public.contact_messages for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Valeurs par défaut des paramètres (reprises des View Composers Laravel)
-- ---------------------------------------------------------------------------
insert into public.settings (key, value) values
  ('price_nb', '30'),
  ('price_couleur', '100'),
  ('contact_phone', '+228 91 35 00 00'),
  ('contact_email', 'support@masoft-consulting.com'),
  ('contact_address', 'Lomé, Togo'),
  -- Vide : les alertes partent alors vers `contact_email`.
  ('notification_email', ''),
  ('recharge_amounts', '500,1000,2000,5000'),
  ('avg_print_time', '3 min'),
  ('payment_methods_count', '3')
on conflict (key) do nothing;
