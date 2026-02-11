/**
 * EFAS Scoring Logic
 * European Foot and Ankle Society Score
 * 
 * This scoring implementation can be shared between frontend and backend.
 * Exports a calculateScore function that matches the backend plugin interface.
 */

import type { FormData } from '../../types'
import type { ScoringData } from '@/types/backend/scoring'
import { calculateSubscaleScore, extractQuestions, calculateTotalScore } from '../../utils/scoring'

/**
 * Calculate EFAS score from form data
 * 
 * EFAS has two subscales:
 * - Standard Questions (q1-q6): 6 questions, required
 * - Sport Questions (s1-s4): 4 questions, optional
 * 
 * All questions use 0-4 scale (5 options: 0, 1, 2, 3, 4)
 * Total: 10 questions maximum
 * 
 * Scoring:
 * - Standard subscale: max 24 points (6 questions × 4)
 * - Sport subscale: max 16 points (4 questions × 4)
 * - Total: max 40 points raw, normalized to 0-100%
 * 
 * @param data Form data structure
 * @returns Scoring data with subscales and total
 */
export function calculateScore(data: FormData): ScoringData {
  // Extract sections from form data
  const standardSection = data.standardfragebogen || {}
  const sportSection = data.sportfragebogen || {}

  // Define question groups for each subscale
  const standardQuestions = extractQuestions(standardSection, [
    'q1', 'q2', 'q3', 'q4', 'q5', 'q6'
  ])

  const sportQuestions = extractQuestions(sportSection, [
    's1', 's2', 's3', 's4'
  ])

  // Calculate subscale scores (max score per question is 4)
  const standardScore = calculateSubscaleScore(
    'Standard Questions',
    standardQuestions,
    4,
    { description: 'Daily activity questions - assesses basic foot and ankle function.' }
  )

  const sportScore = calculateSubscaleScore(
    'Sport Questions',
    sportQuestions,
    4,
    { description: 'Sports-specific questions - optional for athletes and active individuals.' }
  )

  // Calculate total score only from answered questions
  const allSubscales = [standardScore, sportScore]
  const totalScore = calculateTotalScore(allSubscales, 'EFAS Total')

  return {
    rawData: {
      standardfragebogen: standardSection,
      sportfragebogen: sportSection
    },
    subscales: {
      standard: standardScore,
      sport: sportScore
    },
    total: totalScore
  }
}

/**
 * Validate EFAS form data
 * 
 * This validates the data structure and value ranges, not completeness.
 * Completeness is tracked separately via the scoring's isComplete flag.
 * 
 * All answers must be in range 0-4, or null (unanswered)
 */
export function validateFormData(data: FormData): boolean {
  // Validate standard questions
  const standardSection = data.standardfragebogen || {}
  const standardKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']

  for (const key of standardKeys) {
    const value = standardSection[key]
    
    // Null/undefined is valid (unanswered) - completeness is checked via scoring
    if (value === null || value === undefined) continue
    
    // Must be a number
    if (typeof value !== 'number') return false
    
    // Must be in valid range
    if (value < 0 || value > 4) return false
  }

  // Validate sport questions (optional, but if answered must be valid)
  const sportSection = data.sportfragebogen || {}
  const sportKeys = ['s1', 's2', 's3', 's4']

  for (const key of sportKeys) {
    const value = sportSection[key]
    
    // Null/undefined is valid (unanswered)
    if (value === null || value === undefined) continue
    
    // Must be a number
    if (typeof value !== 'number') return false
    
    // Must be in valid range
    if (value < 0 || value > 4) return false
  }

  return true
}

/**
 * Get initial/empty EFAS form data
 */
export function getInitialData(): FormData {
  return {
    standardfragebogen: {
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      q5: null,
      q6: null
    },
    sportfragebogen: {
      s1: null,
      s2: null,
      s3: null,
      s4: null
    }
  }
}

/**
 * Generate mock EFAS data for testing
 */
export function generateMockData(): FormData {
  return {
    standardfragebogen: {
      q1: 2,
      q2: 3,
      q3: 2,
      q4: 3,
      q5: 2,
      q6: 3
    },
    sportfragebogen: {
      s1: 2,
      s2: 3,
      s3: 2,
      s4: 3
    }
  }
}
