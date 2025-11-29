import { inject } from 'vue'

// Small helper to provide the JSONForms translate function inside <script setup>
// Usage: import { createTranslate } from './translate' and then const translate = createTranslate()

export const createTranslate = (): ((key: string, defaultMessage?: string) => string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonforms = inject<any>('jsonforms')

  return (key: string, defaultMessage?: string) => {
    if (jsonforms?.i18n?.translate) {
      return jsonforms.i18n.translate(key, defaultMessage)
    }
    return defaultMessage || key
  }
}

export default createTranslate
