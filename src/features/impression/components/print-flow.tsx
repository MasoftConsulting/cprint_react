'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  Wallet,
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
  resumedSession,
  sameTabUploadHref,
  sessionPreviewUrl,
  topUpWallet,
  verifyCode,
  type ColorMode,
  type Duplex,
  type PaperSize,
  type Payment,
  type PaymentSummary,
  type PrintDocument,
  type PrintSession,
  type Quote,
  type WalletQuote,
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
 * Trois chemins mènent aux documents : l'écran suit la session en direct (le
 * client téléverse depuis son téléphone), la page d'envoi ouverte dans ce même
 * onglet y ramène (`?session=…`), ou le client saisit le code reçu par e-mail
 * (il revient plus tard, par exemple pour payer).
 *
 * Le montant affiché ici n'est jamais celui qui fait foi : il est recalculé
 * côté serveur au moment de payer et de nouveau au moment d'imprimer.
 */

type Step = 'resuming' | 'start' | 'waiting' | 'documents' | 'paying' | 'topup' | 'ready'

const SESSION_POLL_MS = 3000
const PAYMENT_POLL_MS = 3000
const MAX_COPIES = 20

/** Ce que le client emporte à la borne : son code, et ce qu'il a réglé. */
type Ready = {
  paid: { amount: number; currency: string } | null
  pages: number
  /** Paiement de démonstration (aucune transaction réelle). */
  simulated: boolean
  /**
   * Comment l'impression a été réglée. Un débit de crédit ou de portefeuille
   * n'est pas un paiement : annoncer « paiement confirmé » à quelqu'un qui n'a
   * rien payé à l'instant lui ferait chercher une transaction inexistante sur
   * son téléphone.
   */
  provider?: Payment['provider']
}

/**
 * Lit le jeton de session au retour de la page d'envoi (`?session=…`).
 * Côté client, comme la page d'envoi : la page `/imprimer` reste statique.
 * À placer sous un `<Suspense>`.
 */
export function PrintFlowFromQuery() {
  const params = useSearchParams()
  return <PrintFlow resumeToken={params.get('session')} />
}

export function PrintFlow({ resumeToken = null }: { resumeToken?: string | null }) {
  const [step, setStep] = useState<Step>(resumeToken ? 'resuming' : 'start')
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
  const [paperSize, setPaperSize] = useState<PaperSize>('A4')
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
    () =>
      `${[...selected].sort((a, b) => a - b).join(',')}|${colorMode}|${copies}|${paperSize}`,
    [selected, colorMode, copies, paperSize],
  )

  const [quoteState, setQuoteState] = useState<{ key: string; quote: Quote } | null>(null)
  const [paymentState, setPaymentState] = useState<{ key: string; payment: Payment } | null>(null)
  /**
   * Recharge du portefeuille en cours. Volontairement rangée à part du
   * paiement d'impression : elle ne vaut pour aucune sélection, et un
   * changement d'options ne doit pas l'annuler — l'argent rechargé reste
   * acquis quoi qu'il arrive ensuite.
   */
  const [topUp, setTopUp] = useState<Payment | null>(null)
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
    setPaperSize('A4')
    setDuplex('SIMPLEX')
    setCopies(1)
    setQuoteState(null)
    setPaymentState(null)
    setTopUp(null)
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
    async (
      paid: Ready['paid'],
      pages: number,
      simulated = false,
      provider?: Payment['provider'],
    ) => {
      setReady({ paid, pages, simulated, provider })
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

  // --- Retour de la page d'envoi ouverte dans cet onglet ---------------------
  useEffect(() => {
    if (!resumeToken) return

    let cancelled = false
    getSession(resumeToken)
      .then((state) => {
        if (cancelled) return
        // Le jeton quitte l'adresse : un rechargement repart de l'accueil
        // plutôt que de rejouer la reprise.
        window.history.replaceState(null, '', '/imprimer')
        if (state.status === 'EXPIRED') {
          setError('La session a expiré. Recommencez pour obtenir un nouveau QR code.')
          setStep('start')
          return
        }
        setSession(resumedSession(state, window.location.origin))
        if (state.code) {
          // Impression gratuite : le code a été remis dès l'envoi.
          setCode(state.code)
          setReady({ paid: null, pages: state.total_pages, simulated: false })
          setStep('ready')
        } else if (state.documents.length > 0) {
          showDocuments(state.documents)
        } else {
          // Rien d'envoyé (retour arrière) : on réaffiche le QR code.
          setStep('waiting')
        }
      })
      .catch((cause) => {
        if (cancelled) return
        window.history.replaceState(null, '', '/imprimer')
        setError(messageOf(cause, 'Session introuvable. Recommencez.'))
        setStep('start')
      })

    return () => {
      cancelled = true
    }
  }, [resumeToken, showDocuments])

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
    // L'adresse permet à la centrale de dire si un compte à crédit couvre
    // l'impression, et combien il restera après.
    getQuote(selected, colorMode, copies, session?.email ?? null, paperSize)
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
    // `session?.email` en dépendance : c'est elle qui détermine si un compte à
    // crédit couvre l'impression. L'omettre afficherait un devis de client
    // payant à quelqu'un qui a du crédit.
  }, [step, selected, colorMode, copies, paperSize, optionsKey, session?.email])

  /**
   * Relit le devis sans attendre le prochain changement d'options : appelé
   * après une recharge, pour que le nouveau solde apparaisse immédiatement.
   */
  const sessionEmail = session?.email ?? null
  const refreshQuote = useCallback(async () => {
    if (selected.length === 0) return
    try {
      const next = await getQuote(selected, colorMode, copies, sessionEmail, paperSize)
      setQuoteState({ key: optionsKey, quote: next })
    } catch {
      // Le devis affiché reste celui d'avant : le serveur recalculera de
      // toute façon au moment de payer.
    }
  }, [selected, colorMode, copies, sessionEmail, paperSize, optionsKey])

  // --- Recharge du portefeuille ----------------------------------------------
  async function handleTopUp(amount: number) {
    if (!session?.email) return
    setBusy(true)
    setError(null)
    try {
      const created = await topUpWallet(session.email, amount)
      setTopUp(created)
      if (created.status === 'APPROVED') {
        // Mode simulé : le solde est déjà crédité.
        await refreshQuote()
        setTopUp(null)
      } else {
        setStep('topup')
      }
    } catch (cause) {
      setError(messageOf(cause, "La recharge n'a pas pu être lancée."))
    } finally {
      setBusy(false)
    }
  }

  // --- Suivi de la recharge en cours -----------------------------------------
  // Le solde n'est crédité qu'à la confirmation du webhook : cet écran attend
  // cette confirmation, il ne la suppose pas parce que le client est revenu.
  useEffect(() => {
    if (step !== 'topup' || !topUp || topUp.status !== 'PENDING') return

    let cancelled = false
    const timer = setInterval(async () => {
      try {
        const next = await getPayment(topUp.reference)
        if (cancelled) return

        if (next.status === 'APPROVED') {
          setTopUp(null)
          await refreshQuote()
          setStep('documents')
        } else if (next.status !== 'PENDING') {
          setTopUp(null)
          setError("La recharge n'a pas abouti. Votre solde est inchangé.")
          setStep('documents')
        } else {
          setTopUp(next)
        }
      } catch {
        // Réessai au tour suivant.
      }
    }, PAYMENT_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [step, topUp, refreshQuote])

  // --- Paiement --------------------------------------------------------------
  async function handlePay() {
    setBusy(true)
    setError(null)
    try {
      const created = await createPayment(
        { job_ids: selected, color_mode: colorMode, duplex, copies, paper_size: paperSize },
        session?.email ?? null,
      )
      setPaymentState({ key: optionsKey, payment: created })

      if (created.status === 'APPROVED') {
        // Mode simulé (FedaPay pas encore branché) : validé immédiatement.
        showReady(
          paidOf(created),
          created.pages,
          created.provider === 'SIMULATED',
          created.provider,
        )
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
          showReady(paidOf(next), next.pages, next.provider === 'SIMULATED', next.provider)
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

      {step === 'resuming' && (
        <Card>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Récupération de vos documents…
          </p>
        </Card>
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
          paperSize={paperSize}
          onPaperSize={setPaperSize}
          duplex={duplex}
          onDuplex={setDuplex}
          copies={copies}
          onCopies={setCopies}
          quote={quote}
          busy={busy}
          onPay={handlePay}
          onTopUp={session?.email ? handleTopUp : null}
          onReady={() => showReady(null, quote?.pages ?? 0)}
          onBack={reset}
        />
      )}

      {step === 'paying' && payment && (
        <PayingStep payment={payment} onCancel={() => setStep('documents')} />
      )}

      {step === 'topup' && topUp && (
        <TopUpStep
          payment={topUp}
          onCancel={() => {
            setTopUp(null)
            setStep('documents')
          }}
        />
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
            Pas de lecteur de QR code ? Ouvrez cette adresse sur votre téléphone, ou cliquez
            dessus pour envoyer vos fichiers depuis cet ordinateur :
            <br />
            {/* Même onglet : après l'envoi, la page d'envoi ramène ici
                (`?session=…`), directement sur les options et le paiement. */}
            <Link
              href={sameTabUploadHref(session.token)}
              className="mt-1 inline-block font-mono break-all text-primary underline underline-offset-2 hover:text-primary-dark"
            >
              {session.upload_url}
            </Link>
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
  paperSize,
  onPaperSize,
  duplex,
  onDuplex,
  copies,
  onCopies,
  quote,
  busy,
  onPay,
  onTopUp,
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
  paperSize: PaperSize
  onPaperSize: (value: PaperSize) => void
  duplex: Duplex
  onDuplex: (value: Duplex) => void
  copies: number
  onCopies: (value: number) => void
  quote: Quote | null
  busy: boolean
  onPay: () => void
  /** `null` dans le parcours par code : recharger exige l'adresse de la session. */
  onTopUp: ((amount: number) => void) | null
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Choice
          label="Format"
          icon={<FileText className="h-4 w-4" aria-hidden />}
          value={paperSize}
          onChange={onPaperSize}
          options={[
            { value: 'A4', label: 'A4' },
            { value: 'A3', label: 'A3' },
          ]}
        />
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

          {/* L'A3 double le prix de chaque page, et tous les points n'en font
              pas. Le dire ici, pendant que le choix se fait, évite au client
              de l'apprendre devant une borne qui refuse son code. */}
          {quote.paper_size === 'A3' && (
            <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
              <strong className="text-foreground">A3 : deux fois le tarif A4</strong> par page.
              Tous les points Campus Print ne sont pas équipés — renseignez-vous avant de vous
              déplacer.
            </p>
          )}

          {/* Compte à crédit : ce que l'impression coûte, et ce qu'il restera.
              Le solde est en pages noir & blanc, une page couleur en consomme
              2 — d'où un nombre de pages requises parfois supérieur au nombre
              de pages du document. */}
          {quote.credit && (
            <div className="mt-3 border-t border-border/60 pt-3 text-sm">
              {quote.credit.couvert ? (
                <>
                  <p className="font-medium text-emerald-700">
                    Imprimé sur votre crédit — rien à payer.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {quote.credit.pages_requises} page
                    {quote.credit.pages_requises > 1 ? 's' : ''} déduite
                    {quote.credit.pages_requises > 1 ? 's' : ''} de vos{' '}
                    {quote.credit.pages_disponibles} — il vous restera{' '}
                    <strong>{quote.credit.pages_restantes}</strong> page
                    {quote.credit.pages_restantes > 1 ? 's' : ''}.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-amber-700">Crédit insuffisant.</p>
                  <p className="mt-1 text-muted-foreground">
                    {quote.credit.pages_requises} page
                    {quote.credit.pages_requises > 1 ? 's' : ''} nécessaire
                    {quote.credit.pages_requises > 1 ? 's' : ''}, il vous en reste{' '}
                    {quote.credit.pages_disponibles}. Cette impression est à payer
                    normalement ; votre crédit n&apos;est pas entamé.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Portefeuille PrintPoint : en argent, et rechargé par le client
              lui-même. Affiché après le crédit, dans l'ordre où la centrale
              les sollicite — le crédit en pages passe en premier. */}
          {quote.portefeuille && (
            <div className="mt-3 border-t border-border/60 pt-3 text-sm">
              {quote.portefeuille.couvert ? (
                <>
                  <p className="font-medium text-emerald-700">
                    Réglé par votre portefeuille — rien à payer maintenant.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {formatAmount(quote.portefeuille.montant, quote.portefeuille.devise)} déduits
                    de vos {formatAmount(quote.portefeuille.solde, quote.portefeuille.devise)} — il
                    vous restera{' '}
                    <strong>
                      {formatAmount(quote.portefeuille.restant, quote.portefeuille.devise)}
                    </strong>
                    .
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-amber-700">Solde insuffisant.</p>
                  <p className="mt-1 text-muted-foreground">
                    Il vous reste{' '}
                    {formatAmount(quote.portefeuille.solde, quote.portefeuille.devise)}, il manque{' '}
                    <strong>
                      {formatAmount(quote.portefeuille.manquant, quote.portefeuille.devise)}
                    </strong>
                    . Rechargez, ou payez cette impression normalement — votre solde n&apos;est
                    pas entamé.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recharger est proposé ici, au moment où le besoin apparaît, et non
          sur un écran séparé : un client à qui il manque 200 F ne va pas
          chercher une page « mon portefeuille ». */}
      {onTopUp &&
        quote &&
        // Rien à recharger si l'impression est gratuite (aucun tarif
        // configuré), ni si un prépaiement la couvre déjà.
        quote.amount > 0 &&
        !quote.portefeuille?.couvert &&
        !quote.credit?.couvert && (
        <TopUpOffer
          amounts={quote.montants_de_recharge ?? []}
          wallet={quote.portefeuille ?? null}
          currency={quote.currency}
          busy={busy}
          onTopUp={onTopUp}
        />
      )}

      <div className="mt-6 space-y-3">
        {/* L'ordre suit celui de la centrale : le crédit en pages est sollicité
            avant le portefeuille. L'inverse annoncerait un débit du solde là
            où le serveur débiterait le crédit. */}
        {quote?.credit?.couvert ? (
          // Passe par onPay malgré l'absence de paiement : c'est cet appel qui
          // débite le crédit et libère le code de retrait. onReady ne ferait ni
          // l'un ni l'autre.
          <PrimaryButton onClick={onPay} disabled={busy || nothingSelected} busy={busy}>
            <Wallet className="h-5 w-5" aria-hidden />
            Imprimer sur mon crédit
          </PrimaryButton>
        ) : quote?.portefeuille?.couvert ? (
          <PrimaryButton onClick={onPay} disabled={busy || nothingSelected} busy={busy}>
            <Wallet className="h-5 w-5" aria-hidden />
            Imprimer sur mon solde
          </PrimaryButton>
        ) : quote?.payment_required ? (
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

/**
 * Proposition de recharge du portefeuille PrintPoint.
 *
 * Les montants viennent de la centrale (`WALLET_TOPUP_AMOUNTS`) et ne sont
 * jamais codés ici : une liste figée côté navigateur finirait par proposer un
 * montant que la centrale refuse, après que le client l'a choisi.
 *
 * Le montant qui suffit tout juste est mis en avant — c'est presque toujours
 * celui que le client veut, et le chercher dans la liste est un effort inutile.
 */
function TopUpOffer({
  amounts,
  wallet,
  currency,
  busy,
  onTopUp,
}: {
  amounts: number[]
  /** `null` = cette adresse n'a jamais rechargé : on explique le principe. */
  wallet: WalletQuote | null
  currency: string
  busy: boolean
  onTopUp: (amount: number) => void
}) {
  if (amounts.length === 0) return null

  const manquant = wallet?.manquant ?? 0
  const suffisant = manquant > 0 ? amounts.find((amount) => amount >= manquant) : undefined

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border px-5 py-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Wallet className="h-4 w-4 text-primary" aria-hidden />
        {wallet ? 'Recharger mon portefeuille' : 'Payer d’avance avec un portefeuille PrintPoint'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {wallet
          ? 'Vos prochaines impressions seront débitées de ce solde, sans repasser par un paiement mobile.'
          : 'Rechargez une fois, puis imprimez à l’unité sans repasser par un paiement mobile à chaque fois.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {amounts.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={busy}
            onClick={() => onTopUp(amount)}
            className={cn(
              'h-11 rounded-xl border px-4 text-sm font-semibold transition-colors disabled:opacity-50',
              amount === suffisant
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-accent',
            )}
          >
            {formatAmount(amount, currency)}
            {amount === suffisant && (
              <span className="ml-1 font-normal text-muted-foreground">· suffit</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Attente de la confirmation d'une recharge.
 *
 * Le solde n'est crédité qu'à la confirmation du webhook signé, jamais parce
 * que le client est revenu sur cette page : il suffirait sinon de taper
 * l'adresse de retour pour se créditer gratuitement.
 */
function TopUpStep({ payment, onCancel }: { payment: Payment; onCancel: () => void }) {
  return (
    <Card>
      <StepHeader
        icon={<Wallet className="h-5 w-5" aria-hidden />}
        title={`Recharger ${formatAmount(payment.amount, payment.currency)}`}
        subtitle="Réglez avec Flooz, T-Money/Mixx ou votre carte. Le solde sera crédité dès la confirmation, et vos impressions en seront ensuite débitées."
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
          En attente de la confirmation de la recharge…
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
        Revenir aux documents
      </button>
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

/**
 * Titre de l'écran final, selon la façon dont l'impression a été réglée.
 *
 * Un crédit et un portefeuille ne sont pas des paiements : ils ont été
 * encaissés avant, et le client n'a rien à chercher sur son téléphone.
 */
function titreDe(ready: Ready): string {
  if (!ready.paid) return 'Vos documents sont prêts'
  if (ready.provider === 'CREDIT') return 'Déduit de votre crédit'
  if (ready.provider === 'WALLET') return 'Déduit de votre solde'
  return 'Paiement confirmé'
}

function detailDe(ready: Ready): string {
  if (!ready.paid) return "Rien ne sera imprimé avant votre passage à la borne."
  const pages = `${ready.pages} page${ready.pages > 1 ? 's' : ''}`
  const montant = formatAmount(ready.paid.amount, ready.paid.currency)
  if (ready.provider === 'CREDIT') return `${pages} déduites de votre crédit.`
  if (ready.provider === 'WALLET') return `${montant} déduits de votre solde — ${pages}.`
  return `${montant} réglés — ${pages}.`
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
        <h2 className="mt-4 text-2xl font-extrabold">{titreDe(ready)}</h2>
        <p className="mt-2 text-muted-foreground">{detailDe(ready)}</p>
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
