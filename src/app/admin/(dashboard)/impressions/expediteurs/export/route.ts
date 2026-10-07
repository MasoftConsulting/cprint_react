import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import { expediteursVersExcel, nomDuFichierExcel } from '@/features/impressions/export-excel'
import { getExpediteurs } from '@/features/impressions/queries'

/**
 * Téléchargement du classeur Excel de l'activité par expéditeur.
 *
 * Un Route Handler et non une Server Action : il faut renvoyer un fichier avec
 * ses en-têtes, ce qu'une action ne sait pas faire. Le jeton d'administration
 * reste côté serveur — le navigateur ne voit que le classeur.
 *
 * La garde est rejouée ici : une route est publique par nature, et celle-ci
 * expose les adresses des clients et leur consommation.
 */
export async function GET(request: Request) {
  await requirePrintAdmin()

  const params = new URL(request.url).searchParams
  const depuis = params.get('depuis') ?? undefined
  const jusqua = params.get('jusqua') ?? undefined

  let classeur: Buffer
  try {
    classeur = await expediteursVersExcel(await getExpediteurs({ depuis, jusqua }))
  } catch (cause) {
    const message =
      cause instanceof PrintAdminError ? cause.message : "L'export n'a pas pu être produit."
    return new Response(message, { status: 502, headers: { 'Content-Type': 'text/plain' } })
  }

  return new Response(new Uint8Array(classeur), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomDuFichierExcel(depuis, jusqua)}"`,
      // Ces chiffres changent à chaque impression : rien à mettre en cache.
      'Cache-Control': 'no-store',
    },
  })
}
