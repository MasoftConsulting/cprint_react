-- ---------------------------------------------------------------------------
-- Migration 003 — type et fonction d'une machine
--
-- À coller dans Supabase Studio > SQL Editor, après les migrations 001 et 002.
--
-- `type`     : format de papier pris en charge — A4 ou A3
-- `fonction` : rendu d'impression — mono (noir & blanc) ou couleur
--
-- Une contrainte CHECK plutôt qu'un type enum : ajouter une valeur plus tard
-- (A5, par exemple) ne demandera qu'un ALTER de la contrainte, sans toucher
-- au catalogue des types.
-- ---------------------------------------------------------------------------

begin;

alter table public.machine
  add column if not exists type text not null default 'A4';

alter table public.machine
  add column if not exists fonction text not null default 'mono';

alter table public.machine drop constraint if exists machine_type_check;
alter table public.machine
  add constraint machine_type_check check (type in ('A4', 'A3'));

alter table public.machine drop constraint if exists machine_fonction_check;
alter table public.machine
  add constraint machine_fonction_check check (fonction in ('mono', 'couleur'));

commit;
