/**
 * Mise en forme des comptes. Pur affichage, donc utilisable des deux côtés de
 * la frontière serveur/client.
 *
 * Les dates viennent de Supabase Auth en ISO 8601 avec fuseau — contrairement
 * à celles de la centrale d'impression, qui arrivent en UTC sans fuseau et ont
 * leur propre formateur (`features/impressions/format.ts`). Les mélanger
 * décalerait les heures d'une ou deux heures sans prévenir.
 */

/** « 02/10/2026 à 01:52 », ou « — » si la date manque. */
export function formatDateIso(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Ancienneté en clair : « aujourd'hui », « il y a 3 j », « il y a 2 mois ». */
export function formatDepuis(value: string | null): string {
  if (!value) return 'jamais'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const jours = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (jours <= 0) return "aujourd'hui"
  if (jours === 1) return 'hier'
  if (jours < 31) return `il y a ${jours} j`
  const mois = Math.round(jours / 30)
  return mois < 24 ? `il y a ${mois} mois` : `il y a ${Math.round(mois / 12)} ans`
}
