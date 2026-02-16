/**
 * EFAS Scoring Logic
 * European Foot and Ankle Society Score
 * 
 * This scoring implementation can be shared between frontend and backend.
 * Exports a calculateScore function that matches the backend plugin interface.
 */

import type { FormData } from '../../types'
import type { ScoringData } from '@/types/backend/scoring'
import { calculateSubscaleScore, calculateTotalScore } from '../../utils/scoring'

/**
 * Extract EFAS questions handling 'na' string format
 * 
 * EFAS supports N/A answers represented as 'na' string:
 * - When value === 'na': scores 0 points (but treats as answered)
 * - When value is a number (0-4): uses the numeric value
 * - When value is null/undefined: treats as unanswered
 * 
 * @param section Form data section
 * @param questionKeys Array of question keys to extract
 * @returns Filtered questions object
 */
function extractEFASQuestions(
  section: Record<string, any> | undefined,
  questionKeys: string[]
): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  
  if (!section) {
    for (const key of questionKeys) {
      result[key] = null
    }
    return result
  }

  for (const key of questionKeys) {
    const value = section[key]
    
    // Handle 'na' string - scores 0 points
    if (value === 'na') {
      result[key] = 0
    }
    // Handle numeric format
    else if (typeof value === 'number') {
      result[key] = value
    }
    // Unanswered (null, undefined, or any other value)
    else {
      result[key] = null
    }
  }

  return result
}

/**
 * Validate EFAS form data
 * 
 * Handles numeric answers (0-4), 'na' string, null (unanswered)
 * 
 * @param data Form data to validate
 * @returns true if valid, false otherwise
 */
function validateEFASFormData(data: FormData): boolean {
  // Validate standard questions
  const standardSection = data.standardfragebogen || {}
  const standardKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']

  for (const key of standardKeys) {
    const value = standardSection[key]
    
    // Null/undefined is valid (unanswered)
    if (value === null || value === undefined) continue
    
    // 'na' string is valid
    if (value === 'na') continue
    
    // Must be a number in valid range
    if (typeof value === 'number') {
      if (value < 0 || value > 4) return false
    } else {
      return false
    }
  }

  // Validate sport questions
  const sportSection = data.sportfragebogen || {}
  const sportKeys = ['s1', 's2', 's3', 's4']

  for (const key of sportKeys) {
    const value = sportSection[key]
    
    if (value === null || value === undefined) continue
    if (value === 'na') continue
    
    if (typeof value === 'number') {
      if (value < 0 || value > 4) return false
    } else {
      return false
    }
  }

  return true
}

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
  const standardQuestions = extractEFASQuestions(standardSection, [
    'q1', 'q2', 'q3', 'q4', 'q5', 'q6'
  ])

  const sportQuestions = extractEFASQuestions(sportSection, [
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
    rawFormData: {
      standardfragebogen: standardSection,
      sportfragebogen: sportSection
    },
    subscales: {
      standard: standardScore,
      sport: sportScore
    },
    totalScore: totalScore
  }
}

/**
 * Validate EFAS form data
 * 
 * Delegates to the EFAS-specific validation function that handles {value, na} format.
 * All answers must be in range 0-4, or null (unanswered)
 */
export function validateFormData(data: FormData): boolean {
  return validateEFASFormData(data)
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
