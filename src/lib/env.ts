import { z } from 'zod'

/**
 * Validation des variables d'environnement au démarrage : une clé manquante
 * doit casser le build, pas une requête en production.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

// Next.js remplace `process.env.NEXT_PUBLIC_*` à la compilation : il faut les
// écrire en toutes lettres, une lecture dynamique renverrait `undefined`.
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})
