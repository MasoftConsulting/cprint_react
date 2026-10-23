# MASC Print — règles du projet

MASC Print est le projet global ; Campus Print n'en est qu'une déclinaison (l'offre
pour les universités). Le nom affiché vient de `src/lib/marque.ts` — jamais écrit en
dur dans un composant. Les identifiants techniques (`campus-print`, `campus_print`,
`CampusPrintAgent-…`) ne changent pas avec la marque.

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

## Devise d'affichage

- **La comptabilité est en F CFA** : prix (Supabase), soldes, paiements. Rien
  n'est stocké en euros. Le back-office reste en F CFA.
- Le site public **affiche** dans la devise du visiteur : euro par défaut, F CFA
  pour la zone UEMOA (pays de connexion, `x-vercel-ip-country`), ou son choix
  (sélecteur de l'en-tête, cookie `devise`). Conversion **exacte** à la parité
  fixe 655,957 — jamais un cours de marché.
- Tout montant public passe par `src/features/devise/` : `<Prix>` (serveur, sous
  `<Suspense>`), `useMontants()` (navigateur). Jamais « FCFA » ni « € » en dur.
- Là où de l'argent part, `debite()` annonce **la devise du débit** : F CFA pour
  le Mobile Money, euro pour la carte et PayPal — puis l'équivalent.
- `npm run verify` vérifie que l'euro affiché est exactement ce que la centrale
  débite (centime supérieur). La CI le lance.

## Zones tarifaires

- **Deux zones** : F CFA (UEMOA : `price_nb`, `price_couleur`, `price_livret`, en
  F CFA) et euro (`price_nb_eur`, `price_couleur_eur`, `price_livret_eur`, en
  euros), dans `settings`, administrées depuis `/admin/tarifs`. Zone euro vide :
  facturée aux prix F CFA — c'est la règle de la centrale, `prixDeZone()` la
  reproduit à l'identique.
- **La zone d'un paiement est celle du lieu d'impression**, choisie par le client
  dans le parcours (défaut : la zone de sa devise). Jamais la devise affichée,
  jamais le moyen de paiement.
- **Un code s'imprime partout.** Payé au tarif le plus cher, il sort dans
  l'autre zone sans remboursement ; payé au moins cher, la borne d'un point plus
  cher fait régler la différence (paiement `AJUSTEMENT`, solde ou QR code)
  avant que la centrale ne serve le moindre fichier. La zone d'un point vient
  du pays de son site (`print_points.country`), relié par `agent_name`.
- **Supabase est la source unique** des tarifs et des montants de recharge
  (`recharge_amounts`) ; les variables d'environnement de la centrale ne sont
  plus que des replis.

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

- **Deux prépaiements, à ne pas confondre.** Les *comptes à crédit* sont en
  **pages**, rechargés depuis `/admin/impressions/credits`. Les *portefeuilles
  PrintPoint* sont en **argent**, rechargés par le client lui-même en ligne et
  seulement consultés depuis `/admin/impressions/portefeuilles`. Quand une
  adresse a les deux, le crédit en pages passe en premier — l'ordre des
  boutons de `/imprimer` suit celui de la centrale, l'inverse annoncerait un
  débit qui n'aura pas lieu. Si aucun ne couvre, le client paie la totalité et
  ni l'un ni l'autre n'est entamé.
- La recharge d'un portefeuille est la **seule** transaction Mobile Money de ce
  parcours : les impressions suivantes sont des débits du solde. Le solde n'est
  crédité qu'au webhook signé, jamais au retour de navigateur
  (`/imprimer/portefeuille` est purement informative).

Documentation complète du flux, des garde-fous de paiement et du déploiement :
`campus-print/README.md`.

## Commandes

```bash
npm run dev        # serveur de développement
npm run build      # build de production
npm run typecheck  # next typegen && tsc --noEmit
npm run lint       # eslint
```

`typecheck` génère d'abord les types de Next.js (`PageProps`…) : sans
`next typegen`, il ne passait que sur un poste où un build avait déjà tourné,
et échouait sur toute machine neuve — la CI comprise.

**La CI garde la production.** `.github/workflows/ci.yml` (job `qualite`)
lance typecheck et lint à chaque poussée, et Vercel ne promeut un déploiement
sur `www.mascprint.online` qu'une fois ce job au vert (Deployment Checks). Un
commit rouge est construit mais jamais publié. Renommer le job oblige à
refaire le réglage dans Vercel.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
