import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  getScaleInfo,
} from '../scoring'
import type { SubscaleScore } from '@/types/backend/scoring'

// Maximum point values per question for AOFAS Hindfoot:
// q1:40, q2:10, q3:10, q4:5, q5:5, q6:8, q7:8, q8:6, q9:8, q10:10 → total 110
// Normalized to 100-point scale

describe('AOFAS Hindfoot Scoring Plugin', () => {
  describe('calculateScore', () => {
    it('should calculate perfect score (all max values → 100)', () => {
      const perfectData = {
        hindfoot: {
          q1: 40,
          q2: 10,
          q3: 10,
          q4: 5,
          q5: 5,
          q6: 8,
          q7: 8,
          q8: 6,
          q9: 8,
          q10: 10,
        },
      }
      const result = calculateScore(perfectData)

      expect(result.totalScore!.normalizedScore).toBe(100)
      expect(result.totalScore!.maxScore).toBe(100)
      expect(result.totalScore!.isComplete).toBe(true)
      expect(result.totalScore!.answeredQuestions).toBe(10)
    })

    it('should calculate zero score (all minimum values)', () => {
      const worstData = {
        hindfoot: {
          q1: 0,
          q2: 0,
          q3: 0,
          q4: 0,
          q5: 0,
          q6: 0,
          q7: 0,
          q8: 0,
          q9: 0,
          q10: 0,
        },
      }
      const result = calculateScore(worstData)

      expect(result.totalScore!.normalizedScore).toBe(0)
      expect(result.totalScore!.isComplete).toBe(true)
    })

    it('should handle empty form data', () => {
      const result = calculateScore({})

      expect(result.totalScore!.rawScore).toBe(0)
      expect(result.totalScore!.answeredQuestions).toBe(0)
      expect(result.totalScore!.totalQuestions).toBe(10)
      expect(result.totalScore!.isComplete).toBe(false)
    })

    it('should score mock data', () => {
      const result = calculateScore(generateMockData())

      expect(result.totalScore).toBeDefined()
      expect(result.totalScore!.answeredQuestions).toBe(10)
      expect(result.totalScore!.isComplete).toBe(true)
      expect(result.totalScore!.normalizedScore).toBeGreaterThan(0)
      expect(result.totalScore!.normalizedScore).toBeLessThanOrEqual(100)
    })

    it('should populate subscales.hindfoot', () => {
      const result = calculateScore(generateMockData())

      expect(result.subscales!.hindfoot).toBeDefined()
      expect(result.subscales!.hindfoot!.name).toBe('AOFAS Hindfoot Score')
    })

    it('should handle partial answers', () => {
      const data = { hindfoot: { q1: 30, q2: 7 } }
      const result = calculateScore(data)

      expect(result.totalScore!.answeredQuestions).toBe(2)
      expect(result.totalScore!.totalQuestions).toBe(10)
      expect(result.totalScore!.isComplete).toBe(false)
    })
  })

  describe('validateFormData', () => {
    it('should return true for empty form data', () => {
      expect(validateFormData({})).toBe(true)
    })

    it('should return true for null values (unanswered)', () => {
      const data = { hindfoot: { q1: null } }
      expect(validateFormData(data)).toBe(true)
    })

    it('should return true for valid point values', () => {
      const data = { hindfoot: { q1: 40, q2: 10, q9: 8 } }
      expect(validateFormData(data)).toBe(true)
    })

    it('should return false for invalid point values', () => {
      const data = { hindfoot: { q1: 99 } }
      expect(validateFormData(data)).toBe(false)
    })

    it('should return false for non-numeric values', () => {
      const data = { hindfoot: { q1: 'bad' as unknown as number } }
      expect(validateFormData(data)).toBe(false)
    })
  })

  describe('getInitialData', () => {
    it('should return hindfoot section with null values', () => {
      const data = getInitialData()
      expect(data.hindfoot).toBeDefined()
      Object.values(data.hindfoot!).forEach(v => expect(v).toBeNull())
    })
  })

  describe('getScaleInfo', () => {
    it('should return higher-is-better polarity', () => {
      const score: SubscaleScore = { name: 'AOFAS', rawScore: 75, isComplete: true }
      const info = getScaleInfo(score)

      expect(info.polarity).toBe('higher-is-better')
      expect(info.min).toBe(0)
      expect(info.max).toBe(100)
      expect(info.goodLabel).toBe('Excellent')
      expect(info.badLabel).toBe('Poor')
    })

    it('should set normalizedValue equal to rawScore', () => {
      const score: SubscaleScore = { name: 'AOFAS', rawScore: 60, isComplete: true }
      const info = getScaleInfo(score)
      expect(info.normalizedValue).toBe(60)
    })
  })
})
