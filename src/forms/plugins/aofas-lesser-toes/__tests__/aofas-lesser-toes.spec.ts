import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
} from '../scoring'

// AOFAS Lesser Toes max values: q1:40, q2:10, q3:10, q4:14, q5:6, q6:5, q7:5, q8:10 → total 100

describe('AOFAS Lesser Toes Scoring Plugin', () => {
  describe('calculateScore', () => {
    it('should calculate perfect score (max values → 100)', () => {
      const perfectData = {
        lesserToes: {
          q1: 40,
          q2: 10,
          q3: 10,
          q4: 14,
          q5: 6,
          q6: 5,
          q7: 5,
          q8: 10,
        },
      }
      const result = calculateScore(perfectData)

      expect(result.totalScore!.normalizedScore).toBe(100)
      expect(result.totalScore!.isComplete).toBe(true)
      expect(result.totalScore!.answeredQuestions).toBe(8)
    })

    it('should calculate zero score', () => {
      const worstData = {
        lesserToes: {
          q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0,
        },
      }
      const result = calculateScore(worstData)

      expect(result.totalScore!.normalizedScore).toBe(0)
      expect(result.totalScore!.isComplete).toBe(true)
    })

    it('should handle empty data', () => {
      const result = calculateScore({})

      expect(result.totalScore!.answeredQuestions).toBe(0)
      expect(result.totalScore!.totalQuestions).toBe(8)
      expect(result.totalScore!.isComplete).toBe(false)
    })

    it('should score mock data within valid range', () => {
      const result = calculateScore(generateMockData())

      expect(result.totalScore!.answeredQuestions).toBe(8)
      expect(result.totalScore!.normalizedScore).toBeGreaterThan(0)
      expect(result.totalScore!.normalizedScore).toBeLessThanOrEqual(100)
    })

    it('should populate subscales.lesserToes', () => {
      const result = calculateScore(generateMockData())

      expect(result.subscales!.lesserToes).toBeDefined()
      expect(result.subscales!.lesserToes!.name).toBe('AOFAS Lesser Toes Score')
    })

    it('should handle partial answers and track completion correctly', () => {
      const data = { lesserToes: { q1: 30, q2: 7, q3: 5 } }
      const result = calculateScore(data)

      expect(result.totalScore!.answeredQuestions).toBe(3)
      expect(result.totalScore!.totalQuestions).toBe(8)
      expect(result.totalScore!.completionPercentage).toBe(38)
      expect(result.totalScore!.isComplete).toBe(false)
    })
  })

  describe('validateFormData', () => {
    it('should return true for empty data', () => {
      expect(validateFormData({})).toBe(true)
    })

    it('should return true for null values', () => {
      const data = { lesserToes: { q1: null } }
      expect(validateFormData(data)).toBe(true)
    })

    it('should return true for valid point values', () => {
      const data = { lesserToes: { q1: 40, q4: 14, q5: 6 } }
      expect(validateFormData(data)).toBe(true)
    })

    it('should return false for invalid point values', () => {
      const data = { lesserToes: { q1: 99 } }
      expect(validateFormData(data)).toBe(false)
    })

    it('should return false for non-numeric values', () => {
      const data = { lesserToes: { q1: 'bad' as unknown as number } }
      expect(validateFormData(data)).toBe(false)
    })
  })

  describe('getInitialData', () => {
    it('should return lesserToes section with null values', () => {
      const data = getInitialData()
      expect(data.lesserToes).toBeDefined()
      Object.values(data.lesserToes!).forEach(v => expect(v).toBeNull())
    })
  })
})
