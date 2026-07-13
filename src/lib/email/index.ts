/**
 * Email service — real sending via Resend.
 *
 * Server-only module. When RESEND_API_KEY is not configured the
 * functions degrade gracefully (log a warning, return failure).
 */

import { Resend } from 'resend';
import { sanitizeHtml } from '@/lib/security/sanitization';

// ── Singleton client ──────────────────────────────────────────────────────────

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// ── Core send ─────────────────────────────────────────────────────────────────

const DEFAULT_FROM = 'CourtVision AI <noreply@courtvision.ai>'

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  from?: string
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const client = getResendClient()
  if (!client) {
    console.warn('[Email] RESEND_API_KEY not configured — email not sent')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
      from: options.from || DEFAULT_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Email] Send failed: ${message}`)
    return { success: false, error: message }
  }
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://courtvision.ai'

/**
 * Escape a string for safe interpolation in HTML content.
 * Converts &, <, >, ", ' into their HTML entity equivalents.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr>
          <td style="padding:24px 32px;background:#0f172a;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">CourtVision AI</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e4e4e7;text-align:center;">
            <p style="margin:0;color:#71717a;font-size:12px;">
              &copy; ${new Date().getFullYear()} CourtVision AI &mdash;
              <a href="${APP_URL}" style="color:#0ea5e9;text-decoration:none;">${APP_URL}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Pre-built templates ───────────────────────────────────────────────────────

export interface EmailTemplateResult {
  subject: string
  html: string
}

export const emailTemplates = {
  welcome(name: string): EmailTemplateResult {
    const safeName = escapeHtml(name)
    return {
      subject: 'Bienvenue sur CourtVision AI ! 🏀',
      html: emailShell(
        'Bienvenue',
        `<p style="font-size:16px;color:#27272a;">Salut <strong>${safeName}</strong>,</p>
<p style="font-size:16px;color:#27272a;">Bienvenue sur <strong>CourtVision AI</strong> ! Ton compte a été créé avec succès.</p>
<p style="font-size:16px;color:#27272a;">Commence par uploader une vidéo de ton tir pour obtenir un diagnostic IA personnalisé.</p>
<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
  <tr>
    <td align="center" style="background:#0ea5e9;border-radius:8px;">
      <a href="${APP_URL}" style="display:inline-block;padding:12px 32px;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">Accéder au tableau de bord</a>
    </td>
  </tr>
</table>`,
      ),
    }
  },

  passwordReset(name: string, resetUrl: string): EmailTemplateResult {
    const safeName = escapeHtml(name)
    return {
      subject: 'Réinitialisation de ton mot de passe',
      html: emailShell(
        'Réinitialisation du mot de passe',
        `<p style="font-size:16px;color:#27272a;">Salut <strong>${safeName}</strong>,</p>
<p style="font-size:16px;color:#27272a;">Tu as demandé la réinitialisation de ton mot de passe. Clique sur le bouton ci-dessous pour en définir un nouveau :</p>
<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
  <tr>
    <td align="center" style="background:#0ea5e9;border-radius:8px;">
      <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">Réinitialiser le mot de passe</a>
    </td>
  </tr>
</table>
<p style="margin-top:24px;font-size:13px;color:#a1a1aa;">Ce lien expire dans 1 heure. Si tu n'as pas fait cette demande, ignore cet email.</p>`,
      ),
    }
  },

  weeklyReport(name: string, stats: string): EmailTemplateResult {
    const safeName = escapeHtml(name)
    // stats is raw HTML from AI — sanitize it with DOMPurify
    const safeStats = sanitizeHtml(stats)
    return {
      subject: 'Ta semaine sur CourtVision AI 📊',
      html: emailShell(
        'Rapport hebdomadaire',
        `<p style="font-size:16px;color:#27272a;">Salut <strong>${safeName}</strong>,</p>
<p style="font-size:16px;color:#27272a;">Voici ton résumé hebdomadaire :</p>
<div style="margin-top:16px;padding:20px;background:#f4f4f5;border-radius:8px;font-size:14px;color:#27272a;line-height:1.7;">
  ${safeStats}
</div>
<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
  <tr>
    <td align="center" style="background:#0ea5e9;border-radius:8px;">
      <a href="${APP_URL}" style="display:inline-block;padding:12px 32px;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">Voir le tableau de bord</a>
    </td>
  </tr>
</table>`,
      ),
    }
  },

  emailVerification(name: string, verifyUrl: string): EmailTemplateResult {
    const safeName = escapeHtml(name)
    return {
      subject: 'Confirme ton adresse email',
      html: emailShell(
        'Vérification d\'email',
        `<p style="font-size:16px;color:#27272a;">Salut <strong>${safeName}</strong>,</p>
<p style="font-size:16px;color:#27272a;">Confirme ton adresse email en cliquant sur le bouton ci-dessous :</p>
<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
  <tr>
    <td align="center" style="background:#0ea5e9;border-radius:8px;">
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 32px;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">Confirmer mon email</a>
    </td>
  </tr>
</table>
<p style="margin-top:24px;font-size:13px;color:#a1a1aa;">Ce lien expire dans 24 heures.</p>`,
      ),
    }
  },
}

// ── Template resolver (used by the API route) ─────────────────────────────────

type TemplateName = keyof typeof emailTemplates
type TemplateParams = Record<string, string>

const TEMPLATE_PARAM_KEYS: Record<TemplateName, string[]> = {
  welcome: ['name'],
  passwordReset: ['name', 'resetUrl'],
  weeklyReport: ['name', 'stats'],
  emailVerification: ['name', 'verifyUrl'],
}

/**
 * Returns subject + html for a named template, given params.
 * Used by `POST /api/email/send`.
 */
export function getEmailTemplate(
  template: string,
  params: TemplateParams,
): { subject: string; html: string } {
  const key = template as TemplateName
  if (!(key in emailTemplates)) {
    return {
      subject: `Notification: ${params.title ?? template}`,
      html: emailShell(
        template,
        `<p style="font-size:16px;color:#27272a;">${params.body ?? ''}</p>`,
      ),
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = emailTemplates[key] as (...args: any[]) => EmailTemplateResult
  const fnArgs = TEMPLATE_PARAM_KEYS[key].map((k) => params[k] ?? '')
  return fn(...fnArgs)
}