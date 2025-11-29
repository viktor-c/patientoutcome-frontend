import { describe, it, expect, vi } from 'vitest'
import { useDateFormat } from '../useDateFormat'

// Mock vue-i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
  }),
}))

describe('useDateFormat composable', () => {
  it('should provide locale-aware date formatting functions', () => {
    const { formatLocalizedDate, formatLocalizedRelativeTime, formatLocalizedCustomDate, currentLocale } = useDateFormat()

    expect(currentLocale.value).toBe('en')
    expect(typeof formatLocalizedDate).toBe('function')
    expect(typeof formatLocalizedRelativeTime).toBe('function')
    expect(typeof formatLocalizedCustomDate).toBe('function')
  })

  it('should format date with current locale', () => {
    const { formatLocalizedDate } = useDateFormat()
    const date = '2024-01-15T10:30:00Z'
    const result = formatLocalizedDate(date, 'YYYY-MM-DD')

    expect(result).toBe('2024-01-15')
  })

  it('should format custom date pattern', () => {
    const { formatLocalizedCustomDate } = useDateFormat()
    const date = '2024-12-25T00:00:00Z'
    const result = formatLocalizedCustomDate(date, 'DD.MM.YYYY')

    expect(result).toBe('25.12.2024')
  })

  it('should format relative time', () => {
    const { formatLocalizedRelativeTime } = useDateFormat()
    const now = new Date()
    const result = formatLocalizedRelativeTime(now.toISOString())

    expect(result).toContain('ago')
  })

  it('should provide localized dayjs instance', () => {
    const { getLocalizedDayjs } = useDateFormat()
    const dayjsInstance = getLocalizedDayjs('2024-01-15')

    expect(dayjsInstance.isValid()).toBe(true)
    expect(dayjsInstance.year()).toBe(2024)
  })
})
