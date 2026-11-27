import { Resend } from 'resend'
import { createHash } from 'node:crypto'

export interface EmailService {
  sendEmailVerification(input: { email: string; name: string; token: string }): Promise<void>
}

export class ResendEmailService implements EmailService {
  private readonly resend: Resend

  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly apiPublicUrl: string,
  ) {
    this.resend = new Resend(apiKey)
  }

  async sendEmailVerification(input: { email: string; name: string; token: string }) {
    const verificationUrl = new URL('/auth/verify-email', this.apiPublicUrl)
    verificationUrl.searchParams.set('token', input.token)

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: input.email,
      subject: 'Confirme seu e-mail no Parlo',
      html: verificationTemplate(input.name, verificationUrl.toString()),
    }, {
      idempotencyKey: `email-verification/${digestForIdempotency(input.token)}`,
    })

    if (error) throw new Error(`Resend error: ${error.message}`)
  }
}

export class DisabledEmailService implements EmailService {
  async sendEmailVerification() {
    throw new Error('Email service is not configured')
  }
}

function verificationTemplate(name: string, url: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#fff8ea;font-family:Arial,sans-serif;color:#14213d">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <p style="color:#5b8e7d;font-weight:700;letter-spacing:2px">PARLO</p>
      <h1 style="font-size:30px">Confirme seu e-mail</h1>
      <p>Olá, ${escapeHtml(name)}! Confirme seu endereço para proteger sua conta e continuar no Parlo.</p>
      <p style="margin:32px 0">
        <a href="${escapeHtml(url)}" style="background:#14213d;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;display:inline-block">Confirmar meu e-mail</a>
      </p>
      <p style="font-size:13px;color:#687086">Este link expira em 24 horas. Se você não criou esta conta, ignore esta mensagem.</p>
    </div>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function digestForIdempotency(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
