import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Download, FileText, Printer, Users } from 'lucide-react'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { cn } from '@/lib/cn'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import { formatCentralDate, JOB_STATUS_LABELS } from '@/features/impressions/format'
import { getExpediteurs } from '@/features/impressions/queries'
import type { DocumentExpediteur, Expediteur } from '@/features/impressions/types'

export const metadata: Metadata = {
  title: 'Activité par expéditeur',
}

type Periode = { depuis?: string; jusqua?: string }

function Totaux({ expediteurs }: { expediteurs: Expediteur[] }) {
  const pages = expediteurs.reduce((n, e) => n + e.pages_imprimees, 0)
  const encaisse = expediteurs.reduce((n, e) => n + e.encaisse, 0)
  const devise = expediteurs.find((e) => e.devise)?.devise ?? ''

  const cartes = [
    { Icon: Users, label: 'Expéditeurs', valeur: String(expediteurs.length) },
    { Icon: Printer, label: 'Pages imprimées', valeur: pages.toLocaleString('fr-FR') },
    {
      Icon: FileText,
      label: 'Encaissé',
      valeur: `${encaisse.toLocaleString('fr-FR')} ${devise}`.trim(),
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cartes.map(({ Icon, label, valeur }) => (
        <div key={label} className="surface-card p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{valeur}</p>
        </div>
      ))}
    </div>
  )
}

function LigneDocument({ doc }: { doc: DocumentExpediteur }) {
  return (
    <tr>
      <td className="px-4 py-2">
        <Link
          href={`/admin/impressions/documents/${doc.id}`}
          className="font-medium hover:text-primary"
        >
          {doc.fichier}
        </Link>
      </td>
      <td className="px-4 py-2 text-muted-foreground">
        {JOB_STATUS_LABELS[doc.etat] ?? doc.etat}
      </td>
      <td className="px-4 py-2 text-muted-foreground">
        {doc.pages}
        {doc.copies > 1 && ` × ${doc.copies}`}
      </td>
      <td className="px-4 py-2 font-medium">{doc.pages_sorties || '—'}</td>
      <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">
        {doc.point ?? '—'}
      </td>
      <td className="hidden px-4 py-2 text-muted-foreground lg:table-cell">
        {formatCentralDate(doc.envoye_le)}
      </td>
    </tr>
  )
}

function CarteExpediteur({ expediteur }: { expediteur: Expediteur }) {
  const e = expediteur
  return (
    <article className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-6">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold break-all">{e.email}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Du {formatCentralDate(e.premier_envoi)} au {formatCentralDate(e.dernier_envoi)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
            {e.pages_imprimees} page{e.pages_imprimees > 1 ? 's' : ''} imprimée
            {e.pages_imprimees > 1 ? 's' : ''}
          </span>
          {e.encaisse > 0 && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700">
              {e.encaisse.toLocaleString('fr-FR')} {e.devise}
            </span>
          )}
          {e.echecs > 0 && (
            <span className="rounded-full bg-destructive/10 px-3 py-1 font-semibold text-destructive">
              {e.echecs} échec{e.echecs > 1 ? 's' : ''}
            </span>
          )}
          {e.expires > 0 && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 font-semibold text-amber-700">
              {e.expires} expiré{e.expires > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-y border-border bg-border text-center sm:grid-cols-4">
        {[
          ['Documents', e.documents],
          ['Imprimés', e.documents_imprimes],
          ['Pages envoyées', e.pages_envoyees],
          ['Pages sorties', e.pages_imprimees],
        ].map(([label, valeur]) => (
          <div key={String(label)} className="bg-card px-2 py-3">
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="font-display text-lg font-bold">{valeur}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Document</th>
              <th className="px-4 py-2 font-medium">État</th>
              <th className="px-4 py-2 font-medium">Pages</th>
              <th className="px-4 py-2 font-medium">Sorties</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Point</th>
              <th className="hidden px-4 py-2 font-medium lg:table-cell">Envoyé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {e.documents_detail.map((doc) => (
              <LigneDocument key={doc.id} doc={doc} />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

async function Activite({ depuis, jusqua }: Periode) {
  await requirePrintAdmin()

  let expediteurs: Expediteur[]
  try {
    expediteurs = await getExpediteurs({ depuis, jusqua })
  } catch (error) {
    const message = error instanceof PrintAdminError ? error.message : 'Lecture impossible.'
    return (
      <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">{message}</p>
      </div>
    )
  }

  if (expediteurs.length === 0) {
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground">
        Aucun document sur cette période.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Totaux expediteurs={expediteurs} />
      {expediteurs.map((expediteur) => (
        <CarteExpediteur key={expediteur.email} expediteur={expediteur} />
      ))}
    </div>
  )
}

export default async function ExpediteursPage({
  searchParams,
}: {
  searchParams: Promise<{ depuis?: string; jusqua?: string }>
}) {
  const { depuis, jusqua } = await searchParams
  const query = new URLSearchParams()
  if (depuis) query.set('depuis', depuis)
  if (jusqua) query.set('jusqua', jusqua)
  const exportHref = `/admin/impressions/expediteurs/export${query.size > 0 ? `?${query}` : ''}`

  return (
    <div className="space-y-6">
      <Link
        href="/admin/impressions"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux impressions
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            Activité par expéditeur
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Qui envoie quoi, ce qui est réellement sorti des machines, et ce que cela a
            rapporté. Les expéditeurs sont classés du plus gros consommateur au plus petit.
          </p>
        </div>
        <a
          href={exportHref}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Download className="h-4 w-4" aria-hidden />
          Exporter en CSV
        </a>
      </header>

      {/* GET : la période reste dans l'URL, donc partageable et rechargeable,
          et le bouton d'export la reprend telle quelle. */}
      <form method="get" className="surface-card flex flex-wrap items-end gap-4 p-6">
        {[
          { nom: 'depuis', label: 'Du', valeur: depuis },
          { nom: 'jusqua', label: 'Au', valeur: jusqua },
        ].map(({ nom, label, valeur }) => (
          <div key={nom}>
            <label htmlFor={nom} className="text-sm font-medium text-muted-foreground">
              {label}
            </label>
            <input
              id={nom}
              name={nom}
              type="date"
              defaultValue={valeur}
              className="mt-2 h-11 rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
            />
          </div>
        ))}
        <button
          type="submit"
          className="h-11 rounded-xl bg-secondary px-5 text-sm font-semibold hover:bg-secondary/70"
        >
          Filtrer
        </button>
        {(depuis || jusqua) && (
          <Link
            href="/admin/impressions/expediteurs"
            className={cn(
              'inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium',
              'text-muted-foreground hover:text-foreground',
            )}
          >
            Tout l&apos;historique
          </Link>
        )}
      </form>

      <Suspense key={`${depuis}-${jusqua}`} fallback={<CardsSkeleton />}>
        <Activite depuis={depuis} jusqua={jusqua} />
      </Suspense>
    </div>
  )
}
