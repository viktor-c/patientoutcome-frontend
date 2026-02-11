/**
 * VISA-A Plugin Tests
 * 
 * Tests for the VISA-A form plugin scoring, validation, and data generation
 */

import { describe, it, expect } from 'vitest'
import { calculateScore, validateFormData, getInitialData, generateMockData } from '../scoring'
import type { FormData } from '../../../types'

describe('VISA-A Plugin', () => {
  describe('getInitialData', () => {
    it('should return empty form data with all questions as null', () => {
      const data = getInitialData()
      
      expect(data.visaa).toBeDefined()
      expect(data.visaa.q1).toBeNull()
      expect(data.visaa.q2).toBeNull()
      expect(data.visaa.q3).toBeNull()
      expect(data.visaa.q4).toBeNull()
      expect(data.visaa.q5).toBeNull()
      expect(data.visaa.q6).toBeNull()
      expect(data.visaa.q7).toBeNull()
      expect(data.visaa.q8_type).toBeNull()
      expect(data.visaa.q8a).toBeNull()
      expect(data.visaa.q8b).toBeNull()
      expect(data.visaa.q8c).toBeNull()
    })
  })

  describe('generateMockData', () => {
    it('should return valid mock data', () => {
      const data = generateMockData()
      
      expect(data.visaa).toBeDefined()
      expect(validateFormData(data)).toBe(true)
    })
  })

  describe('validateFormData', () => {
    it('should accept valid form data', () => {
      const validData: FormData = {
        visaa: {
          q1: 50,
          q2: 5,
          q3: 5,
          q4: 5,
          q5: 5,
          q6: 5,
          q7: 7,
          q8_type: 'pain_no_stop',
          q8a: null,
          q8b: 15,
          q8c: null
        }
      }
      
      expect(validateFormData(validData)).toBe(true)
    })

    it('should accept null values', () => {
      const validData: FormData = {
        visaa: {
          q1: null,
          q2: null,
          q3: null,
          q4: null,
          q5: null,
          q6: null,
          q7: null,
          q8_type: null,
          q8a: null,
          q8b: null,
          q8c: null
        }
      }
      
      expect(validateFormData(validData)).toBe(true)
    })

    it('should reject q1 out of range', () => {
      const invalidData: FormData = {
        visaa: {
          q1: 150, // Invalid: > 100
          q2: 5,
          q3: 5,
          q4: 5,
          q5: 5,
          q6: 5,
          q7: 7,
          q8_type: 'no_pain',
          q8a: 15,
          q8b: null,
          q8c: null
        }
      }
      
      expect(validateFormData(invalidData)).toBe(false)
    })

    it('should reject q2-q6 out of range', () => {
      const invalidData: FormData = {
        visaa: {
          q1: 50,
          q2: 15, // Invalid: > 10
          q3: 5,
          q4: 5,
          q5: 5,
          q6: 5,
          q7: 7,
          q8_type: 'no_pain',
          q8a: 15,
          q8b: null,
          q8c: null
        }
      }
      
      expect(validateFormData(invalidData)).toBe(false)
    })

    it('should reject invalid q7 enum value', () => {
      const invalidData: FormData = {
        visaa: {
          q1: 50,
          q2: 5,
          q3: 5,
          q4: 5,
          q5: 5,
          q6: 5,
          q7: 5, // Invalid: not in [0, 4, 7, 10]
          q8_type: 'no_pain',
          q8a: 15,
          q8b: null,
          q8c: null
        }
      }
      
      expect(validateFormData(invalidData)).toBe(false)
    })

    it('should reject invalid q8_type', () => {
      const invalidData: FormData = {
        visaa: {
          q1: 50,
          q2: 5,
          q3: 5,
          q4: 5,
          q5: 5,
          q6: 5,
          q7: 7,
          q8_type: 'invalid_type', // Invalid type
          q8a: 15,
          q8b: null,
          q8c: null
        }
      }
      
      expect(validateFormData(invalidData)).toBe(false)
    })
  })

  describe('calculateScore', () => {
    it('should calculate score for complete form with q8a (no pain)', () => {
      const data: FormData = {
        visaa: {
          q1: 0,   // 0 mins → 10 points
          q2: 10,  // 10 (no pain) → 10 points
          q3: 10,  // 10 (no pain) → 10 points
          q4: 10,  // 10 (no pain) → 10 points
          q5: 10,  // 10 (no pain) → 10 points
          q6: 10,  // 10 points
          q7: 10,  // 10 points
          q8_type: 'no_pain',
          q8a: 30, // 30 mins → 21 points (21-30 range)
          q8b: null,
          q8c: null
        }
      }
      
      const result = calculateScore(data)
      
      // Total: 10 + 10 + 10 + 10 + 10 + 10 + 10 + 21 = 91 points
      expect(result.total).toBeDefined()
      expect(result.total).not.toBeNull()
      expect(result.total!.rawScore).toBe(91)
      expect(result.total!.isComplete).toBe(true)
      expect(result.total!.answeredQuestions).toBe(8)
    })

    it('should calculate score with q8b (pain no stop)', () => {
      const data: FormData = {
        visaa: {
          q1: 50,  // 50 mins → 5 points
          q2: 5,   // 5 points
          q3: 5,   // 5 points
          q4: 5,   // 5 points
          q5: 5,   // 5 points
          q6: 5,   // 5 points
          q7: 7,   // 7 points
          q8_type: 'pain_no_stop',
          q8a: null,
          q8b: 15, // 15 mins (11-20 range) → 10 points
          q8c: null
        }
      }
      
      const result = calculateScore(data)
      
      // Total: 5 + 5 + 5 + 5 + 5 + 5 + 7 + 10 = 47 points
      expect(result.total).toBeDefined()
      expect(result.total).not.toBeNull()
      expect(result.total!.rawScore).toBe(47)
      expect(result.total!.isComplete).toBe(true)
    })

    it('should calculate score with q8c (pain stops)', () => {
      const data: FormData = {
        visaa: {
          q1: 100, // 100 mins → 0 points
          q2: 0,   // 0 points
          q3: 0,   // 0 points
          q4: 0,   // 0 points
          q5: 0,   // 0 points
          q6: 0,   // 0 points
          q7: 0,   // 0 points
          q8_type: 'pain_stop',
          q8a: null,
          q8b: null,
          q8c: 25  // 25 mins (21-30 range) → 7 points
        }
      }
      
      const result = calculateScore(data)
      
      // Total: 0 + 0 + 0 + 0 + 0 + 0 + 0 + 7 = 7 points
      expect(result.total).not.toBeNull()
      expect(result.total!.rawScore).toBe(7)
      expect(result.total!.rawScore).toBe(7)
      expect(result.total!.isComplete).toBe(true)
    })

    it('should handle incomplete form data', () => {
      const data: FormData = {
        visaa: {
          q1: 50,
          q2: 5,
          q3: null, // Not answered
          q4: null, // Not answered
          q5: 5,
          q6: 5,
          q7: 7,
          q8_type: null, // Not answered
          q8a: null,
          q8b: null,
          q8c: null
        }
      }
      
      const result = calculateScore(data)
      
      expect(result.total).not.toBeNull()
      expect(result.total!.isComplete).toBe(false)
      expect(result.total!.isComplete).toBe(false)
      expect(result.total!.answeredQuestions).toBeLessThan(8)
    })

    it('should calculate subscales correctly', () => {
      const data: FormData = {
        visaa: {
          q1: 20,  // 20 mins → 8 points
          q2: 8,   // 8 points
          q3: 7,   // 7 points
          q4: 8,   // 8 points
          q5: 7,   // 7 points
          q6: 8,   // 8 points
          q7: 7,   // 7 points
          q8_type: 'pain_no_stop',
          q8a: null,
          q8b: 18, // 18 mins (11-20 range) → 10 points
          q8c: null
        }
      }
      
      const result = calculateScore(data)
      
      // Symptoms (q1-q3): 8 + 8 + 7 =).toBeDefined()
      expect(result.subscales.symptoms?.rawScore).toBe(23)
      expect(result.subscales.symptoms?.maxPossibleScore).toBe(30)
      
      // Daily Function (q4): 8 points (max 10)
      expect(result.subscales.dailyFunction).toBeDefined()
      expect(result.subscales.dailyFunction?.rawScore).toBe(8)
      expect(result.subscales.dailyFunction?.maxPossibleScore).toBe(10)
      
      // Sport Function (q5-q6): 7 + 8 = 15 points (max 20)
      expect(result.subscales.sportFunction).toBeDefined()
      expect(result.subscales.sportFunction?.rawScore).toBe(15)
      expect(result.subscales.sportFunction?.maxPossibleScore).toBe(20)
      
      // Activity (q7-q8): 7 + 10 = 17 points (max 40)
      expect(result.subscales.activity).toBeDefined()
      expect(result.subscales.activity?.rawScore).toBe(17)
      expect(result.subscales.activity?.maxPossibleScore).toBe(40)
      
      // Total: 23 + 8 + 15 + 17 = 63 points
      expect(result.total).toBeDefined()
      expect(result.total).not.toBeNull()
      expect(result.total!.rawScore).toBe(63)
    })

    it('should handle q1 boundary values correctly', () => {
      // Test q1 = 0 mins → 10 points
      const data1: FormData = {
        visaa: {
          q1: 0,
          q2: null,
          q3: null,
          q4: null,
          q5: null,
          q6: null,
          q7: null,
          q8_type: null,
          q8a: null,
          q8b: null,
          q8c: null
        }
      }
      
      const result1 = calculateScore(data1)
      expect(result1.subscales.symptoms).toBeDefined()
      expect(result1.subscales.symptoms?.rawScore).toBe(10)
      
      // Test q1 = 100 mins → 0 points
      const data2: FormData = {
        visaa: {
          q1: 100,
          q2: null,
          q3: null,
          q4: null,
          q5: null,
          q6: null,
          q7: null,
          q8_type: null,
          q8a: null,
          q8b: null,
          q8c: null
        }
      }
      
      const result2 = calculateScore(data2)
      expect(result2.subscales.symptoms).toBeDefined()
      expect(result2.subscales.symptoms?.rawScore).toBe(0)
    })

    it('should handle q8 boundary values correctly', () => {
      // Test q8a boundaries
      const testCases = [
        { minutes: 0, expectedPoints: 0 },
        { minutes: 7, expectedPoints: 7 },
        { minutes: 14, expectedPoints: 14 },
        { minutes: 21, expectedPoints: 21 },
        { minutes: 30, expectedPoints: 21 }
      ]
      
      testCases.forEach(({ minutes, expectedPoints }) => {
        const data: FormData = {
          visaa: {
            q1: null,
            q2: null,
            q3: null,
            q4: null,
            q5: null,
            q6: null,
            q7: null,
            q8_type: 'no_pain',
            q8a: minutes,
            q8b: null,
            q8c: null
          }
        }
        
        const result = calculateScore(data)
        expect(result.subscales.activity).toBeDefined()
        expect(result.subscales.activity?.rawScore).toBe(expectedPoints)
      })
    })
  })
})
