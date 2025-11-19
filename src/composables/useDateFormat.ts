import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate, formatRelativeTime, formatCustomDate, dateFormats, getDayjsWithLocale } from '@/utils/dayjs'

/**
 * Vue composable for working with dayjs and i18n localization
 * This composable provides locale-aware date formatting functions
 */
export const useDateFormat = () => {
  const { locale } = useI18n()

  // Computed property to get current locale
  const currentLocale = computed(() => locale.value)

  /**
   * Format a date with the current i18n locale
   * @param dateString - The date string to format
   * @param format - The format string (default: 'LLLL' for full date/time)
   * @returns Formatted date string
   */
  const formatLocalizedDate = (dateString: string | Date, format: string = 'LLLL'): string => {
    return formatDate(dateString, currentLocale.value, format)
  }

  /**
   * Format a date as relative time with the current i18n locale
   * @param dateString - The date string to format
   * @returns Relative time string
   */
  const formatLocalizedRelativeTime = (dateString: string | Date): string => {
    return formatRelativeTime(dateString, currentLocale.value)
  }

  /**
   * Format a date with custom format using the current i18n locale
   * @param dateString - The date string to format
   * @param format - Custom format string
   * @returns Formatted date string
   */
  const formatLocalizedCustomDate = (dateString: string | Date, format: string): string => {
    return formatCustomDate(dateString, currentLocale.value, format)
  }

  /**
   * Get a dayjs instance with the current i18n locale
   * @param date - Optional date to create dayjs instance with
   * @returns dayjs instance with current locale
   */
  const getLocalizedDayjs = (date?: unknown) => {
    // getDayjsWithLocale accepts various input shapes; suppress explicit any lint here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getDayjsWithLocale(date as any, currentLocale.value)
  }

  return {
    currentLocale,
    formatLocalizedDate,
    formatLocalizedRelativeTime,
    formatLocalizedCustomDate,
    getLocalizedDayjs,
    dateFormats,
  }
}
