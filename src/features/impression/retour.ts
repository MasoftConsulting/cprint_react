/**
 * La page d'où part un paiement, pour y revenir une fois le prestataire passé.
 *
 * La page de paiement s'ouvre dans l'onglet du client ; le prestataire le
 * renvoie ensuite sur `/imprimer/paiement` ou `/imprimer/portefeuille`, qui
 * lisent le statut — puis le ramènent ici, au lieu de le laisser sur une page
 * sans issue.
 *
 * Gardé dans `sessionStorage` : propre à cet onglet, il survit au détour par
 * le prestataire et disparaît avec l'onglet. Un paiement réglé sur un autre
 * appareil (le QR code d'une borne) n'a rien de mémorisé : la page de retour
 * garde alors son message.
 */
const PREFIXE = 'retour-paiement:'

/** Seule une page de ce site est acceptée : jamais une adresse extérieure. */
function interne(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//')
}

export function memoriserRetour(reference: string, url: string) {
  if (!reference || !interne(url)) return
  try {
    sessionStorage.setItem(PREFIXE + reference, url)
  } catch {
    // Stockage refusé (navigation privée stricte) : la page de retour garde
    // son message, le client revient à la main.
  }
}

/** La page d'appel de ce paiement, ou `null`. */
export function lireRetour(reference: string): string | null {
  if (!reference) return null
  try {
    const url = sessionStorage.getItem(PREFIXE + reference)
    return url && interne(url) ? url : null
  } catch {
    return null
  }
}

/** Ajoute la référence du paiement à la page d'appel, pour qu'elle l'affiche. */
export function avecPaiement(url: string, reference: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}paiement=${encodeURIComponent(reference)}`
}
