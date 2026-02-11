/**
 * VAS Scoring Logic
 * 
 * This scoring implementation can be shared between frontend and backend.
 * Exports a calculateScore function that matches the backend plugin interface.
 */

import type { FormData } from '../../types'
import type { ScoringData } from '@/types/backend/scoring'

/**
 * Calculate VAS score from form data
 * 
 * VAS uses a simple 0-10 scale for pain level
 * The score is the pain level value itself
 * 
 * @param data Form data structure
 * @returns Scoring data with total score
 */
export function calculateScore(data: FormData): ScoringData {
  // Extract painScale section from form data
  const painScale = data.painScale || {}
  const painLevel = painScale.painLevel

  // Calculate raw score (0-10 scale)
  const rawScore = typeof painLevel === 'number' ? painLevel : 0
  
  // Calculate answered and total questions
  const answeredQuestions = typeof painLevel === 'number' ? 1 : 0
  const totalQuestions = 1

  // Calculate normalized score (0-100 scale)
  const normalizedScore = typeof painLevel === 'number' ? (painLevel * 10) : 0
  
  // Calculate completion percentage
  const completionPercentage = answeredQuestions === totalQuestions ? 100 : 0
  const isComplete = answeredQuestions === totalQuestions

  return {
    rawData: { painScale },
    subscales: {},
    total: {
      name: 'Total',
      description: null,
      rawScore,
      normalizedScore,
      maxPossibleScore: 10,
      answeredQuestions,
      totalQuestions,
      completionPercentage,
      isComplete
    }
  }
}

/**
 * Validate VAS form data
 * Pain level must be in range 0-10, or null (unanswered)
 */
export function validateFormData(data: FormData): boolean {
  const painScale = data.painScale || {}
  const painLevel = painScale.painLevel

  // Null/undefined is valid (unanswered)
  if (painLevel === null || painLevel === undefined) return true

  // Must be a number
  if (typeof painLevel !== 'number') return false

  // Must be in valid range
  if (painLevel < 0 || painLevel > 10) return false

  return true
}

/**
 * Get initial/empty VAS form data
 */
export function getInitialData(): FormData {
  return {
    painScale: {
      painLevel: null
    }
  }
}

/**
 * Generate mock VAS data for testing
 */
export function generateMockData(): FormData {
  return {
    painScale: {
      painLevel: 5.5
    }
  }
}
