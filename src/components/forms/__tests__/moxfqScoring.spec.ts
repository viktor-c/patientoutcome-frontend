import { describe, it, expect } from 'vitest'

// Mock scoring calculation function - extracted from MoxfqTableRenderer.vue
interface SubscaleScore {
  name: string
  description?: string
  rawScore: number
  normalizedScore: number
  maxPossibleScore: number
  answeredQuestions: number
  totalQuestions: number
  completionPercentage: number
  isComplete: boolean
}

interface ScoringData {
  rawData: Record<string, number | null>
  subscales: Record<string, SubscaleScore | null>
  total: SubscaleScore | null
}

function calculateMoxfqScore(data: Record<string, number | null>): ScoringData {
  const subscales = {
    walkingStanding: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
    pain: ['q9', 'q11', 'q12', 'q15'],
    socialInteraction: ['q10', 'q13', 'q14', 'q16']
  }

  const calculateSubscaleScore = (
    questionKeys: string[],
    subscaleName: string,
    subscaleDescription: string
  ): SubscaleScore | null => {
    const validAnswers = questionKeys
      .map(key => data[key])
      .filter(value => value !== null && value !== undefined) as number[]

    if (validAnswers.length === 0) return null

    const rawScore = validAnswers.reduce((sum, value) => sum + value, 0)
    const maxPossibleScore = questionKeys.length * 4
    const completionRate = validAnswers.length / questionKeys.length
    const normalizedScore = (rawScore / maxPossibleScore) * 100

    return {
      name: subscaleName,
      description: subscaleDescription,
      rawScore,
      normalizedScore: Math.round(normalizedScore * 10) / 10,
      maxPossibleScore,
      answeredQuestions: validAnswers.length,
      totalQuestions: questionKeys.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1
    }
  }

  const walkingStandingScore = calculateSubscaleScore(
    subscales.walkingStanding,
    "Walking & Standing",
    "Assesses difficulties in walking and standing."
  )
  const painScore = calculateSubscaleScore(subscales.pain, "Pain", "Evaluates pain levels and impact.")
  const socialInteractionScore = calculateSubscaleScore(
    subscales.socialInteraction,
    "Social Interaction",
    "Measures social engagement and interaction."
  )

  const allQuestions = [...subscales.walkingStanding, ...subscales.pain, ...subscales.socialInteraction]
  const totalScore = calculateSubscaleScore(allQuestions, "Total", "Measures overall health status.")

  return {
    rawData: data,
    subscales: {
      walkingStanding: walkingStandingScore,
      pain: painScore,
      socialInteraction: socialInteractionScore,
    },
    total: totalScore
  }
}

describe('MOXFQ Scoring Calculations', () => {
  it('should calculate correct score for complete questionnaire', () => {
    const data: Record<string, number | null> = {
      q1: 2, q2: 1, q3: 3, q4: 2, q5: 1, q6: 2, q7: 3, q8: 2,  // Walking & Standing
      q9: 3, q11: 2, q12: 1, q15: 4,  // Pain
      q10: 2, q13: 1, q14: 2, q16: 3  // Social Interaction
    }

    const result = calculateMoxfqScore(data)

    expect(result.total).toBeTruthy()
    expect(result.total!.isComplete).toBe(true)
    expect(result.total!.answeredQuestions).toBe(16)
    expect(result.total!.totalQuestions).toBe(16)
    expect(result.total!.completionPercentage).toBe(100)
  })

  it('should calculate correct subscale scores', () => {
    const data: Record<string, number | null> = {
      q1: 4, q2: 4, q3: 4, q4: 4, q5: 4, q6: 4, q7: 4, q8: 4,  // All max for walking
      q9: 0, q11: 0, q12: 0, q15: 0,  // All zero for pain
      q10: 2, q13: 2, q14: 2, q16: 2  // Half for social
    }

    const result = calculateMoxfqScore(data)

    // Walking & Standing: 32/32 = 100%
    expect(result.subscales.walkingStanding!.normalizedScore).toBe(100)
    expect(result.subscales.walkingStanding!.rawScore).toBe(32)

    // Pain: 0/16 = 0%
    expect(result.subscales.pain!.normalizedScore).toBe(0)
    expect(result.subscales.pain!.rawScore).toBe(0)

    // Social: 8/16 = 50%
    expect(result.subscales.socialInteraction!.normalizedScore).toBe(50)
    expect(result.subscales.socialInteraction!.rawScore).toBe(8)
  })

  it('should handle partial completion', () => {
    const data: Record<string, number | null> = {
      q1: 2, q2: null, q3: 3, q4: null, q5: 1, q6: null, q7: null, q8: 2,
      q9: 3, q11: null, q12: null, q15: null,
      q10: null, q13: null, q14: null, q16: null
    }

    const result = calculateMoxfqScore(data)

    expect(result.subscales.walkingStanding!.answeredQuestions).toBe(4)
    expect(result.subscales.walkingStanding!.totalQuestions).toBe(8)
    expect(result.subscales.walkingStanding!.isComplete).toBe(false)

    expect(result.subscales.pain!.answeredQuestions).toBe(1)
    expect(result.subscales.pain!.isComplete).toBe(false)

    // Social interaction should be null (no answered questions)
    expect(result.subscales.socialInteraction).toBeNull()
  })

  it('should return null for subscale with no answers', () => {
    const data: Record<string, number | null> = {
      q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: null, q8: null,
      q9: null, q11: null, q12: null, q15: null,
      q10: null, q13: null, q14: null, q16: null
    }

    const result = calculateMoxfqScore(data)

    expect(result.subscales.walkingStanding).toBeNull()
    expect(result.subscales.pain).toBeNull()
    expect(result.subscales.socialInteraction).toBeNull()
    expect(result.total).toBeNull()
  })

  it('should calculate normalized score correctly', () => {
    // Half score should be 50%
    const data: Record<string, number | null> = {
      q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 2, q7: 2, q8: 2,
      q9: 2, q11: 2, q12: 2, q15: 2,
      q10: 2, q13: 2, q14: 2, q16: 2
    }

    const result = calculateMoxfqScore(data)

    // Each question answered with 2 out of max 4 = 50%
    expect(result.total!.normalizedScore).toBe(50)
    expect(result.subscales.walkingStanding!.normalizedScore).toBe(50)
    expect(result.subscales.pain!.normalizedScore).toBe(50)
    expect(result.subscales.socialInteraction!.normalizedScore).toBe(50)
  })

  it('should round normalized score to 1 decimal place', () => {
    const data: Record<string, number | null> = {
      q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1, q7: 1, q8: 1,
      q9: 1, q11: 1, q12: 1, q15: 1,
      q10: 1, q13: 1, q14: 1, q16: 1
    }

    const result = calculateMoxfqScore(data)

    // 1 out of 4 = 25%
    expect(result.total!.normalizedScore).toBe(25)
    // Should be a number with at most 1 decimal place
    expect(result.total!.normalizedScore.toString()).toMatch(/^\d+(\.\d)?$/)
  })

  it('should correctly identify completion percentage', () => {
    const data: Record<string, number | null> = {
      q1: 2, q2: 2, q3: 2, q4: 2, q5: null, q6: null, q7: null, q8: null,  // 50% walking
      q9: 3, q11: null, q12: null, q15: null,  // 25% pain
      q10: 2, q13: 2, q14: 2, q16: 2  // 100% social
    }

    const result = calculateMoxfqScore(data)

    expect(result.subscales.walkingStanding!.completionPercentage).toBe(50)
    expect(result.subscales.pain!.completionPercentage).toBe(25)
    expect(result.subscales.socialInteraction!.completionPercentage).toBe(100)
    expect(result.subscales.socialInteraction!.isComplete).toBe(true)
  })
})
