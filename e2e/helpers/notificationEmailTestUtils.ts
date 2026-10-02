import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

type EnvMap = Record<string, string>

export interface NotificationMailboxConfig {
  backendUrl: string
  recipientEmail: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  imapUser: string
  imapPassword: string
}

export interface NotificationMailboxMessage {
  subject: string
  text: string
  html: string
}

function parseEnvFile(filePath: string): EnvMap {
  const content = readFileSync(filePath, 'utf-8')
  const values: EnvMap = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    values[key] = value
  }

  return values
}

export function loadNotificationMailboxConfig(): NotificationMailboxConfig {
  const backendEnvPath = path.resolve(__dirname, '../../../patientoutcome-backend/.env')
  const backendEnv = parseEnvFile(backendEnvPath)

  const backendUrl = process.env.NOTIFICATION_TEST_BACKEND_URL
    || process.env.BACKEND_URL
    || 'http://localhost:40001'

  const recipientEmail = process.env.NOTIFICATION_TEST_EMAIL
    || backendEnv.SMTP_FROM_EMAIL
    || backendEnv.SMTP_USER

  const imapHost = process.env.NOTIFICATION_TEST_IMAP_HOST || backendEnv.SMTP_HOST
  const imapPort = Number(process.env.NOTIFICATION_TEST_IMAP_PORT || '993')
  const imapSecure = (process.env.NOTIFICATION_TEST_IMAP_SECURE || 'true') !== 'false'
  const imapUser = process.env.NOTIFICATION_TEST_IMAP_USER || backendEnv.SMTP_USER
  const imapPassword = process.env.NOTIFICATION_TEST_IMAP_PASSWORD || backendEnv.SMTP_PASS

  if (!recipientEmail || !imapHost || !imapUser || !imapPassword) {
    throw new Error('Real SMTP notification test requires SMTP/IMAP credentials. Set NOTIFICATION_TEST_* env vars or configure patientoutcome-backend/.env.')
  }

  return {
    backendUrl,
    recipientEmail,
    imapHost,
    imapPort,
    imapSecure,
    imapUser,
    imapPassword,
  }
}

export function shouldRunRealNotificationEmailTest(): boolean {
  return process.env.RUN_REAL_SMTP_NOTIFICATION_E2E === 'true'
}

export class NotificationMailbox {
  private client: ImapFlow

  constructor(private readonly config: NotificationMailboxConfig) {
    this.client = new ImapFlow({
      host: config.imapHost,
      port: config.imapPort,
      secure: config.imapSecure,
      auth: {
        user: config.imapUser,
        pass: config.imapPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: false,
    })
  }

  async connect(): Promise<void> {
    await this.client.connect()
    await this.client.mailboxOpen('INBOX')
  }

  getMessageCount(): number {
    return this.client.mailbox.exists ?? 0
  }

  async waitForConfirmationMessage(afterCount: number, timeoutMs = 90_000): Promise<NotificationMailboxMessage> {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      await this.client.noop()
      const currentCount = this.client.mailbox.exists ?? 0

      if (currentCount > afterCount) {
        for await (const message of this.client.fetch(`${afterCount + 1}:*`, { source: true })) {
          const parsed = await simpleParser(message.source)
          const subject = parsed.subject ?? ''
          const text = parsed.text ?? ''
          const html = typeof parsed.html === 'string' ? parsed.html : ''
          const combined = `${subject}\n${text}\n${html}`

          if (combined.includes('/notifications/email/confirm/')) {
            return { subject, text, html }
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 5_000))
    }

    throw new Error('Timed out waiting for notification confirmation email in inbox')
  }

  async close(): Promise<void> {
    await this.client.logout().catch(() => undefined)
  }
}

export function extractConfirmationToken(message: NotificationMailboxMessage): string {
  const combined = `${message.text}\n${message.html}`
  const match = combined.match(/\/notifications\/email\/confirm\/([A-Za-z0-9-]+)/)
  if (!match?.[1]) {
    throw new Error('Could not find confirmation token in notification confirmation email')
  }

  return match[1]
}