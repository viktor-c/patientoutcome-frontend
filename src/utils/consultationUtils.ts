import type { Composer } from 'vue-i18n'

/**
 * Localizes a consultation reason code or object.
 * @param r The reason to localize (string or object)
 * @param i18n An i18n instance (t and te functions)
 * @returns The localized string or raw value as fallback
 */
export const localizeConsultationReason = (r: unknown, i18n: { t: Composer['t'], te: Composer['te'] }) => {
  const { t, te } = i18n
  if (r === null || typeof r === 'undefined') return ''

  // simple string codes
  if (typeof r === 'string') {
    const key = `consultation.reasons.${r}`
    return te(key) ? t(key) : r
  }

  // objects: try common fields
  if (typeof r === 'object') {
    const obj = r as Record<string, unknown>
    if (obj.id && typeof obj.id === 'string') {
      const key = `consultation.reasons.${obj.id}`
      return te(key) ? t(key) : String(obj.id)
    }
    if (obj.code && typeof obj.code === 'string') {
      const key = `consultation.reasons.${obj.code}`
      return te(key) ? t(key) : String(obj.code)
    }
    if (obj.label && typeof obj.label === 'string') {
      const key = `consultation.reasons.${obj.label}`
      return te(key) ? t(key) : String(obj.label)
    }
    // fallback: stringify
    try {
      return JSON.stringify(obj)
    } catch (e) {
      console.error('Error stringifying object:', e)
      return String(obj)
    }
  }

  return String(r)
}
