import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import {
  AgentRow,
  CreateAgentForm,
} from '@/features/impressions/components/agents-manager'
import { getPrintAgents } from '@/features/impressions/queries'

export const metadata: Metadata = {
  title: 'Points d’impression',
}

async function AgentsList() {
  await requirePrintAdmin()

  let agents
  try {
    agents = await getPrintAgents()
  } catch (error) {
    const message =
      error instanceof PrintAdminError ? error.message : 'Lecture impossible.'
    return (
      <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">{message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CreateAgentForm />

      {agents.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          Aucun point déclaré pour l&apos;instant.
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {agents.map((agent) => (
            <AgentRow key={agent.name} agent={agent} />
          ))}
        </div>
      )}

      <div className="surface-card bg-secondary/40 p-6 text-sm">
        <p className="font-medium">Ce que fait l&apos;installeur sur le PC du magasin</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>vérifie que la centrale répond et que le jeton du point est valide ;</li>
          <li>installe Python 3.12 s&apos;il manque ;</li>
          <li>télécharge le code de l&apos;agent depuis la centrale, dans C:\campus-print ;</li>
          <li>écrit les réglages, choisit un port libre, désactive la mise en veille ;</li>
          <li>crée la tâche planifiée, ouvre le pare-feu, puis contrôle que tout répond.</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Le PC n&apos;a besoin ni d&apos;un compte GitHub, ni d&apos;une copie du projet : le
          jeton du point suffit à récupérer le code. Un PC peut piloter plusieurs imprimantes —
          un point, un jeton et un port par imprimante.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Mise à jour d&apos;un point déjà installé :{' '}
          <code>C:\campus-print\deploy\mettre-a-jour-agent.ps1</code> (ajoutez{' '}
          <code>-Verifier</code> pour regarder sans rien changer).
        </p>
      </div>
    </div>
  )
}

export default function PointsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/impressions"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux impressions
      </Link>

      <header>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
          Points d&apos;impression
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque imprimante a son point, son jeton et son agent. Supprimer un point révoque son
          jeton sur-le-champ.
        </p>
      </header>

      <Suspense fallback={<CardsSkeleton />}>
        <AgentsList />
      </Suspense>
    </div>
  )
}
