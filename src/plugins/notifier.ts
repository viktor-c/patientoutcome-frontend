import { type App } from 'vue'
import { useNotifierStore } from '@/stores/notifierStore'

export default {
  install(app: App) {
    app.config.globalProperties.$notify = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 2000) => {
      const notifierStore = useNotifierStore()
      notifierStore.notify(message, type, duration)
    }
  }
}
