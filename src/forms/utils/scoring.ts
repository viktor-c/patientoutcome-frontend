/**
 * Shared Scoring Utilities
 * 
 * Common functions for calculating scores across different forms.
 * These utilities can be imported by both frontend and backend.
 */

import type { SubscaleScore, ScoringData } from '@/types/backend/scoring'

/**
 * Calculate a subscale score from question answers
 * 
 * @param questions Object with question IDs as keys and answers as values
 * @param maxScore Maximum possible score per question
 * @param options Additional options
 * @returns Calculated subscale score
 */
export function calculateSubscaleScore(
  name: string,
  questions: Record<string, number | null>,
  maxScore: number,
  options: {
    description?: string
    reverseScale?: boolean
    minScore?: number
  } = {}
): SubscaleScore {
  const { description, reverseScale = false } = options

  const questionKeys = Object.keys(questions)
  const totalQuestions = questionKeys.length
  
  let answeredQuestions = 0
  let rawScore = 0

  for (const key of questionKeys) {
    const value = questions[key]
    if (value !== null && value !== undefined) {
      answeredQuestions++
      // Apply scale reversal if needed
      const scoreValue = reverseScale ? (maxScore - value) : value
      rawScore += scoreValue
    }
  }

  const maxPossibleScore = totalQuestions * maxScore
  const completionPercentage = totalQuestions > 0 
    ? (answeredQuestions / totalQuestions) * 100 
    : 0
  const isComplete = answeredQuestions === totalQuestions

  // Normalize to 0-100 scale
  const normalizedScore = maxPossibleScore > 0 
    ? (rawScore / maxPossibleScore) * 100 
    : 0

  return {
    name,
    description: description || null,
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100, // Round to 2 decimals
    maxPossibleScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage: Math.round(completionPercentage * 100) / 100,
    isComplete
  }
}

/**
 * Calculate total score from multiple subscales
 * 
 * @param subscales Array of subscale scores
 * @param name Name for the total score
 * @returns Total score
 */
export function calculateTotalScore(
  subscales: SubscaleScore[],
  name: string = 'Total'
): SubscaleScore {
  let totalRawScore = 0
  let totalMaxScore = 0
  let totalAnswered = 0
  let totalQuestions = 0

  for (const subscale of subscales) {
    totalRawScore += subscale.rawScore
    totalMaxScore += subscale.maxPossibleScore
    totalAnswered += subscale.answeredQuestions
    totalQuestions += subscale.totalQuestions
  }

  const completionPercentage = totalQuestions > 0 
    ? (totalAnswered / totalQuestions) * 100 
    : 0
  const isComplete = totalAnswered === totalQuestions

  const normalizedScore = totalMaxScore > 0 
    ? (totalRawScore / totalMaxScore) * 100 
    : 0

  return {
    name,
    description: null,
    rawScore: totalRawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxPossibleScore: totalMaxScore,
    answeredQuestions: totalAnswered,
    totalQuestions,
    completionPercentage: Math.round(completionPercentage * 100) / 100,
    isComplete
  }
}

/**
 * Extract questions for a specific subscale from form data
 * 
 * @param section Form data section
 * @param questionKeys Array of question keys to extract
 * @returns Filtered questions object
 */
export function extractQuestions(
  section: Record<string, number | string | null> | undefined,
  questionKeys: string[]
): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  
  if (!section) {
    // Return null for all questions if section doesn't exist
    for (const key of questionKeys) {
      result[key] = null
    }
    return result
  }

  for (const key of questionKeys) {
    const value = section[key]
    // Convert to number or null
    result[key] = typeof value === 'number' ? value : null
  }

  return result
}

/**
 * Create an empty scoring data structure
 */
export function createEmptyScoring(): ScoringData {
  return {
    rawData: {},
    subscales: {},
    total: null
  }
}

/**
 * Validate that a value is within expected range
 */
export function isValidScore(value: number | null, min: number, max: number): boolean {
  if (value === null || value === undefined) return true // Null is valid (unanswered)
  return value >= min && value <= max
}

/**
 * Get completion status based on scoring data
 */
export function getFormCompletionStatus(scoring: ScoringData | null): 'draft' | 'incomplete' | 'completed' {
  if (!scoring || !scoring.total) {
    return 'draft'
  }

  if (scoring.total.isComplete) {
    return 'completed'
  }

  if (scoring.total.answeredQuestions > 0) {
    return 'incomplete'
  }

  return 'draft'
}
