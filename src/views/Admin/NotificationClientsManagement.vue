<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotifierStore } from '@/stores/notifierStore'
import {
  clearPatientNotificationContactByCaseId,
  getNotificationAdminStatus,
  resendPatientNotificationConfirmationByCaseId,
  sendManualNotification,
  type NotificationAdminStatus,
  type NotificationEmailContactSummary,
  type NotificationEventType,
  type NotificationPushSubscriptionSummary,
  type NotificationStatusItem,
} from '@/services/notificationApi'

const { t } = useI18n()
const router = useRouter()
const notifierStore = useNotifierStore()

const loading = ref(false)
const actionLoadingKey = ref<string | null>(null)
const search = ref('')
const status = ref<NotificationAdminStatus | null>(null)
const itemsPerPage = 10
const pushPage = ref(1)
const emailPage = ref(1)
const upcomingPage = ref(1)
const recentPage = ref(1)

const pushHeaders = computed(() => [
  { title: t('admin.notificationClients.pushTable.endpoint'), key: 'userAgent', sortable: true },
  { title: t('admin.notificationClients.pushTable.patientId'), key: 'patientId', sortable: true },
  { title: t('admin.notificationClients.pushTable.caseId'), key: 'caseId', sortable: true },
  { title: t('admin.notificationClients.pushTable.consultationId'), key: 'consultationId', sortable: true },
  { title: t('admin.notificationClients.pushTable.createdAt'), key: 'createdAt', sortable: true },
  { title: t('admin.notificationClients.pushTable.lastDeliveredAt'), key: 'lastDeliveredAt', sortable: true },
  { title: t('common.actions'), key: 'actions', sortable: false },
])

const emailHeaders = computed(() => [
  { title: t('admin.notificationClients.emailTable.email'), key: 'email', sortable: true },
  { title: t('admin.notificationClients.emailTable.patientId'), key: 'patientId', sortable: true },
  { title: t('admin.notificationClients.emailTable.caseId'), key: 'caseId', sortable: true },
  { title: t('admin.notificationClients.emailTable.subscribed'), key: 'futureConsultationReminders', sortable: true },
  { title: t('admin.notificationClients.emailTable.consentedAt'), key: 'consentedAt', sortable: true },
  { title: t('admin.notificationClients.emailTable.unsubscribedAt'), key: 'unsubscribedAt', sortable: true },
  { title: t('common.actions'), key: 'actions', sortable: false },
])

const notificationHeaders = computed(() => [
  { title: t('admin.notificationClients.notificationTable.type'), key: 'type', sortable: true },
  { title: t('admin.notificationClients.notificationTable.patientId'), key: 'patientId', sortable: true },
  { title: t('admin.notificationClients.notificationTable.caseId'), key: 'caseId', sortable: true },
  { title: t('admin.notificationClients.notificationTable.consultationId'), key: 'consultationId', sortable: true },
  { title: t('admin.notificationClients.notificationTable.when'), key: 'when', sortable: true },
  { title: t('admin.notificationClients.notificationTable.channels'), key: 'channels', sortable: false },
  { title: t('common.actions'), key: 'actions', sortable: false },
])

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const eventLabel = (type: NotificationEventType) => (
  type === 'consultation_window_opened'
    ? t('notifications.windowOpenLabel')
    : t('notifications.consultationDayLabel')
)

const normalizedSearch = computed(() => search.value.trim().toLowerCase())

const matchesSearch = (values: Array<string | null | undefined>) => {
  if (!normalizedSearch.value) return true
  return values.some((value) => (value || '').toLowerCase().includes(normalizedSearch.value))
}

const filteredPushSubscriptions = computed(() => {
  return (status.value?.pushSubscriptions || []).filter((subscription) =>
    matchesSearch([
      subscription.userAgent,
      subscription.endpoint,
      subscription.patientId,
      subscription.caseId,
      subscription.consultationId,
    ]),
  )
})

const filteredEmailContacts = computed(() => {
  return (status.value?.emailContacts || []).filter((contact) =>
    matchesSearch([
      contact.email,
      contact.pendingEmail,
      contact.patientId,
      contact.caseId,
    ]),
  )
})

const filteredUpcomingNotifications = computed(() => {
  return (status.value?.upcomingNotifications || []).filter((item) =>
    matchesSearch([
      eventLabel(item.type),
      item.patientId,
      item.caseId,
      item.consultationId,
    ]),
  )
})

const filteredRecentNotifications = computed(() => {
  return (status.value?.recentNotifications || []).filter((item) =>
    matchesSearch([
      eventLabel(item.type),
      item.patientId,
      item.caseId,
      item.consultationId,
    ]),
  )
})

const paginatedPushSubscriptions = computed(() => {
  const start = (pushPage.value - 1) * itemsPerPage
  return filteredPushSubscriptions.value.slice(start, start + itemsPerPage)
})

const paginatedEmailContacts = computed(() => {
  const start = (emailPage.value - 1) * itemsPerPage
  return filteredEmailContacts.value.slice(start, start + itemsPerPage)
})

const paginatedUpcomingNotifications = computed(() => {
  const start = (upcomingPage.value - 1) * itemsPerPage
  return filteredUpcomingNotifications.value.slice(start, start + itemsPerPage)
})

const paginatedRecentNotifications = computed(() => {
  const start = (recentPage.value - 1) * itemsPerPage
  return filteredRecentNotifications.value.slice(start, start + itemsPerPage)
})

const pushTotalPages = computed(() => Math.max(1, Math.ceil(filteredPushSubscriptions.value.length / itemsPerPage)))
const emailTotalPages = computed(() => Math.max(1, Math.ceil(filteredEmailContacts.value.length / itemsPerPage)))
const upcomingTotalPages = computed(() => Math.max(1, Math.ceil(filteredUpcomingNotifications.value.length / itemsPerPage)))
const recentTotalPages = computed(() => Math.max(1, Math.ceil(filteredRecentNotifications.value.length / itemsPerPage)))

const paginationSummary = (page: number, total: number) => ({
  start: total === 0 ? 0 : (page - 1) * itemsPerPage + 1,
  end: Math.min(page * itemsPerPage, total),
  total,
})

const loadStatus = async () => {
  loading.value = true
  try {
    status.value = await getNotificationAdminStatus({})
    pushPage.value = 1
    emailPage.value = 1
    upcomingPage.value = 1
    recentPage.value = 1
  } catch (error) {
    const message = error instanceof Error ? error.message : t('notifications.adminLoadError')
    notifierStore.notify(message, 'error')
  } finally {
    loading.value = false
  }
}

const manageEmailSubscription = async (
  contact: NotificationEmailContactSummary,
  action: 'delete' | 'resend-confirmation',
) => {
  actionLoadingKey.value = `${action}:${contact.caseId}`

  try {
    if (action === 'delete') {
      await clearPatientNotificationContactByCaseId(contact.caseId)
      notifierStore.notify(t('admin.notificationClients.deleteSuccess'), 'success')
    } else {
      await resendPatientNotificationConfirmationByCaseId(contact.caseId)
      notifierStore.notify(t('admin.notificationClients.resendConfirmationSuccess'), 'success')
    }

    await loadStatus()
  } catch (error) {
    const fallbackKey = action === 'delete'
      ? 'admin.notificationClients.deleteError'
      : 'admin.notificationClients.resendConfirmationError'
    const message = error instanceof Error ? error.message : t(fallbackKey)
    notifierStore.notify(message, 'error')
  } finally {
    actionLoadingKey.value = null
  }
}

const sendNotification = async (item: NotificationStatusItem) => {
  actionLoadingKey.value = `${item.consultationId}:${item.type}`
  try {
    const result = await sendManualNotification({
      consultationId: item.consultationId,
      type: item.type,
    })
    notifierStore.notify(
      t('notifications.manualSendSuccess', {
        emailSucceeded: result.email.succeeded,
        pushSucceeded: result.push.succeeded,
      }),
      'success',
    )
    await loadStatus()
  } catch (error) {
    const message = error instanceof Error ? error.message : t('notifications.manualSendError')
    notifierStore.notify(message, 'error')
  } finally {
    actionLoadingKey.value = null
  }
}

const openPatient = (patientId: string | null) => {
  if (!patientId) return
  router.push({ name: 'patientoverview', params: { patientId } })
}

const openCase = (caseId: string | null) => {
  if (!caseId) return
  router.push({ name: 'patientcaselanding', params: { caseId } })
}

const openConsultation = (consultationId: string | null) => {
  if (!consultationId) return
  router.push({ name: 'consultationoverview', params: { consultationId } })
}

const emailSubscriptionLabel = (contact: NotificationEmailContactSummary) => (
  contact.confirmationPending
    ? (contact.confirmationExpired
      ? t('admin.notificationClients.pendingExpired')
      : t('admin.notificationClients.pendingConfirmation'))
    : contact.futureConsultationReminders && !contact.unsubscribedAt
      ? t('admin.notificationClients.subscribed')
      : t('admin.notificationClients.inactive')
)

const emailDisplay = (contact: NotificationEmailContactSummary) => contact.pendingEmail || contact.email || '-'

const channelSummary = (item: NotificationStatusItem) => [
  item.channels.email ? t('admin.notificationClients.emailChannel') : null,
  item.channels.push ? t('admin.notificationClients.pushChannel') : null,
].filter(Boolean).join(' / ')

const summaryChips = computed(() => {
  if (!status.value) return []
  return [
    { label: t('notifications.activePushCount', { count: status.value.summary.activePushSubscriptionCount }), color: 'primary' },
    { label: t('notifications.activeEmailCount', { count: status.value.summary.activeEmailSubscriptionCount }), color: 'success' },
    { label: t('admin.notificationClients.upcomingCount', { count: status.value.upcomingNotifications.length }), color: 'warning' },
    { label: t('admin.notificationClients.recentCount', { count: status.value.recentNotifications.length }), color: 'secondary' },
  ]
})

onMounted(async () => {
  await loadStatus()
})
</script>

<template>
  <div>
    <v-card class="mb-6">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-3">
        <div>
          <div class="text-h5">{{ t('admin.notificationClients.title') }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ t('admin.notificationClients.description') }}</div>
        </div>
        <div class="d-flex ga-2 flex-wrap align-center">
          <v-text-field
                        v-model="search"
                        :label="t('admin.notificationClients.search')"
                        prepend-inner-icon="mdi-magnify"
                        density="comfortable"
                        variant="outlined"
                        hide-details
                        class="search-field" />
          <v-btn color="primary" variant="outlined" :loading="loading" @click="loadStatus">
            {{ t('buttons.refresh') }}
          </v-btn>
        </div>
      </v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
                  v-for="chip in summaryChips"
                  :key="chip.label"
                  :color="chip.color"
                  variant="tonal">
            {{ chip.label }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="mb-6">
      <v-card-title>{{ t('admin.notificationClients.pushTable.title') }}</v-card-title>
      <v-card-text>
        <v-data-table
                      :headers="pushHeaders"
                      :items="paginatedPushSubscriptions"
                      :items-length="filteredPushSubscriptions.length"
                      :items-per-page="itemsPerPage"
                      :page="pushPage"
                      hide-default-footer
                      :loading="loading"
                      item-key="endpoint">
          <template #item.userAgent="{ item }">
            <div class="text-body-2 table-wrap">{{ item.userAgent || item.endpoint }}</div>
          </template>
          <template #item.createdAt="{ item }">{{ formatDateTime(item.createdAt) }}</template>
          <template #item.lastDeliveredAt="{ item }">{{ formatDateTime(item.lastDeliveredAt) }}</template>
          <template #item.actions="{ item }">
            <div class="d-flex ga-1 flex-wrap">
              <v-btn size="small" variant="text" @click="openPatient(item.patientId)">{{ t('common.patient') }}</v-btn>
              <v-btn size="small" variant="text" @click="openCase(item.caseId)">{{ t('common.case') }}</v-btn>
              <v-btn size="small" variant="text" @click="openConsultation(item.consultationId)">{{
                t('common.consultation') }}</v-btn>
            </div>
          </template>
          <template #bottom>
            <div class="d-flex justify-center align-center pa-4 flex-wrap ga-4">
              <v-pagination v-model="pushPage" :length="pushTotalPages" :total-visible="7" />
              <span class="text-caption">
                {{ t('pagination.showing', paginationSummary(pushPage, filteredPushSubscriptions.length)) }}
              </span>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-card class="mb-6">
      <v-card-title>{{ t('admin.notificationClients.emailTable.title') }}</v-card-title>
      <v-card-text>
        <v-data-table
                      :headers="emailHeaders"
                      :items="paginatedEmailContacts"
                      :items-length="filteredEmailContacts.length"
                      :items-per-page="itemsPerPage"
                      :page="emailPage"
                      hide-default-footer
                      :loading="loading"
                      item-key="caseId">
          <template #item.email="{ item }">{{ emailDisplay(item) }}</template>
          <template #item.futureConsultationReminders="{ item }">{{ emailSubscriptionLabel(item) }}</template>
          <template #item.consentedAt="{ item }">{{ formatDateTime(item.consentedAt) }}</template>
          <template #item.unsubscribedAt="{ item }">{{ formatDateTime(item.unsubscribedAt) }}</template>
          <template #item.actions="{ item }">
            <div class="d-flex ga-1 flex-wrap">
              <v-btn size="small" variant="text" @click="openPatient(item.patientId)">{{ t('common.patient') }}</v-btn>
              <v-btn size="small" variant="text" @click="openCase(item.caseId)">{{ t('common.case') }}</v-btn>
              <v-btn
                     v-if="item.confirmationPending"
                     size="small"
                     color="secondary"
                     variant="outlined"
                     :loading="actionLoadingKey === `resend-confirmation:${item.caseId}`"
                     @click="manageEmailSubscription(item, 'resend-confirmation')">
                {{ t('admin.notificationClients.resendConfirmation') }}
              </v-btn>
              <v-btn
                     size="small"
                     color="error"
                     variant="text"
                     :loading="actionLoadingKey === `delete:${item.caseId}`"
                     @click="manageEmailSubscription(item, 'delete')">
                {{ t('admin.notificationClients.deleteSubscription') }}
              </v-btn>
            </div>
          </template>
          <template #bottom>
            <div class="d-flex justify-center align-center pa-4 flex-wrap ga-4">
              <v-pagination v-model="emailPage" :length="emailTotalPages" :total-visible="7" />
              <span class="text-caption">
                {{ t('pagination.showing', paginationSummary(emailPage, filteredEmailContacts.length)) }}
              </span>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-card class="mb-6">
      <v-card-title>{{ t('admin.notificationClients.upcomingTitle') }}</v-card-title>
      <v-card-text>
        <v-data-table
                      :headers="notificationHeaders"
                      :items="paginatedUpcomingNotifications"
                      :items-length="filteredUpcomingNotifications.length"
                      :items-per-page="itemsPerPage"
                      :page="upcomingPage"
                      hide-default-footer
                      :loading="loading"
                      item-key="consultationId">
          <template #item.type="{ item }">{{ eventLabel(item.type) }}</template>
          <template #item.when="{ item }">{{ formatDateTime(item.dueAt) }}</template>
          <template #item.channels="{ item }">{{ channelSummary(item) }}</template>
          <template #item.actions="{ item }">
            <div class="d-flex ga-1 flex-wrap align-center">
              <v-btn size="small" variant="text" @click="openPatient(item.patientId)">{{ t('common.patient') }}</v-btn>
              <v-btn size="small" variant="text" @click="openCase(item.caseId)">{{ t('common.case') }}</v-btn>
              <v-btn size="small" variant="text" @click="openConsultation(item.consultationId)">{{
                t('common.consultation') }}</v-btn>
              <v-btn
                     size="small"
                     color="primary"
                     variant="outlined"
                     :loading="actionLoadingKey === `${item.consultationId}:${item.type}`"
                     @click="sendNotification(item)">
                {{ t('notifications.sendNow') }}
              </v-btn>
            </div>
          </template>
          <template #bottom>
            <div class="d-flex justify-center align-center pa-4 flex-wrap ga-4">
              <v-pagination v-model="upcomingPage" :length="upcomingTotalPages" :total-visible="7" />
              <span class="text-caption">
                {{ t('pagination.showing', paginationSummary(upcomingPage, filteredUpcomingNotifications.length)) }}
              </span>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>{{ t('admin.notificationClients.recentTitle') }}</v-card-title>
      <v-card-text>
        <v-data-table
                      :headers="notificationHeaders"
                      :items="paginatedRecentNotifications"
                      :items-length="filteredRecentNotifications.length"
                      :items-per-page="itemsPerPage"
                      :page="recentPage"
                      hide-default-footer
                      :loading="loading"
                      item-key="consultationId">
          <template #item.type="{ item }">{{ eventLabel(item.type) }}</template>
          <template #item.when="{ item }">{{ formatDateTime(item.sentAt) }}</template>
          <template #item.channels="{ item }">{{ channelSummary(item) }}</template>
          <template #item.actions="{ item }">
            <div class="d-flex ga-1 flex-wrap align-center">
              <v-btn size="small" variant="text" @click="openPatient(item.patientId)">{{ t('common.patient') }}</v-btn>
              <v-btn size="small" variant="text" @click="openCase(item.caseId)">{{ t('common.case') }}</v-btn>
              <v-btn size="small" variant="text" @click="openConsultation(item.consultationId)">{{
                t('common.consultation') }}</v-btn>
              <v-btn
                     size="small"
                     color="secondary"
                     variant="outlined"
                     :loading="actionLoadingKey === `${item.consultationId}:${item.type}`"
                     @click="sendNotification(item)">
                {{ t('notifications.resend') }}
              </v-btn>
            </div>
          </template>
          <template #bottom>
            <div class="d-flex justify-center align-center pa-4 flex-wrap ga-4">
              <v-pagination v-model="recentPage" :length="recentTotalPages" :total-visible="7" />
              <span class="text-caption">
                {{ t('pagination.showing', paginationSummary(recentPage, filteredRecentNotifications.length)) }}
              </span>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.search-field {
  min-width: 280px;
}

.table-wrap {
  overflow-wrap: anywhere;
}
</style>