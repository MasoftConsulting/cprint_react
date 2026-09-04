-- ---------------------------------------------------------------------------
-- Migration 004 — FAQ éditable et boîte de réception du formulaire de contact
--
-- À coller dans Supabase Studio > SQL Editor, après les migrations 001 à 003.
--
-- Jusqu'ici la FAQ était codée en dur dans les pages et les messages du
-- formulaire de contact étaient validés puis jetés. Les deux passent en base
-- pour être gérés depuis l'espace d'administration.
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- FAQ
-- `page` désigne la page publique qui affiche la question. Contrainte CHECK
-- plutôt qu'un type enum : ajouter une page plus tard ne demandera qu'un ALTER.
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
-- Messages du formulaire de contact
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
-- Triggers updated_at
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
-- ---------------------------------------------------------------------------
alter table public.faq enable row level security;
alter table public.contact_messages enable row level security;

-- La FAQ s'affiche sur le site : lecture publique, écriture authentifiée.
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
-- Reprise des questions jusqu'ici codées en dur dans les pages, pour que le
-- site public affiche exactement la même chose après la migration.
-- ---------------------------------------------------------------------------
insert into public.faq (page, question, reponse, position)
select v.page, v.question, v.reponse, v.position
  from (values
    ('comment-ca-marche', 'Quels formats de fichiers sont acceptés ?',
     'PDF, DOCX, PPTX, JPG et PNG, jusqu''à 50 Mo par envoi.', 0),
    ('comment-ca-marche', 'Mes documents sont-ils en sécurité ?',
     'Oui, vos fichiers sont supprimés automatiquement 24 heures après leur envoi.', 1),
    ('comment-ca-marche', 'Quels moyens de paiement puis-je utiliser ?',
     'Flooz, T-Money/Mixx, ou la carte prépayée Campus Print.', 2),
    ('comment-ca-marche', 'Faut-il créer un compte ?',
     'Non, aucun compte n''est nécessaire pour imprimer un document.', 3),
    ('tarifs', 'Y a-t-il un abonnement ?',
     'Non, aucun abonnement. Vous payez uniquement ce que vous imprimez.', 0),
    ('tarifs', 'Comment fonctionne la carte prépayée ?',
     'Rechargez le montant de votre choix et utilisez le solde à chaque impression, sans repasser par Mobile Money.', 1),
    ('tarifs', 'Le recto/verso coûte-t-il plus cher ?',
     'Non, le tarif reste le même, par page imprimée.', 2)
  ) as v(page, question, reponse, position)
 where not exists (select 1 from public.faq);

commit;
