<template>
  <v-card variant="outlined" :loading="loading" class="notification-prefs">
    <v-card-title class="d-flex align-center gap-2">
      <v-icon>mdi-bell-outline</v-icon>
      {{ $t ? $t('notifications.title') : 'Browser notifications' }}
    </v-card-title>

    <v-card-text>
      <!-- Not supported -->
      <v-alert
               v-if="supportStatus !== 'supported'"
               :type="supportAlertType"
               variant="tonal"
               density="compact"
               class="mb-3">
        {{ supportMessage }}
      </v-alert>

      <v-alert
               v-if="showInstallGuidance"
               type="info"
               variant="tonal"
               density="compact"
               class="mb-3">
        <div>{{ installMessage }}</div>

        <div v-if="canPromptInstall" class="mt-3">
          <v-btn
                 color="primary"
                 variant="outlined"
                 :loading="loading"
                 @click="onInstallApp">
            {{ $t ? $t('notifications.installButton') : 'Install app' }}
          </v-btn>
        </div>
      </v-alert>

      <v-alert
               v-if="supportStatus === 'supported' && permission === 'denied'"
               type="warning"
               variant="tonal"
               density="compact"
               class="mb-3">
        {{
          $t
            ? $t('notifications.permissionDenied')
            : 'Notifications are blocked. Please allow notifications in your browser settings.'
        }}
      </v-alert>

      <!-- Active state -->
      <template v-if="supportStatus === 'supported'">
        <p class="text-body-2 mb-4">
          {{
            subscribed
              ? ($t ? $t('notifications.activeDescription') : 'You will receive push notifications in this browser.')
              : ($t
                ? $t('notifications.inactiveDescription')
                : 'Enable notifications to be alerted when forms are submitted or when your form window opens.')
          }}
        </p>

        <v-switch
                  :model-value="subscribed"
                  :loading="loading"
                  :disabled="loading || isPermissionDenied || !supported"
                  color="primary"
                  hide-details
                  :label="subscribed
                    ? ($t ? $t('notifications.enabled') : 'Notifications enabled')
                    : ($t ? $t('notifications.disabled') : 'Enable notifications')"
                  @update:model-value="onToggle" />

        <div v-if="isDevMode && subscribed && permission === 'granted'" class="mt-4">
          <p class="text-caption mb-2">
            {{ $t ? $t('notifications.testDescription') : 'Send a development test push notification to this browser.'
            }}
          </p>
          <v-btn
                 color="secondary"
                 variant="outlined"
                 :loading="loading"
                 @click="onSendTestNotification">
            {{ $t ? $t('notifications.testButton') : 'Send test notification' }}
          </v-btn>
        </div>
      </template>

      <!-- Error -->
      <v-alert
               v-if="error"
               type="error"
               variant="tonal"
               density="compact"
               class="mt-3"
               closable
               @click:close="clearError">
        {{ error }}
      </v-alert>

      <v-alert
               v-if="actionMessage"
               :type="actionMessageType"
               variant="tonal"
               density="compact"
               class="mt-3"
               closable
               @click:close="clearDevMessage">
        {{ actionMessage }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePwaInstall } from '@/composables/usePwaInstall'
import { usePushNotifications } from '@/composables/usePushNotifications'

const props = defineProps<{
  /** Patient case-code session token; provide for patient flow, omit for admin. */
  caseAccessToken?: string | null
}>()

const { t } = useI18n()

const {
  supported,
  supportStatus,
  permission,
  subscribed,
  loading,
  error,
  subscribe,
  unsubscribe,
  sendTestNotification,
  checkCurrentSubscription,
} = usePushNotifications()

const {
  isInstalled,
  isIos,
  canPromptInstall,
  installMode,
  promptInstall,
  refreshInstalledState,
} = usePwaInstall()

const isPermissionDenied = computed(() => permission.value === 'denied')
const isDevMode = import.meta.env.DEV
const actionMessage = ref<string | null>(null)
const actionMessageType = ref<'success' | 'error'>('success')

const supportAlertType = computed<'info' | 'warning'>(() =>
  supportStatus.value === 'ios-home-screen-required' ? 'warning' : 'info',
)

const supportMessage = computed(() => {
  switch (supportStatus.value) {
    case 'insecure-context':
      return t('notifications.supportInsecureContext')
    case 'ios-home-screen-required':
      return t('notifications.supportIosHomeScreen')
    case 'unsupported-browser':
      return t('notifications.unsupported')
    default:
      return ''
  }
})

const showInstallGuidance = computed(() => !isInstalled.value && installMode.value !== 'installed')

const installMessage = computed(() => {
  if (isIos.value) {
    return t('notifications.installIosInstructions')
  }

  if (canPromptInstall.value) {
    return t('notifications.installDescription')
  }

  return t('notifications.installBrowserInstructions')
})

const clearError = () => {
  // The error ref is readonly outside the composable; we trigger a re-check
  // which resets it via unsubscribe flow if needed. For now just reload state.
  checkCurrentSubscription()
}

async function onToggle(value: boolean | null) {
  if (value) {
    await subscribe({ caseAccessToken: props.caseAccessToken ?? null })
  } else {
    await unsubscribe()
  }
}

const clearDevMessage = () => {
  actionMessage.value = null
}

async function onSendTestNotification() {
  const ok = await sendTestNotification()
  actionMessageType.value = ok ? 'success' : 'error'
  actionMessage.value = ok
    ? t('notifications.testSent')
    : t('notifications.testFailed')
}

async function onInstallApp() {
  const installed = await promptInstall()
  actionMessageType.value = installed ? 'success' : 'error'
  actionMessage.value = installed
    ? t('notifications.installAccepted')
    : t('notifications.installPromptFailed')

  refreshInstalledState()
}

onMounted(async () => {
  refreshInstalledState()
  await checkCurrentSubscription()
})
</script>

<style scoped>
.notification-prefs {
  max-width: 480px;
}
</style>
