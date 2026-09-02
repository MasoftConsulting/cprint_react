import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-5xl font-extrabold text-primary">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-muted-foreground">
        Le lien que vous avez suivi n&apos;existe pas ou n&apos;existe plus.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-cta px-6 text-sm font-medium text-cta-foreground shadow-[var(--shadow-cta)]"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}
