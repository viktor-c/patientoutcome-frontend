import { apiBasePath } from '@/api'

export type NotificationEventType = 'consultation_window_opened' | 'consultation_day_reminder'

export interface PatientNotificationContact {
  caseId: string
  patientId: string
  email: string | null
  futureConsultationReminders: boolean
  subscribed: boolean
  consentedAt: string | null
  unsubscribedAt: string | null
}

export interface NotificationStatusItem {
  consultationId: string
  caseId: string
  patientId: string
  consultationDate: string | null
  type: NotificationEventType
  dueAt?: string | null
  sentAt?: string | null
  source: 'scheduled' | 'manual'
  channels: {
    email: boolean
    push: boolean
  }
}

export interface NotificationEmailContactSummary {
  caseId: string
  patientId: string
  email: string | null
  futureConsultationReminders: boolean
  consentedAt: string | null
  unsubscribedAt: string | null
}

export interface NotificationPushSubscriptionSummary {
  endpoint: string
  userAgent: string | null
  createdAt: string | null
  archivedAt: string | null
  lastDeliveredAt: string | null
  failureCount: number
  patientId: string | null
  caseId: string | null
  consultationId: string | null
}

export interface NotificationAdminStatus {
  scope: {
    patientId: string | null
    caseId: string | null
    consultationId: string | null
  }
  summary: {
    activePushSubscriptionCount: number
    activeEmailSubscriptionCount: number
    activeEmailRecipients: string[]
  }
  emailContacts: NotificationEmailContactSummary[]
  pushSubscriptions: NotificationPushSubscriptionSummary[]
  upcomingNotifications: NotificationStatusItem[]
  recentNotifications: NotificationStatusItem[]
}

export interface ManualNotificationSendResult {
  consultationId: string
  caseId: string
  type: NotificationEventType
  sentAt: string
  email: { attempted: number; succeeded: number; failed: number }
  push: { attempted: number; succeeded: number; failed: number }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(data.message || `Request failed with ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return await response.json() as T
}

export async function getPatientNotificationContact(caseAccessToken: string): Promise<PatientNotificationContact> {
  const response = await fetch(`${apiBasePath}/notifications/patient-contact/${encodeURIComponent(caseAccessToken)}`, {
    credentials: 'include',
  })

  return parseJsonResponse<PatientNotificationContact>(response)
}

export async function savePatientNotificationContact(payload: {
  caseAccessToken: string
  email: string
  futureConsultationReminders: boolean
}): Promise<PatientNotificationContact> {
  const response = await fetch(`${apiBasePath}/notifications/patient-contact`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<PatientNotificationContact>(response)
}

export async function clearPatientNotificationContact(caseAccessToken: string): Promise<void> {
  const response = await fetch(`${apiBasePath}/notifications/patient-contact/${encodeURIComponent(caseAccessToken)}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  await parseJsonResponse<void>(response)
}

export async function getNotificationAdminStatus(params: {
  patientId?: string | null
  caseId?: string | null
  consultationId?: string | null
}): Promise<NotificationAdminStatus> {
  const url = new URL(`${apiBasePath}/notifications/admin/status`, window.location.origin)

  if (params.patientId) url.searchParams.set('patientId', params.patientId)
  if (params.caseId) url.searchParams.set('caseId', params.caseId)
  if (params.consultationId) url.searchParams.set('consultationId', params.consultationId)

  const response = await fetch(url.toString(), {
    credentials: 'include',
  })

  return parseJsonResponse<NotificationAdminStatus>(response)
}

export async function sendManualNotification(payload: {
  consultationId: string
  type: NotificationEventType
}): Promise<ManualNotificationSendResult> {
  const response = await fetch(`${apiBasePath}/notifications/admin/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJsonResponse<ManualNotificationSendResult>(response)
}