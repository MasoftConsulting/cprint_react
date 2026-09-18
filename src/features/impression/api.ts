/**
 * Client de l'API d'impression (FastAPI).
 *
 * Cette API tourne sur la machine du magasin, celle qui parle réellement à la
 * Sharp par le réseau local — un hébergement cloud ne peut pas joindre une
 * imprimante physique. Elle est exposée à l'extérieur par un tunnel Cloudflare
 * (voir `campus-print/deploy/cloudflared/`), et c'est cette URL publique que
 * porte `NEXT_PUBLIC_PRINT_API_URL`.
 *
 * Volontairement appelée depuis le navigateur et non depuis un Server Action :
 * les fichiers doivent de toute façon atterrir sur la machine qui imprime. Les
 * faire transiter par Next.js les ferait voyager deux fois, avec la limite de
 * taille du serverless au milieu, pour aucun bénéfice.
 */

export const PRINT_API_URL = (process.env.NEXT_PUBLIC_PRINT_API_URL ?? '').replace(/\/$/, '')

/** Le service d'impression est-il configuré ? Sans URL, les écrans le disent au lieu de planter. */
export const isPrintApiConfigured = PRINT_API_URL.length > 0

/**
 * Destination des boutons « Imprimer un document » du site.
 *
 * Tant que l'API n'est pas branchée (tunnel pas encore en place, variable
 * absente sur Vercel), ces boutons gardent leur destination d'avant plutôt que
 * de mener à une page « bientôt disponible ». Ils basculent d'eux-mêmes sur le
 * parcours en ligne au premier déploiement où la variable est renseignée.
 */
export function printEntryHref(fallback: string) {
  return isPrintApiConfigured ? '/imprimer' : fallback
}

export type PrintSession = {
  token: string
  email: string
  status: SessionStatus
  upload_url: string
  qrcode_url: string
  expires_at: string
}

export type SessionStatus = 'PENDING' | 'FILES_RECEIVED' | 'COMPLETED' | 'EXPIRED'

export type PrintDocument = {
  job_id: number
  original_filename: string
  file_size_bytes: number
  page_count: number
}

export type SessionState = {
  token: string
  status: SessionStatus
  email: string
  documents: PrintDocument[]
  total_pages: number
  /** `null` tant que le code de retrait n'a pas été remis, c'est-à-dire avant le paiement. */
  code: string | null
  expires_at: string
  warnings: string[]
}

export type UploadResult = {
  token: string
  status: SessionStatus
  /** `null` tant que le paiement n'est pas confirmé : le code de retrait est remis après paiement. */
  code: string | null
  documents: PrintDocument[]
  total_pages: number
  code_sent_to: string
  code_email_failed: boolean
  warnings: string[]
}

/** Paiement déjà effectué (ou en cours) pour les documents d'un code. */
export type PaymentSummary = {
  reference: string
  status: Payment['status']
  amount: number
  currency: string
  pages: number
  job_ids: number[]
  color_mode: ColorMode
  duplex: Duplex
  copies: number
}

export type VerifiedCode = {
  code: string
  attachments: PrintDocument[]
  expires_at: string
  warnings: string[]
  payment: PaymentSummary | null
}

export type ColorMode = 'COLOR' | 'MONO'
export type Duplex = 'SIMPLEX' | 'DUPLEX'

export type PrintOptions = {
  job_ids: number[]
  color_mode: ColorMode
  duplex: Duplex
  copies: number
}

export type Quote = {
  pages: number
  amount: number
  currency: string
  payment_required: boolean
}

export type Payment = {
  reference: string
  provider: 'FEDAPAY' | 'SIMULATED'
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELED' | 'EXPIRED'
  amount: number
  currency: string
  pages: number
  /** Page de paiement FedaPay. `null` en mode simulé : le paiement est déjà validé. */
  payment_url: string | null
}

/**
 * Erreur renvoyée par l'API, avec son code HTTP : l'écran distingue ainsi
 * « il faut payer » (402) d'une saisie erronée (404), et affiche le message
 * du serveur plutôt qu'un texte générique.
 */
export class PrintApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'PrintApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isPrintApiConfigured) {
    throw new PrintApiError(
      "Le service d'impression n'est pas configuré (NEXT_PUBLIC_PRINT_API_URL).",
      0,
    )
  }

  let response: Response
  try {
    response = await fetch(`${PRINT_API_URL}${path}`, init)
  } catch {
    // Panne réseau, tunnel coupé, borne hors ligne : le message doit renvoyer
    // vers une action concrète, pas afficher « Failed to fetch ».
    throw new PrintApiError(
      "Le service d'impression est injoignable. Vérifiez la connexion, puis réessayez.",
      0,
    )
  }

  if (!response.ok) {
    let detail = `Erreur ${response.status}.`
    try {
      const body = (await response.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      // Réponse non-JSON (proxy, page d'erreur du tunnel) : on garde le message par défaut.
    }
    throw new PrintApiError(detail, response.status)
  }

  return (await response.json()) as T
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Démarre une session : c'est ce qu'appelle le bouton « Imprimer un document ». */
export function createSession(email: string) {
  return postJson<PrintSession>('/sessions', { email })
}

/** État de la session, interrogé en boucle par l'écran pendant le téléversement. */
export function getSession(token: string) {
  return request<SessionState>(`/sessions/${token}`, { cache: 'no-store' })
}

/** Téléversement depuis le téléphone, après scan du QR code. */
export function uploadToSession(token: string, files: File[]) {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  return request<UploadResult>(`/sessions/${token}/upload`, { method: 'POST', body: form })
}

/** Vérifie le code à 6 chiffres saisi sur la borne. */
export function verifyCode(code: string) {
  return postJson<VerifiedCode>('/jobs/verify', { code })
}

/** Montant à payer pour cette sélection — même formule que le paiement lui-même. */
export function getQuote(job_ids: number[], color_mode: ColorMode, copies: number) {
  return postJson<Quote>('/payments/quote', { job_ids, color_mode, copies })
}

export function createPayment(options: PrintOptions, email: string | null) {
  return postJson<Payment>('/payments', { ...options, email })
}

export function getPayment(reference: string) {
  return request<Payment>(`/payments/${reference}`, { cache: 'no-store' })
}

// Pas de fonction d'impression ici, volontairement : imprimer n'est possible
// que depuis la borne du magasin, après saisie du code de retrait. L'API refuse
// d'ailleurs toute demande d'impression venue d'Internet.

/**
 * Page d'envoi ouverte dans l'onglet même du parcours : après l'envoi, elle
 * ramène ici (`/imprimer?session=…`) pour choisir les options et payer.
 */
export function sameTabUploadHref(token: string) {
  return `/imprimer/upload?session=${encodeURIComponent(token)}&retour=1`
}

/**
 * Session reprise depuis son jeton, au retour de la page d'envoi. Les deux
 * URL sont reconstruites à l'identique de celles que l'API fournit à la
 * création : l'API n'a pas besoin d'évoluer pour cette reprise.
 */
export function resumedSession(state: SessionState, origin: string): PrintSession {
  return {
    token: state.token,
    email: state.email,
    status: state.status,
    expires_at: state.expires_at,
    upload_url: `${origin}/imprimer/upload?session=${state.token}`,
    qrcode_url: `${PRINT_API_URL}/sessions/${state.token}/qrcode.png`,
  }
}

/** Aperçu avant paiement, protégé par le jeton de session (le code n'existe pas encore pour le client). */
export function sessionPreviewUrl(token: string, jobId: number) {
  return `${PRINT_API_URL}/sessions/${token}/documents/${jobId}/preview`
}

/** URL d'aperçu d'un document, protégée par le même code que l'impression. */
export function previewUrl(jobId: number, code: string) {
  return `${PRINT_API_URL}/jobs/${jobId}/preview?code=${encodeURIComponent(code)}`
}

export function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString('fr-FR')} ${currency}`
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
