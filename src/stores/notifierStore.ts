import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotifierStore = defineStore('notifier', () => {
  const isOpen = ref(false)
  const content = ref('')
  const color = ref<'success' | 'error' | 'info' | 'warning'>('info')
  const timeout = ref(4000)
  const defaultTimeout = 4000

  const notifications = ref<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; time: string }[]>([])

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = defaultTimeout) => {
    const currentTime = new Date().toISOString() // Get the current time as a string
    content.value = message
    color.value = type
    timeout.value = duration
    isOpen.value = true

    // Add notification to the list and keep only the last 10
    notifications.value.unshift({ message, type, time: currentTime })
    if (notifications.value.length > 10) {
      notifications.value.pop()
    }
  }

  const clearNotifications = () => {
    notifications.value = []
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

  return { isOpen, content, color, timeout, notify, success, error, info, warning, notifications, clearNotifications }
})
