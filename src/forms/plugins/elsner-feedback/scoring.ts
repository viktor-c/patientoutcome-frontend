import type { FormData } from '../../types'
import type { ScoringData, SubscaleScore } from '@/types/backend/scoring'

export type ElsnerFeedbackPoint = {
  week: number
  expectation: number
}

type ElsnerFeedbackSection = {
  currentWeek: number | null
  selectedExpectation: number | null
  pointsJson: string | null
}

const DEFAULT_SECTION: ElsnerFeedbackSection = {
  currentWeek: null,
  selectedExpectation: null,
  pointsJson: null,
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

export function normalizePoints(pointsValue: unknown): ElsnerFeedbackPoint[] {
  let parsed: unknown = pointsValue

  if (typeof pointsValue === 'string') {
    try {
      parsed = JSON.parse(pointsValue)
    } catch {
      return []
    }
  }

  if (!Array.isArray(parsed)) return []

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const candidate = entry as Record<string, unknown>
      const week = normalizeNumber(candidate.week)
      const expectation = normalizeNumber(candidate.expectation)
      if (week == null || expectation == null) return null
      return {
        week: Math.max(0, Math.round(week)),
        expectation: Math.max(0, Math.min(140, Math.round(expectation))),
      }
    })
    .filter((point): point is ElsnerFeedbackPoint => point !== null)
}

export function getSection(data: FormData): ElsnerFeedbackSection {
  const rawSection = (data.elsnerFeedback || {}) as Record<string, unknown>
  const currentWeek = normalizeNumber(rawSection.currentWeek)
  const selectedExpectation = normalizeNumber(rawSection.selectedExpectation)
  const pointsJson = typeof rawSection.pointsJson === 'string' ? rawSection.pointsJson : null

  return {
    currentWeek: currentWeek == null ? null : Math.max(0, Math.round(currentWeek)),
    selectedExpectation:
      selectedExpectation == null ? null : Math.max(0, Math.min(140, Math.round(selectedExpectation))),
    pointsJson,
  }
}

export function serializePoints(points: ElsnerFeedbackPoint[]): string {
  return JSON.stringify(points)
}

export function calculateScore(data: FormData): ScoringData {
  const section = getSection(data)

  return {
    rawFormData: {
      elsnerFeedback: section,
    },
    subscales: {},
    totalScore: null as SubscaleScore | null,
  }
}

export function validateFormData(data: FormData): boolean {
  const section = getSection(data)

  if (section.currentWeek != null && (section.currentWeek < 0 || section.currentWeek > 104)) {
    return false
  }

  if (
    section.selectedExpectation != null &&
    (section.selectedExpectation < 0 || section.selectedExpectation > 140)
  ) {
    return false
  }

  return true
}

export function getInitialData(): FormData {
  return {
    elsnerFeedback: { ...DEFAULT_SECTION },
  }
}

export function generateMockData(): FormData {
  return {
    elsnerFeedback: {
      currentWeek: 8,
      selectedExpectation: 70,
      pointsJson: JSON.stringify([
        { week: 1, expectation: 30 },
        { week: 6, expectation: 35 },
        { week: 8, expectation: 70 },
      ]),
    },
  }
}
