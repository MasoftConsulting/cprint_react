'use client'

import { useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload } from 'lucide-react'

import { cn } from '@/lib/cn'
import {
  formatSize,
  isPrintApiConfigured,
  PrintApiError,
  uploadToSession,
  type UploadResult,
} from '../api'

/**
 * Page ouverte sur le téléphone après scan du QR code affiché sur la borne.
 *
 * Les fichiers partent directement vers l'API d'impression, sans transiter par
 * Next.js : ils doivent de toute façon atterrir sur la machine qui parle à
 * l'imprimante (voir `../api.ts`).
 *
 * Le code de retrait n'est PAS affiché après l'envoi : il est remis (e-mail +
 * écran) seulement une fois le paiement confirmé, sur l'écran où le QR code a
 * été scanné. Exception : impression gratuite, où il n'y a rien à payer.
 */

// Les fichiers Office sont convertis en PDF par l'API dès l'envoi (LibreOffice).
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.webp'

/**
 * Lit le jeton de session dans l'URL du QR code (`?session=...`).
 *
 * Le lire côté client plutôt que dans les `searchParams` de la page garde
 * celle-ci statique : avec `cacheComponents`, la lire côté serveur rendrait
 * toute la page dynamique alors qu'elle n'a rien à calculer — seul ce
 * formulaire a besoin du jeton. À placer sous un `<Suspense>`.
 */
export function UploadFormFromQuery() {
  const params = useSearchParams()
  return <UploadForm token={params.get('session')} />
}

export function UploadForm({ token }: { token: string | null }) {
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!token) {
    return (
      <Notice tone="error" title="Lien incomplet">
        Ce lien ne contient pas de session. Scannez à nouveau le QR code affiché sur la borne.
      </Notice>
    )
  }

  if (!isPrintApiConfigured) {
    return (
      <Notice tone="error" title="Service indisponible">
        Le service d&apos;impression n&apos;est pas configuré. Prévenez un responsable du point
        Campus Print.
      </Notice>
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (files.length === 0) return

    setStatus('sending')
    setError(null)
    try {
      setResult(await uploadToSession(token!, files))
      setStatus('done')
    } catch (cause) {
      setError(
        cause instanceof PrintApiError
          ? cause.message
          : "L'envoi a échoué. Réessayez dans un instant.",
      )
      setStatus('idle')
    }
  }

  if (status === 'done' && result) {
    return <UploadSuccess result={result} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            setFiles(Array.from(event.target.files ?? []))
            setError(null)
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <Upload className="h-8 w-8 text-primary" aria-hidden />
          <span className="text-base font-semibold">
            {files.length > 0 ? 'Changer de fichiers' : 'Choisir mes documents'}
          </span>
          <span className="text-sm text-muted-foreground">
            PDF, Word, Excel, PowerPoint ou photos — vous pouvez en sélectionner plusieurs
          </span>
        </button>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSize(file.size)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <Notice tone="error" title="Envoi impossible">
          {error}
        </Notice>
      )}

      <button
        type="submit"
        disabled={files.length === 0 || status === 'sending'}
        className={cn(
          'inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl px-8 text-base font-medium transition-colors',
          'bg-cta text-cta-foreground shadow-[var(--shadow-cta)] hover:brightness-105 active:scale-[0.98]',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        {status === 'sending' ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Envoi en cours…
          </>
        ) : (
          `Envoyer ${files.length > 1 ? `${files.length} documents` : 'mon document'}`
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Vos fichiers sont supprimés automatiquement après impression.
      </p>
    </form>
  )
}

function UploadSuccess({ result }: { result: UploadResult }) {
  const count = result.documents.length

  return (
    <div className="space-y-5">
      {result.code ? (
        // Impression gratuite (aucun tarif) : rien à payer, le code est remis tout de suite.
        <div className="rounded-2xl bg-[image:var(--gradient-hero)] px-6 py-8 text-center text-primary-foreground">
          <CheckCircle2 className="mx-auto h-10 w-10" aria-hidden />
          <p className="mt-3 text-sm opacity-85">Votre code de retrait</p>
          <p className="mt-2 font-mono text-5xl font-extrabold tracking-[0.2em]">{result.code}</p>
          <p className="mt-4 text-sm opacity-85">
            Saisissez ce code sur la borne pour lancer l&apos;impression.
          </p>
        </div>
      ) : (
        // Cas normal : le code de retrait n'est remis qu'après le paiement,
        // qui se fait sur l'écran où le QR code a été scanné.
        <div className="rounded-2xl bg-[image:var(--gradient-hero)] px-6 py-8 text-center text-primary-foreground">
          <CheckCircle2 className="mx-auto h-10 w-10" aria-hidden />
          <p className="mt-3 text-2xl font-extrabold">Documents reçus</p>
          <p className="mt-3 text-sm opacity-85">
            Revenez sur l&apos;écran où vous avez scanné le QR code pour choisir vos options et
            payer.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">
          {count} document{count > 1 ? 's' : ''} reçu{count > 1 ? 's' : ''} — {result.total_pages}{' '}
          page{result.total_pages > 1 ? 's' : ''}
        </p>
        <ul className="mt-3 space-y-2">
          {result.documents.map((doc) => (
            <li key={doc.job_id} className="flex items-center gap-3 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{doc.original_filename}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{doc.page_count} p.</span>
            </li>
          ))}
        </ul>
      </div>

      {result.warnings.length > 0 && (
        <Notice tone="warning" title="Certains fichiers ont été écartés">
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Notice>
      )}

      {result.code && result.code_email_failed ? (
        <Notice tone="warning" title="E-mail non envoyé">
          Nous n&apos;avons pas pu envoyer le code à {result.code_sent_to}. Notez-le bien
          ci-dessus avant de quitter cette page.
        </Notice>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {result.code
            ? `Une copie du code a été envoyée à ${result.code_sent_to}.`
            : `Votre code de retrait sera envoyé à ${result.code_sent_to} dès le paiement confirmé.`}
        </p>
      )}
    </div>
  )
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: 'error' | 'warning'
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border p-4 text-sm',
        tone === 'error'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-700',
      )}
    >
      <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  )
}
