import { describe, it, expect } from 'vitest'

// Mock EFAS scoring calculation - extracted from EfasQuestionSliderControlRenderer.vue
interface SubscaleScore {
  name: string
  isComplete: boolean
  completionPercentage: number
  answeredQuestions: number
  totalQuestions: number
  rawScore: number
  normalizedScore: number
  maxPossibleScore: number
}

interface ScoringData {
  rawData: Record<string, Record<string, number>>
  subscales: Record<string, SubscaleScore>
  total: SubscaleScore
}

function calculateEfasScore(
  data: Record<string, unknown>,
  standardQuestionKeys: string[],
  sportQuestionKeys: string[]
): ScoringData {
  // Calculate standard subscale
  const standardAnswers = standardQuestionKeys
    .map(key => (data['standardfragebogen'] as Record<string, unknown>)?.[key] as number)
    .filter(v => v !== null && v !== undefined)

  const standardComplete = standardAnswers.length === standardQuestionKeys.length
  const standardRawScore = standardAnswers.reduce((sum, v) => sum + v, 0)
  const standardMaxScore = standardQuestionKeys.length * 5 // 0-5 scale
  const standardNormalized = standardMaxScore > 0 ? (standardRawScore / standardMaxScore) * 100 : 0

  // Calculate sport subscale
  const sportAnswers = sportQuestionKeys
    .map(key => (data['sportfragebogen'] as Record<string, unknown>)?.[key] as number)
    .filter(v => v !== null && v !== undefined)

  const sportComplete = sportAnswers.length === sportQuestionKeys.length
  const sportRawScore = sportAnswers.reduce((sum, v) => sum + v, 0)
  const sportMaxScore = sportQuestionKeys.length * 5 // 0-5 scale
  const sportNormalized = sportMaxScore > 0 ? (sportRawScore / sportMaxScore) * 100 : 0

  // Total metrics
  const totalAnswered = standardAnswers.length + sportAnswers.length
  const totalQuestions = standardQuestionKeys.length + sportQuestionKeys.length
  const completionPercentage = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0
  const isComplete = completionPercentage === 100
  const totalRawScore = standardRawScore + sportRawScore
  const totalMaxScore = standardMaxScore + sportMaxScore
  const totalNormalized = totalMaxScore > 0 ? (totalRawScore / totalMaxScore) * 100 : 0

  return {
    rawData: data as Record<string, Record<string, number>>,
    subscales: {
      standardfragebogen: {
        name: 'Standard',
        isComplete: standardComplete,
        completionPercentage: standardQuestionKeys.length > 0
          ? Math.round((standardAnswers.length / standardQuestionKeys.length) * 100)
          : 0,
        answeredQuestions: standardAnswers.length,
        totalQuestions: standardQuestionKeys.length,
        rawScore: standardRawScore,
        normalizedScore: Math.round(standardNormalized),
        maxPossibleScore: standardMaxScore
      },
      sportfragebogen: {
        name: 'Sport',
        isComplete: sportComplete,
        completionPercentage: sportQuestionKeys.length > 0
          ? Math.round((sportAnswers.length / sportQuestionKeys.length) * 100)
          : 0,
        answeredQuestions: sportAnswers.length,
        totalQuestions: sportQuestionKeys.length,
        rawScore: sportRawScore,
        normalizedScore: Math.round(sportNormalized),
        maxPossibleScore: sportMaxScore
      }
    },
    total: {
      name: 'Total',
      isComplete,
      completionPercentage: Math.round(completionPercentage),
      answeredQuestions: totalAnswered,
      totalQuestions,
      rawScore: totalRawScore,
      normalizedScore: Math.round(totalNormalized),
      maxPossibleScore: totalMaxScore
    }
  }
}

describe('EFAS Scoring Calculations', () => {
  const standardKeys = ['q1', 'q2', 'q3', 'q4', 'q5']
  const sportKeys = ['s1', 's2', 's3']

  it('should calculate correct score for complete questionnaire', () => {
    const data = {
      standardfragebogen: { q1: 3, q2: 4, q3: 2, q4: 5, q5: 1 },
      sportfragebogen: { s1: 2, s2: 3, s3: 4 }
    }

    const result = calculateEfasScore(data, standardKeys, sportKeys)

    expect(result.total.isComplete).toBe(true)
    expect(result.total.answeredQuestions).toBe(8)
    expect(result.total.completionPercentage).toBe(100)
    expect(result.subscales.standardfragebogen.isComplete).toBe(true)
    expect(result.subscales.sportfragebogen.isComplete).toBe(true)
  })

  it('should calculate normalized scores correctly (0-5 scale)', () => {
    const data = {
      standardfragebogen: { q1: 5, q2: 5, q3: 5, q4: 5, q5: 5 },  // Max score
      sportfragebogen: { s1: 0, s2: 0, s3: 0 }  // Min score
    }

    const result = calculateEfasScore(data, standardKeys, sportKeys)

    // Standard: 25/25 = 100%
    expect(result.subscales.standardfragebogen.normalizedScore).toBe(100)
    expect(result.subscales.standardfragebogen.rawScore).toBe(25)

    // Sport: 0/15 = 0%
    expect(result.subscales.sportfragebogen.normalizedScore).toBe(0)
    expect(result.subscales.sportfragebogen.rawScore).toBe(0)
  })

  it('should handle partial completion', () => {
    const data = {
      standardfragebogen: { q1: 3, q2: 4, q3: null },  // 2/5 answered
      sportfragebogen: { s1: 2 }  // 1/3 answered
    }

    const result = calculateEfasScore(data, standardKeys, sportKeys)

    expect(result.subscales.standardfragebogen.answeredQuestions).toBe(2)
    expect(result.subscales.standardfragebogen.completionPercentage).toBe(40)
    expect(result.subscales.standardfragebogen.isComplete).toBe(false)

    expect(result.subscales.sportfragebogen.answeredQuestions).toBe(1)
    expect(result.subscales.sportfragebogen.completionPercentage).toBe(33)  // Rounded
    expect(result.subscales.sportfragebogen.isComplete).toBe(false)

    expect(result.total.isComplete).toBe(false)
    expect(result.total.answeredQuestions).toBe(3)
  })

  it('should handle all null/undefined values', () => {
    const data = {
      standardfragebogen: { q1: null, q2: null, q3: null, q4: null, q5: null },
      sportfragebogen: { s1: null, s2: null, s3: null }
    }

    const result = calculateEfasScore(data, standardKeys, sportKeys)

    expect(result.total.answeredQuestions).toBe(0)
    expect(result.total.rawScore).toBe(0)
    expect(result.total.normalizedScore).toBe(0)
    expect(result.total.isComplete).toBe(false)
  })

  it('should calculate correct total score combining both subscales', () => {
    const data = {
      standardfragebogen: { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2 },  // 10/25
      sportfragebogen: { s1: 3, s2: 3, s3: 3 }  // 9/15
    }

    const result = calculateEfasScore(data, standardKeys, sportKeys)

    // Total: 19/40 = 47.5%, rounded to 48%
    expect(result.total.rawScore).toBe(19)
    expect(result.total.maxPossibleScore).toBe(40)
    expect(result.total.normalizedScore).toBe(48)
  })

  it('should handle missing sections', () => {
    const data = {
      standardfragebogen: { q1: 3, q2: 4, q3: 2, q4: 5, q5: 1 }
      // No sportfragebogen section
    }

    const result = calculateEfasScore(data, standardKeys, sportKeys)

    expect(result.subscales.standardfragebogen.isComplete).toBe(true)
    expect(result.subscales.sportfragebogen.answeredQuestions).toBe(0)
    expect(result.subscales.sportfragebogen.normalizedScore).toBe(0)
    expect(result.total.isComplete).toBe(false)
  })

  it('should round normalized scores to whole numbers', () => {
    const data = {
      standardfragebogen: { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 },  // 5/25 = 20%
      sportfragebogen: { s1: 2, s2: 2, s3: 2 }  // 6/15 = 40%
    }

    const result = calculateEfasScore(data, standardKeys, sportKeys)

    expect(result.subscales.standardfragebogen.normalizedScore).toBe(20)
    expect(result.subscales.sportfragebogen.normalizedScore).toBe(40)
    // Total: 11/40 = 27.5%, should round to 28
    expect(result.total.normalizedScore).toBe(28)
  })

  it('should handle zero values correctly (not same as null)', () => {
    const data = {
      standardfragebogen: { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 },
      sportfragebogen: { s1: 0, s2: 0, s3: 0 }
    }

    const result = calculateEfasScore(data, standardKeys, sportKeys)

    // Zero is a valid answer, all questions are answered
    expect(result.total.answeredQuestions).toBe(8)
    expect(result.total.isComplete).toBe(true)
    expect(result.total.rawScore).toBe(0)
    expect(result.total.normalizedScore).toBe(0)
  })
})
