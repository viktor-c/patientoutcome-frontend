import { describe, it, expect } from 'vitest'
import {
  calculateSubscaleScore,
  calculateTotalScore,
  extractQuestions,
  createEmptyScoring,
  isValidScore,
  getFormCompletionStatus,
} from '../scoring'
import type { ScoringData } from '@/types/backend/scoring'

describe('forms/utils/scoring', () => {
  describe('calculateSubscaleScore', () => {
    it('should calculate score with all questions answered', () => {
      const questions = { q1: 3, q2: 2, q3: 4 }
      const result = calculateSubscaleScore('Test', questions, 4)

      expect(result.name).toBe('Test')
      expect(result.rawScore).toBe(9)
      expect(result.maxScore).toBe(12)
      expect(result.answeredQuestions).toBe(3)
      expect(result.totalQuestions).toBe(3)
      expect(result.isComplete).toBe(true)
      expect(result.completionPercentage).toBe(100)
      expect(result.normalizedScore).toBeCloseTo(75, 1)
    })

    it('should handle unanswered questions (null values)', () => {
      const questions = { q1: 3, q2: null, q3: 4 }
      const result = calculateSubscaleScore('Test', questions, 4)

      expect(result.rawScore).toBe(7)
      expect(result.answeredQuestions).toBe(2)
      expect(result.totalQuestions).toBe(3)
      expect(result.isComplete).toBe(false)
      expect(result.completionPercentage).toBeCloseTo(66.67, 1)
    })

    it('should handle all null questions', () => {
      const questions = { q1: null, q2: null }
      const result = calculateSubscaleScore('Empty', questions, 5)

      expect(result.rawScore).toBe(0)
      expect(result.answeredQuestions).toBe(0)
      expect(result.isComplete).toBe(false)
      expect(result.completionPercentage).toBe(0)
      expect(result.normalizedScore).toBe(0)
    })

    it('should apply reverse scale when reverseScale is true', () => {
      const questions = { q1: 1, q2: 0 }
      const result = calculateSubscaleScore('Reversed', questions, 3, { reverseScale: true })

      // q1 reversed: 3 - 1 = 2, q2 reversed: 3 - 0 = 3 → total = 5
      expect(result.rawScore).toBe(5)
    })

    it('should include description when provided', () => {
      const questions = { q1: 2 }
      const result = calculateSubscaleScore('Name', questions, 5, { description: 'Desc' })

      expect(result.description).toBe('Desc')
    })

    it('should round normalizedScore to 2 decimal places', () => {
      const questions = { q1: 1 }
      const result = calculateSubscaleScore('Test', questions, 3)

      // 1/3 * 100 = 33.333...
      expect(result.normalizedScore).toBe(33.33)
    })
  })

  describe('calculateTotalScore', () => {
    it('should aggregate multiple subscale scores', () => {
      const subscales = [
        {
          name: 'Sub1',
          rawScore: 10,
          normalizedScore: 50,
          maxScore: 20,
          answeredQuestions: 2,
          totalQuestions: 2,
          completionPercentage: 100,
          isComplete: true,
        },
        {
          name: 'Sub2',
          rawScore: 15,
          normalizedScore: 75,
          maxScore: 20,
          answeredQuestions: 2,
          totalQuestions: 2,
          completionPercentage: 100,
          isComplete: true,
        },
      ]

      const result = calculateTotalScore(subscales, 'Total')

      expect(result.name).toBe('Total')
      expect(result.rawScore).toBe(25)
      expect(result.maxScore).toBe(40)
      expect(result.answeredQuestions).toBe(4)
      expect(result.totalQuestions).toBe(4)
      expect(result.isComplete).toBe(true)
      expect(result.normalizedScore).toBeCloseTo(62.5, 1)
    })

    it('should return incomplete if any subscale is incomplete', () => {
      const subscales = [
        {
          name: 'Sub1',
          rawScore: 5,
          normalizedScore: 50,
          maxScore: 10,
          answeredQuestions: 1,
          totalQuestions: 2,
          completionPercentage: 50,
          isComplete: false,
        },
      ]

      const result = calculateTotalScore(subscales)
      expect(result.isComplete).toBe(false)
    })

    it('should use default name "Total" when not provided', () => {
      const result = calculateTotalScore([])
      expect(result.name).toBe('Total')
    })

    it('should handle empty subscales array', () => {
      const result = calculateTotalScore([])

      expect(result.rawScore).toBe(0)
      expect(result.maxScore).toBe(0)
      expect(result.normalizedScore).toBe(0)
      expect(result.isComplete).toBe(true)
    })
  })

  describe('extractQuestions', () => {
    it('should extract numeric values for specified keys', () => {
      const section = { q1: 3, q2: 'invalid', q3: 5 }
      const result = extractQuestions(section, ['q1', 'q2', 'q3'])

      expect(result.q1).toBe(3)
      expect(result.q2).toBeNull() // string → null
      expect(result.q3).toBe(5)
    })

    it('should return null for all keys if section is undefined', () => {
      const result = extractQuestions(undefined, ['q1', 'q2'])

      expect(result.q1).toBeNull()
      expect(result.q2).toBeNull()
    })

    it('should return null for missing keys', () => {
      const section = { q1: 2 }
      const result = extractQuestions(section, ['q1', 'q2'])

      expect(result.q1).toBe(2)
      expect(result.q2).toBeNull()
    })
  })

  describe('createEmptyScoring', () => {
    it('should return empty scoring structure', () => {
      const result = createEmptyScoring()

      expect(result.rawFormData).toEqual({})
      expect(result.subscales).toEqual({})
      expect(result.totalScore).toBeNull()
    })
  })

  describe('isValidScore', () => {
    it('should return true for null value', () => {
      expect(isValidScore(null, 0, 10)).toBe(true)
    })

    it('should return true for value within range', () => {
      expect(isValidScore(5, 0, 10)).toBe(true)
      expect(isValidScore(0, 0, 10)).toBe(true)
      expect(isValidScore(10, 0, 10)).toBe(true)
    })

    it('should return false for value outside range', () => {
      expect(isValidScore(-1, 0, 10)).toBe(false)
      expect(isValidScore(11, 0, 10)).toBe(false)
    })
  })

  describe('getFormCompletionStatus', () => {
    it('should return "draft" for null scoring', () => {
      expect(getFormCompletionStatus(null)).toBe('draft')
    })

    it('should return "draft" for scoring without totalScore', () => {
      const scoring: ScoringData = { rawFormData: {}, totalScore: null }
      expect(getFormCompletionStatus(scoring)).toBe('draft')
    })

    it('should return "complete" when totalScore is complete', () => {
      const scoring: ScoringData = {
        rawFormData: {},
        totalScore: {
          name: 'Total',
          rawScore: 80,
          isComplete: true,
          answeredQuestions: 8,
          totalQuestions: 8,
        },
      }
      expect(getFormCompletionStatus(scoring)).toBe('complete')
    })

    it('should return "incomplete" when some questions answered but not all', () => {
      const scoring: ScoringData = {
        rawFormData: {},
        totalScore: {
          name: 'Total',
          rawScore: 20,
          isComplete: false,
          answeredQuestions: 3,
          totalQuestions: 8,
        },
      }
      expect(getFormCompletionStatus(scoring)).toBe('incomplete')
    })

    it('should return "draft" when no questions answered', () => {
      const scoring: ScoringData = {
        rawFormData: {},
        totalScore: {
          name: 'Total',
          rawScore: 0,
          isComplete: false,
          answeredQuestions: 0,
          totalQuestions: 8,
        },
      }
      expect(getFormCompletionStatus(scoring)).toBe('draft')
    })
  })
})
