/**
 * VISA-A Scoring Logic
 * 
 * Victorian Institute of Sports Assessment - Achilles
 * This scoring implementation matches the backend plugin.
 * 
 * Total score: 0-100 points (higher is better)
 * - Symptoms (q1-q3): 30 points max
 * - Daily Function (q4): 10 points max
 * - Sport Function (q5-q6): 20 points max
 * - Activity (q7-q8): 40 points max
 * 
 * Special scoring rules:
 * - q1: Maps 0-100 minutes to 10-0 points (reversed)
 * - q2-q6: Direct 0-10 scoring (UI shows reversed labels but stores normal values)
 * - q7: Enum (0, 4, 7, 10 points)
 * - q8: Conditional (q8a/q8b/q8c), 0-30 mins with different point mappings
 */

import type { FormData } from '../../types'
import type { ScoringData, SubscaleScore } from '@/types/backend/scoring'
import type { ScaleInfo } from '@/utils/scaleInfo'

/**
 * Map Q1 slider value (0-100 minutes) to points (10-0)
 * Higher stiffness duration = lower score
 */
function mapQ1Score(minutes: number): number {
  // Linear mapping: 0 min = 10 points, 100 min = 0 points
  // Formula: 10 - (minutes / 10)
  const points = Math.max(0, Math.min(10, 10 - Math.floor(minutes / 10)))
  return points
}

/**
 * Map Q8a slider value (0-30 minutes) to points
 * Training with NO pain
 */
function mapQ8aScore(minutes: number): number {
  if (minutes === 0) return 0
  if (minutes >= 1 && minutes <= 10) return 7
  if (minutes >= 11 && minutes <= 20) return 14
  if (minutes >= 21 && minutes <= 30) return 21
  if (minutes > 30) return 30
  return 0
}

/**
 * Map Q8b slider value (0-30 minutes) to points
 * Training with pain but does NOT stop
 */
function mapQ8bScore(minutes: number): number {
  if (minutes === 0) return 0
  if (minutes >= 1 && minutes <= 10) return 4
  if (minutes >= 11 && minutes <= 20) return 10
  if (minutes >= 21 && minutes <= 30) return 14
  if (minutes > 30) return 20
  return 0
}

/**
 * Map Q8c slider value (0-30 minutes) to points
 * Training with pain that stops activity
 */
function mapQ8cScore(minutes: number): number {
  if (minutes === 0) return 0
  if (minutes >= 1 && minutes <= 10) return 2
  if (minutes >= 11 && minutes <= 20) return 5
  if (minutes >= 21 && minutes <= 30) return 7
  if (minutes > 30) return 10
  return 0
}

/**
 * Helper to calculate subscale score
 */
function calculateSubscaleScore(
  name: string,
  description: string,
  rawScore: number,
  maxScore: number,
  answeredQuestions: number,
  totalQuestions: number
): SubscaleScore {
  const completionRate = answeredQuestions / totalQuestions
  const normalizedScore = (rawScore / maxScore) * 100

  return {
    name,
    description,
    rawScore,
    normalizedScore: Math.round(normalizedScore * 100) / 100,
    maxScore: maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage: Math.round(completionRate * 100),
    isComplete: completionRate === 1
  }
}

/**
 * Calculate VISA-A score from form data
 */
export function calculateScore(data: FormData): ScoringData {
  const visaaSection = data.visaa || {}

  // Extract and score each question
  // Q1: Stiffness (0-100 mins → 10-0 points)
  const q1Value = visaaSection.q1
  const q1Score = q1Value !== null && q1Value !== undefined ? mapQ1Score(q1Value as number) : null

  // Q2-Q6: Pain/function scales (0-10, direct scoring - NO reversal)
  // The UI shows reversed labels but stores normal values (0=bad, 10=good)
  const q2Value = visaaSection.q2
  const q2Score = q2Value !== null && q2Value !== undefined ? (q2Value as number) : null

  const q3Value = visaaSection.q3
  const q3Score = q3Value !== null && q3Value !== undefined ? (q3Value as number) : null

  const q4Value = visaaSection.q4
  const q4Score = q4Value !== null && q4Value !== undefined ? (q4Value as number) : null

  const q5Value = visaaSection.q5
  const q5Score = q5Value !== null && q5Value !== undefined ? (q5Value as number) : null

  // Q6: Direct 0-10 scale (no reversal)
  const q6Value = visaaSection.q6
  const q6Score = q6Value !== null && q6Value !== undefined ? (q6Value as number) : null

  // Q7: Enum (0, 4, 7, 10)
  const q7Value = visaaSection.q7
  const q7Score = q7Value !== null && q7Value !== undefined ? (q7Value as number) : null

  // Q8: Conditional based on q8_type
  let q8Score: number | null = null
  const q8Type = visaaSection.q8_type as string | undefined

  if (q8Type === 'no_pain' && visaaSection.q8a !== null && visaaSection.q8a !== undefined) {
    q8Score = mapQ8aScore(visaaSection.q8a as number)
  } else if (q8Type === 'pain_no_stop' && visaaSection.q8b !== null && visaaSection.q8b !== undefined) {
    q8Score = mapQ8bScore(visaaSection.q8b as number)
  } else if (q8Type === 'pain_stop' && visaaSection.q8c !== null && visaaSection.q8c !== undefined) {
    q8Score = mapQ8cScore(visaaSection.q8c as number)
  }

  // Calculate subscales
  // Symptoms: Q1 + Q2 + Q3 (max 30 points)
  const symptomsScores = [q1Score, q2Score, q3Score].filter((s): s is number => s !== null)
  const symptomsScore = symptomsScores.length > 0
    ? calculateSubscaleScore(
        'Symptoms',
        'Achilles tendon pain and stiffness',
        symptomsScores.reduce((sum, s) => sum + s, 0),
        30,
        symptomsScores.length,
        3
      )
    : null

  // Daily Function: Q4 (max 10 points)
  const dailyFunctionScore = q4Score !== null
    ? calculateSubscaleScore(
        'Daily Function',
        'Walking downstairs with normal gait',
        q4Score,
        10,
        1,
        1
      )
    : null

  // Sport Function: Q5 + Q6 (max 20 points)
  const sportScores = [q5Score, q6Score].filter((s): s is number => s !== null)
  const sportFunctionScore = sportScores.length > 0
    ? calculateSubscaleScore(
        'Sport Function',
        'Sport-specific functional tests',
        sportScores.reduce((sum, s) => sum + s, 0),
        20,
        sportScores.length,
        2
      )
    : null

  // Activity: Q7 + Q8 (max 40 points)
  const activityScores = [q7Score, q8Score].filter((s): s is number => s !== null)
  const activityScore = activityScores.length > 0
    ? calculateSubscaleScore(
        'Activity',
        'Physical activity and sport participation',
        activityScores.reduce((sum, s) => sum + s, 0),
        40,
        activityScores.length,
        2
      )
    : null

  // Calculate total score
  const allScores = [q1Score, q2Score, q3Score, q4Score, q5Score, q6Score, q7Score, q8Score]
  const validScores = allScores.filter((s): s is number => s !== null)
  const totalRawScore = validScores.reduce((sum, s) => sum + s, 0)
  const totalQuestions = 8 // Always 8 questions total (q8 variants count as one)

  const totalAnswered = validScores.length
  const totalScore: SubscaleScore = {
    name: 'Total VISA-A Score',
    description: 'Overall Achilles tendon pain and function assessment (0-100, higher is better)',
    rawScore: totalRawScore,
    normalizedScore: totalAnswered === totalQuestions ? totalRawScore : 0,
    maxScore: 100,
    answeredQuestions: totalAnswered,
    totalQuestions,
    completionPercentage: Math.round((totalAnswered / totalQuestions) * 100),
    isComplete: totalAnswered === totalQuestions
  }

  return {
    rawFormData: data,
    subscales: {
      symptoms: symptomsScore,
      dailyFunction: dailyFunctionScore,
      sportFunction: sportFunctionScore,
      activity: activityScore
    },
    totalScore: totalScore
  }
}

/**
 * Validate VISA-A form data
 */
export function validateFormData(data: FormData): boolean {
  const visaaSection = data.visaa || {}

  // Q1: 0-100 range
  const q1 = visaaSection.q1
  if (q1 !== null && q1 !== undefined) {
    if (typeof q1 !== 'number' || q1 < 0 || q1 > 100) return false
  }

  // Q2-Q6: 0-10 range
  const standardQuestions = ['q2', 'q3', 'q4', 'q5', 'q6']
  for (const key of standardQuestions) {
    const value = visaaSection[key]
    if (value !== null && value !== undefined) {
      if (typeof value !== 'number' || value < 0 || value > 10) return false
    }
  }

  // Q7: Must be one of the enum values (0, 4, 7, 10)
  const q7 = visaaSection.q7
  if (q7 !== null && q7 !== undefined) {
    if (![0, 4, 7, 10].includes(q7 as number)) return false
  }

  // Q8_type: Must be one of the valid types
  const q8Type = visaaSection.q8_type
  if (q8Type !== null && q8Type !== undefined) {
    if (!['no_pain', 'pain_no_stop', 'pain_stop'].includes(q8Type as string)) return false
  }

  // Q8 variants: 0-30 range (or null/undefined)
  const q8Variants = ['q8a', 'q8b', 'q8c']
  for (const key of q8Variants) {
    const value = visaaSection[key]
    if (value !== null && value !== undefined) {
      if (typeof value !== 'number' || value < 0 || value > 30) return false
    }
  }

  return true
}

/**
 * Get initial/empty VISA-A form data
 */
export function getInitialData(): FormData {
  return {
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
}

/**
 * Generate mock VISA-A data for testing
 */
export function generateMockData(): FormData {
  return {
    visaa: {
      q1: 20,  // 20 minutes stiffness → 8 points
      q2: 8,   // 8 points (pain when walking)
      q3: 7,   // 7 points (pain after 30min walk)
      q4: 8,   // 8 points (pain downstairs)
      q5: 7,   // 7 points (pain heel raises)
      q6: 8,   // 8 points (single leg hops)
      q7: 7,   // 7 points (sport participation)
      q8_type: 'pain_no_stop',
      q8a: null,
      q8b: 15, // 11-20 mins with pain → 10 points
      q8c: null
    }
  }
}

/**
 * Get scale information for VISA-A scores
 * VISA-A: 0-100 scale, higher is better
 */
export function getScaleInfo(score: SubscaleScore, subscaleKey?: string): ScaleInfo {
  const rawScore = score.rawScore ?? 0
  const maxScore = score.maxScore ?? 100
  
  // Calculate normalized value for positioning (0-100 scale)
  const normalizedValue = maxScore > 0 ? (rawScore / maxScore) * 100 : 0

  // Customize labels based on subscale
  let goodLabel = 'Excellent'
  let badLabel = 'Poor'
  
  if (subscaleKey === 'symptoms') {
    goodLabel = 'No symptoms'
    badLabel = 'Severe symptoms'
  } else if (subscaleKey === 'dailyFunction') {
    goodLabel = 'No limitation'
    badLabel = 'Severe limitation'
  } else if (subscaleKey === 'sportFunction') {
    goodLabel = 'Full function'
    badLabel = 'No function'
  } else if (subscaleKey === 'activity') {
    goodLabel = 'Full activity'
    badLabel = 'No activity'
  }

  return {
    min: 0,
    max: maxScore,
    normalizedValue: Math.round(normalizedValue * 100) / 100,
    polarity: 'higher-is-better',
    goodLabel,
    badLabel
  }
}
