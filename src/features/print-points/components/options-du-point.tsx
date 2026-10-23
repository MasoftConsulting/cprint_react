import { BookOpen, Copy, Maximize2, Palette, ScanLine } from 'lucide-react'

import type { OptionsMachine } from '@/features/print-points/queries'

type Option = { cle: string; Icone: typeof Palette; libelle: string }

/**
 * Ce qu'une machine — ou un site, en réunissant ses machines — sait faire.
 *
 * Le format se lit comme sur une fiche produit : « A3 » si l'on peut imprimer
 * en A3, sinon « A4 max. ». C'est ce qu'un client a besoin de savoir avant de
 * se déplacer avec un poster.
 */
function options(machines: OptionsMachine[], livret: boolean): Option[] {
  const couleur = machines.some((m) => m.couleur)
  const a3 = machines.some((m) => m.format === 'A3')
  return [
    { cle: 'couleur', Icone: Palette, libelle: couleur ? 'Couleurs' : 'Noir & blanc' },
    { cle: 'format', Icone: Maximize2, libelle: a3 ? 'A3' : 'A4 max.' },
    ...(machines.some((m) => m.photocopie) ? [{ cle: 'copie', Icone: Copy, libelle: 'Photocopie' }] : []),
    ...(machines.some((m) => m.scan) ? [{ cle: 'scan', Icone: ScanLine, libelle: 'Scan' }] : []),
    ...(livret ? [{ cle: 'livret', Icone: BookOpen, libelle: 'Livret agrafé' }] : []),
  ]
}

function Liste({ items }: { items: Option[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-muted-foreground">
      {items.map(({ cle, Icone, libelle }) => (
        <li key={cle} className="flex items-center gap-2.5">
          <Icone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          {libelle}
        </li>
      ))}
    </ul>
  )
}

/**
 * Les options d'un point d'impression.
 *
 * `livret` vient de la centrale (le finisseur est une capacité attestée du
 * point), le reste de la fiche des machines. Avec plusieurs machines, le
 * détail de chacune suit : « Couleurs » sur le site ne dit pas laquelle.
 */
export function OptionsDuPoint({
  machines,
  livret,
}: {
  machines: OptionsMachine[]
  livret: boolean
}) {
  if (machines.length === 0) return null

  return (
    <div className="mt-3">
      <Liste items={options(machines, livret)} />
      {machines.length > 1 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-medium text-primary">
            Détail des {machines.length} machines
          </summary>
          <ul className="mt-2 space-y-2">
            {machines.map((machine) => (
              <li key={machine.rang}>
                <p className="text-xs font-semibold text-foreground">Machine {machine.rang}</p>
                <p className="text-xs text-muted-foreground">
                  {options([machine], false)
                    .map((o) => o.libelle)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
