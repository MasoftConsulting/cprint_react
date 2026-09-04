import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { createAnonClient } from '@/lib/supabase/anon'

export const SETTINGS_TAG = 'settings'

/** Valeurs de repli — identiques aux View Composers du projet Laravel. */
const DEFAULTS = {
  price_nb: '30',
  price_couleur: '100',
  contact_phone: '+228 91 35 00 00',
  contact_email: 'support@masoft-consulting.com',
  contact_address: 'Lomé, Togo',
  // Vide par défaut : on retombe alors sur `contact_email`.
  notification_email: '',
  recharge_amounts: '500,1000,2000,5000',
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
  nb: number
  couleur: number
}

export async function getPricing(): Promise<Pricing> {
  const settings = await getSettings()
  return {
    nb: Number(settings.price_nb),
    couleur: Number(settings.price_couleur),
  }
}

export async function getRechargeAmounts(): Promise<number[]> {
  const settings = await getSettings()
  return settings.recharge_amounts
    .split(',')
    .map((amount) => Number.parseInt(amount, 10))
    .filter((amount) => Number.isFinite(amount))
}
