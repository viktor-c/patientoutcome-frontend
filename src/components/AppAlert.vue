<template>
  <div class="notification-container">
    <!-- Show "more notifications" indicator if there are hidden ones -->
    <v-snackbar
                v-if="hiddenCount > 0"
                :model-value="true"
                color="grey-darken-1"
                location="top"
                :timeout="-1"
                class="compact-notification">
      <div class="d-flex align-center justify-space-between" style="width:100%">
        <div class="text-caption">
          +{{ hiddenCount }} more notification{{ hiddenCount > 1 ? 's' : '' }}
        </div>
      </div>
    </v-snackbar>
    
    <!-- Show only the most recent 3 notifications -->
    <v-snackbar
                v-for="notification in visibleNotifications"
                :key="notification.id"
                :model-value="true"
                :color="notification.type"
                :timeout="notification.timeout"
                timer="true"
                location="top"
                :style="{ top: getNotificationOffset(notification.id) + 'px' }"
                class="compact-notification"
                @update:model-value="(val) => !val && removeNotification(notification.id)">
      <div class="d-flex align-center justify-space-between" style="width:100%">
        <div class="notification-text">
          {{ notification.message }}
          <v-chip v-if="notification.count > 1" 
                  size="x-small" 
                  class="ml-2"
                  :color="notification.type"
                  variant="elevated">
            {{ notification.count }}x
          </v-chip>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" density="compact" aria-label="Close notification" @click="removeNotification(notification.id)" />
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotifierStore } from '@/stores/notifierStore'

const notifierStore = useNotifierStore()

const activeNotifications = computed(() => notifierStore.activeNotifications)

// Maximum number of notifications to show at once
const MAX_VISIBLE = 3

// Only show the most recent MAX_VISIBLE notifications
const visibleNotifications = computed(() => 
  activeNotifications.value.slice(0, MAX_VISIBLE)
)

// Count of hidden notifications
const hiddenCount = computed(() => 
  Math.max(0, activeNotifications.value.length - MAX_VISIBLE)
)

const removeNotification = (id: number) => {
  notifierStore.removeNotification(id)
}

// Calculate vertical offset for each notification to stack them
// Using smaller offset for more compact display
const getNotificationOffset = (id: number) => {
  const index = visibleNotifications.value.findIndex(n => n.id === id)
  // Offset by 60px + 16px for the "more notifications" indicator if present
  const baseOffset = hiddenCount.value > 0 ? 56 : 0
  return baseOffset + (index * 60)
}
</script>

<style scoped>
.notification-container {
  position: relative;
}

/* Make notifications more compact */
:deep(.v-snackbar.compact-notification) {
  margin-bottom: 8px;
}

:deep(.v-snackbar.compact-notification .v-snackbar__wrapper) {
  min-height: 48px;
  padding: 8px 12px;
  max-width: 600px;
}

:deep(.v-snackbar.compact-notification .v-snackbar__content) {
  padding: 0;
}

.notification-text {
  font-size: 0.875rem;
  line-height: 1.4;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
