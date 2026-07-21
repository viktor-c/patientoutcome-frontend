<template>
  <v-card variant="outlined" :loading="loading" class="notification-prefs">
    <v-card-title class="d-flex align-center gap-2">
      <v-icon>mdi-bell-outline</v-icon>
      {{ $t ? $t('notifications.title') : 'Browser notifications' }}
    </v-card-title>

    <v-card-text>
      <!-- Not supported -->
      <v-alert
        v-if="!supported"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{ $t ? $t('notifications.unsupported') : 'Push notifications are not supported in this browser.' }}
      </v-alert>

      <!-- Permission denied -->
      <v-alert
        v-else-if="permission === 'denied'"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{
          $t
            ? $t('notifications.permissionDenied')
            : 'Notifications are blocked. Please allow notifications in your browser settings.'
        }}
      </v-alert>

      <!-- Active state -->
      <template v-else-if="supported">
        <p class="text-body-2 mb-4">
          {{
            subscribed
              ? ($t ? $t('notifications.activeDescription') : 'You will receive push notifications in this browser.')
              : ($t ? $t('notifications.inactiveDescription') : 'Enable notifications to be alerted when forms are submitted or when your form window opens.')
          }}
        </p>

        <v-switch
          :model-value="subscribed"
          :loading="loading"
          :disabled="loading || permission === 'denied' || !supported"
          color="primary"
          hide-details
          :label="subscribed
            ? ($t ? $t('notifications.enabled') : 'Notifications enabled')
            : ($t ? $t('notifications.disabled') : 'Enable notifications')"
          @update:model-value="onToggle"
        />
      </template>

      <!-- Error -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-3"
        closable
        @click:close="clearError"
      >
        {{ error }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { usePushNotifications } from '@/composables/usePushNotifications'

const props = defineProps<{
  /** Patient case-code session token; provide for patient flow, omit for admin. */
  caseAccessToken?: string | null
}>()

const {
  supported,
  permission,
  subscribed,
  loading,
  error,
  subscribe,
  unsubscribe,
  checkCurrentSubscription,
} = usePushNotifications()

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

onMounted(async () => {
  await checkCurrentSubscription()
})
</script>

<style scoped>
.notification-prefs {
  max-width: 480px;
}
</style>
