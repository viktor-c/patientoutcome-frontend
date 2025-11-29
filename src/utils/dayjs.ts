import dayjs from 'dayjs'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Configure dayjs with plugins
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Set the global dayjs locale
 * @param locale - The locale to set (e.g., 'de', 'en')
 */
export const setDayjsLocale = (locale: string) => {
  const supportedLocale = locale === 'de' ? 'de' : 'en'
  dayjs.locale(supportedLocale)
}

/**
 * Get a dayjs instance with a specific locale
 * @param date - Optional date to create dayjs instance with
 * @param locale - The locale to use (defaults to 'en')
 * @returns dayjs instance with specified locale
 */
export const getDayjsWithLocale = (date?: dayjs.ConfigType, locale: string = 'en') => {
  const supportedLocale = locale === 'de' ? 'de' : 'en'
  return dayjs(date).locale(supportedLocale)
}

/**
 * Format a date string with localized format
 * @param dateString - The date string to format
 * @param locale - The locale to use for formatting
 * @param format - The format string (default: 'LLLL' for full date/time)
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | Date, locale: string = 'en', format: string = 'LLLL'): string => {
  return getDayjsWithLocale(dateString, locale).format(format)
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * @param dateString - The date string to format
 * @param locale - The locale to use for formatting
 * @returns Relative time string
 */
export const formatRelativeTime = (dateString: string | Date, locale: string = 'en'): string => {
  return getDayjsWithLocale(dateString, locale).fromNow()
}

/**
 * Format a date with custom format
 * @param dateString - The date string to format
 * @param locale - The locale to use for formatting
 * @param format - Custom format string
 * @returns Formatted date string
 */
export const formatCustomDate = (dateString: string | Date, locale: string, format: string): string => {
  return getDayjsWithLocale(dateString, locale).format(format)
}

/**
 * Common date format presets
 */
export const dateFormats = {
  shortDate: 'L',           // 09/05/2025 or 05.09.2025
  mediumDate: 'LL',         // September 5, 2025 or 5. September 2025
  longDate: 'LLL',          // September 5, 2025 2:30 PM
  fullDate: 'LLLL',         // Thursday, September 5, 2025 2:30 PM
  shortTime: 'LT',          // 2:30 PM or 14:30
  longTime: 'LTS',          // 2:30:25 PM or 14:30:25
  dateTime: 'L LT',         // 09/05/2025 2:30 PM
  isoDate: 'YYYY-MM-DD',    // 2025-09-05
  isoDateTime: 'YYYY-MM-DD HH:mm:ss', // 2025-09-05 14:30:25
} as const

// Export dayjs instance for advanced usage
export { dayjs }
