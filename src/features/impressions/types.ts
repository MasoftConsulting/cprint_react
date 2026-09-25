/**
 * Formes des données renvoyées par l'API centrale d'impression.
 *
 * Ce fichier ne contient que des types : il est importable depuis un
 * composant client, contrairement à `queries.ts` qui est `server-only`
 * (il porte le jeton d'administration).
 */

export type JobStatus = 'RECEIVED' | 'READY' | 'PRINTING' | 'PRINTED' | 'ERROR' | 'EXPIRED'

export type PrintJob = {
  id: number
  sender_email: string
  original_filename: string
  status: JobStatus
  color_mode: string
  duplex: string
  copies: number
  page_count: number
  created_at: string
  updated_at: string
  printed_at: string | null
  expires_at: string
  error_message: string | null
}

export type JobEvent = {
  event: string
  message: string | null
  created_at: string
}

export type PrintAgent = {
  name: string
  printer_label: string | null
  last_seen_at: string | null
  last_status: string | null
  created_at: string
}

export type PrintStats = {
  documents_par_etat: Partial<Record<JobStatus, number>>
  dernieres_24h: Periode
  derniers_7j: Periode
  points: PrintAgent[]
  devise: string
}

export type Periode = {
  documents_recus: number
  pages_recues: number
  documents_imprimes: number
  pages_imprimees: number
  paiements: number
  encaisse: number
}

export type CodeDocument = {
  job_id: number
  original_filename: string
  status: JobStatus
  page_count: number
  created_at: string
  expires_at: string
  printed_at: string | null
  fichier_present: boolean
  reserve_par: string | null
  reservation_jusqua: string | null
  destinataire: string
}

export type CodeDetail = {
  code: string
  utilisable: boolean
  /** Phrase prête à afficher : pourquoi ce code passe, ou pourquoi il est refusé. */
  explication: string
  documents: CodeDocument[]
  paiement: {
    reference: string
    status: string
    amount: number
    currency: string
    pages: number
    color_mode: string
    duplex: string
    copies: number
    consomme: boolean
  } | null
}
