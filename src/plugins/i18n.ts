import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import de from '@/locales/de'

const messages = {
  en,
  de,
}

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: 'de', // Default locale
  fallbackLocale: 'en',
  messages,
})

export default i18n
