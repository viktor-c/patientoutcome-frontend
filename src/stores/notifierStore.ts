import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ActiveNotification {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  timeout: number
  count: number // Track how many times this notification was sent
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

  // Batching mechanism
  const pendingNotifications = ref<Array<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; duration: number }>>([])
  let batchTimer: NodeJS.Timeout | null = null
  const BATCH_DELAY = 300 // Wait 300ms before showing notifications
  const DUPLICATE_WINDOW = 2000 // Consider duplicates within 2 seconds

  const processBatch = () => {
    if (pendingNotifications.value.length === 0) {
      return
    }

    // Group notifications by message and type
    const grouped = new Map<string, { type: 'success' | 'error' | 'info' | 'warning'; duration: number; count: number }>()
    
    for (const notif of pendingNotifications.value) {
      const key = `${notif.message}|||${notif.type}`
      if (grouped.has(key)) {
        const existing = grouped.get(key)!
        existing.count++
      } else {
        grouped.set(key, { type: notif.type, duration: notif.duration, count: 1 })
      }
    }

    // Show grouped notifications
    const currentTime = new Date().toISOString()
    
    for (const [key, data] of grouped.entries()) {
      const message = key.split('|||')[0]
      
      // Check if this exact notification already exists in active notifications
      const existingIndex = activeNotifications.value.findIndex(
        n => n.message === message && n.type === data.type
      )

      if (existingIndex !== -1) {
        // Update existing notification's count
        const existing = activeNotifications.value[existingIndex]
        existing.count += data.count
        // Force reactivity by creating a new array
        activeNotifications.value = [...activeNotifications.value]
      } else {
        // Create new notification
        const notification: ActiveNotification = {
          id: nextNotificationId++,
          message,
          type: data.type,
          timeout: data.duration,
          count: data.count
        }
        activeNotifications.value.push(notification)

        // Legacy behavior (kept for compatibility) - only for the first notification
        if (activeNotifications.value.length === 1) {
          content.value = message
          color.value = data.type
          timeout.value = data.duration
          isOpen.value = true
        }

        // Add notification to the history list and keep only the last 10
        notifications.value.unshift({ message, type: data.type, time: currentTime })
        if (notifications.value.length > 10) {
          notifications.value.pop()
        }
      }
    }

    // Clear pending notifications
    pendingNotifications.value = []
    batchTimer = null
  }

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = defaultTimeout) => {
    // Add to pending notifications
    pendingNotifications.value.push({ message, type, duration })

    // Clear existing timer and set a new one
    if (batchTimer) {
      clearTimeout(batchTimer)
    }

    // Process batch after delay
    batchTimer = setTimeout(processBatch, BATCH_DELAY)
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
