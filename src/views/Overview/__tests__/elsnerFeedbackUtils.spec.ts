import { describe, expect, it } from 'vitest'
import {
  ELSNER_FEEDBACK_TEMPLATE_ID,
  isElsnerFeedbackTemplateId,
  parseElsnerFeedbackPoints,
} from '../elsnerFeedbackUtils'

describe('elsnerFeedbackUtils', () => {
  it('identifies elsner-feedback template ids for consultation overview branching', () => {
    expect(isElsnerFeedbackTemplateId(ELSNER_FEEDBACK_TEMPLATE_ID)).toBe(true)
    expect(isElsnerFeedbackTemplateId('67b4e612d0feb4ad99ae2e86')).toBe(false)
  })

  it('parses and sorts points from serialized raw form data', () => {
    const result = parseElsnerFeedbackPoints({
      elsnerFeedback: {
        pointsJson: JSON.stringify([
          { week: 9, expectation: 85 },
          { week: 2, expectation: 35 },
          { week: 5, expectation: 60 },
        ]),
      },
    })

    expect(result).toEqual([
      { week: 2, expectation: 35 },
      { week: 5, expectation: 60 },
      { week: 9, expectation: 85 },
    ])
  })

  it('returns empty list for missing or malformed payloads', () => {
    expect(parseElsnerFeedbackPoints(null)).toEqual([])
    expect(parseElsnerFeedbackPoints({ elsnerFeedback: { pointsJson: '{broken' } })).toEqual([])
  })
})
