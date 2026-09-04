'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { type FormState } from '@/lib/form-state'
import { pricingSchema, siteSettingsSchema } from '@/features/settings/schema'
import { SETTINGS_TAG } from '@/features/settings/queries'

/** Écrit un lot de paramètres en une seule requête (upsert sur la clé). */
async function saveSettings(values: Record<string, string | number>) {
  const supabase = await createClient()
  const rows = Object.entries(values).map(([key, value]) => ({
    key,
    value: String(value),
  }))
  return supabase.from('settings').upsert(rows, { onConflict: 'key' })
}

export async function updatePricing(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser()

  const parsed = pricingSchema.safeParse({
    price_nb: formData.get('price_nb'),
    price_couleur: formData.get('price_couleur'),
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { error } = await saveSettings(parsed.data)
  if (error) {
    return { status: 'error', message: 'Impossible d’enregistrer les tarifs.' }
  }

  updateTag(SETTINGS_TAG)
  return { status: 'success', message: 'Tarifs mis à jour.' }
}

export async function updateSiteSettings(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser()

  const parsed = siteSettingsSchema.safeParse({
    contact_phone: formData.get('contact_phone'),
    contact_email: formData.get('contact_email'),
    contact_address: formData.get('contact_address'),
    notification_email: formData.get('notification_email'),
    recharge_amounts: formData.get('recharge_amounts'),
    avg_print_time: formData.get('avg_print_time'),
    payment_methods_count: formData.get('payment_methods_count'),
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { error } = await saveSettings(parsed.data)
  if (error) {
    return { status: 'error', message: 'Impossible d’enregistrer les paramètres.' }
  }

  updateTag(SETTINGS_TAG)
  return { status: 'success', message: 'Paramètres mis à jour.' }
}
