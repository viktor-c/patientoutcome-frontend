<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NotFoundErrorPage from '@/components/NotFoundErrorPage.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const redirectCountdown = ref(5)
let redirectInterval: ReturnType<typeof setInterval> | null = null
let redirectTimeout: ReturnType<typeof setTimeout> | null = null

const clearRedirectTimers = () => {
  if (redirectInterval) {
    clearInterval(redirectInterval)
    redirectInterval = null
  }
  if (redirectTimeout) {
    clearTimeout(redirectTimeout)
    redirectTimeout = null
  }
}

const redirectToDashboard = async () => {
  clearRedirectTimers()
  await router.replace({ name: 'dashboard' })
}

const sourcePath = computed(() => {
  const from = route.query.from
  return typeof from === 'string' ? from : ''
})

const description = computed(() => {
  if (sourcePath.value) {
    return t('entityNotFound.descriptionWithSource', { source: sourcePath.value })
  }
  return t('entityNotFound.description')
})

onMounted(() => {
  redirectCountdown.value = 5

  redirectInterval = setInterval(() => {
    if (redirectCountdown.value > 0) {
      redirectCountdown.value -= 1
    }
  }, 1000)

  redirectTimeout = setTimeout(() => {
    redirectToDashboard()
  }, 5000)
})

onUnmounted(() => {
  clearRedirectTimers()
})
</script>

<template>
  <v-container>
    <NotFoundErrorPage
                      :title="t('entityNotFound.title')"
                      :message="description"
                      :button-text="t('buttons.goToDashboard')"
                      @retry="redirectToDashboard" />

    <p class="text-center text-medium-emphasis mt-4">
      {{ t('entityNotFound.redirectHint', { seconds: redirectCountdown }) }}
    </p>
  </v-container>
</template>
