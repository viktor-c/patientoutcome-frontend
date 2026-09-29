<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/userStore'
import {
  getNotificationAdminStatus,
  sendManualNotification,
  type NotificationAdminStatus,
  type NotificationEventType,
} from '@/services/notificationApi'

const props = defineProps<{
  patientId?: string | null
  caseId?: string | null
  consultationId?: string | null
}>()

const { t } = useI18n()
const userStore = useUserStore()

const loading = ref(false)
const status = ref<NotificationAdminStatus | null>(null)
const error = ref<string | null>(null)
const actionMessage = ref<string | null>(null)
const sendingKey = ref<string | null>(null)
const isCollapsed = ref(true)

const canView = computed(() => userStore.hasRole('admin') || userStore.hasRole('developer'))
const hasScope = computed(() => Boolean(props.patientId || props.caseId || props.consultationId))

const scopeParams = computed(() => ({
  patientId: props.patientId ?? null,
  caseId: props.caseId ?? null,
  consultationId: props.consultationId ?? null,
}))

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return t('common.notAvailable')

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('common.notAvailable')
  return date.toLocaleString()
}

const eventLabel = (type: NotificationEventType) => {
  return type === 'consultation_window_opened'
    ? t('notifications.windowOpenLabel')
    : t('notifications.consultationDayLabel')
}

const loadStatus = async () => {
  if (!canView.value || !hasScope.value) return

  loading.value = true
  error.value = null

  try {
    status.value = await getNotificationAdminStatus(scopeParams.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('notifications.adminLoadError')
  } finally {
    loading.value = false
  }
}

const sendNow = async (consultationId: string, type: NotificationEventType) => {
  sendingKey.value = `${consultationId}:${type}`
  actionMessage.value = null
  error.value = null

  try {
    const result = await sendManualNotification({ consultationId, type })
    actionMessage.value = t('notifications.manualSendSuccess', {
      emailSucceeded: result.email.succeeded,
      pushSucceeded: result.push.succeeded,
    })
    await loadStatus()
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('notifications.manualSendError')
  } finally {
    sendingKey.value = null
  }
}

watch(scopeParams, () => {
  loadStatus()
}, { deep: true })

onMounted(async () => {
  await loadStatus()
})
</script>

<template>
  <v-card v-if="canView && hasScope" class="" variant="outlined">
    <v-card-title class="d-flex align-center justify-space-between ga-2 flex-wrap">
      <div class="d-flex align-center ga-2">
        <v-icon>mdi-bell-badge-outline</v-icon>
        {{ t('notifications.adminPanelTitle') }}
      </div>
      <v-btn
             icon
             size="small"
             variant="text"
             @click="isCollapsed = !isCollapsed">
        <v-icon>{{ isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text v-show="!isCollapsed">
      <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

      <v-alert
               v-if="error"
               type="error"
               variant="tonal"
               density="compact"
               class="">
        {{ error }}
      </v-alert>

      <v-alert
               v-if="actionMessage"
               type="success"
               variant="tonal"
               density="compact">
        {{ actionMessage }}
      </v-alert>

      <template v-if="status">
        <div class="d-flex flex-wrap ga-2">
          <v-chip color="primary" variant="tonal">
            {{ t('notifications.activePushCount', { count: status.summary.activePushSubscriptionCount }) }}
          </v-chip>
          <v-chip color="success" variant="tonal">
            {{ t('notifications.activeEmailCount', { count: status.summary.activeEmailSubscriptionCount }) }}
          </v-chip>
        </div>

        <v-row>
          <v-col cols="12" md="6">
            <h3 class="text-subtitle-1 mb-1">{{ t('notifications.emailRecipientsTitle') }}</h3>
            <v-list density="compact" lines="two">
              <v-list-item
                           v-for="contact in status.emailContacts"
                           :key="`${contact.caseId}-${contact.email || 'none'}`">
                <v-list-item-title>
                  {{ contact.email || t('notifications.noEmailConfigured') }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ contact.futureConsultationReminders ? t('notifications.emailSubscribed') :
                    t('notifications.emailNotSubscribed') }}
                  · {{ t('notifications.caseLabel', { caseId: contact.caseId }) }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="status.emailContacts.length === 0">
                <v-list-item-title>{{ t('notifications.noEmailConfigured') }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-col>

          <v-col cols="12" md="6">
            <h3 class="text-subtitle-1 mb-1">{{ t('notifications.pushSubscriptionsTitle') }}</h3>
            <v-list density="compact" lines="two">
              <v-list-item
                           v-for="subscription in status.pushSubscriptions"
                           :key="subscription.endpoint">
                <v-list-item-title class="text-body-2 notification-endpoint">
                  {{ subscription.userAgent || subscription.endpoint }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ t('notifications.lastDeliveredAtLabel') }}: {{ formatDateTime(subscription.lastDeliveredAt) }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="status.pushSubscriptions.length === 0">
                <v-list-item-title>{{ t('notifications.noPushSubscriptions') }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-col>
        </v-row>

        <v-divider class="my-1" />

        <h3 class="text-subtitle-1 mb-1">{{ t('notifications.upcomingTitle') }}</h3>
        <v-list density="compact" lines="three">
          <v-list-item
                       v-for="item in status.upcomingNotifications"
                       :key="`upcoming-${item.consultationId}-${item.type}`">
            <v-list-item-title>
              {{ eventLabel(item.type) }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ t('notifications.dueAtLabel') }}: {{ formatDateTime(item.dueAt) }}
              · {{ t('notifications.channelSummary', {
                email: item.channels.email ? 'on' : 'off', push:
                  item.channels.push ? 'on' : 'off'
              }) }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                     size="small"
                     color="primary"
                     variant="outlined"
                     :loading="sendingKey === `${item.consultationId}:${item.type}`"
                     @click="sendNow(item.consultationId, item.type)">
                {{ t('notifications.sendNow') }}
              </v-btn>
            </template>
          </v-list-item>
          <v-list-item v-if="status.upcomingNotifications.length === 0">
            <v-list-item-title>{{ t('notifications.noUpcomingNotifications') }}</v-list-item-title>
          </v-list-item>
        </v-list>

        <v-divider class="my-1" />

        <h3 class="text-subtitle-1 mb-1">{{ t('notifications.recentTitle') }}</h3>
        <v-list density="compact" lines="three">
          <v-list-item
                       v-for="item in status.recentNotifications"
                       :key="`recent-${item.consultationId}-${item.type}-${item.source}-${item.sentAt}`">
            <v-list-item-title>
              {{ eventLabel(item.type) }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ t('notifications.sentAtLabel') }}: {{ formatDateTime(item.sentAt) }}
              · {{ item.source === 'manual' ? t('notifications.manualSource') : t('notifications.scheduledSource') }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                     size="small"
                     color="secondary"
                     variant="text"
                     :loading="sendingKey === `${item.consultationId}:${item.type}`"
                     @click="sendNow(item.consultationId, item.type)">
                {{ t('notifications.resend') }}
              </v-btn>
            </template>
          </v-list-item>
          <v-list-item v-if="status.recentNotifications.length === 0">
            <v-list-item-title>{{ t('notifications.noRecentNotifications') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.notification-endpoint {
  overflow-wrap: anywhere;
}
</style>