-- MASC Print — options de chaque machine, et leur affichage public
--
-- À lancer une fois dans le SQL Editor de Supabase. Additif et rejouable :
-- aucune donnée n'est modifiée, et le relancer ne fait rien de plus.
--
-- Le site fonctionne AVANT cette migration : la page Points affiche alors ce
-- qu'elle affichait, et le formulaire des machines enregistre tout sauf les
-- deux nouvelles cases.

-- 1. Deux options par machine. Vraies par défaut : une multifonction Sharp
--    photocopie et scanne. Décochez-les pour une machine qui ne le fait pas,
--    ou dont la fonction n'est pas ouverte au public.
alter table public.machine add column if not exists photocopie boolean not null default true;
alter table public.machine add column if not exists scan boolean not null default true;

-- 2. Les options des machines de chaque site, pour la page publique.
--
--    SANS AUCUN IDENTIFIANT : ni numéro de série, ni nom, ni adresse IP ou
--    MAC. Le parc n'est jamais lisible publiquement (même règle que
--    `site_machine_counts`) ; seul ce qu'une machine sait faire l'est.
--    `rang` numérote les machines d'un site (1, 2…), dans l'ordre de leur
--    enregistrement.
create or replace view public.site_machine_options
with (security_invoker = off) as
  select a.id_site,
         (row_number() over (partition by a.id_site order by m.id_machine))::int as rang,
         m.fonction,
         m.type,
         m.photocopie,
         m.scan
    from public.affectation a
    join public.machine m on m.id_machine = a.id_machine
   where m.actif;

grant select on public.site_machine_options to anon, authenticated;
