// ── CourtVision AI — Email Helper (Mock) ────────────────────────────────────
// In production, replace with a real email service (SendGrid, Resend, etc.)

export type EmailTemplate =
  | 'verification'
  | 'password_reset'
  | 'challenge_invite'
  | 'weekly_summary'

interface EmailParams {
  to: string
  subject: string
  html: string
  text: string
  template?: EmailTemplate
}

/**
 * Send an email. In development, logs to console.
 * In production, integrate with SendGrid, Resend, etc.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  template,
}: EmailParams): Promise<{ success: boolean; messageId?: string }> {
  // Mock: log the email to console
  console.log(`[EMAIL] ─────────────────────────────────`)
  console.log(`  To: ${to}`)
  console.log(`  Subject: ${subject}`)
  console.log(`  Template: ${template || 'custom'}`)
  console.log(`  Text: ${text}`)
  console.log(`  HTML: ${html.length} chars`)
  console.log(`[EMAIL END] ─────────────────────────────`)

  // Simulate async send
  const messageId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return { success: true, messageId }
}

/**
 * Generate email templates
 */
export function getEmailTemplate(
  template: EmailTemplate,
  params: Record<string, string>,
): { subject: string; html: string; text: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  switch (template) {
    case 'verification': {
      const { name, token } = params
      const verifyUrl = `${baseUrl}/?verify_email=${token}`
      return {
        subject: 'CourtVision AI — Vérifiez votre email',
        text: `Bonjour ${name},\n\nMerci de vous inscrire sur CourtVision AI. Veuillez vérifier votre email en cliquant sur le lien suivant :\n\n${verifyUrl}\n\nCe lien expire dans 24 heures.\n\n— L'équipe CourtVision AI`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f97316;">CourtVision AI 🏀</h1>
          <p>Bonjour <strong>${name}</strong>,</p>
          <p>Merci de vous inscrire ! Veuillez vérifier votre email :</p>
          <p><a href="${verifyUrl}" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Vérifier mon email</a></p>
          <p style="color: #666; font-size: 14px;">Ce lien expire dans 24 heures.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">— L'équipe CourtVision AI</p>
        </div>`,
      }
    }

    case 'password_reset': {
      const { name } = params
      return {
        subject: 'CourtVision AI — Réinitialisation du mot de passe',
        text: `Bonjour ${name},\n\nUne demande de réinitialisation de mot de passe a été effectuée. Le token vous a été communiqué dans l'application.\n\nSi vous n'avez pas fait cette demande, ignorez cet email.\n\n— L'équipe CourtVision AI`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f97316;">CourtVision AI 🏀</h1>
          <p>Bonjour <strong>${name}</strong>,</p>
          <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte.</p>
          <p>Le token de réinitialisation vous a été communiqué dans l'application.</p>
          <p style="color: #666; font-size: 14px;">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">— L'équipe CourtVision AI</p>
        </div>`,
      }
    }

    case 'challenge_invite': {
      const { name, challengerName, challengeName, challengeId } = params
      const challengeUrl = `${baseUrl}/?deep=challenge/${challengeId}`
      return {
        subject: `CourtVision AI — ${challengerName} vous a défié !`,
        text: `Bonjour ${name},\n\n${challengerName} vous a défié au défi "${challengeName}" !\n\nRejoignez le défi : ${challengeUrl}\n\n— L'équipe CourtVision AI`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f97316;">CourtVision AI 🏀</h1>
          <p>Bonjour <strong>${name}</strong>,</p>
          <p><strong>${challengerName}</strong> vous a défié au défi "${challengeName}" !</p>
          <p><a href="${challengeUrl}" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Rejoindre le défi</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">— L'équipe CourtVision AI</p>
        </div>`,
      }
    }

    case 'weekly_summary': {
      const { name, sessions, reps, bestScore } = params
      return {
        subject: 'CourtVision AI — Votre résumé hebdomadaire',
        text: `Bonjour ${name},\n\nVoici votre résumé de la semaine :\n- Séances : ${sessions}\n- Répétitions : ${reps}\n- Meilleur score : ${bestScore}\n\nContinuez à vous entraîner ! 🏀\n\n— L'équipe CourtVision AI`,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f97316;">CourtVision AI 🏀</h1>
          <p>Bonjour <strong>${name}</strong>,</p>
          <p>Voici votre résumé de la semaine :</p>
          <ul>
            <li><strong>Séances :</strong> ${sessions}</li>
            <li><strong>Répétitions :</strong> ${reps}</li>
            <li><strong>Meilleur score :</strong> ${bestScore}</li>
          </ul>
          <p>Continuez à vous entraîner ! 🏀</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">— L'équipe CourtVision AI</p>
        </div>`,
      }
    }

    default:
      return {
        subject: 'CourtVision AI',
        text: '',
        html: '',
      }
  }
}