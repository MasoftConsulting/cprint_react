import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Envoi d'e-mails par SMTP.
 *
 * Le choix du SMTP plutôt que l'API d'un fournisseur précis est délibéré :
 * les mêmes variables d'environnement fonctionnent avec Resend, Brevo, Gmail,
 * Office 365 ou le serveur de messagerie de l'hébergeur. Changer de
 * fournisseur ne demande aucune modification de code.
 *
 * Si la configuration est absente, l'envoi est simplement ignoré : le site doit
 * continuer à fonctionner sans serveur de messagerie configuré.
 */
export type MailResult = { status: 'sent' } | { status: 'skipped'; reason: string } | { status: 'failed'; reason: string }

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  from: string
}

function readConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD

  if (!host || !user || !password) return null

  // 465 est le port TLS implicite ; 587 et 25 passent par STARTTLS.
  const port = Number(process.env.SMTP_PORT ?? 587)

  return {
    host,
    port,
    secure: port === 465,
    user,
    password,
    from: process.env.SMTP_FROM ?? user,
  }
}

// Le transport est réutilisé entre les invocations d'une même instance
// serverless : rouvrir une connexion SMTP à chaque envoi coûte cher.
let cachedTransporter: Transporter | null = null

function getTransporter(config: SmtpConfig): Transporter {
  cachedTransporter ??= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  })
  return cachedTransporter
}

export async function sendMail(options: {
  to: string
  subject: string
  text: string
  html: string
  replyTo?: string
}): Promise<MailResult> {
  const config = readConfig()
  if (!config) {
    return { status: 'skipped', reason: 'SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASSWORD).' }
  }
  if (!options.to) {
    return { status: 'skipped', reason: 'Aucune adresse de destination.' }
  }

  try {
    await getTransporter(config).sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    })
    return { status: 'sent' }
  } catch (error) {
    // Un envoi raté ne doit jamais faire échouer l'action qui l'a déclenché.
    return { status: 'failed', reason: error instanceof Error ? error.message : String(error) }
  }
}
