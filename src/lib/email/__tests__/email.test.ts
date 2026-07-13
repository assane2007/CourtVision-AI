import { describe, it, expect, vi, beforeEach } from 'vitest';
 describe('email service', () => {
  beforeEach(() => {
    vi?.resetModules()
    // Ensure RESEND_API_KEY is not set
    delete process.env.RESEND_API_KEY
  })

  it('sendEmail returns success: false when RESEND_API_KEY not set', async () => {
    const { sendEmail } = await import('@/lib/email')
    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    })
    expect(result?.success)?.toBe(false)
    expect(result?.error)?.toContain('not configured')
  })

  it('emailTemplates has all 4 template types', async () => {
    const { emailTemplates } = await import('@/lib/email')
    expect(typeof emailTemplates?.welcome)?.toBe('function')
    expect(typeof emailTemplates?.passwordReset)?.toBe('function')
    expect(typeof emailTemplates?.weeklyReport)?.toBe('function')
    expect(typeof emailTemplates?.emailVerification)?.toBe('function')
  })

  it('getEmailTemplate returns correct template with subject and html', async () => {
    const { getEmailTemplate } = await import('@/lib/email')
    const result = getEmailTemplate('welcome', { name: 'Kyrie' })
    expect(result?.subject)?.toContain('Bienvenue')
    expect(result?.html)?.toContain('Kyrie')
  })

  it('getEmailTemplate returns fallback for unknown template name', async () => {
    const { getEmailTemplate } = await import('@/lib/email')
    const result = getEmailTemplate('unknown_template', {
      title: 'Custom Title',
      body: 'Custom body',
    })
    expect(result?.subject)?.toContain('Custom Title')
    expect(result?.html)?.toContain('Custom body')
  })
})