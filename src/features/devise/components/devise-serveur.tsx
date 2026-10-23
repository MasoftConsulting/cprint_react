import { afficher, prixDeZone, type Devise, type GrilleTarifaire } from '../devise'
import { getDevise } from '../server'
import { SelecteurDevise } from './devise-client'

/*
 * Composants serveur qui lisent la devise du visiteur.
 *
 * Ils lisent la requête (cookie, pays) : chacun doit être rendu sous un
 * `<Suspense>`, pour que le reste de la page reste prérendu. La page arrive
 * aussitôt, les montants convertis dans le même flux.
 */

export async function SelecteurDeviseServeur() {
  return <SelecteurDevise initiale={await getDevise()} />
}

/**
 * Un montant tenu en F CFA (les prix administrés dans Supabase), affiché dans
 * la devise du visiteur.
 */
export async function Prix({
  montant,
  source = 'XOF',
  unitaire = false,
}: {
  montant: number
  source?: Devise
  unitaire?: boolean
}) {
  return <>{afficher(montant, source, await getDevise(), { unitaire })}</>
}

/** Pour un composant client qui doit être hydraté dans la bonne devise. */
export async function AvecDevise({ children }: { children: (devise: Devise) => React.ReactNode }) {
  return <>{children(await getDevise())}</>
}

/**
 * Le prix d'une page dans la zone du visiteur, dans sa devise.
 *
 * 0,10 € pour un visiteur qui lit l'euro, si la zone euro a ses prix ; sinon
 * la conversion des prix F CFA, que la centrale applique aussi.
 */
export async function PrixDePage({
  grille,
  type,
}: {
  grille: GrilleTarifaire
  type: 'mono' | 'couleur' | 'livret'
}) {
  const devise = await getDevise()
  const prix = prixDeZone(grille, devise)
  return <>{afficher(prix[type], prix.devise, devise, { unitaire: type !== 'livret' })}</>
}
