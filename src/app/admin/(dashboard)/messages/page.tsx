import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Mail, Phone } from 'lucide-react'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/dal'
import { deleteContactMessage, markMessageRead } from '@/features/contact/actions'
import { formatReceivedAt, getContactMessages } from '@/features/contact/queries'
import {
  DeleteMessageButton,
  ToggleReadButton,
} from '@/features/contact/components/message-actions'

export const metadata: Metadata = {
  title: 'Messages reçus',
}

async function MessagesList() {
  await requireUser()
  const messages = await getContactMessages()

  if (messages.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <Mail className="h-6 w-6 text-muted-foreground" aria-hidden />
        </span>
        <p className="mt-4 font-medium">Aucun message pour l&apos;instant</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Les demandes envoyées depuis le formulaire de la page Contact apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      {messages.map((message) => (
        <article
          key={message.id_message}
          className={cn('surface-card p-6 sm:p-8', !message.lu && 'border-primary/40')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold">{message.nom}</h2>
              <p className="text-xs text-muted-foreground">
                {formatReceivedAt(message.created_at)}
              </p>
            </div>
            {!message.lu && (
              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Non lu
              </span>
            )}
          </div>

          <ul className="mt-4 space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <a href={`mailto:${message.email}`} className="truncate hover:underline">
                {message.email}
              </a>
            </li>
            {message.telephone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <a href={`tel:${message.telephone}`} className="hover:underline">
                  {message.telephone}
                </a>
              </li>
            )}
          </ul>

          <p className="mt-4 rounded-xl bg-secondary/60 px-4 py-3 text-sm whitespace-pre-line">
            {message.message}
          </p>

          <div className="mt-5 flex items-center gap-4">
            <form action={markMessageRead}>
              <input type="hidden" name="id_message" value={message.id_message} />
              <input type="hidden" name="lu" value={message.lu ? 'false' : 'true'} />
              <ToggleReadButton lu={message.lu} />
            </form>
            <form action={deleteContactMessage}>
              <input type="hidden" name="id_message" value={message.id_message} />
              <DeleteMessageButton />
            </form>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function AdminMessagesPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Demandes envoyées depuis le formulaire de la page Contact.
      </p>

      <div className="mt-6">
        <Suspense fallback={<CardsSkeleton count={2} className="h-64" />}>
          <MessagesList />
        </Suspense>
      </div>
    </>
  )
}
