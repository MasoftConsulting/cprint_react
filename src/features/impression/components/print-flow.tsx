'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Palette,
  RefreshCw,
  Smartphone,
} from 'lucide-react'

import { cn } from '@/lib/cn'
import {
  createPayment,
  createSession,
  formatAmount,
  formatSize,
  getPayment,
  getQuote,
  getSession,
  isPrintApiConfigured,
  previewUrl,
  PrintApiError,
  sessionPreviewUrl,
  verifyCode,
  type ColorMode,
  type Duplex,
  type Payment,
  type PaymentSummary,
  type PrintDocument,
  type PrintSession,
  type Quote,
} from '../api'

/**
 * Parcours d'impression en ligne — tout sauf l'impression elle-même.
 *
 *   e-mail  →  QR code  →  (le client téléverse depuis son téléphone)
 *           →  options  →  paiement  →  « rendez-vous à la borne avec votre code »
 *
 * **Rien ne s'imprime depuis cette page.** Elle est accessible de partout :
 * si payer faisait sortir les pages, elles tomberaient au magasin pendant que
 * le client est encore chez lui. L'impression est libérée sur la borne du
 * magasin, quand le client y saisit son code de retrait — et l'API refuse de
 * toute façon d'imprimer sur demande venue d'Internet.
 *
 * Deux chemins mènent aux documents : l'écran suit la session en direct (le
 * client vient de téléverser), ou le client saisit le code reçu par e-mail (il
 * revient plus tard, par exemple pour payer).
 *
 * Le montant affiché ici n'est jamais celui qui fait foi : il est recalculé
 * côté serveur au moment de payer et de nouveau au moment d'imprimer.
 */

type Step = 'start' | 'waiting' | 'documents' | 'paying' | 'ready'

const SESSION_POLL_MS = 3000
const PAYMENT_POLL_MS = 3000
const MAX_COPIES = 20

/** Ce que le client emporte à la borne : son code, et ce qu'il a réglé. */
type Ready = {
  paid: { amount: number; currency: string } | null
  pages: number
  /** Paiement de démonstration (aucune transaction réelle). */
  simulated: boolean
}

export function PrintFlow() {
  const [step, setStep] = useState<Step>('start')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Session (chemin QR code)
  const [email, setEmail] = useState('')
  const [session, setSession] = useState<PrintSession | null>(null)

  // Documents, quel que soit le chemin emprunté
  const [code, setCode] = useState('')
  const [documents, setDocuments] = useState<PrintDocument[]>([])
  const [selected, setSelected] = useState<number[]>([])

  // Options
  const [colorMode, setColorMode] = useState<ColorMode>('MONO')
  const [duplex, setDuplex] = useState<Duplex>('SIMPLEX')
  const [copies, setCopies] = useState(1)

  const [ready, setReady] = useState<Ready | null>(null)
  const [preview, setPreview] = useState<number | null>(null)

  /**
   * Empreinte de ce qui est facturable : documents sélectionnés, couleur,
   * nombre d'exemplaires. Un devis et un paiement ne valent que pour
   * l'empreinte sous laquelle ils ont été obtenus.
   *
   * Le rattachement est ce qui invalide automatiquement un paiement quand la
   * sélection ou les options changent — il faudrait sinon pouvoir payer deux
   * pages en noir et blanc puis en imprimer cinquante en couleur. Le serveur
   * applique la même règle de son côté (`payment_service.assert_paid`) ; cet
   * état dérivé ne fait que l'exprimer à l'écran, sans jamais s'y substituer.
   */
  const optionsKey = useMemo(
    () => `${[...selected].sort((a, b) => a - b).join(',')}|${colorMode}|${copies}`,
    [selected, colorMode, copies],
  )

  const [quoteState, setQuoteState] = useState<{ key: string; quote: Quote } | null>(null)
  const [paymentState, setPaymentState] = useState<{ key: string; payment: Payment } | null>(null)
  const quote = quoteState?.key === optionsKey ? quoteState.quote : null
  const payment = paymentState?.key === optionsKey ? paymentState.payment : null

  const reset = useCallback(() => {
    setStep('start')
    setError(null)
    setBusy(false)
    setEmail('')
    setSession(null)
    setCode('')
    setDocuments([])
    setSelected([])
    setColorMode('MONO')
    setDuplex('SIMPLEX')
    setCopies(1)
    setQuoteState(null)
    setPaymentState(null)
    setReady(null)
    setPreview(null)
  }, [])

  const showDocuments = useCallback((docs: PrintDocument[]) => {
    setDocuments(docs)
    setSelected(docs.map((doc) => doc.job_id))
    setStep('documents')
  }, [])

  /**
   * Écran final. Dans le parcours QR code, le code de retrait n'existe pour le
   * client qu'à partir d'ici : l'API ne le remet (e-mail + écran) qu'une fois
   * le paiement confirmé, c'est la preuve du paiement. On le relit donc sur la
   * session à ce moment-là, jamais avant.
   */
  const showReady = useCallback(
    async (paid: Ready['paid'], pages: number, simulated = false) => {
      setReady({ paid, pages, simulated })
      setStep('ready')
      if (!session) return
      try {
        const state = await getSession(session.token)
        if (state.code) setCode(state.code)
      } catch {
        // Le code est aussi parti par e-mail : l'écran final le signale.
      }
    },
    [session],
  )

  // --- Étape 1 : démarrer une session ---------------------------------------
  async function handleStart(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setSession(await createSession(email.trim()))
      setStep('waiting')
    } catch (cause) {
      setError(messageOf(cause, 'Impossible de démarrer la session.'))
    } finally {
      setBusy(false)
    }
  }

  // --- Étape 2 : suivre la session pendant que le téléphone téléverse -------
  useEffect(() => {
    if (step !== 'waiting' || !session) return

    let cancelled = false
    const timer = setInterval(async () => {
      try {
        const state = await getSession(session.token)
        if (cancelled) return
        if (state.documents.length > 0) {
          // Pas de code à ce stade : il n'est remis qu'après le paiement.
          showDocuments(state.documents)
        } else if (state.status === 'EXPIRED') {
          setError('La session a expiré. Recommencez pour obtenir un nouveau QR code.')
          setStep('start')
        }
      } catch {
        // Coupure passagère : on laisse le prochain tour réessayer plutôt que
        // d'effacer le QR code sous les yeux du client.
      }
    }, SESSION_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [step, session, showDocuments])

  // --- Saisie manuelle du code ----------------------------------------------
  async function handleCode(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const verified = await verifyCode(code.trim())
      if (verified.payment?.status === 'APPROVED') {
        // Déjà payé : il ne reste qu'à passer à la borne.
        showReady(paidOf(verified.payment), verified.payment.pages)
      } else {
        showDocuments(verified.attachments)
      }
    } catch (cause) {
      setError(messageOf(cause, 'Code invalide ou expiré.'))
    } finally {
      setBusy(false)
    }
  }

  // --- Devis, recalculé à chaque changement d'options ------------------------
  // Le résultat est rangé avec son empreinte : un devis périmé cesse d'être
  // affiché de lui-même, sans avoir à l'effacer depuis cet effet.
  useEffect(() => {
    if (step !== 'documents' || selected.length === 0) return

    let cancelled = false
    getQuote(selected, colorMode, copies)
      .then((next) => {
        if (!cancelled) setQuoteState({ key: optionsKey, quote: next })
      })
      .catch(() => {
        // Coupure passagère : le résumé reste sans montant, le serveur
        // recalculera de toute façon au moment de payer.
      })

    return () => {
      cancelled = true
    }
  }, [step, selected, colorMode, copies, optionsKey])

  // --- Paiement --------------------------------------------------------------
  async function handlePay() {
    setBusy(true)
    setError(null)
    try {
      const created = await createPayment(
        { job_ids: selected, color_mode: colorMode, duplex, copies },
        session?.email ?? null,
      )
      setPaymentState({ key: optionsKey, payment: created })

      if (created.status === 'APPROVED') {
        // Mode simulé (FedaPay pas encore branché) : validé immédiatement.
        showReady(paidOf(created), created.pages, created.provider === 'SIMULATED')
      } else {
        setStep('paying')
      }
    } catch (cause) {
      setError(messageOf(cause, 'Le paiement a échoué.'))
    } finally {
      setBusy(false)
    }
  }

  // --- Suivi du paiement en cours -------------------------------------------
  useEffect(() => {
    if (step !== 'paying' || !payment || payment.status !== 'PENDING') return

    let cancelled = false
    const timer = setInterval(async () => {
      try {
        const next = await getPayment(payment.reference)
        if (cancelled) return
        setPaymentState({ key: optionsKey, payment: next })

        if (next.status === 'APPROVED') {
          showReady(paidOf(next), next.pages, next.provider === 'SIMULATED')
        } else if (next.status !== 'PENDING') {
          setError("Le paiement n'a pas abouti. Vous pouvez réessayer.")
          setStep('documents')
        }
      } catch {
        // Réessai au tour suivant.
      }
    }, PAYMENT_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [step, payment, optionsKey, showReady])

  if (!isPrintApiConfigured) {
    return (
      <Card>
        <Notice tone="warning" title="Bientôt disponible">
          L&apos;impression en ligne arrive très prochainement. En attendant, rendez-vous
          directement sur une borne Campus Print.
        </Notice>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Notice tone="error" title="Un instant">
          {error}
        </Notice>
      )}

      {step === 'start' && (
        <StartStep
          email={email}
          onEmailChange={setEmail}
          onSubmit={handleStart}
          code={code}
          onCodeChange={setCode}
          onCodeSubmit={handleCode}
          busy={busy}
        />
      )}

      {step === 'waiting' && session && (
        <WaitingStep
          session={session}
          onCancel={reset}
          code={code}
          onCodeChange={setCode}
          onCodeSubmit={handleCode}
          busy={busy}
        />
      )}

      {step === 'documents' && (
        <DocumentsStep
          documents={documents}
          selected={selected}
          onToggle={(jobId) =>
            setSelected((current) =>
              current.includes(jobId)
                ? current.filter((id) => id !== jobId)
                : [...current, jobId],
            )
          }
          previewSrc={
            session
              ? (jobId) => sessionPreviewUrl(session.token, jobId)
              : code
                ? (jobId) => previewUrl(jobId, code)
                : null
          }
          preview={preview}
          onPreview={setPreview}
          colorMode={colorMode}
          onColorMode={setColorMode}
          duplex={duplex}
          onDuplex={setDuplex}
          copies={copies}
          onCopies={setCopies}
          quote={quote}
          busy={busy}
          onPay={handlePay}
          onReady={() => showReady(null, quote?.pages ?? 0)}
          onBack={reset}
        />
      )}

      {step === 'paying' && payment && (
        <PayingStep payment={payment} onCancel={() => setStep('documents')} />
      )}

      {step === 'ready' && ready && <ReadyStep code={code} ready={ready} onRestart={reset} />}
    </div>
  )
}

function paidOf(payment: Pick<PaymentSummary, 'amount' | 'currency'>): Ready['paid'] {
  return { amount: payment.amount, currency: payment.currency }
}

// --- Étapes -----------------------------------------------------------------

function StartStep({
  email,
  onEmailChange,
  onSubmit,
  code,
  onCodeChange,
  onCodeSubmit,
  busy,
}: {
  email: string
  onEmailChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  code: string
  onCodeChange: (value: string) => void
  onCodeSubmit: (event: React.FormEvent) => void
  busy: boolean
}) {
  return (
    <>
      <Card>
        <StepHeader
          icon={<Smartphone className="h-5 w-5" aria-hidden />}
          title="Envoyez vos documents depuis votre téléphone"
          subtitle="Saisissez votre e-mail : un QR code s'affiche, vous le scannez, et vous choisissez vos fichiers sur votre téléphone."
        />
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="print-email" className="text-sm font-medium">
              Votre adresse e-mail
            </label>
            <input
              id="print-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="prenom.nom@exemple.com"
              className="mt-2 h-14 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors focus:border-primary"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Elle sert à vous envoyer votre code de retrait. Aucun autre usage.
            </p>
          </div>
          <PrimaryButton type="submit" disabled={busy || email.trim().length === 0} busy={busy}>
            Obtenir mon QR code
          </PrimaryButton>
        </form>
      </Card>

      <CodeCard code={code} onChange={onCodeChange} onSubmit={onCodeSubmit} busy={busy} />
    </>
  )
}

function WaitingStep({
  session,
  onCancel,
  code,
  onCodeChange,
  onCodeSubmit,
  busy,
}: {
  session: PrintSession
  onCancel: () => void
  code: string
  onCodeChange: (value: string) => void
  onCodeSubmit: (event: React.FormEvent) => void
  busy: boolean
}) {
  return (
    <>
      <Card>
        <StepHeader
          icon={<Smartphone className="h-5 w-5" aria-hidden />}
          title="Scannez ce QR code avec votre téléphone"
          subtitle="Ouvrez l'appareil photo de votre téléphone et visez le code. La page d'envoi s'ouvre toute seule."
        />

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-border bg-background p-4">
            {/* Image servie par l'API : une borne sans accès Internet doit
                pouvoir afficher son QR code, ce qu'une librairie JS chargée
                depuis un CDN ne permettrait pas. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.qrcode_url}
              alt="QR code à scanner pour envoyer vos documents"
              width={240}
              height={240}
              className="h-60 w-60"
            />
          </div>

          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            En attente de vos documents…
          </p>

          <p className="text-center text-xs text-muted-foreground">
            Pas de lecteur de QR code ? Ouvrez cette adresse sur votre téléphone :
            <br />
            <span className="mt-1 inline-block font-mono break-all">{session.upload_url}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Recommencer
        </button>
      </Card>

      <CodeCard code={code} onChange={onCodeChange} onSubmit={onCodeSubmit} busy={busy} />
    </>
  )
}

function DocumentsStep({
  documents,
  selected,
  onToggle,
  previewSrc,
  preview,
  onPreview,
  colorMode,
  onColorMode,
  duplex,
  onDuplex,
  copies,
  onCopies,
  quote,
  busy,
  onPay,
  onReady,
  onBack,
}: {
  documents: PrintDocument[]
  selected: number[]
  onToggle: (jobId: number) => void
  previewSrc: ((jobId: number) => string) | null
  preview: number | null
  onPreview: (jobId: number | null) => void
  colorMode: ColorMode
  onColorMode: (value: ColorMode) => void
  duplex: Duplex
  onDuplex: (value: Duplex) => void
  copies: number
  onCopies: (value: number) => void
  quote: Quote | null
  busy: boolean
  onPay: () => void
  onReady: () => void
  onBack: () => void
}) {
  const nothingSelected = selected.length === 0

  return (
    <Card>
      <StepHeader
        icon={<FileText className="h-5 w-5" aria-hidden />}
        title="Vos documents"
        subtitle="Décochez ce que vous ne voulez pas imprimer, choisissez vos options. L'impression se lance ensuite à la borne, avec votre code."
      />

      <ul className="mt-6 space-y-2">
        {documents.map((doc) => (
          <li key={doc.job_id}>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
              <input
                id={`doc-${doc.job_id}`}
                type="checkbox"
                checked={selected.includes(doc.job_id)}
                onChange={() => onToggle(doc.job_id)}
                className="h-5 w-5 shrink-0 accent-[var(--primary)]"
              />
              <label
                htmlFor={`doc-${doc.job_id}`}
                className="min-w-0 flex-1 cursor-pointer truncate text-sm font-medium"
              >
                {doc.original_filename}
              </label>
              <span className="shrink-0 text-xs text-muted-foreground">
                {doc.page_count} p. · {formatSize(doc.file_size_bytes)}
              </span>
              {previewSrc && (
                <button
                  type="button"
                  onClick={() => onPreview(preview === doc.job_id ? null : doc.job_id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  Aperçu
                </button>
              )}
            </div>
            {preview === doc.job_id && previewSrc && (
              <iframe
                src={previewSrc(doc.job_id)}
                title={`Aperçu de ${doc.original_filename}`}
                className="mt-2 h-[28rem] w-full rounded-xl border border-border"
              />
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Choice
          label="Couleur"
          icon={<Palette className="h-4 w-4" aria-hidden />}
          value={colorMode}
          onChange={onColorMode}
          options={[
            { value: 'MONO', label: 'Noir & blanc' },
            { value: 'COLOR', label: 'Couleur' },
          ]}
        />
        <Choice
          label="Impression"
          icon={<Copy className="h-4 w-4" aria-hidden />}
          value={duplex}
          onChange={onDuplex}
          options={[
            { value: 'SIMPLEX', label: 'Recto' },
            { value: 'DUPLEX', label: 'Recto verso' },
          ]}
        />
        <div>
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Copy className="h-4 w-4" aria-hidden />
            Exemplaires
          </span>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCopies(Math.max(1, copies - 1))}
              aria-label="Diminuer le nombre d'exemplaires"
              className="h-12 w-12 shrink-0 rounded-xl border border-border text-xl font-semibold transition-colors hover:bg-accent"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COPIES}
              value={copies}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10)
                onCopies(
                  Number.isFinite(parsed) ? Math.min(MAX_COPIES, Math.max(1, parsed)) : 1,
                )
              }}
              className="h-12 w-full rounded-xl border border-border bg-background text-center text-base outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => onCopies(Math.min(MAX_COPIES, copies + 1))}
              aria-label="Augmenter le nombre d'exemplaires"
              className="h-12 w-12 shrink-0 rounded-xl border border-border text-xl font-semibold transition-colors hover:bg-accent"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {quote && (
        <div className="mt-6 rounded-xl bg-accent px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              {quote.pages} page{quote.pages > 1 ? 's' : ''} à imprimer
            </span>
            {quote.payment_required && (
              <span className="text-2xl font-extrabold text-primary">
                {formatAmount(quote.amount, quote.currency)}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {quote?.payment_required ? (
          <PrimaryButton onClick={onPay} disabled={busy || nothingSelected} busy={busy}>
            <CreditCard className="h-5 w-5" aria-hidden />
            Payer {formatAmount(quote.amount, quote.currency)}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={onReady} disabled={busy || nothingSelected} busy={busy}>
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            Valider
          </PrimaryButton>
        )}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Annuler
        </button>
      </div>
    </Card>
  )
}

function PayingStep({ payment, onCancel }: { payment: Payment; onCancel: () => void }) {
  return (
    <Card>
      <StepHeader
        icon={<CreditCard className="h-5 w-5" aria-hidden />}
        title={`Payer ${formatAmount(payment.amount, payment.currency)}`}
        subtitle="Réglez avec Flooz, T-Money/Mixx ou votre carte. Vous recevrez ensuite la marche à suivre pour imprimer à la borne."
      />

      <div className="mt-6 space-y-4">
        {payment.payment_url && (
          <a
            href={payment.payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cta px-8 text-base font-medium text-cta-foreground shadow-[var(--shadow-cta)] transition-colors hover:brightness-105 active:scale-[0.98]"
          >
            Ouvrir la page de paiement
          </a>
        )}

        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          En attente de la confirmation du paiement…
        </p>

        <p className="text-center text-xs text-muted-foreground">
          Référence : <span className="font-mono">{payment.reference}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Revenir aux options
      </button>
    </Card>
  )
}

function ReadyStep({
  code,
  ready,
  onRestart,
}: {
  code: string
  ready: Ready
  onRestart: () => void
}) {
  return (
    <Card>
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden />
        <h2 className="mt-4 text-2xl font-extrabold">
          {ready.paid ? 'Paiement confirmé' : 'Vos documents sont prêts'}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {ready.paid
            ? `${formatAmount(ready.paid.amount, ready.paid.currency)} réglés — ${ready.pages} page${ready.pages > 1 ? 's' : ''}.`
            : 'Rien ne sera imprimé avant votre passage à la borne.'}
        </p>
        {ready.simulated && (
          <p className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-muted-foreground">
            Paiement de démonstration — aucun montant débité
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-[image:var(--gradient-hero)] px-6 py-8 text-center text-primary-foreground">
        <p className="text-sm opacity-85">Votre code de retrait</p>
        {code ? (
          <p className="mt-2 font-mono text-5xl font-extrabold tracking-[0.2em]">{code}</p>
        ) : (
          <p className="mt-3 flex items-center justify-center gap-2 text-base font-semibold">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Envoi en cours par e-mail…
          </p>
        )}
        <p className="mt-3 text-xs opacity-75">Une copie vous a été envoyée par e-mail.</p>
      </div>

      <div className="mt-6 flex gap-3 rounded-xl bg-accent px-5 py-4 text-sm">
        <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p>
          <span className="font-semibold">Rendez-vous à la borne Campus Print</span> et saisissez ce
          code : l&apos;impression démarre à ce moment-là, quand vous êtes devant la machine. Personne
          d&apos;autre ne peut récupérer vos pages.
        </p>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-8 text-base font-medium text-primary transition-colors hover:bg-primary/15"
      >
        <RefreshCw className="h-5 w-5" aria-hidden />
        Envoyer d&apos;autres documents
      </button>
    </Card>
  )
}

// --- Éléments partagés -------------------------------------------------------

function CodeCard({
  code,
  onChange,
  onSubmit,
  busy,
}: {
  code: string
  onChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  busy: boolean
}) {
  return (
    <Card>
      <h2 className="text-base font-semibold">Vous avez déjà un code ?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Saisissez le code à 6 chiffres reçu par e-mail après l&apos;envoi de vos documents.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          aria-label="Code à 6 chiffres"
          className="h-14 flex-1 rounded-xl border border-border bg-background px-4 text-center font-mono text-2xl tracking-[0.3em] outline-none transition-colors focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="inline-flex h-14 items-center justify-center rounded-xl bg-primary/10 px-8 text-base font-medium text-primary transition-colors hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-50"
        >
          Valider
        </button>
      </form>
    </Card>
  )
}

function Choice<T extends string>({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string
  icon: React.ReactNode
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div>
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              'h-12 rounded-xl border text-sm font-medium transition-colors',
              value === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-accent',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PrimaryButton({
  children,
  busy,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cta px-8 text-base font-medium text-cta-foreground shadow-[var(--shadow-cta)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="surface-card p-6 sm:p-8">{children}</div>
}

function StepHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
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

function messageOf(cause: unknown, fallback: string) {
  return cause instanceof PrintApiError ? cause.message : fallback
}
