import i18n from '@/plugins/i18n'

const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
}

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
}

const resolveLocale = (): string => {
  const localeRef = i18n.global.locale
  const localeValue = typeof localeRef === 'string' ? localeRef : localeRef.value
  return localeValue || 'en'
}

const toValidDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatDateTimeForLocale = (
  value: string | Date | null | undefined,
  fallback = '-',
  options?: Intl.DateTimeFormatOptions,
): string => {
  const parsed = toValidDate(value)
  if (!parsed) return fallback
  return new Intl.DateTimeFormat(resolveLocale(), options || defaultDateTimeOptions).format(parsed)
}

export const formatDateForLocale = (
  value: string | Date | null | undefined,
  fallback = '-',
  options?: Intl.DateTimeFormatOptions,
): string => {
  const parsed = toValidDate(value)
  if (!parsed) return fallback
  return new Intl.DateTimeFormat(resolveLocale(), options || defaultDateOptions).format(parsed)
}
