import type { ElsnerPoint } from '@/components/forms/ElsnerFeedbackChart.vue'

export const ELSNER_FEEDBACK_TEMPLATE_ID = '67b4e612d0feb4ad99ae2e8b'

export function isElsnerFeedbackTemplateId(formTemplateId: unknown): boolean {
  return formTemplateId != null && String(formTemplateId) === ELSNER_FEEDBACK_TEMPLATE_ID
}

export function parseElsnerFeedbackPoints(rawFormData: unknown): ElsnerPoint[] {
  if (!rawFormData || typeof rawFormData !== 'object') return []

  const section = (rawFormData as Record<string, unknown>).elsnerFeedback
  if (!section || typeof section !== 'object') return []

  const rawPointsValue = (section as Record<string, unknown>).pointsJson
  if (typeof rawPointsValue !== 'string') return []

  let parsed: unknown
  try {
    parsed = JSON.parse(rawPointsValue)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const candidate = entry as Record<string, unknown>
      const week = typeof candidate.week === 'number' ? Math.max(0, Math.round(candidate.week)) : null
      const expectation =
        typeof candidate.expectation === 'number'
          ? Math.max(0, Math.min(140, Math.round(candidate.expectation)))
          : null

      if (week == null || expectation == null) return null
      return { week, expectation }
    })
    .filter((point): point is ElsnerPoint => point !== null)
    .sort((a, b) => a.week - b.week)
}
