import 'server-only'

import { sendMail } from '@/lib/mailer'
import { getSettings } from '@/features/settings/queries'
import type { ContactInput } from '@/features/contact/schema'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Prévient l'équipe qu'un message vient d'arriver.
 *
 * L'adresse de destination vient des paramètres du site (`notification_email`,
 * à défaut `contact_email`) : elle se change depuis l'admin, sans redéploiement.
 * L'échec est journalisé mais jamais propagé — le message est déjà en base, et
 * un serveur SMTP indisponible ne doit pas faire croire au visiteur que son
 * envoi a échoué.
 */
export async function notifyNewContactMessage(message: ContactInput): Promise<void> {
  const settings = await getSettings()
  const destinataire = settings.notification_email.trim() || settings.contact_email.trim()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const lienAdmin = siteUrl ? `${siteUrl}/admin/messages` : '/admin/messages'

  const lignes = [
    `Nom : ${message.nom}`,
    `E-mail : ${message.email}`,
    `Téléphone : ${message.telephone ?? '—'}`,
    '',
    message.message,
    '',
    `Voir dans l'administration : ${lienAdmin}`,
  ]

  const result = await sendMail({
    to: destinataire,
    // Le sujet reprend le nom : la boîte de réception reste lisible sans ouvrir.
    subject: `Campus Print — nouveau message de ${message.nom}`,
    text: lignes.join('\n'),
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1b2033">
        <h2 style="margin:0 0 16px">Nouveau message depuis le site</h2>
        <table cellpadding="0" cellspacing="0" style="margin-bottom:16px">
          <tr><td style="padding-right:12px;color:#6b7280">Nom</td><td><strong>${escapeHtml(message.nom)}</strong></td></tr>
          <tr><td style="padding-right:12px;color:#6b7280">E-mail</td><td><a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a></td></tr>
          <tr><td style="padding-right:12px;color:#6b7280">Téléphone</td><td>${escapeHtml(message.telephone ?? '—')}</td></tr>
        </table>
        <div style="white-space:pre-line;padding:16px;background:#f4f6fa;border-radius:12px">${escapeHtml(message.message)}</div>
        <p style="margin-top:20px">
          <a href="${escapeHtml(lienAdmin)}" style="color:#2a3f8f">Voir dans l'administration</a>
        </p>
      </div>
    `,
    // Répondre depuis sa boîte écrit directement au visiteur.
    replyTo: message.email,
  })

  if (result.status !== 'sent') {
    console.error(`[mail] alerte de nouveau message non envoyée — ${result.reason}`)
  }
}
