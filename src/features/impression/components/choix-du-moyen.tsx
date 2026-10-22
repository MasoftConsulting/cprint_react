'use client'

import { useEffect, useState } from 'react'
import { Loader2, Smartphone } from 'lucide-react'

import { getPaymentMeans, type PaymentMeans } from '../api'
import { useMontants } from '@/features/devise/components/devise-client'

/**
 * Choix du moyen de paiement, pour un montant donné.
 *
 * La liste n'est pas écrite ici : elle vient du serveur, qui la tient de
 * chaque prestataire. Un moyen désactivé chez Mollie, ou trop petit pour ses
 * frais fixes, n'y figure pas — un bouton qui mène à une erreur est pire que
 * pas de bouton.
 *
 * Le Mobile Money arrive en tête parce que c'est ce que paie la quasi-totalité
 * des clients au Togo. Les autres moyens servent qui n'en a pas : la diaspora
 * qui recharge le portefeuille d'un étudiant, et le point de Villepinte.
 *
 * Un seul moyen disponible : rien ne s'affiche. Faire « choisir » entre une
 * option et rien n'est pas un choix, c'est une étape de plus.
 */
export function ChoixDuMoyen({
  montant,
  valeur,
  devise = 'F CFA',
  surSeuil,
  onChange,
}: {
  montant: number
  valeur: string
  devise?: string
  /**
   * Ce qu'on affiche quand d'autres moyens existent mais que le montant est
   * trop petit pour eux. Diffère selon l'écran : sur la recharge, il suffit
   * de choisir un montant plus élevé ; sur un paiement d'impression, le
   * montant est ce qu'il est, et le chemin passe par le portefeuille.
   */
  surSeuil?: (seuil: string) => React.ReactNode
  onChange: (code: string) => void
}) {
  // La liste est gardée AVEC le montant pour lequel elle vaut : comparer les
  // deux dit si on est à jour, sans avoir à remettre l'état à zéro au début de
  // chaque effet (ce qui déclenche un rendu en cascade).
  const [charge, setCharge] = useState<{ pour: number; moyens: PaymentMeans } | null>(null)
  const { affiche } = useMontants()

  useEffect(() => {
    if (!montant) return
    let vivant = true
    getPaymentMeans(montant).then((moyens) => {
      if (!vivant) return
      setCharge({ pour: montant, moyens })
      // Présélectionner le premier évite un aller-retour : le client qui ne
      // veut pas choisir n'a rien à faire.
      const liste = moyens.moyens
      if (liste.length > 0 && !liste.some((m) => m.code === valeur)) {
        onChange(liste[0].code)
      }
    })
    return () => {
      vivant = false
    }
    // `valeur` et `onChange` volontairement absents : ils changent à chaque
    // sélection, et relancer l'appel à chaque clic ferait clignoter la liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montant])

  if (!montant) return null

  const charges = charge?.pour === montant ? charge.moyens : null

  if (charges === null) {
    return (
      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Moyens de paiement disponibles…
      </p>
    )
  }

  const moyens = charges.moyens
  const seuil = charges.autres_moyens_des

  // Un seul moyen, mais d'autres existent plus haut : le dire. Les masquer en
  // silence laisse croire à une panne, et prive le client d'une information
  // qui lui permettrait d'agir.
  if (moyens.length <= 1) {
    if (!seuil || montant >= seuil || !surSeuil) return null
    return (
      <p className="mt-6 rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
        {surSeuil(affiche(seuil, devise))}
      </p>
    )
  }

  return (
    <fieldset className="mt-6">
      <legend className="text-sm font-medium text-muted-foreground">
        Comment souhaitez-vous payer ?
      </legend>
      <div className="mt-3 grid gap-2">
        {moyens.map((moyen) => {
          const choisi = moyen.code === valeur
          return (
            <label
              key={moyen.code}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                choisi ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
              }`}
            >
              <input
                type="radio"
                name="moyen-de-paiement"
                value={moyen.code}
                checked={choisi}
                onChange={() => onChange(moyen.code)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span className="flex h-8 w-12 shrink-0 items-center justify-center">
                {moyen.logo ? (
                  // Logo servi par le prestataire. `img` et non `next/image` :
                  // le domaine varie selon le moyen, et une liste d'hôtes
                  // autorisés finirait par bloquer un moyen nouvellement activé.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={moyen.logo} alt="" aria-hidden className="h-7 w-auto" />
                ) : (
                  <Smartphone className="h-5 w-5 text-primary" aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{moyen.nom}</span>
                {moyen.detail ? (
                  <span className="block text-xs text-muted-foreground">{moyen.detail}</span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
