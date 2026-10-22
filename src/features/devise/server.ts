import 'server-only'

import { cookies, headers } from 'next/headers'

import { COOKIE_DEVISE, deviseDuPays, lireDevise, type Devise } from './devise'

/**
 * Devise d'affichage du visiteur, dans cet ordre :
 *
 * 1. son choix explicite (cookie posé par le sélecteur de l'en-tête) ;
 * 2. son pays de connexion, que Vercel transmet dans `x-vercel-ip-country` :
 *    franc CFA pour la zone UEMOA, euro ailleurs ;
 * 3. l'euro, si le pays est inconnu (développement local, réseau masqué).
 *
 * Le pays n'est **pas** mémorisé : un visiteur qui voyage voit la devise du
 * lieu où il se trouve, tant qu'il n'a rien choisi.
 *
 * Lit des données de la requête : à n'appeler que sous un `<Suspense>`, pour
 * que le reste de la page reste prérendu (Cache Components).
 */
export async function getDevise(): Promise<Devise> {
  const choix = lireDevise((await cookies()).get(COOKIE_DEVISE)?.value)
  if (choix) return choix
  return deviseDuPays((await headers()).get('x-vercel-ip-country'))
}
