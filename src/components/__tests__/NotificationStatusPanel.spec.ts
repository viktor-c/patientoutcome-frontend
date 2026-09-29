import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import NotificationStatusPanel from '../NotificationStatusPanel.vue'

const {
  mockGetNotificationAdminStatus,
  mockSendManualNotification,
  mockHasRole,
} = vi.hoisted(() => ({
  mockGetNotificationAdminStatus: vi.fn(),
  mockSendManualNotification: vi.fn(),
  mockHasRole: vi.fn(() => true),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    hasRole: mockHasRole,
  }),
}))

vi.mock('@/services/notificationApi', () => ({
  getNotificationAdminStatus: mockGetNotificationAdminStatus,
  sendManualNotification: mockSendManualNotification,
}))

describe('NotificationStatusPanel.vue', () => {
  const vuetify = createVuetify({ components, directives })
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        common: {
          notAvailable: 'common.notAvailable',
        },
        notifications: {
          adminPanelTitle: 'notifications.adminPanelTitle',
          activePushCount: 'notifications.activePushCount',
          activeEmailCount: 'notifications.activeEmailCount',
          emailRecipientsTitle: 'notifications.emailRecipientsTitle',
          pushSubscriptionsTitle: 'notifications.pushSubscriptionsTitle',
          noEmailConfigured: 'notifications.noEmailConfigured',
          emailSubscribed: 'notifications.emailSubscribed',
          emailNotSubscribed: 'notifications.emailNotSubscribed',
          caseLabel: 'notifications.caseLabel',
          noPushSubscriptions: 'notifications.noPushSubscriptions',
          lastDeliveredAtLabel: 'notifications.lastDeliveredAtLabel',
          upcomingTitle: 'notifications.upcomingTitle',
          recentTitle: 'notifications.recentTitle',
          dueAtLabel: 'notifications.dueAtLabel',
          sentAtLabel: 'notifications.sentAtLabel',
          windowOpenLabel: 'notifications.windowOpenLabel',
          consultationDayLabel: 'notifications.consultationDayLabel',
          sendNow: 'notifications.sendNow',
          resend: 'notifications.resend',
          noUpcomingNotifications: 'notifications.noUpcomingNotifications',
          noRecentNotifications: 'notifications.noRecentNotifications',
          manualSource: 'notifications.manualSource',
          scheduledSource: 'notifications.scheduledSource',
          channelSummary: 'notifications.channelSummary',
          manualSendSuccess: 'notifications.manualSendSuccess',
        },
      },
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockHasRole.mockReturnValue(true)
    mockGetNotificationAdminStatus.mockResolvedValue({
      scope: { patientId: 'patient-1', caseId: null, consultationId: null },
      summary: {
        activePushSubscriptionCount: 1,
        activeEmailSubscriptionCount: 1,
        activeEmailRecipients: ['patient@example.com'],
      },
      emailContacts: [
        {
          caseId: 'case-1',
          patientId: 'patient-1',
          email: 'patient@example.com',
          futureConsultationReminders: true,
          consentedAt: null,
          unsubscribedAt: null,
        },
      ],
      pushSubscriptions: [
        {
          endpoint: 'https://push.example/sub-1',
          userAgent: 'Chrome',
          createdAt: null,
          archivedAt: null,
          lastDeliveredAt: null,
          failureCount: 0,
          patientId: 'patient-1',
          caseId: 'case-1',
          consultationId: 'consult-1',
        },
      ],
      upcomingNotifications: [
        {
          consultationId: 'consult-1',
          caseId: 'case-1',
          patientId: 'patient-1',
          consultationDate: null,
          type: 'consultation_day_reminder',
          dueAt: '2026-09-28T08:00:00.000Z',
          source: 'scheduled',
          channels: { email: true, push: true },
        },
      ],
      recentNotifications: [],
    })
    mockSendManualNotification.mockResolvedValue({
      consultationId: 'consult-1',
      caseId: 'case-1',
      type: 'consultation_day_reminder',
      sentAt: '2026-09-28T08:00:00.000Z',
      email: { attempted: 1, succeeded: 1, failed: 0 },
      push: { attempted: 1, succeeded: 1, failed: 0 },
    })
  })

  it('loads and renders admin notification status', async () => {
    const wrapper = mount(NotificationStatusPanel, {
      props: { patientId: 'patient-1' },
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    expect(mockGetNotificationAdminStatus).toHaveBeenCalledWith({
      patientId: 'patient-1',
      caseId: null,
      consultationId: null,
    })
    expect(wrapper.text()).toContain('patient@example.com')
    expect(wrapper.text()).toContain('Chrome')
  })

  it('allows admins to trigger a manual notification send', async () => {
    const wrapper = mount(NotificationStatusPanel, {
      props: { patientId: 'patient-1' },
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    const sendButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('notifications.sendNow'))

    await sendButton!.trigger('click')
    await flushPromises()

    expect(mockSendManualNotification).toHaveBeenCalledWith({
      consultationId: 'consult-1',
      type: 'consultation_day_reminder',
    })
  })
})