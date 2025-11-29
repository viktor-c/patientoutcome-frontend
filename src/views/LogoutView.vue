<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useNotifierStore } from '@/stores/notifierStore'

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const notifier = useNotifierStore()

const performLogout = async () => {
  try {
    await userStore.logout()
    notifier.success(t('login.logoutSuccessfull'))
    // Redirect to login page
    await router.push({ name: 'Login' })
  } catch (error) {
    console.error('Logout failed:', error)
    notifier.error(t('logout.error'))
    // Still redirect to login page even if logout failed
    await router.push({ name: 'Login' })
  }
}

// Perform logout immediately when component mounts
onMounted(() => {
  performLogout()
})
</script>

<template>
  <v-container class="pa-6 d-flex justify-center align-center" style="min-height: 100vh;">
    <v-card class="text-center pa-8" elevation="2" max-width="400">
      <v-icon icon="mdi-logout" size="64" color="primary" class="mb-4" />
      <div class="text-h6 mb-4">{{ t('logout.processing') }}</div>
      <v-progress-circular indeterminate color="primary" size="32" />
    </v-card>
  </v-container>
</template>
