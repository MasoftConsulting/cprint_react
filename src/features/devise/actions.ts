'use server'

import { cookies } from 'next/headers'

import { COOKIE_DEVISE, lireDevise } from './devise'

/** Un an : le choix d'une devise ne change pas d'une visite à l'autre. */
const UN_AN = 60 * 60 * 24 * 365

/**
 * Mémorise la devise choisie par le visiteur.
 *
 * Passée à l'attribut `action` d'un formulaire : le sélecteur fonctionne donc
 * même sans JavaScript, et Next.js renvoie dans le même aller-retour la page
 * re-rendue avec les montants convertis.
 *
 * Le cookie n'est pas `httpOnly` : les écrans du parcours d'impression,
 * rendus dans le navigateur, doivent pouvoir le lire. Il ne contient qu'une
 * préférence d'affichage, rien qui autorise quoi que ce soit.
 */
export async function choisirDevise(formData: FormData): Promise<void> {
  const devise = lireDevise(formData.get('devise'))
  if (!devise) return
  ;(await cookies()).set(COOKIE_DEVISE, devise, {
    maxAge: UN_AN,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  })
}
