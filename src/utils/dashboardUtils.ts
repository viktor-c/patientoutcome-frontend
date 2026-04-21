/**
 * Pure helper functions for the Dashboard view.
 * Extracted here so they can be unit-tested independently of the Vue component.
 */

/** Extract patient-level external IDs (comma-separated) from a consultation item. */
export function getPatientExternalIds(item: unknown): string {
  if (!item || typeof item !== 'object') return ''
  const obj = item as Record<string, unknown>
  const pc = obj['patientCaseId'] as Record<string, unknown> | undefined
  const patient = pc?.['patient'] as Record<string, unknown> | undefined
  const ext = patient?.['externalPatientId'] as unknown
  if (!ext) return ''
  if (Array.isArray(ext)) return (ext as unknown[]).map(String).join(', ')
  return String(ext)
}

/** Return a comma-separated string of case-level external IDs from a consultation item. */
export function getPatientCaseExternalIds(item: unknown): string {
  const obj = item as Record<string, unknown>
  const pc = obj['patientCaseId'] as Record<string, unknown> | undefined
  const ext = pc?.['externalId'] as unknown
  if (!ext) return ''
  if (Array.isArray(ext)) return (ext as unknown[]).map(String).join(', ')
  return String(ext)
}

/** Extract access code and kiosk number from a consultation item. */
export function getAccessInfo(item: unknown): { code?: string; kioskNumber?: number } {
  if (!item || typeof item !== 'object') return {}
  const obj = item as Record<string, unknown>
  const result: { code?: string; kioskNumber?: number } = {}

  const formAccessCode = obj['formAccessCode'] as Record<string, unknown> | string | undefined
  if (formAccessCode) {
    if (typeof formAccessCode === 'string') {
      result.code = formAccessCode
    } else if (typeof formAccessCode === 'object' && 'code' in formAccessCode) {
      result.code = (formAccessCode as Record<string, unknown>).code as string
    }
  }

  const kioskId = obj['kioskId'] as Record<string, unknown> | undefined
  if (kioskId && 'postopWeek' in kioskId) {
    result.kioskNumber = kioskId.postopWeek as number
  }

  return result
}

/** Build an inline style object representing form completion ratio as a progress bar. */
export function getCompletionStyle(proms: unknown[]): Record<string, string> {
  if (!proms || proms.length === 0) return {}
  const completed = proms.filter((prom) => {
    if (!prom || typeof prom !== 'object') return false
    const promRecord = prom as Record<string, unknown>
    const patientFormData =
      promRecord.patientFormData && typeof promRecord.patientFormData === 'object'
        ? (promRecord.patientFormData as Record<string, unknown>)
        : null
    return patientFormData?.fillStatus === 'complete'
  }).length
  const ratio = (completed / proms.length) * 100
  return {
    background: `linear-gradient(90deg, rgba(76, 175, 80, 0.5) 0%, rgba(76, 175, 80, 0.5) ${ratio}%, transparent ${ratio}%, transparent 100%)`,
    transition: 'background 0.3s ease',
  }
}

/** Extract the string ID from a form record, handling nested id / _id shapes. */
export function getFormId(form: unknown): string | null {
  if (!form || typeof form !== 'object') return null
  const formRecord = form as Record<string, unknown>
  const id = formRecord.id
  if (typeof id === 'string' && id.length > 0) return id
  if (id && typeof id === 'object') {
    const nestedId = id as Record<string, unknown>
    if (typeof nestedId.id === 'string' && nestedId.id.length > 0) return nestedId.id
    if (typeof nestedId._id === 'string' && nestedId._id.length > 0) return nestedId._id
  }
  return null
}

/**
 * Extract the form display title, returning `fallback` when no title is present.
 * The caller (Vue component) should pass `t('forms.consultation.untitledForm')` as the fallback.
 */
export function getFormTitle(form: unknown, fallback = ''): string {
  if (!form || typeof form !== 'object') return fallback
  const title = (form as Record<string, unknown>).title
  return typeof title === 'string' && title.length > 0 ? title : fallback
}

/** Extract the MongoDB string ID from a populated or bare patientCase reference. */
export function getCaseIdFromPatientCase(patientCase: unknown): string | null {
  if (typeof patientCase === 'string' && patientCase.length > 0) return patientCase
  if (!patientCase || typeof patientCase !== 'object') return null
  const patientCaseRecord = patientCase as Record<string, unknown>
  if (typeof patientCaseRecord._id === 'string' && patientCaseRecord._id.length > 0)
    return patientCaseRecord._id
  if (typeof patientCaseRecord.id === 'string' && patientCaseRecord.id.length > 0)
    return patientCaseRecord.id
  return null
}
