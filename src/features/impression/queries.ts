import 'server-only'

import { cacheLife } from 'next/cache'

import { getTopUpConfig, type TopUpConfig } from './api'

/**
 * Montants de recharge **réellement acceptés** par la centrale, pour les pages
 * publiques rendues par le serveur.
 *
 * `/tarifs` lisait jusqu'ici `recharge_amounts` dans Supabase, une liste que
 * la centrale n'emploie pas : la page annonçait 1 500 F CFA, refusé au
 * paiement, et taisait 100 et 1 000, acceptés. La liste qui fait foi est celle
 * qui accepte ou refuse le paiement.
 *
 * Mise en cache une heure : elle change rarement, et une centrale
 * momentanément injoignable ne doit pas casser la page (`getTopUpConfig`
 * retombe alors sur les valeurs par défaut de la centrale).
 */
export async function getMontantsRechargeCentrale(): Promise<TopUpConfig> {
  'use cache'
  cacheLife('hours')
  return getTopUpConfig()
}
