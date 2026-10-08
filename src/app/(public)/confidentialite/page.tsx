import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Clock,
  Eye,
  FileWarning,
  KeyRound,
  Lock,
  Printer,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wallet,
} from 'lucide-react'

import { ButtonLink } from '@/components/ui/button-link'

export const metadata: Metadata = {
  title: 'Vos documents sont-ils en sécurité ?',
  description:
    "Où passe votre document, qui peut le lire, combien de temps il existe. Les réponses exactes, y compris ce que Campus Print ne fait pas.",
}

/**
 * Page publique de confidentialité.
 *
 * Version web de `campus-print/docs/CONFIDENTIALITE.md` — les deux doivent
 * rester cohérents, c'est la même promesse faite aux mêmes personnes.
 *
 * Volontairement statique : aucun chiffre n'est lu depuis la centrale au
 * chargement. Une page qui afficherait « 24 h » un jour et « 12 h » le
 * lendemain, au gré d'un réglage, vaudrait moins qu'une page qui engage. Les
 * valeurs annoncées ici sont celles du service, vérifiables par
 * l'exploitation sur `/admin/centrale` (`retention`, `codes_de_retrait`).
 *
 * **Ne rien ajouter ici qui ne soit vrai.** Cette page est lue par des gens
 * qui décident de nous confier un mémoire. En particulier : ne jamais écrire
 * « chiffré de bout en bout », le dernier saut vers l'imprimante ne l'est pas,
 * et la section « Le dernier mètre » l'explique.
 */

const ETAPES = [
  {
    Icon: Smartphone,
    titre: 'De votre téléphone à notre serveur',
    texte:
      "Chiffré par HTTPS, la même technologie que votre banque en ligne. Personne sur le Wi-Fi du campus, ni votre opérateur, ne peut lire votre document pendant l'envoi.",
    etat: 'chiffré',
  },
  {
    Icon: Lock,
    titre: 'De notre serveur au magasin',
    texte:
      "Le PC du magasin ne reçoit rien tant que vous n'avez pas tapé votre code. Il prouve alors son identité avec une clé qui lui est propre, et ne peut réclamer que les documents de ce code — jamais ceux des autres.",
    etat: 'chiffré',
  },
  {
    Icon: Printer,
    titre: 'Du PC à l’imprimante',
    texte:
      "Le dernier mètre passe par le câble réseau du magasin, et cette liaison n'est pas chiffrée : c'est le protocole que comprennent les imprimantes professionnelles. Il faudrait être physiquement branché sur le réseau interne, au moment exact de votre impression.",
    etat: 'en clair, réseau du magasin',
  },
]

const DUREES = [
  { situation: 'Vous avez imprimé', duree: 'effacé dès l’impression terminée' },
  { situation: 'Vous n’êtes jamais venu', duree: 'effacé à l’expiration du code, 24 h après l’envoi' },
  { situation: 'Sur le PC du magasin', duree: 'jamais enregistré — il transite en mémoire' },
]

const COLLECTE = [
  ['Votre adresse e-mail', 'vous envoyer votre code de retrait et vos reçus'],
  ['Le nom, la taille et le nombre de pages du fichier', 'vous les afficher, et calculer le prix'],
  ['Vos options d’impression', 'imprimer ce que vous avez demandé'],
  ['Vos références de paiement', 'retrouver un paiement en cas de litige'],
  ['Votre solde, si vous avez un portefeuille', 'savoir ce qui vous reste'],
]

const JAMAIS = [
  'Nous ne conservons pas vos documents au-delà de 24 heures.',
  'Nous ne les stockons jamais sur le PC d’un magasin.',
  'Nous ne les lisons pas, et nous n’en analysons pas le contenu.',
  'Nous ne les partageons avec personne — ni partenaire, ni annonceur.',
  'Nous n’imprimons rien à distance : vos pages ne sortent que lorsque vous tapez votre code, devant la machine.',
]

export default function ConfidentialitePage() {
  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <span className="text-sm font-semibold opacity-90">Confidentialité</span>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">
            Vos documents, de votre téléphone à l&apos;imprimante
          </h1>
          <p className="mt-4 max-w-2xl opacity-85">
            Vous nous confiez un mémoire, un relevé de notes, parfois un contrat. Vous avez le
            droit de savoir où il passe, qui peut le lire, et combien de temps il existe. Cette
            page répond sans formules creuses — et dit aussi ce que nous ne faisons pas.
          </p>
        </div>
      </section>

      {/* Le trajet */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Le trajet, étape par étape</h2>
        <div className="mt-8 space-y-4">
          {ETAPES.map(({ Icon, titre, texte, etat }, index) => (
            <div key={titre} className="surface-card grid gap-5 p-6 sm:p-8 lg:grid-cols-[auto_1fr]">
              <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-7 w-7" aria-hidden />
                </span>
                <span className="font-display text-sm font-bold text-muted-foreground">
                  Étape {index + 1}
                </span>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">{titre}</h3>
                <p className="mt-2 text-muted-foreground">{texte}</p>
                <span
                  className={
                    etat === 'chiffré'
                      ? 'mt-3 inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700'
                      : 'mt-3 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700'
                  }
                >
                  {etat}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm">
          <FileWarning className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <span>
            <strong>Pourquoi nous ne disons pas « chiffré de bout en bout ».</strong> Ce serait
            faux pour le dernier mètre, entre le PC du magasin et l&apos;imprimante. Aucun
            fabricant ne propose autre chose pour ce type de machine, et c&apos;est le même cas
            dans toutes les entreprises. Nous préférons vous le dire que vous laisser le croire.
          </span>
        </p>
      </section>

      {/* Durée de vie */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Combien de temps votre document existe
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {DUREES.map(({ situation, duree }) => (
              <div key={situation} className="surface-card p-6">
                <p className="text-sm font-semibold">{situation}</p>
                <p className="mt-2 text-sm text-muted-foreground">{duree}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex gap-3 text-sm text-muted-foreground">
            <Trash2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span>
              Le balayage qui efface passe toutes les quinze minutes.{' '}
              <strong className="text-foreground">
                Au-delà de 24 heures, votre document n&apos;existe plus.
              </strong>{' '}
              Nous ne pouvons pas le récupérer, même si vous le demandez — et c&apos;est
              précisément ce qui fait que personne d&apos;autre ne le peut.
            </span>
          </p>
        </div>
      </section>

      {/* Qui peut lire */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="flex items-center gap-3">
          <KeyRound className="h-6 w-6 text-primary" aria-hidden />
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Qui peut lire votre document
          </h2>
        </div>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Il faut votre code de retrait à six chiffres. Sans lui, votre document n&apos;est
          accessible à personne.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="surface-card p-6 sm:p-8">
            <h3 className="font-display text-lg font-bold">
              Et si quelqu&apos;un essayait de deviner un code&nbsp;?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              C&apos;est la bonne question, et nous nous la sommes posée sérieusement. Six
              chiffres, cela fait un million de possibilités — essayées à la machine, sans
              limite, cela finirait par tomber juste.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              <strong className="text-foreground">Nous comptons les codes erronés.</strong>{' '}
              Au-delà de dix essais ratés en cinq minutes, l&apos;origine est bloquée un quart
              d&apos;heure. Cela vaut aussi pour l&apos;aperçu d&apos;un document.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Ce seuil ne gêne jamais personne au comptoir, parce qu&apos;un code reconnu remet
              le compteur à zéro. Une machine qui devine, elle, ne réussit jamais : elle est
              arrêtée en quelques secondes.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Nous préférons le dire plutôt que le laisser croire : cette protection
              n&apos;arrête pas quelqu&apos;un qui disposerait de centaines d&apos;adresses
              différentes. Nous surveillons ce cas, et un code plus long est la prochaine étape
              si cela devenait nécessaire.
            </p>
          </div>

          <div className="surface-card p-6 sm:p-8">
            <h3 className="font-display text-lg font-bold">Et notre équipe&nbsp;?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              L&apos;équipe qui exploite le service voit votre adresse e-mail, le{' '}
              <strong className="text-foreground">nom</strong> de votre fichier, sa taille, son
              nombre de pages et ce que vous avez payé.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              <strong className="text-foreground">Pas le contenu</strong> — il faudrait saisir
              votre code, exactement comme vous.
            </p>
            <p className="mt-3 flex gap-3 rounded-xl bg-accent p-4 text-sm">
              <Eye className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span>
                Le nom du fichier, lui, est visible. Si l&apos;intitulé de votre document est en
                soi confidentiel, renommez-le avant de l&apos;envoyer.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Données collectées */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Ce que nous savons de vous
          </h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">
            Uniquement ce qui est nécessaire au service. Nous ne demandons ni votre nom, ni votre
            numéro de téléphone, ni votre établissement, ni votre pièce d&apos;identité. Vous
            n&apos;avez pas de compte à créer.
          </p>

          <div className="surface-card mt-8 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Donnée</th>
                  <th className="px-5 py-3 font-medium">Pourquoi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COLLECTE.map(([donnee, pourquoi]) => (
                  <tr key={donnee}>
                    <td className="px-5 py-3 font-medium">{donnee}</td>
                    <td className="px-5 py-3 text-muted-foreground">{pourquoi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
            Votre adresse e-mail sert au service, et à rien d&apos;autre : elle n&apos;est ni
            revendue, ni louée, ni utilisée pour de la publicité.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            <strong className="text-foreground">Un point de franchise :</strong> nous ne
            vérifions pas votre adresse e-mail — c&apos;est ce qui rend le service utilisable
            sans inscription. Si vous avez un portefeuille ou un compte prépayé, nous prenons une
            précaution de plus : votre code n&apos;est alors{' '}
            <strong className="text-foreground">jamais affiché à l&apos;écran</strong>, il part
            uniquement sur votre boîte. Quelqu&apos;un qui saisirait votre adresse ne pourrait
            rien consommer de votre solde.
          </p>
        </div>
      </section>

      {/* Argent */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-primary" aria-hidden />
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Votre argent</h2>
        </div>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Nous ne voyons <strong className="text-foreground">jamais</strong> votre numéro Mobile
          Money ni votre numéro de carte. Le paiement se déroule entièrement chez notre
          prestataire. Nous n&apos;en recevons qu&apos;une référence et une confirmation signée.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            'Votre solde n’est crédité qu’après confirmation signée du paiement — jamais parce que vous êtes revenu sur une page.',
            'Chaque mouvement est enregistré et consultable.',
            'Si un code expire sans que rien ne soit imprimé, l’argent vous est rendu automatiquement.',
            'Votre solde ne périme pas.',
          ].map((item) => (
            <li key={item} className="surface-card flex gap-3 p-5 text-sm">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Ce que nous ne faisons pas */}
      <section className="bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            Ce que nous ne faisons pas
          </h2>
          <ul className="mt-8 space-y-3">
            {JAMAIS.map((item) => (
              <li key={item} className="surface-card flex gap-3 p-5 text-sm">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
            Ce dernier point est une décision de conception, pas une promesse : notre service{' '}
            <strong className="text-foreground">refuse techniquement</strong> toute demande
            d&apos;impression venue d&apos;Internet. Même en payant depuis chez vous, rien ne
            tombe dans un bac en votre absence.
          </p>
        </div>
      </section>

      {/* Ce que nous vous demandons */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
          Ce que nous vous demandons
        </h2>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Deux gestes, et ils comptent autant que tout le reste.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="surface-card p-6">
            <p className="font-display font-bold">Ne partagez pas votre code de retrait</p>
            <p className="mt-2 text-sm text-muted-foreground">C&apos;est la clé de vos documents.</p>
          </div>
          <div className="surface-card p-6">
            <p className="font-display font-bold">Vérifiez votre adresse avant de valider</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Une faute de frappe envoie votre code à quelqu&apos;un d&apos;autre.
            </p>
          </div>
        </div>

        <div className="surface-card mt-10 p-6 sm:p-8">
          <h3 className="font-display text-lg font-bold">Une question, un doute</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Parlez-en à un responsable du point Campus Print, ou{' '}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              écrivez-nous
            </Link>
            . Si vous souhaitez que votre adresse e-mail et votre historique soient effacés,
            demandez-le : nous le ferons. Vos documents, eux, le sont déjà.
          </p>
          <ButtonLink href="/comment-ca-marche" className="mt-6">
            Voir comment ça marche
          </ButtonLink>
        </div>
      </section>
    </>
  )
}
