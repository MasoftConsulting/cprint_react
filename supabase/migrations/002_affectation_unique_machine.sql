-- ---------------------------------------------------------------------------
-- Migration 002 — une machine ne peut être affectée qu'à un seul site
--
-- À coller dans Supabase Studio > SQL Editor, après la migration 001.
--
-- Règle métier : dès qu'une machine est affectée à un site, elle n'est plus
-- disponible pour un autre. On la fait respecter par la base plutôt que par
-- le seul formulaire : une contrainte d'unicité sur `id_machine` interdit
-- physiquement la double affectation, même en cas de double soumission.
-- ---------------------------------------------------------------------------

begin;

-- Si des doublons existent déjà, on ne garde que l'affectation la plus ancienne.
delete from public.affectation a
 using public.affectation b
 where a.id_machine = b.id_machine
   and a.id_affectation > b.id_affectation;

-- L'ancienne contrainte autorisait le couple (machine, site) : elle devient
-- redondante une fois `id_machine` unique à lui seul.
alter table public.affectation
  drop constraint if exists affectation_id_machine_id_site_key;

alter table public.affectation
  drop constraint if exists affectation_id_machine_key;

alter table public.affectation
  add constraint affectation_id_machine_key unique (id_machine);

commit;
