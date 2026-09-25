import 'server-only'

/**
 * Accès à l'API centrale d'impression, réservé au serveur.
 *
 * Le jeton d'administration (`PRINT_ADMIN_TOKEN`) ne doit jamais atteindre le
 * navigateur : il ouvre l'accès à tous les documents et à tous les points.
 * D'où `server-only` en tête de fichier, et une variable sans préfixe
 * `NEXT_PUBLIC_`. Les pages de `/admin/impressions` sont des composants
 * serveur, et les Server Actions passent aussi par ici.
 *
 * Aucune mise en cache : ces écrans montrent l'état courant des documents et
 * des points, et servent à diagnostiquer une panne en direct.
 */

const API_URL = (process.env.PRINT_API_URL ?? process.env.NEXT_PUBLIC_PRINT_API_URL ?? '').replace(
  /\/$/,
  '',
)
const ADMIN_TOKEN = process.env.PRINT_ADMIN_TOKEN ?? ''

/** L'administration des impressions est-elle configurée ? */
export const isPrintAdminConfigured = API_URL.length > 0 && ADMIN_TOKEN.length > 0

export class PrintAdminError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PrintAdminError'
    this.status = status
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'DELETE'
  /** Corps JSON, pour les rares routes qui en prennent un. */
  body?: unknown
}

export async function callCentral<T>(path: string, options: Options = {}): Promise<T> {
  if (!isPrintAdminConfigured) {
    throw new PrintAdminError(
      "L'administration des impressions n'est pas configurée (PRINT_API_URL, PRINT_ADMIN_TOKEN).",
      0,
    )
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'X-Admin-Token': ADMIN_TOKEN,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    })
  } catch {
    // Coupure réseau, centrale arrêtée, déploiement en cours : le message doit
    // envoyer vers une action, pas afficher « fetch failed ».
    throw new PrintAdminError(
      "Le service d'impression est injoignable. Réessayez dans un instant.",
      0,
    )
  }

  if (!response.ok) {
    // 404 sans corps JSON = jeton refusé par le filtre de la centrale : elle
    // répond « Not Found » plutôt que de confirmer que la route existe.
    const detail = await response
      .json()
      .then((data: { detail?: string }) => data.detail)
      .catch(() => null)
    throw new PrintAdminError(
      detail ??
        (response.status === 404
          ? "Accès refusé par le service d'impression : vérifiez PRINT_ADMIN_TOKEN."
          : `Le service d'impression a répondu ${response.status}.`),
      response.status,
    )
  }

  return (await response.json()) as T
}
