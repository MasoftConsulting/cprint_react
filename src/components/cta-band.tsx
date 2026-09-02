import { ButtonLink } from '@/components/ui/button-link'

export function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-20">
      <div className="surface-card flex flex-col items-center gap-5 p-8 text-center sm:p-12">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Votre document, imprimé en quelques minutes
        </h2>
        <p className="max-w-xl text-muted-foreground">
          Envoyez, payez en Mobile Money, récupérez sur votre campus. Sans application, sans
          abonnement.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href="/tarifs">Imprimer un document</ButtonLink>
          <ButtonLink href="/points" variant="soft">
            Trouver un point Campus
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
