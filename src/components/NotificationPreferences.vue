<template>
  <v-card variant="outlined" :loading="loading || contactLoading">
    <v-card-title class="d-flex align-center ">
      <v-icon>mdi-bell-outline</v-icon>
      {{ $t ? $t('notifications.title') : 'Browser notifications' }}
    </v-card-title>

    <v-card-text>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ t('completionInfo.notificationPrompt')
          || 'Optional: enable browser notifications for reminders and updates about your forms.' }}
      </p>
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

      <template v-if="caseAccessToken">
        <v-divider class="my-4" />
        <p class="text-body-2 mb-2">
          {{ t('notifications.emailSectionTitle') }}
        </p>
        <v-text-field
                      v-model="emailAddress"
                      :label="t('notifications.emailLabel')"
                      type="email"
                      variant="outlined"
                      density="comfortable"
                      :disabled="contactLoading"
                      class="mb-2" />
        <v-checkbox
                    v-model="futureConsultationReminders"
                    :label="t('notifications.emailConsentLabel')"
                    :disabled="contactLoading"
                    density="compact"
                    hide-details
                    class="mb-3" />
        <div class="d-flex flex-wrap ga-2">
          <v-btn
                 color="primary"
                 variant="flat"
                 :disabled="!canSaveEmail"
                 :loading="contactLoading"
                 @click="onSaveEmailSubscription">
            {{ t('notifications.saveEmailSubscription') }}
          </v-btn>
          <v-btn
                 v-if="hasStoredEmailSubscription"
                 color="error"
                 variant="text"
                 :loading="contactLoading"
                 @click="onClearEmailSubscription">
            {{ t('notifications.removeEmailSubscription') }}
          </v-btn>
        </div>
        <p v-if="contactStatusMessage" class="text-caption text-medium-emphasis mt-3 mb-0">
          {{ contactStatusMessage }}
        </p>
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
import {
  clearPatientNotificationContact,
  getPatientNotificationContact,
  savePatientNotificationContact,
} from '@/services/notificationApi'

const props = defineProps<{
  /** Patient case-code session token; provide for patient flow, omit for admin. */
  caseAccessToken?: string | null
}>()

const { t, locale } = useI18n()

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
const emailAddress = ref('')
const futureConsultationReminders = ref(false)
const hasStoredEmailSubscription = ref(false)
const confirmationPending = ref(false)
const contactLoading = ref(false)

const supportAlertType = computed<'info' | 'warning'>(() =>
  supportStatus.value === 'ios-home-screen-required' ? 'warning' : 'info',
)

const emailIsValid = computed(() => /.+@.+\..+/.test(emailAddress.value.trim()))
const canSaveEmail = computed(() => {
  if (!props.caseAccessToken) return false
  return emailIsValid.value && futureConsultationReminders.value
})

const contactStatusMessage = computed(() => {
  if (!props.caseAccessToken) return ''
  if (confirmationPending.value && emailAddress.value) {
    return t('notifications.emailStatusPending', { email: emailAddress.value })
  }
  if (hasStoredEmailSubscription.value && emailAddress.value) {
    return t('notifications.emailStatusActive', { email: emailAddress.value })
  }

  return t('notifications.emailStatusInactive')
})

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

async function loadPatientNotificationContact() {
  if (!props.caseAccessToken) return

  contactLoading.value = true
  try {
    const contact = await getPatientNotificationContact(props.caseAccessToken)
    emailAddress.value = contact.pendingEmail ?? contact.email ?? ''
    futureConsultationReminders.value = contact.futureConsultationReminders
    hasStoredEmailSubscription.value = contact.subscribed
    confirmationPending.value = contact.confirmationPending
  } catch {
    emailAddress.value = ''
    futureConsultationReminders.value = false
    hasStoredEmailSubscription.value = false
    confirmationPending.value = false
  } finally {
    contactLoading.value = false
  }
}

async function onSaveEmailSubscription() {
  if (!props.caseAccessToken || !canSaveEmail.value) return

  contactLoading.value = true
  actionMessage.value = null

  try {
    const result = await savePatientNotificationContact({
      caseAccessToken: props.caseAccessToken,
      email: emailAddress.value.trim(),
      futureConsultationReminders: futureConsultationReminders.value,
      locale: locale.value,
    })

    emailAddress.value = result.pendingEmail ?? result.email ?? ''
    futureConsultationReminders.value = result.futureConsultationReminders
    hasStoredEmailSubscription.value = result.subscribed
    confirmationPending.value = result.confirmationPending
    actionMessageType.value = 'success'
    actionMessage.value = result.confirmationPending
      ? t('notifications.emailConfirmationSent')
      : t('notifications.emailSaveSuccess')
  } catch (err) {
    actionMessageType.value = 'error'
    actionMessage.value = err instanceof Error ? err.message : t('notifications.emailSaveError')
  } finally {
    contactLoading.value = false
  }
}

async function onClearEmailSubscription() {
  if (!props.caseAccessToken) return

  contactLoading.value = true
  actionMessage.value = null

  try {
    await clearPatientNotificationContact(props.caseAccessToken)
    emailAddress.value = ''
    futureConsultationReminders.value = false
    hasStoredEmailSubscription.value = false
    confirmationPending.value = false
    actionMessageType.value = 'success'
    actionMessage.value = t('notifications.emailRemoveSuccess')
  } catch (err) {
    actionMessageType.value = 'error'
    actionMessage.value = err instanceof Error ? err.message : t('notifications.emailSaveError')
  } finally {
    contactLoading.value = false
  }
}

onMounted(async () => {
  refreshInstalledState()
  await checkCurrentSubscription()
  await loadPatientNotificationContact()
})
</script>

<style scoped></style>
