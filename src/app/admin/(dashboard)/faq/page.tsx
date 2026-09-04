import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { TableSkeleton } from '@/components/ui/skeletons'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/dal'
import { deleteFaq } from '@/features/faq/actions'
import { getAllFaq } from '@/features/faq/queries'
import { FAQ_PAGE_LABELS } from '@/features/faq/schema'
import { DeleteFaqButton } from '@/features/faq/components/delete-faq-button'

export const metadata: Metadata = {
  title: 'FAQ',
}

async function FaqTable() {
  await requireUser()
  const entries = await getAllFaq()

  return (
    <div className="surface-card mt-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Question</th>
            <th className="px-4 py-3 font-medium">Page</th>
            <th className="px-4 py-3 font-medium">Ordre</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                Aucune question pour le moment.
              </td>
            </tr>
          )}

          {entries.map((entry) => (
            <tr key={entry.id_faq}>
              <td className="max-w-md px-4 py-3">
                <span className="block font-medium">{entry.question}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {entry.reponse}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{FAQ_PAGE_LABELS[entry.page]}</td>
              <td className="px-4 py-3 text-muted-foreground">{entry.position}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    entry.actif ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {entry.actif ? 'Publiée' : 'Masquée'}
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Link
                  href={`/admin/faq/${entry.id_faq}`}
                  className="font-medium text-primary hover:underline"
                >
                  Modifier
                </Link>
                <form action={deleteFaq} className="inline">
                  <input type="hidden" name="id_faq" value={entry.id_faq} />
                  <DeleteFaqButton />
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminFaqPage() {
  // L'en-tête ne dépend pas de la requête : il s'affiche immédiatement,
  // le tableau est streamé derrière la frontière Suspense.
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Questions affichées sur les pages Comment ça marche et Tarifs.
        </p>
        <Link
          href="/admin/faq/nouveau"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cta px-5 text-sm font-medium whitespace-nowrap text-cta-foreground hover:brightness-105"
        >
          + Ajouter une question
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <FaqTable />
      </Suspense>
    </>
  )
}
