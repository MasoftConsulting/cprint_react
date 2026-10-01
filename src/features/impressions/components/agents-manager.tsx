'use client'

import { useActionState, useState } from 'react'
import { Check, Copy, Download, KeyRound, Plus, Trash2 } from 'lucide-react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState, type FormState } from '@/lib/form-state'
import { cn } from '@/lib/cn'
import {
  createAgent,
  deleteAgent,
  rotateAgentToken,
  type AgentFormState,
} from '@/features/impressions/actions'
import { formatCentralDate } from '@/features/impressions/format'
import {
  commandeDInstallation,
  nomDuFichierInstalleur,
  scriptDInstallation,
} from '@/features/impressions/installeur'
import type { AgentCredentials, PrintAgent } from '@/features/impressions/types'

/**
 * Création, installation, renouvellement de jeton et suppression d'un point.
 *
 * Le jeton n'existe que le temps de ce retour d'action : la centrale n'en
 * garde que l'empreinte. C'est donc ici, et nulle part ailleurs, que se
 * fabrique l'installeur du point — d'où le panneau qui s'ouvre après une
 * création, et qui disparaît au rechargement suivant.
 */

const initialAgentState: AgentFormState = initialFormState

function Message({ state }: { state: FormState }) {
  if (state.status === 'idle' || !state.message) return null

  return (
    <div
      className={cn(
        'mt-4 rounded-xl border p-4 text-sm',
        state.status === 'success'
          ? 'border-primary/30 bg-primary/5'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <p className="font-medium break-words">{state.message}</p>
    </div>
  )
}

function BoutonCopier({ texte, libelle }: { texte: string; libelle: string }) {
  const [copie, setCopie] = useState(false)
  const [echec, setEchec] = useState(false)

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte)
      setCopie(true)
      setEchec(false)
      window.setTimeout(() => setCopie(false), 2500)
    } catch {
      // Le presse-papier est refusé hors HTTPS, ou par une politique du
      // navigateur : on le dit, plutôt que de laisser croire à une copie.
      setEchec(true)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copier}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary/10 px-4 text-xs font-semibold text-primary hover:bg-primary/15"
      >
        {copie ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
        {copie ? 'Copié' : libelle}
      </button>
      {echec && (
        <span className="text-xs text-destructive">
          Copie refusée par le navigateur : sélectionnez le texte à la main.
        </span>
      )}
    </div>
  )
}

/**
 * Ce qu'il faut pour installer le point sur place : le fichier, la commande,
 * et le jeton en clair en dernier recours.
 */
function PanneauInstallation({ credentials }: { credentials: AgentCredentials }) {
  const fichier = nomDuFichierInstalleur(credentials)
  const commande = commandeDInstallation(credentials)
  const { printerIp, central } = credentials

  function telecharger() {
    const contenu = scriptDInstallation(credentials)
    // BOM UTF-8 : Windows PowerShell 5.1 lit un fichier sans BOM comme de
    // l'ANSI, et les accents de la date de génération y deviendraient illisibles.
    const blob = new Blob([`﻿${contenu}`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const lien = document.createElement('a')
    lien.href = url
    lien.download = fichier
    document.body.appendChild(lien)
    lien.click()
    lien.remove()
    URL.revokeObjectURL(url)
  }

  if (!central) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-medium">Adresse de la centrale inconnue.</p>
        <p className="mt-1 text-xs">
          Renseignez <code>NEXT_PUBLIC_PRINT_API_URL</code> pour que l&apos;installeur sache qui
          appeler. Le jeton reste affiché ci-dessus : recopiez-le maintenant.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-semibold">Installer ce point sur place</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Le fichier et la commande contiennent le jeton de ce point. Il ne sera plus affiché
          après le rechargement de cette page.
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={telecharger}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Download className="h-4 w-4" aria-hidden />
          Télécharger {fichier}
        </button>
        <p className="text-xs text-muted-foreground">
          À copier sur le PC relié à l&apos;imprimante. Puis, dans PowerShell{' '}
          <strong>en administrateur</strong>, depuis le dossier du fichier :
        </p>
        <pre className="overflow-x-auto rounded-lg bg-background px-3 py-2 text-xs">
          {`powershell -ExecutionPolicy Bypass -File .\\${fichier}`}
        </pre>
      </div>

      <details className="rounded-lg bg-background/60 p-3">
        <summary className="cursor-pointer text-xs font-semibold">
          Ou en une commande, sans fichier
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Pratique en dépannage. Le jeton part alors dans l&apos;historique de la console : pour
          une installation normale, préférez le fichier.
        </p>
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-background px-3 py-2 text-[11px] break-all whitespace-pre-wrap">
          {commande}
        </pre>
        <div className="mt-2">
          <BoutonCopier texte={commande} libelle="Copier la commande" />
        </div>
      </details>

      {!printerIp && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          Aucune IP d&apos;imprimante n&apos;a été indiquée : le script la demandera sur place.
          Pour l&apos;éviter, renseignez-la à la création du point.
        </p>
      )}

      <details className="rounded-lg bg-background/60 p-3">
        <summary className="cursor-pointer text-xs font-semibold">
          Voir le jeton en clair
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Utile pour un point déjà installé : il suffit de corriger{' '}
          <code>AGENT_TOKEN</code> dans <code>agent\{credentials.name}.env</code>, puis de
          redémarrer l&apos;agent.
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-background px-3 py-2 text-xs break-all whitespace-pre-wrap">
          {credentials.token}
        </pre>
        <div className="mt-2">
          <BoutonCopier texte={credentials.token} libelle="Copier le jeton" />
        </div>
      </details>
    </div>
  )
}

export function CreateAgentForm() {
  const [state, formAction] = useActionState(createAgent, initialAgentState)

  return (
    <form action={formAction} className="surface-card p-6 sm:p-8">
      <h2 className="font-display text-lg font-bold">Ajouter un point d&apos;impression</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Une imprimante par point. À la création, l&apos;administration remet un installeur prêt à
        lancer sur le PC du magasin.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="agent-name" className="text-sm font-medium text-muted-foreground">
            Nom du point
          </label>
          <input
            id="agent-name"
            name="name"
            required
            placeholder="campus-nord"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
          />
          <FieldError messages={state.errors?.name} />
        </div>
        <div>
          <label htmlFor="agent-printer" className="text-sm font-medium text-muted-foreground">
            Modèle (facultatif)
          </label>
          <input
            id="agent-printer"
            name="printer_label"
            placeholder="Sharp BP-50C45"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
          />
          <FieldError messages={state.errors?.printer_label} />
        </div>
        <div>
          <label htmlFor="agent-ip" className="text-sm font-medium text-muted-foreground">
            IP de l&apos;imprimante
          </label>
          <input
            id="agent-ip"
            name="printer_ip"
            inputMode="numeric"
            placeholder="192.168.1.21"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
          />
          <FieldError messages={state.errors?.printer_ip} />
          <p className="mt-1 text-xs text-muted-foreground">
            Sur le réseau du magasin. Sert à pré-remplir l&apos;installeur ; la centrale ne la
            conserve pas.
          </p>
        </div>
      </div>

      <SubmitButton pendingLabel="Création…" className="mt-4">
        <Plus className="h-4 w-4" aria-hidden />
        Créer le point
      </SubmitButton>

      <Message state={state} />
      {state.credentials && <PanneauInstallation credentials={state.credentials} />}
    </form>
  )
}

export function AgentRow({ agent }: { agent: PrintAgent }) {
  const [rotateState, rotateAction] = useActionState(rotateAgentToken, initialAgentState)
  const [deleteState, deleteAction] = useActionState(deleteAgent, initialFormState)
  const enLigne = agent.last_status === 'ONLINE'

  return (
    <article className="surface-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold">{agent.name}</h3>
          <p className="text-xs text-muted-foreground">
            {agent.printer_label ?? 'Imprimante non précisée'}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
            enLigne ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700',
          )}
        >
          {enLigne ? 'Imprimante en ligne' : (agent.last_status ?? 'Jamais vu')}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Dernier contact : {formatCentralDate(agent.last_seen_at)}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={rotateAction}>
          <input type="hidden" name="name" value={agent.name} />
          <SubmitButton
            pendingLabel="…"
            className="h-10 bg-primary/10 px-4 text-xs text-primary shadow-none hover:bg-primary/15"
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden />
            Renouveler le jeton
          </SubmitButton>
        </form>

        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Supprimer le point « ${agent.name} » ?\n\nSon jeton cessera immédiatement de fonctionner : l'agent installé sur place ne pourra plus imprimer.`,
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <input type="hidden" name="name" value={agent.name} />
          <SubmitButton
            pendingLabel="…"
            className="h-10 bg-destructive/10 px-4 text-xs text-destructive shadow-none hover:bg-destructive/15"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Supprimer
          </SubmitButton>
        </form>
      </div>

      <Message state={rotateState} />
      {rotateState.credentials && <PanneauInstallation credentials={rotateState.credentials} />}
      <Message state={deleteState} />
    </article>
  )
}
