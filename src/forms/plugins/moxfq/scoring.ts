/**
 * MOXFQ Scoring Logic
 * 
 * This scoring implementation can be shared between frontend and backend.
 * Exports a calculateScore function that matches the backend plugin interface.
 */

import type { FormData } from '../../types'
import type { ScoringData } from '@/types/backend/scoring'
import { calculateSubscaleScore, extractQuestions, calculateTotalScore } from '../../utils/scoring'

/**
 * Calculate MOXFQ score from form data
 * 
 * MOXFQ has three subscales:
 * - Walking & Standing (Q1-Q8): 8 questions
 * - Pain (Q9, Q11, Q12, Q15): 4 questions
 * - Social Interaction (Q10, Q13, Q14, Q16): 4 questions
 * 
 * All questions use 0-4 scale (5 options)
 * Total: 16 questions
 * 
 * @param data Form data structure
 * @returns Scoring data with subscales and total
 */
export function calculateScore(data: FormData): ScoringData {
  // Extract moxfq section from form data
  const moxfqSection = data.moxfq || {}

  // Define question groups for each subscale
  const walkingStandingQuestions = extractQuestions(moxfqSection, [
    'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'
  ])

  const painQuestions = extractQuestions(moxfqSection, [
    'q9', 'q11', 'q12', 'q15'
  ])

  const socialInteractionQuestions = extractQuestions(moxfqSection, [
    'q10', 'q13', 'q14', 'q16'
  ])

  // Calculate subscale scores (max score per question is 4)
  const walkingStandingScore = calculateSubscaleScore(
    'Walking & Standing',
    walkingStandingQuestions,
    4,
    { description: 'Assesses difficulties in walking and standing.' }
  )

  const painScore = calculateSubscaleScore(
    'Pain',
    painQuestions,
    4,
    { description: 'Evaluates pain levels and impact.' }
  )

  const socialInteractionScore = calculateSubscaleScore(
    'Social Interaction',
    socialInteractionQuestions,
    4,
    { description: 'Measures social engagement and interaction.' }
  )

  // Calculate total score from all subscales
  const totalScore = calculateTotalScore(
    [walkingStandingScore, painScore, socialInteractionScore],
    'Total'
  )

  return {
    rawFormData: { moxfq: moxfqSection },
    subscales: {
      walkingStanding: walkingStandingScore,
      pain: painScore,
      socialInteraction: socialInteractionScore
    },
    totalScore: totalScore
  }
}

/**
 * Validate MOXFQ form data
 * All answers must be in range 0-4, or null (unanswered)
 */
export function validateFormData(data: FormData): boolean {
  const moxfqSection = data.moxfq || {}
  
  const questionKeys = [
    'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8',
    'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16'
  ]

  for (const key of questionKeys) {
    const value = moxfqSection[key]
    
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
 * Get initial/empty MOXFQ form data
 */
export function getInitialData(): FormData {
  const questions: Record<string, null> = {}
  
  for (let i = 1; i <= 16; i++) {
    questions[`q${i}`] = null  }

  return {
    moxfq: questions
  }
}

/**
 * Generate mock MOXFQ data for testing
 */
export function generateMockData(): FormData {
  return {
    moxfq: {
      q1: 2,
      q2: 1,
      q3: 2,
      q4: 1,
      q5: 2,
      q6: 1,
      q7: 2,
      q8: 1,
      q9: 2,
      q10: 1,
      q11: 2,
      q12: 1,
      q13: 2,
      q14: 1,
      q15: 2,
      q16: 1
    }
  }
}
