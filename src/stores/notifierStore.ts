import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ActiveNotification {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  timeout: number
}

export const useNotifierStore = defineStore('notifier', () => {
  // Legacy properties for backward compatibility
  const isOpen = ref(false)
  const content = ref('')
  const color = ref<'success' | 'error' | 'info' | 'warning'>('info')
  const timeout = ref(4000)
  const defaultTimeout = 4000

  // New active notifications array
  const activeNotifications = ref<ActiveNotification[]>([])
  let nextNotificationId = 1

  const notifications = ref<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; time: string }[]>([])

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = defaultTimeout) => {
    const currentTime = new Date().toISOString()

    // Legacy behavior (kept for compatibility)
    content.value = message
    color.value = type
    timeout.value = duration
    isOpen.value = true

    // Add to active notifications array
    const notification: ActiveNotification = {
      id: nextNotificationId++,
      message,
      type,
      timeout: duration
    }
    activeNotifications.value.push(notification)

    // Add notification to the history list and keep only the last 10
    notifications.value.unshift({ message, type, time: currentTime })
    if (notifications.value.length > 10) {
      notifications.value.pop()
    }
  }

  const removeNotification = (id: number) => {
    const index = activeNotifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      activeNotifications.value.splice(index, 1)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
    activeNotifications.value = []
  }

  const success = (message: string, duration = defaultTimeout) => {
    notify(message, 'success', duration)
  }

  const error = (message: string, duration = defaultTimeout) => {
    notify(message, 'error', duration)
  }

  const info = (message: string, duration = defaultTimeout) => {
    notify(message, 'info', duration)
  }

  const warning = (message: string, duration = defaultTimeout) => {
    notify(message, 'warning', duration)
  }

  return {
    isOpen,
    content,
    color,
    timeout,
    notify,
    success,
    error,
    info,
    warning,
    notifications,
    clearNotifications,
    activeNotifications,
    removeNotification
  }
})
