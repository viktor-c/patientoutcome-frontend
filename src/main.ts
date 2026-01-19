import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vuetify from '@/plugins/vuetify'
import i18n from '@/plugins/i18n'
import notifier from '@/plugins/notifier'
import { logger } from '@/services/logger'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(vuetify)
app.use(notifier) // Use notifier plugin

import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import 'animate.css';


app.component('VueDatePicker', VueDatePicker);

app.mount('#app')

// Log environment with structured logger
logger.info('Application started', {
  environment: import.meta.env.MODE,
  apiUrl: import.meta.env.VITE_API_URL,
  timestamp: new Date().toISOString()
});
