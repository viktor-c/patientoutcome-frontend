import { describe, expect, it } from 'vitest'
import { shouldShowElsnerTrendLine } from '../utils'

describe('shouldShowElsnerTrendLine', () => {
  it('returns true for authenticated non-kiosk users', () => {
    expect(shouldShowElsnerTrendLine(true, false)).toBe(true)
  })

  it('returns false for kiosk users', () => {
    expect(shouldShowElsnerTrendLine(true, true)).toBe(false)
  })

  it('returns false for unauthenticated users', () => {
    expect(shouldShowElsnerTrendLine(false, false)).toBe(false)
  })
})
