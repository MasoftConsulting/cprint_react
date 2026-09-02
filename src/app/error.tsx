'use client'

export default function GlobalRouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold">Une erreur est survenue</h1>
      <p className="mt-2 text-muted-foreground">
        La page n&apos;a pas pu être affichée. Réessayez dans un instant.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-cta px-6 text-sm font-medium text-cta-foreground shadow-[var(--shadow-cta)]"
      >
        Réessayer
      </button>
    </div>
  )
}
