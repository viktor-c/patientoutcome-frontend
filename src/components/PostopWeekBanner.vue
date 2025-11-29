<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()

// Compute the display text based on postopWeek (backend sends weeks)
const displayText = computed(() => {
  const weeks = userStore.postopWeek
  if (!weeks) return ''

  // If less than 16 weeks (4 months), display in weeks
  if (weeks < 16) {
    return `Bitte füllen Sie die Formulare aus, sie sind in der ${weeks}. postoperativen Woche.`
  } else {
    // Convert weeks to months (1 month = 4 weeks)
    const months = Math.floor(weeks / 4)
    return `Bitte füllen Sie die Formulare aus, sie sind im ${months}. postoperativen Monat.`
  }
})

// Only show banner if postopWeek exists and user is kiosk user
const shouldShow = computed(() => userStore.postopWeek && userStore.isKioskUser())
</script>

<template>
  <v-alert
    v-if="shouldShow"
    type="info"
    variant="tonal"
    prominent
    class="mb-4 text-h6"
    icon="mdi-calendar-clock"
  >
    {{ displayText }}
  </v-alert>
</template>

<style scoped>
/* Ensure text is readable on mobile */
@media (max-width: 480px) {
  .text-h6 {
    font-size: 1rem !important;
  }
}
</style>
