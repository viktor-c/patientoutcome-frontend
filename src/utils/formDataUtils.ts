// shared helpers for form data utilities
import type { FormSubmissionData } from '@/forms/types'
import type { ApiPatientFormData } from '@/types'

/**
 * Bridge to the API type for patient form data. Using a shared helper
 * ensures that when the underlying API type name changes we only need
 * to update this file, not every consumer.
 */
export function toApiPatientFormData(
  data: FormSubmissionData
): ApiPatientFormData {
  return data as unknown as ApiPatientFormData
}

/**
 * Attempts to extract an object ID from a value that may contain either
 * `id` or `_id` fields. Returns `null` if none found or value is not object.
 *
 * Note: original callers expected either string or empty; adapt as needed.
 */
export function extractObjectId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { id?: unknown; _id?: unknown }

  if (typeof candidate.id === 'string' && candidate.id) return candidate.id
  if (typeof candidate._id === 'string' && candidate._id) return candidate._id

  return null
}
