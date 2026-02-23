/**
 * Quick verification test for AOFAS plugin
 */
import { describe, it, expect } from 'vitest'
import { calculateScore, generateMockData, validateFormData, getInitialData } from '../plugins/aofas/scoring'

describe('AOFAS Plugin Verification', () => {
  it('should calculate correct score from mock data', () => {
    const mockData = generateMockData()
    
    // Mock data should have these values:
    // q1: 30, q2: 7, q3: 5, q4: 10, q5: 5, q6: 5, q7: 5, q8: 8
    // Total: 75 points out of 100
    
    const result = calculateScore(mockData)
    
    expect(result).toBeDefined()
    expect(result.totalScore).toBeDefined()
    expect(result.totalScore!.rawScore).toBe(75)
    expect(result.totalScore!.normalizedScore).toBe(75) // 75/100 * 100 = 75%
    expect(result.totalScore!.maxScore).toBe(100)
    expect(result.totalScore!.answeredQuestions).toBe(8)
    expect(result.totalScore!.totalQuestions).toBe(8)
    expect(result.totalScore!.isComplete).toBe(true)
    
    // Check subscale
    expect(result.subscales!.forefoot).toBeDefined()
    expect(result.subscales!.forefoot!.rawScore).toBe(75)
    
    console.log('✅ AOFAS Score Calculation: PASSED')
    console.log('   Raw Score: 75/100')
    console.log('   Normalized: 75%')
  })

  it('should validate mock data', () => {
    const mockData = generateMockData()
    const isValid = validateFormData(mockData)
    
    expect(isValid).toBe(true)
    console.log('✅ AOFAS Validation: PASSED')
  })

  it('should handle maximum score (perfect answers)', () => {
    const perfectData = {
      forefoot: {
        q1: 40,  // No pain - max points
        q2: 10,  // No limitation - max points
        q3: 10,  // Fashionable shoes - max points
        q4: 10,  // Normal mobility - max points
        q5: 5,   // No restriction - max points
        q6: 5,   // Stable - max points
        q7: 5,   // No callus - max points
        q8: 15   // Good alignment - max points
        // Total: 100 points
      }
    }
    
    const result = calculateScore(perfectData)
    
    expect(result.totalScore!.rawScore).toBe(100)
    expect(result.totalScore!.normalizedScore).toBe(100)
    expect(result.totalScore!.isComplete).toBe(true)
    
    console.log('✅ AOFAS Perfect Score: PASSED')
    console.log('   Raw Score: 100/100')
  })

  it('should handle minimum score (worst answers)', () => {
    const worstData = {
      forefoot: {
        q1: 0,   // Severe pain - 0 points
        q2: 0,   // Severe limitation - 0 points
        q3: 0,   // Modified shoes - 0 points
        q4: 0,   // Severe restriction - 0 points
        q5: 0,   // Restricted - 0 points
        q6: 0,   // Unstable - 0 points
        q7: 0,   // Symptomatic callus - 0 points
        q8: 0    // Severe malalignment - 0 points
        // Total: 0 points
      }
    }
    
    const result = calculateScore(worstData)
    
    expect(result.totalScore!.rawScore).toBe(0)
    expect(result.totalScore!.normalizedScore).toBe(0)
    expect(result.totalScore!.isComplete).toBe(true)
    
    console.log('✅ AOFAS Minimum Score: PASSED')
    console.log('   Raw Score: 0/100')
  })

  it('should handle partially filled form', () => {
    const partialData = {
      forefoot: {
        q1: 30,
        q2: 7,
        q3: null,  // Unanswered
        q4: null,  // Unanswered
        q5: 5,
        q6: 5,
        q7: null,  // Unanswered
        q8: 8
        // Answered: 5/8 questions, Total: 55 points
      }
    }
    
    const result = calculateScore(partialData)
    
    expect(result.totalScore!.rawScore).toBe(55)
    expect(result.totalScore!.answeredQuestions).toBe(5)
    expect(result.totalScore!.totalQuestions).toBe(8)
    expect(result.totalScore!.isComplete).toBe(false)
    expect(result.totalScore!.completionPercentage).toBe(63) // rounded
    
    console.log('✅ AOFAS Partial Form: PASSED')
    console.log(`   Answered: 5/8 questions`)
    console.log(`   Raw Score: 55/100`)
  })

  it('should get correct initial data structure', () => {
    const initialData = getInitialData()
    
    expect(initialData).toBeDefined()
    expect(initialData.forefoot).toBeDefined()
    expect(Object.keys(initialData.forefoot)).toHaveLength(8)
    expect(initialData.forefoot.q1).toBeNull()
    expect(initialData.forefoot.q8).toBeNull()
    
    console.log('✅ AOFAS Initial Data: PASSED')
  })
})
