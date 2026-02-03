<template>
  <div class="notification-container">
    <v-snackbar
                v-for="notification in activeNotifications"
                :key="notification.id"
                :model-value="true"
                :color="notification.type"
                :timeout="notification.timeout"
                timer="true"
                location="top"
                :style="{ top: getNotificationOffset(notification.id) + 'px' }"
                @update:model-value="(val) => !val && removeNotification(notification.id)">
      <div class="d-flex align-center justify-space-between" style="width:100%">
        <div>
          {{ notification.message }}
          <v-chip v-if="notification.count > 1" 
                  size="x-small" 
                  class="ml-2"
                  :color="notification.type">
            {{ notification.count }}x
          </v-chip>
        </div>
        <v-btn icon variant="text" aria-label="Close notification" @click="removeNotification(notification.id)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotifierStore } from '@/stores/notifierStore'

const notifierStore = useNotifierStore()

const activeNotifications = computed(() => notifierStore.activeNotifications)

const removeNotification = (id: number) => {
  notifierStore.removeNotification(id)
}

// Calculate vertical offset for each notification to stack them
const getNotificationOffset = (id: number) => {
  const index = activeNotifications.value.findIndex(n => n.id === id)
  // Each notification is offset by 80px from the previous one
  return index * 80
}
</script>

<style scoped>
.notification-container {
  position: relative;
}
</style>
