import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
} from '../scoring'

// AOFAS Midfoot max values: q1:40, q2:10, q3:10, q4:5, q5:5, q6:8, q7:6, q8:6, q9:5, q10:10 → total 105

describe('AOFAS Midfoot Scoring Plugin', () => {
  describe('calculateScore', () => {
    it('should calculate perfect score', () => {
      const perfectData = {
        midfoot: {
          q1: 40,
          q2: 10,
          q3: 10,
          q4: 5,
          q5: 5,
          q6: 8,
          q7: 6,
          q8: 6,
          q9: 5,
          q10: 10,
        },
      }
      const result = calculateScore(perfectData)

      expect(result.totalScore!.normalizedScore).toBe(100)
      expect(result.totalScore!.isComplete).toBe(true)
      expect(result.totalScore!.answeredQuestions).toBe(10)
    })

    it('should calculate zero score', () => {
      const worstData = {
        midfoot: {
          q1: 0, q2: 0, q3: 0, q4: 0, q5: 0,
          q6: 0, q7: 0, q8: 0, q9: 0, q10: 0,
        },
      }
      const result = calculateScore(worstData)

      expect(result.totalScore!.normalizedScore).toBe(0)
      expect(result.totalScore!.isComplete).toBe(true)
    })

    it('should handle empty data', () => {
      const result = calculateScore({})

      expect(result.totalScore!.rawScore).toBe(0)
      expect(result.totalScore!.answeredQuestions).toBe(0)
      expect(result.totalScore!.isComplete).toBe(false)
    })

    it('should score mock data within valid range', () => {
      const result = calculateScore(generateMockData())

      expect(result.totalScore!.answeredQuestions).toBe(10)
      expect(result.totalScore!.normalizedScore).toBeGreaterThan(0)
      expect(result.totalScore!.normalizedScore).toBeLessThanOrEqual(100)
    })

    it('should populate subscales.midfoot', () => {
      const result = calculateScore(generateMockData())

      expect(result.subscales!.midfoot).toBeDefined()
      expect(result.subscales!.midfoot!.name).toBe('AOFAS Midfoot Score')
    })
  })

  describe('validateFormData', () => {
    it('should return true for empty data', () => {
      expect(validateFormData({})).toBe(true)
    })

    it('should return true for valid values', () => {
      const data = { midfoot: { q1: 20, q3: 5 } }
      expect(validateFormData(data)).toBe(true)
    })

    it('should return false for invalid values', () => {
      const data = { midfoot: { q1: 99 } }
      expect(validateFormData(data)).toBe(false)
    })
  })

  describe('getInitialData', () => {
    it('should return midfoot section with null values', () => {
      const data = getInitialData()
      expect(data.midfoot).toBeDefined()
      Object.values(data.midfoot!).forEach(v => expect(v).toBeNull())
    })
  })
})
