/**
 * Placeholders affichés pendant que le contenu dépendant de la session est
 * streamé. Ils gardent la hauteur des blocs réels pour éviter que la page
 * ne sursaute à l'arrivée des données.
 */

export function CardsSkeleton({
  count = 2,
  className = 'h-72',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`surface-card animate-pulse ${className}`} />
      ))}
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="surface-card mt-6 divide-y divide-border">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  )
}
