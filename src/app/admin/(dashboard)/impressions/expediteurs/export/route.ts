import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import { expediteursVersCsv, nomDuFichierCsv } from '@/features/impressions/export-csv'
import { getExpediteurs } from '@/features/impressions/queries'

/**
 * Téléchargement de l'export CSV de l'activité par expéditeur.
 *
 * Un Route Handler et non une Server Action : il faut renvoyer un fichier avec
 * ses en-têtes, ce qu'une action ne sait pas faire. Le jeton d'administration
 * reste côté serveur — le navigateur ne voit que le CSV.
 *
 * La garde est rejouée ici : une route est publique par nature, et celle-ci
 * expose les adresses des clients et leur consommation.
 */
export async function GET(request: Request) {
  await requirePrintAdmin()

  const params = new URL(request.url).searchParams
  const depuis = params.get('depuis') ?? undefined
  const jusqua = params.get('jusqua') ?? undefined

  let csv: string
  try {
    csv = expediteursVersCsv(await getExpediteurs({ depuis, jusqua }))
  } catch (cause) {
    const message =
      cause instanceof PrintAdminError ? cause.message : "L'export n'a pas pu être produit."
    return new Response(message, { status: 502, headers: { 'Content-Type': 'text/plain' } })
  }

  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomDuFichierCsv(depuis, jusqua)}"`,
      // Ces chiffres changent à chaque impression : rien à mettre en cache.
      'Cache-Control': 'no-store',
    },
  })
}
