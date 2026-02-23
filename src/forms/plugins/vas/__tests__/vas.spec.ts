import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  getScaleInfo,
} from '../scoring'
import type { SubscaleScore } from '@/types/backend/scoring'

describe('VAS Scoring Plugin', () => {
  describe('calculateScore', () => {
    it('should calculate correct score for a given pain level', () => {
      const data = { painScale: { painLevel: 7 } }
      const result = calculateScore(data)

      expect(result.totalScore).toBeDefined()
      expect(result.totalScore!.rawScore).toBe(7)
      expect(result.totalScore!.normalizedScore).toBe(70)
      expect(result.totalScore!.maxScore).toBe(10)
      expect(result.totalScore!.isComplete).toBe(true)
      expect(result.totalScore!.answeredQuestions).toBe(1)
      expect(result.totalScore!.totalQuestions).toBe(1)
    })

    it('should return zero score when painLevel is absent', () => {
      const result = calculateScore({})

      expect(result.totalScore!.rawScore).toBe(0)
      expect(result.totalScore!.normalizedScore).toBe(0)
      expect(result.totalScore!.isComplete).toBe(false)
      expect(result.totalScore!.answeredQuestions).toBe(0)
    })

    it('should handle painLevel of 0 (no pain)', () => {
      const result = calculateScore({ painScale: { painLevel: 0 } })

      expect(result.totalScore!.rawScore).toBe(0)
      expect(result.totalScore!.normalizedScore).toBe(0)
      expect(result.totalScore!.isComplete).toBe(true)
    })

    it('should handle painLevel of 10 (worst pain)', () => {
      const result = calculateScore({ painScale: { painLevel: 10 } })

      expect(result.totalScore!.rawScore).toBe(10)
      expect(result.totalScore!.normalizedScore).toBe(100)
    })

    it('should score mock data correctly', () => {
      const mockData = generateMockData()
      const result = calculateScore(mockData)

      expect(result.totalScore!.rawScore).toBe(5.5)
      expect(result.totalScore!.normalizedScore).toBe(55)
    })
  })

  describe('validateFormData', () => {
    it('should return true when painLevel is null (unanswered)', () => {
      expect(validateFormData({ painScale: { painLevel: null } })).toBe(true)
    })

    it('should return true for valid pain levels in range', () => {
      expect(validateFormData({ painScale: { painLevel: 0 } })).toBe(true)
      expect(validateFormData({ painScale: { painLevel: 5 } })).toBe(true)
      expect(validateFormData({ painScale: { painLevel: 10 } })).toBe(true)
    })

    it('should return false for out-of-range values', () => {
      expect(validateFormData({ painScale: { painLevel: -1 } })).toBe(false)
      expect(validateFormData({ painScale: { painLevel: 11 } })).toBe(false)
    })

    it('should return false for non-numeric values', () => {
      expect(validateFormData({ painScale: { painLevel: 'high' as unknown as number } })).toBe(false)
    })

    it('should return true for empty form data', () => {
      expect(validateFormData({})).toBe(true)
    })
  })

  describe('getInitialData', () => {
    it('should return form data with null painLevel', () => {
      const data = getInitialData()

      expect(data.painScale).toBeDefined()
      expect(data.painScale!.painLevel).toBeNull()
    })
  })

  describe('getScaleInfo', () => {
    it('should return lower-is-better polarity', () => {
      const score: SubscaleScore = { name: 'Total', rawScore: 4, isComplete: true }
      const info = getScaleInfo(score)

      expect(info.polarity).toBe('lower-is-better')
      expect(info.min).toBe(0)
      expect(info.max).toBe(10)
      expect(info.goodLabel).toBe('No pain')
      expect(info.badLabel).toBe('Worst pain')
    })

    it('should calculate normalizedValue as rawScore * 10', () => {
      const score: SubscaleScore = { name: 'Total', rawScore: 3, isComplete: true }
      const info = getScaleInfo(score)

      expect(info.normalizedValue).toBe(30)
    })
  })
})
