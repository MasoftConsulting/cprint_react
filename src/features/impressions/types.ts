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
  /** Qui a envoyé les documents, et à qui le code de retrait est adressé. */
  sender_email: string
  /** Code de retrait à 6 chiffres, celui que le client tape sur la borne. */
  verification_code: string
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

/**
 * De quoi installer un point sur place, remis **une seule fois**.
 *
 * La centrale ne garde que l'empreinte du jeton : elle ne pourra donc jamais
 * regénérer un installeur pour un point existant. C'est pourquoi ces valeurs
 * ne vivent que le temps d'un retour de Server Action, et servent aussitôt à
 * fabriquer le script d'installation.
 */
export type AgentCredentials = {
  name: string
  token: string
  /** URL de la centrale telle que le PC du point devra l'appeler. */
  central: string
  /** IP de l'imprimante, connue à la création seulement. */
  printerIp?: string
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

/** Un document, tel qu'il apparaît dans l'activité d'un expéditeur. */
export type DocumentExpediteur = {
  id: number
  fichier: string
  etat: JobStatus
  pages: number
  copies: number
  /** `pages x copies`, et 0 tant que rien n'est sorti : c'est ce qui est facturé. */
  pages_sorties: number
  couleur: string
  recto_verso: string
  taille_octets: number
  envoye_le: string
  imprime_le: string | null
  expire_le: string
  /** Point d'impression où le document est sorti, s'il est sorti. */
  point: string | null
  erreur: string | null
}

/**
 * Activité d'une adresse d'envoi.
 *
 * `pages_envoyees` compte les pages reçues, `pages_imprimees` compte
 * `pages x copies` de ce qui est réellement sorti. Les deux diffèrent dès
 * qu'un document est tiré en plusieurs exemplaires, et c'est la seconde qui
 * correspond à la facture.
 */
export type Expediteur = {
  email: string
  documents: number
  pages_envoyees: number
  documents_imprimes: number
  pages_imprimees: number
  echecs: number
  expires: number
  paiements: number
  encaisse: number
  devise: string | null
  premier_envoi: string
  dernier_envoi: string
  documents_detail: DocumentExpediteur[]
}

/** Un compte à crédit : une adresse qui imprime sans payer, sur un solde de pages. */
export type CreditAccount = {
  email: string
  label: string | null
  /** Solde en pages noir & blanc. Une page couleur en consomme davantage. */
  pages_balance: number
  active: boolean
  mouvements: number
  pages_consommees: number
  created_at: string
  updated_at: string
}

export type CreditMovement = {
  /** Positif = recharge, négatif = consommation. */
  pages: number
  reason: 'TOPUP' | 'PRINT' | 'REFUND' | 'ADJUST'
  /** Référence du paiement réglé par le crédit, pour une consommation. */
  reference: string | null
  note: string | null
  created_at: string
}

export type CreditDetail = {
  email: string
  label: string | null
  pages_balance: number
  active: boolean
  created_at: string
  mouvements: CreditMovement[]
}
