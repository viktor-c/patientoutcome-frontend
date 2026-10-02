import { test, expect } from '@playwright/test'
import { applyRuntimeApiUrl, loginWithRole } from './helpers/auth'
import {
  extractConfirmationToken,
  loadNotificationMailboxConfig,
  NotificationMailbox,
  shouldRunRealNotificationEmailTest,
} from './helpers/notificationEmailTestUtils'

const CASE_ACCESS_TOKEN = 'SJM13'
const pendingStatusPattern = /Pending confirmation|Bestätigung ausstehend/
const activeStatusPattern = /Active|Aktiv/

test.describe.serial('Notification email confirmation', () => {
  test.skip(!shouldRunRealNotificationEmailTest(), 'Set RUN_REAL_SMTP_NOTIFICATION_E2E=true to run the real SMTP confirmation test.')

  test('sends a confirmation email, shows pending in admin, and confirms the subscription', async ({ page, request }) => {
    const config = loadNotificationMailboxConfig()
    const mailbox = new NotificationMailbox(config)

    await mailbox.connect()
    const inboxCheckpoint = mailbox.getMessageCount()

    try {
      await applyRuntimeApiUrl(page, config.backendUrl)

      const clearResponse = await request.delete(`${config.backendUrl}/notifications/patient-contact/${CASE_ACCESS_TOKEN}`)
      expect([204, 404]).toContain(clearResponse.status())

      const saveResponse = await request.post(`${config.backendUrl}/notifications/patient-contact`, {
        data: {
          caseAccessToken: CASE_ACCESS_TOKEN,
          email: config.recipientEmail,
          futureConsultationReminders: true,
          locale: 'en',
        },
      })

      expect(saveResponse.ok()).toBeTruthy()
      const pendingContact = await saveResponse.json() as {
        pendingEmail: string | null
        confirmationPending: boolean
        subscribed: boolean
      }
      expect(pendingContact.pendingEmail).toBe(config.recipientEmail)
      expect(pendingContact.confirmationPending).toBe(true)
      expect(pendingContact.subscribed).toBe(false)

      await loginWithRole(page, 'clinician')
      await page.goto('/admin/notification-clients')
      await expect(page.getByText(config.recipientEmail).first()).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(pendingStatusPattern).first()).toBeVisible({ timeout: 15_000 })

      const confirmationMessage = await mailbox.waitForConfirmationMessage(inboxCheckpoint)
      const confirmationToken = extractConfirmationToken(confirmationMessage)

      const confirmationPage = await page.context().newPage()
      await confirmationPage.goto(`${config.backendUrl}/notifications/email/confirm/${confirmationToken}`)
      await expect(confirmationPage.getByText('Email reminders enabled')).toBeVisible({ timeout: 15_000 })
      await confirmationPage.close()

      const confirmedContactResponse = await request.get(`${config.backendUrl}/notifications/patient-contact/${CASE_ACCESS_TOKEN}`)
      expect(confirmedContactResponse.ok()).toBeTruthy()
      const confirmedContact = await confirmedContactResponse.json() as {
        email: string | null
        pendingEmail: string | null
        confirmationPending: boolean
        subscribed: boolean
      }
      expect(confirmedContact.email).toBe(config.recipientEmail)
      expect(confirmedContact.pendingEmail).toBeNull()
      expect(confirmedContact.confirmationPending).toBe(false)
      expect(confirmedContact.subscribed).toBe(true)

      await page.getByRole('button', { name: 'Refresh' }).click()
      await expect(page.getByText(pendingStatusPattern)).toHaveCount(0)
      await expect(page.getByText(activeStatusPattern).first()).toBeVisible({ timeout: 15_000 })
    } finally {
      await mailbox.close()
    }
  })
})