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
