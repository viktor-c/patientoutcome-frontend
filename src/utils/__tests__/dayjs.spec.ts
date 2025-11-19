import { describe, it, expect } from 'vitest'
import { formatDate, formatRelativeTime, formatCustomDate, getDayjsWithLocale } from '../dayjs'

describe('dayjs utilities', () => {
  describe('formatDate', () => {
    it('should format date with default locale and format', () => {
      const date = '2024-01-15T10:30:00Z'
      const result = formatDate(date, 'en', 'YYYY-MM-DD')
      expect(result).toBe('2024-01-15')
    })

    it('should format date with custom format', () => {
      const date = '2024-01-15T10:30:00Z'
      const result = formatDate(date, 'en', 'DD.MM.YYYY')
      expect(result).toBe('15.01.2024')
    })

    it('should handle invalid date gracefully', () => {
      const result = formatDate('invalid-date', 'en', 'YYYY-MM-DD')
      expect(result).toBe('Invalid Date')
    })
  })

  describe('formatRelativeTime', () => {
    it('should return relative time from now', () => {
      const now = new Date()
      const result = formatRelativeTime(now.toISOString(), 'en')
      expect(result).toContain('ago')
    })

    it('should handle future dates', () => {
      const future = new Date(Date.now() + 1000 * 60 * 60 * 24) // 1 day ahead
      const result = formatRelativeTime(future.toISOString(), 'en')
      expect(result).toContain('in')
    })
  })

  describe('formatCustomDate', () => {
    it('should format with custom pattern', () => {
      const date = '2024-12-25T00:00:00Z'
      const result = formatCustomDate(date, 'en', 'MMM DD, YYYY')
      expect(result).toContain('Dec')
      expect(result).toContain('25')
      expect(result).toContain('2024')
    })
  })

  describe('getDayjsWithLocale', () => {
    it('should return dayjs instance with locale', () => {
      const dayjsInstance = getDayjsWithLocale('2024-01-15', 'en')
      expect(dayjsInstance.isValid()).toBe(true)
      expect(dayjsInstance.year()).toBe(2024)
      expect(dayjsInstance.month()).toBe(0) // January is 0
      expect(dayjsInstance.date()).toBe(15)
    })

    it('should handle German locale', () => {
      const dayjsInstance = getDayjsWithLocale('2024-01-15', 'de')
      expect(dayjsInstance.isValid()).toBe(true)
      expect(dayjsInstance.locale()).toBe('de')
    })
  })
})
