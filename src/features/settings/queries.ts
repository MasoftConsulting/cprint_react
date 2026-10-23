import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { createAnonClient } from '@/lib/supabase/anon'

export const SETTINGS_TAG = 'settings'

/** Valeurs de repli — identiques aux View Composers du projet Laravel. */
const DEFAULTS = {
  price_nb: '30',
  price_couleur: '100',
  // Zéro par défaut : tant que personne n'a fixé ce prix, la reliure est
  // offerte. C'est le repli le moins surprenant — facturer un supplément que
  // l'exploitant n'a jamais saisi le serait davantage.
  price_livret: '0',
  // Zone euro : vides tant qu'ils ne sont pas saisis, la zone suit alors les
  // prix de la zone F CFA (règle de la centrale).
  price_nb_eur: '',
  price_couleur_eur: '',
  price_livret_eur: '',
  contact_phone: '+228 91 35 00 00',
  contact_email: 'support@masoft-consulting.com',
  contact_address: 'Lomé, Togo',
  // Vide par défaut : on retombe alors sur `contact_email`.
  notification_email: '',
  recharge_amounts: '100,500,1000,2000,5000',
  // Paliers de la zone euro, en euros : vides tant qu'ils ne sont pas saisis.
  recharge_amounts_eur: '',
  avg_print_time: '3 min',
  payment_methods_count: '3',
} as const

export type SettingKey = keyof typeof DEFAULTS

/**
 * Tous les paramètres du site, avec repli sur les valeurs par défaut.
 * En cache : ils changent rarement et sont lus sur chaque page.
 */
export async function getSettings(): Promise<Record<SettingKey, string>> {
  'use cache'
  cacheTag(SETTINGS_TAG)
  cacheLife('max')

  const supabase = createAnonClient()
  const { data } = await supabase.from('settings').select('key, value')

  const values = { ...DEFAULTS } as Record<SettingKey, string>
  for (const row of data ?? []) {
    if (row.key in values && row.value !== null) {
      values[row.key as SettingKey] = row.value
    }
  }
  return values
}

export type ContactInfo = {
  phone: string
  email: string
  address: string
}

export async function getContactInfo(): Promise<ContactInfo> {
  const settings = await getSettings()
  return {
    phone: settings.contact_phone,
    email: settings.contact_email,
    address: settings.contact_address,
  }
}

export type Pricing = {
  /** Zone F CFA, en F CFA. */
  nb: number
  couleur: number
  /** Supplément par exemplaire relié en livret agrafé. 0 = offert. */
  livret: number
  /**
   * Zone euro, en euros. `null` tant que les deux prix par page ne sont pas
   * saisis : la zone euro est alors facturée aux prix de la zone F CFA.
   */
  eur: { nb: number; couleur: number; livret: number | null } | null
}

export async function getPricing(): Promise<Pricing> {
  const settings = await getSettings()
  return {
    nb: Number(settings.price_nb),
    couleur: Number(settings.price_couleur),
    livret: Number(settings.price_livret),
    eur: prixZoneEuro(settings),
  }
}

/** Même règle que la centrale : les deux prix par page, ou pas de zone euro. */
function prixZoneEuro(settings: Record<SettingKey, string>): Pricing['eur'] {
  const lire = (cle: SettingKey) => {
    const brut = settings[cle]?.trim().replace(',', '.')
    const nombre = brut ? Number(brut) : Number.NaN
    return Number.isFinite(nombre) ? nombre : null
  }
  const nb = lire('price_nb_eur')
  const couleur = lire('price_couleur_eur')
  if (nb === null || couleur === null) return null
  return { nb, couleur, livret: lire('price_livret_eur') }
}

export async function getRechargeAmounts(): Promise<number[]> {
  const settings = await getSettings()
  return settings.recharge_amounts
    .split(',')
    .map((amount) => Number.parseInt(amount, 10))
    .filter((amount) => Number.isFinite(amount))
}
