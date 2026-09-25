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
        <p className="font-medium">Après avoir créé un point</p>
        <p className="mt-1 text-muted-foreground">
          Sur le PC relié à l&apos;imprimante, en administrateur :
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-background px-4 py-3 text-xs">
{`cd C:\\campus-print\\deploy
.\\installer-agent.ps1 -Nom <nom du point> -Imprimante <IP> -Jeton <jeton ci-dessus>`}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Une imprimante par point, un port par imprimante : le script s&apos;en charge.
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
