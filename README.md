# Campus Print by MaSoft — version Next.js

Portage du site Laravel `campus-print-laravel` vers Next.js 16 (App Router) avec
Supabase comme base de données. Le design est repris à l'identique.

## Mise en route

### 1. Créer le projet Supabase

Sur [supabase.com](https://supabase.com), créez un projet, puis ouvrez
**SQL Editor** et exécutez le contenu de [`supabase/schema.sql`](supabase/schema.sql).
Ce script crée les tables `print_points`, `machine`, `affectation` et `settings`,
la vue publique `site_machine_counts`, les politiques RLS et les valeurs par défaut.

**Base déjà en service ?** N'exécutez pas `schema.sql` : lancez plutôt
[`supabase/migrations/001_machines_et_sites.sql`](supabase/migrations/001_machines_et_sites.sql),
qui fait évoluer une base existante sans perdre les sites déjà saisis. Cette
migration **supprime les colonnes `hours` et `position`**, absentes du nouveau
modèle — sauvegardez-les avant si vous y tenez. Enchaînez ensuite avec
[`002_affectation_unique_machine.sql`](supabase/migrations/002_affectation_unique_machine.sql),
qui interdit qu'une machine soit affectée à deux sites, puis
[`003_machine_type_fonction.sql`](supabase/migrations/003_machine_type_fonction.sql),
qui ajoute le format de papier et le rendu d'impression, et enfin
[`004_faq_et_messages.sql`](supabase/migrations/004_faq_et_messages.sql),
qui rend la FAQ éditable et enregistre les messages de contact.

### Modèle de données

| Table | Rôle |
|---|---|
| `print_points` | Un site : `id_site`, `site_name`, `site_address`, `city`, `country`, `latitude`, `longitude`, `actif` |
| `machine` | Un photocopieur : `id_machine`, `serial_number`, `machine_name`, `mac_address`, `ip_address`, `type` (A4/A3), `fonction` (mono/couleur), `date_acquisition`, `date_mise_service`, `actif` |
| `affectation` | Le lien entre une machine et le site où elle est installée |
| `settings` | Tarifs, coordonnées de contact et statistiques éditables depuis l'admin |
| `faq` | Questions affichées sur les pages Comment ça marche et Tarifs |
| `contact_messages` | Messages déposés par le formulaire de la page Contact |

Une machine n'équipe **qu'un seul site à la fois** : dès qu'elle est affectée,
elle disparaît de la liste des machines disponibles. La règle est tenue par une
contrainte d'unicité sur `affectation.id_machine`, pas seulement par le
formulaire — deux onglets ouverts ne peuvent pas affecter la même machine.

Le parc (`machine`, `affectation`) n'est **pas** lisible publiquement : un numéro
de série ou une adresse IP n'ont rien à faire dans une réponse anonyme. La page
publique affiche « N machines » via la vue agrégée `site_machine_counts`.

### 2. Renseigner les variables d'environnement

Copiez `.env.example` vers `.env.local` et remplissez-le depuis
**Project Settings → API** de votre projet Supabase :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=          # optionnel, voir plus bas
```

`SUPABASE_SERVICE_ROLE_KEY` ne sert qu'à afficher le nombre de comptes sur le
tableau de bord admin. Sans elle, cette statistique affiche `—` ; tout le reste
fonctionne. Cette clé ne doit **jamais** être préfixée par `NEXT_PUBLIC_`.

### 3. Créer le compte administrateur

L'authentification passe par Supabase Auth (et non par une table `users`).
Dans Supabase Studio : **Authentication → Users → Add user**, avec une adresse
e-mail et un mot de passe, en cochant « Auto Confirm User ».

Pour que le nom s'affiche dans l'espace admin, ajoutez au champ
**User Metadata** de ce compte :

```json
{ "name": "Votre nom" }
```

Ce nom est ensuite modifiable depuis `/admin/profil`.

### 4. Lancer le projet

```bash
npm install
npm run dev
```

## Tester depuis un téléphone ou un autre appareil

En développement, Next.js bloque par défaut les requêtes vers ses ressources
internes (`/_next/*`) venant d'une autre origine que `localhost`. Ouvrir le site
depuis l'IP réseau sert alors le HTML mais **bloque tout le JavaScript client** :
plus de simulateur, plus de carte, plus de menu déroulant. Les origines du réseau
local sont donc autorisées dans `next.config.ts` (`allowedDevOrigins`) — ajoutez-y
votre plage d'adresses si elle diffère. Cette option n'a aucun effet en production.

La **géolocalisation**, elle, est réservée par les navigateurs aux contextes
sécurisés : elle ne fonctionne que sur `localhost` ou en HTTPS. Pour la tester
depuis un téléphone :

```bash
npm run dev:https
```

Next.js génère un certificat auto-signé ; acceptez l'avertissement du navigateur.
Sans HTTPS, les boutons « Trouver le point le plus proche » et « Utiliser ma
position actuelle » affichent un message l'expliquant — le reste (clic sur la
carte, saisie manuelle des coordonnées) continue de fonctionner.

## Correspondance des routes

| Laravel | Next.js |
|---|---|
| `/` | `/` |
| `/comment-ca-marche` | `/comment-ca-marche` |
| `/tarifs` | `/tarifs` |
| `/points` | `/points` |
| `/universites` | `/universites` |
| `/a-propos` | `/a-propos` |
| `/contact` | `/contact` |
| `/admin` (connexion) | `/admin` |
| `/admin/dashboard` | `/admin/dashboard` |
| `print-points.*` | `/admin/points`, `/admin/points/nouveau`, `/admin/points/[id]` |
| — (nouveau) | `/admin/machines`, `/admin/machines/nouveau`, `/admin/machines/[id]` |
| — (nouveau) | `/admin/gestion` — affectation des machines aux sites |
| — (nouveau) | `/admin/faq`, `/admin/faq/nouveau`, `/admin/faq/[id]` |
| — (nouveau) | `/admin/messages` — boîte de réception du formulaire de contact |
| `/admin/tarifs` | `/admin/tarifs` |
| `/admin/parametres` | `/admin/parametres` |
| `/admin/profil` | `/admin/profil` |

## Architecture

```
src/
├── app/
│   ├── (public)/          # site vitrine — en-tête et pied de page partagés
│   └── admin/             # connexion + espace d'administration
├── features/              # organisé par domaine métier
│   ├── auth/              # session, profil, coquille de l'admin
│   ├── contact/           # formulaire public et boîte de réception
│   ├── faq/               # questions fréquentes éditables
│   ├── affectations/      # affectation d'une machine à un site
│   ├── machines/          # parc de photocopieurs
│   ├── print-points/      # sites d'impression (CRUD, carte Leaflet)
│   └── settings/          # tarifs et paramètres du site
├── lib/
│   ├── dal.ts             # accès aux données + autorisation
│   ├── env.ts             # variables d'environnement validées par Zod
│   └── supabase/          # clients serveur / anonyme / service / navigateur
└── proxy.ts               # ex-middleware : rafraîchit la session, redirige
```

Le cache suit le modèle Cache Components (`cacheComponents: true`) : les lectures
publiques sont marquées `'use cache'` avec un `cacheTag`, et les Server Actions
d'administration appellent `updateTag` pour que la modification soit visible
immédiatement sur le site.

## Ce qui reste à brancher

- **Notification par e-mail des nouveaux messages** : les demandes sont
  enregistrées en base et consultables dans `/admin/messages`, mais aucun e-mail
  n'est envoyé à l'équipe. Il faut brancher un service d'envoi dans
  `src/features/contact/actions.ts`.
- **Commandes / chiffre d'affaires** du tableau de bord : marqués « Bientôt »
  dans le projet d'origine, non implémentés ici non plus.
- **Mot de passe oublié** : lien présent sur la page de connexion Laravel, sans
  page cible ; il n'a pas été repris.
- **Horaires d'ouverture** : la colonne `hours` du modèle Laravel n'existe pas
  dans le diagramme de classes, elle a donc disparu de la base et de la fiche
  publique d'un site. Si vous voulez les réafficher, il faut rajouter la colonne
  au diagramme et au schéma.
