# Campus Print — règles du projet

Port Next.js du site Laravel `campus-print-laravel`. Le design (couleurs, espacements,
typographie) doit rester identique à l'original.

## Versions installées

- Next.js 16.3.4 (App Router, Turbopack), React 19.2, TypeScript 5, Tailwind CSS 4
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`) — pas d'ORM, pas de Prisma
- Zod 4 pour la validation, lucide-react pour les icônes, Leaflet pour les cartes

La documentation alignée sur la version installée est dans `node_modules/next/dist/docs/`.
Lis-la avant d'utiliser une API dont tu n'es pas certain — ne code pas de mémoire.

## Conventions

- `cacheComponents: true` est activé : les données sont **dynamiques par défaut**.
  Les lectures publiques sont mises en cache avec `'use cache'` + `cacheTag`, et
  invalidées par `updateTag` depuis les Server Actions.
- Les routes de `/admin` déclarent `export const instant = false` : elles dépendent
  de la session et bloquent volontairement côté serveur.
- Toute page et toute Server Action de l'espace admin appelle `requireUser()`
  (`src/lib/dal.ts`). `src/proxy.ts` n'est qu'une redirection optimiste.
- Modele de donnees : `print_points` (sites), `machine` (parc), `affectation`
  (lien N-N), `settings`. Les cles primaires sont `id_site` et `id_machine`.
  Le parc n'est jamais lisible publiquement : la page publique passe par la vue
  agregee `site_machine_counts`.
- Organisation par domaine dans `src/features/<domaine>/` :
  `queries.ts` (`server-only`), `actions.ts` (`'use server'`), `schema.ts` (Zod),
  `components/`. `src/components/` ne contient que des primitives génériques.
- `'use client'` reste sur les feuilles. Un layout n'est jamais un composant client.
- Aucune ligne brute de la base ne traverse la frontière serveur/client : projeter
  explicitement les champs nécessaires.

## Service d'impression (API Python)

Le parcours `/imprimer` s'appuie sur une **API FastAPI séparée**, dans le dépôt
voisin `campus-print/`. Elle tourne sur une machine du magasin — elle seule
peut parler à la Sharp BP-70C31 par le réseau local (port 9100) — et est
exposée par un tunnel Cloudflare.

- Client typé : `src/features/impression/api.ts`. Appelé **depuis le
  navigateur**, jamais depuis un Server Action : les fichiers doivent de toute
  façon atterrir sur la machine qui imprime.
- URL : `NEXT_PUBLIC_PRINT_API_URL`. Vide, `/imprimer` affiche « bientôt
  disponible » et les boutons « Imprimer un document » gardent leur ancienne
  destination (`printEntryHref()`) : le site en ligne n'est jamais cassé tant
  que le tunnel n'est pas en place.
- **Les tarifs sont administrés ici** (table `settings` Supabase, back-office
  `/admin/tarifs`) et lus par FastAPI en REST. Ne jamais dupliquer un prix en
  dur : le montant réellement débité vient de cette table.
- Le montant affiché à l'écran n'est qu'un confort de lecture — il est
  recalculé côté FastAPI au moment de payer, puis d'imprimer.
- **Rien ne s'imprime depuis le site.** `/imprimer` s'arrête au paiement et
  affiche le code de retrait ; l'impression part de la borne du magasin
  (`http://localhost:8000`, servie par FastAPI) quand le client y saisit ce
  code. L'API refuse `POST /jobs/print` venu d'Internet — ne jamais ajouter
  d'appel d'impression côté Next.js.
- **Le code de retrait n'est remis qu'après paiement confirmé** (e-mail + écran
  final). Avant, l'écran n'a que le jeton de session : l'aperçu passe par
  `sessionPreviewUrl()`. Ne jamais afficher de code avant l'étape `ready`.

Documentation complète du flux, des garde-fous de paiement et du déploiement :
`campus-print/README.md`.

## Commandes

```bash
npm run dev        # serveur de développement
npm run build      # build de production
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
