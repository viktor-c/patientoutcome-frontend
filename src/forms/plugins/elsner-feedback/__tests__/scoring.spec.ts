import { describe, expect, it } from 'vitest'
import { calculatePostoperativeWeekFromSurgeryDate, normalizePoints, serializePoints } from '../scoring'

describe('elsner-feedback scoring helpers', () => {
  it('serializes and parses point arrays', () => {
    const points = [
      { week: 8, expectation: 70 },
      { week: 1, expectation: 30 },
      { week: 12, expectation: 125 },
    ]

    const serialized = serializePoints(points)
    const parsed = normalizePoints(serialized)

    expect(parsed).toEqual([
      { week: 8, expectation: 70 },
      { week: 1, expectation: 30 },
      { week: 12, expectation: 125 },
    ])
  })

  it('returns empty list for invalid json payload', () => {
    expect(normalizePoints('{bad-json')).toEqual([])
  })

  it('clamps out-of-range values when parsing points', () => {
    const parsed = normalizePoints([
      { week: -1, expectation: -10 },
      { week: 3.6, expectation: 200 },
    ])

    expect(parsed).toEqual([
      { week: 0, expectation: 0 },
      { week: 4, expectation: 140 },
    ])
  })

  it('calculates postoperative week from surgery date', () => {
    const week = calculatePostoperativeWeekFromSurgeryDate(
      '2026-04-01T00:00:00.000Z',
      new Date('2026-04-29T00:00:00.000Z')
    )

    expect(week).toBe(5)
  })

  it('returns null for invalid surgery dates', () => {
    expect(calculatePostoperativeWeekFromSurgeryDate('not-a-date')).toBeNull()
  })
})
