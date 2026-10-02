import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import NotificationClientsManagement from '../NotificationClientsManagement.vue'

const mockNotify = vi.fn()

const {
  mockGetNotificationAdminStatus,
  mockClearPatientNotificationContactByCaseId,
  mockResendPatientNotificationConfirmationByCaseId,
  mockSendManualNotification,
} = vi.hoisted(() => ({
  mockGetNotificationAdminStatus: vi.fn(),
  mockClearPatientNotificationContactByCaseId: vi.fn().mockResolvedValue(undefined),
  mockResendPatientNotificationConfirmationByCaseId: vi.fn().mockResolvedValue(undefined),
  mockSendManualNotification: vi.fn(),
}))

vi.mock('@/stores/notifierStore', () => ({
  useNotifierStore: () => ({
    notify: mockNotify,
  }),
}))

vi.mock('@/services/notificationApi', () => ({
  clearPatientNotificationContactByCaseId: mockClearPatientNotificationContactByCaseId,
  getNotificationAdminStatus: mockGetNotificationAdminStatus,
  resendPatientNotificationConfirmationByCaseId: mockResendPatientNotificationConfirmationByCaseId,
  sendManualNotification: mockSendManualNotification,
}))

describe('NotificationClientsManagement.vue', () => {
  const vuetify = createVuetify({ components, directives })
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        common: {
          actions: 'Actions',
          patient: 'Patient',
          case: 'Case',
          consultation: 'Consultation',
        },
        buttons: {
          refresh: 'Refresh',
        },
        pagination: {
          showing: 'Showing {start}-{end} of {total}',
        },
        notifications: {
          windowOpenLabel: 'Window opens',
          consultationDayLabel: 'Consultation reminder',
          sendNow: 'Send now',
          resend: 'Resend',
          activePushCount: '{count} push active',
          activeEmailCount: '{count} email active',
          manualSendSuccess: 'Sent email {emailSucceeded} push {pushSucceeded}',
          manualSendError: 'Manual send failed',
          adminLoadError: 'Load failed',
        },
        admin: {
          notificationClients: {
            title: 'Notification Clients',
            description: 'Global overview',
            search: 'Search',
            pushTable: {
              title: 'Push subscribers',
              endpoint: 'Browser / Endpoint',
              patientId: 'Patient',
              caseId: 'Case',
              consultationId: 'Consultation',
              createdAt: 'Created',
              lastDeliveredAt: 'Last delivered',
            },
            emailTable: {
              title: 'Email subscriptions',
              email: 'Email',
              patientId: 'Patient',
              caseId: 'Case',
              subscribed: 'Status',
              consentedAt: 'Consented at',
              unsubscribedAt: 'Unsubscribed at',
            },
            notificationTable: {
              type: 'Notification',
              patientId: 'Patient',
              caseId: 'Case',
              consultationId: 'Consultation',
              when: 'When',
              channels: 'Channels',
            },
            subscribed: 'Active',
            pendingConfirmation: 'Pending confirmation',
            pendingExpired: 'Confirmation expired',
            inactive: 'Inactive',
            resendConfirmation: 'Resend confirmation',
            deleteSubscription: 'Delete subscription',
            resendConfirmationSuccess: 'Confirmation email resent.',
            resendConfirmationError: 'Failed to resend confirmation email.',
            deleteSuccess: 'Notification subscription removed.',
            deleteError: 'Failed to remove notification subscription.',
            upcomingTitle: 'Upcoming reminders',
            recentTitle: 'Recent reminders',
            upcomingCount: '{count} upcoming',
            recentCount: '{count} recent',
            emailChannel: 'Email',
            pushChannel: 'Push',
          },
        },
      },
    },
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'root', component: { template: '<div />' } },
      { path: '/patient/:patientId', name: 'patientoverview', component: { template: '<div />' } },
      { path: '/case/:caseId', name: 'patientcaselanding', component: { template: '<div />' } },
      { path: '/consultation/:consultationId', name: 'consultationoverview', component: { template: '<div />' } },
    ],
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    await router.push('/')
    await router.isReady()

    const pushSubscriptions = Array.from({ length: 12 }, (_, index) => ({
      endpoint: `https://push.example/${index + 1}`,
      userAgent: `Browser ${index + 1}`,
      createdAt: '2026-09-20T08:00:00.000Z',
      archivedAt: null,
      lastDeliveredAt: index === 0 ? '2026-09-27T08:00:00.000Z' : null,
      failureCount: 0,
      patientId: `patient-${index + 1}`,
      caseId: `case-${index + 1}`,
      consultationId: `consult-${index + 1}`,
    }))

    mockGetNotificationAdminStatus.mockResolvedValue({
      scope: { patientId: null, caseId: null, consultationId: null },
      summary: {
        activePushSubscriptionCount: 12,
        activeEmailSubscriptionCount: 1,
        activeEmailRecipients: ['patient@example.com'],
      },
      emailContacts: [
        {
          caseId: 'case-1',
          patientId: 'patient-1',
          email: null,
          pendingEmail: 'patient@example.com',
          futureConsultationReminders: true,
          confirmationPending: true,
          confirmationExpired: false,
          confirmationExpiresAt: '2026-10-01T08:00:00.000Z',
          consentedAt: '2026-09-20T08:00:00.000Z',
          unsubscribedAt: null,
        },
      ],
      pushSubscriptions,
      upcomingNotifications: [
        {
          consultationId: 'consult-1',
          caseId: 'case-1',
          patientId: 'patient-1',
          consultationDate: null,
          type: 'consultation_day_reminder',
          dueAt: '2026-09-29T08:00:00.000Z',
          source: 'scheduled',
          channels: { email: true, push: true },
        },
      ],
      recentNotifications: [
        {
          consultationId: 'consult-2',
          caseId: 'case-2',
          patientId: 'patient-2',
          consultationDate: null,
          type: 'consultation_window_opened',
          sentAt: '2026-09-27T08:00:00.000Z',
          source: 'manual',
          channels: { email: false, push: true },
        },
      ],
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

  it('loads global notification status, paginates push clients, and triggers manual sends', async () => {
    const wrapper = mount(NotificationClientsManagement, {
      global: {
        plugins: [vuetify, i18n, router],
      },
    })

    await flushPromises()

    expect(mockGetNotificationAdminStatus).toHaveBeenCalledWith({})
    expect(wrapper.text()).toContain('Notification Clients')
    expect(wrapper.text()).toContain('Showing 1-10 of 12')
    expect(wrapper.text()).toContain('Browser 1')
    expect(wrapper.text()).not.toContain('Browser 12')
    expect(wrapper.text()).toContain('patient@example.com')
    expect(wrapper.text()).toContain('Pending confirmation')

    const sendButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('Send now'))

    await sendButton!.trigger('click')
    await flushPromises()

    expect(mockSendManualNotification).toHaveBeenCalledWith({
      consultationId: 'consult-1',
      type: 'consultation_day_reminder',
    })
    expect(mockNotify).toHaveBeenCalledWith('Sent email 1 push 1', 'success')
  })

  it('navigates to the related patient, case, and consultation from push rows', async () => {
    const pushSpy = vi.spyOn(router, 'push')

    const wrapper = mount(NotificationClientsManagement, {
      global: {
        plugins: [vuetify, i18n, router],
      },
    })

    await flushPromises()

    const patientButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('Patient'))
    const caseButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('Case'))
    const consultationButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('Consultation'))

    await patientButton!.trigger('click')
    await caseButton!.trigger('click')
    await consultationButton!.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'patientoverview', params: { patientId: 'patient-1' } })
    expect(pushSpy).toHaveBeenCalledWith({ name: 'patientcaselanding', params: { caseId: 'case-1' } })
    expect(pushSpy).toHaveBeenCalledWith({ name: 'consultationoverview', params: { consultationId: 'consult-1' } })
  })

  it('allows admins to resend pending confirmations and delete subscriptions', async () => {
    const wrapper = mount(NotificationClientsManagement, {
      global: {
        plugins: [vuetify, i18n, router],
      },
    })

    await flushPromises()

    const resendButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('Resend confirmation'))
    const deleteButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('Delete subscription'))

    await resendButton!.trigger('click')
    await flushPromises()

    expect(mockResendPatientNotificationConfirmationByCaseId).toHaveBeenCalledWith('case-1')
    expect(mockNotify).toHaveBeenCalledWith('Confirmation email resent.', 'success')

    await deleteButton!.trigger('click')
    await flushPromises()

    expect(mockClearPatientNotificationContactByCaseId).toHaveBeenCalledWith('case-1')
    expect(mockNotify).toHaveBeenCalledWith('Notification subscription removed.', 'success')
  })
})