import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from '@/plugins/vuetify'
import i18n from '@/plugins/i18n'
import notifier from '@/plugins/notifier'
import { logger } from '@/services/logger'

import App from './App.vue'
import router from './router'
import { resolveApiBaseUrl } from '@/utils/apiBaseUrl'
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import 'animate.css';

function renderStartupError(message: string, details?: string) {
  const appRoot = document.getElementById('app')
  if (!appRoot) return

  appRoot.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f5f6f8;color:#1f2937;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
      <section style="max-width:680px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
        <h1 style="margin:0 0 8px 0;font-size:24px;">API backend is not reachable</h1>
        <p style="margin:0 0 12px 0;line-height:1.5;">${message}</p>
        ${details ? `<p style="margin:0;color:#6b7280;line-height:1.5;">${details}</p>` : ''}
      </section>
    </main>
  `
}

async function ensureApiReachable(apiBaseUrl: string): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/health-check`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function bootstrap() {
  const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL)

  if (!apiBaseUrl) {
    renderStartupError(
      'Missing API URL configuration.',
      'Set VITE_API_URL to your backend address, for example http://localhost:40001',
    )
    return
  }

  const reachable = await ensureApiReachable(apiBaseUrl)
  if (!reachable) {
    renderStartupError(
      `Cannot reach configured backend: ${apiBaseUrl}`,
      'Check that the backend is running and VITE_API_URL points to the correct address.',
    )
    return
  }

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)
  app.use(i18n)
  app.use(vuetify)
  app.use(notifier) // Use notifier plugin

  app.component('VueDatePicker', VueDatePicker)

  app.mount('#app')

  // Log environment with structured logger
  logger.info('Application started', {
    environment: import.meta.env.MODE,
    apiUrl: import.meta.env.VITE_API_URL,
    timestamp: new Date().toISOString()
  })
}

bootstrap()
