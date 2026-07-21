import { describe, it, expect } from 'vitest'
import {
  getPatientExternalIds,
  getPatientCaseExternalIds,
  getAccessInfo,
  getCompletionStyle,
  getFormId,
  getFormTitle,
  getCaseIdFromPatientCase,
} from '@/utils/dashboardUtils'

// ---------------------------------------------------------------------------
// getPatientExternalIds
// ---------------------------------------------------------------------------
describe('getPatientExternalIds', () => {
  it('returns empty string when item has no patientCaseId', () => {
    expect(getPatientExternalIds({})).toBe('')
  })

  it('returns empty string when patientCaseId has no patient', () => {
    expect(getPatientExternalIds({ patientCaseId: {} })).toBe('')
  })

  it('returns empty string when patient has no externalPatientId', () => {
    expect(getPatientExternalIds({ patientCaseId: { patient: {} } })).toBe('')
  })

  it('returns single string ID', () => {
    const item = { patientCaseId: { patient: { externalPatientId: 'PAT-001' } } }
    expect(getPatientExternalIds(item)).toBe('PAT-001')
  })

  it('joins array of IDs with comma-space', () => {
    const item = { patientCaseId: { patient: { externalPatientId: ['PAT-001', 'EHR-42'] } } }
    expect(getPatientExternalIds(item)).toBe('PAT-001, EHR-42')
  })

  it('converts numeric ID to string', () => {
    const item = { patientCaseId: { patient: { externalPatientId: 12345 } } }
    expect(getPatientExternalIds(item)).toBe('12345')
  })

  it('handles null/undefined item gracefully', () => {
    expect(getPatientExternalIds(null)).toBe('')
    expect(getPatientExternalIds(undefined)).toBe('')
  })
})

// ---------------------------------------------------------------------------
// getPatientCaseExternalIds
// ---------------------------------------------------------------------------
describe('getPatientCaseExternalIds', () => {
  it('returns empty string when item has no patientCaseId', () => {
    expect(getPatientCaseExternalIds({})).toBe('')
  })

  it('returns empty string when patientCaseId has no externalId', () => {
    expect(getPatientCaseExternalIds({ patientCaseId: {} })).toBe('')
  })

  it('returns single string externalId', () => {
    const item = { patientCaseId: { externalId: 'CASE-99' } }
    expect(getPatientCaseExternalIds(item)).toBe('CASE-99')
  })

  it('joins array of externalIds', () => {
    const item = { patientCaseId: { externalId: ['CASE-1', 'CASE-2'] } }
    expect(getPatientCaseExternalIds(item)).toBe('CASE-1, CASE-2')
  })

  it('converts numeric externalId to string', () => {
    const item = { patientCaseId: { externalId: 7 } }
    expect(getPatientCaseExternalIds(item)).toBe('7')
  })
})

// ---------------------------------------------------------------------------
// getAccessInfo
// ---------------------------------------------------------------------------
describe('getAccessInfo', () => {
  it('returns empty object when no access info present', () => {
    expect(getAccessInfo({})).toEqual({})
  })

  it('extracts string formAccessCode', () => {
    expect(getAccessInfo({ formAccessCode: 'ABC123' })).toEqual({ code: 'ABC123' })
  })

  it('extracts formAccessCode from object with code property', () => {
    expect(getAccessInfo({ formAccessCode: { code: 'XYZ789' } })).toEqual({ code: 'XYZ789' })
  })

  it('ignores formAccessCode object without code property', () => {
    expect(getAccessInfo({ formAccessCode: { someOtherProp: 'value' } })).toEqual({})
  })

  it('extracts kiosk number from kioskId.postopWeek', () => {
    expect(getAccessInfo({ kioskId: { postopWeek: 3 } })).toEqual({ kioskNumber: 3 })
  })

  it('returns both code and kioskNumber when both present', () => {
    const item = { formAccessCode: 'OPEN1', kioskId: { postopWeek: 5 } }
    expect(getAccessInfo(item)).toEqual({ code: 'OPEN1', kioskNumber: 5 })
  })

  it('ignores kioskId without postopWeek', () => {
    expect(getAccessInfo({ kioskId: { username: 'kiosk01' } })).toEqual({})
  })

  it('handles null/undefined item gracefully', () => {
    expect(getAccessInfo(null)).toEqual({})
    expect(getAccessInfo(undefined)).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// getCompletionStyle
// ---------------------------------------------------------------------------
describe('getCompletionStyle', () => {
  it('returns empty object for empty array', () => {
    expect(getCompletionStyle([])).toEqual({})
  })

  it('returns empty object for null/undefined', () => {
    expect(getCompletionStyle(null as unknown as unknown[])).toEqual({})
    expect(getCompletionStyle(undefined as unknown as unknown[])).toEqual({})
  })

  it('returns 0% gradient when no forms are complete', () => {
    const proms = [
      { patientFormData: { fillStatus: 'incomplete' } },
      { patientFormData: { fillStatus: 'incomplete' } },
    ]
    const style = getCompletionStyle(proms)
    expect(style.background).toContain('0%')
    expect(style.transition).toBe('background 0.3s ease')
  })

  it('returns 100% gradient when all forms are complete', () => {
    const proms = [
      { patientFormData: { fillStatus: 'complete' } },
      { patientFormData: { fillStatus: 'complete' } },
    ]
    const style = getCompletionStyle(proms)
    expect(style.background).toContain('100%')
  })

  it('returns 50% gradient for half-complete forms', () => {
    const proms = [
      { patientFormData: { fillStatus: 'complete' } },
      { patientFormData: { fillStatus: 'incomplete' } },
    ]
    const style = getCompletionStyle(proms)
    expect(style.background).toContain('50%')
  })

  it('ignores non-object entries in proms', () => {
    const proms = [
      null,
      'invalid',
      { patientFormData: { fillStatus: 'complete' } },
    ]
    const style = getCompletionStyle(proms as unknown[])
    // 1 out of 3 complete → ~33%
    expect(style.background).toContain('33.33333333333333%')
  })

  it('treats missing patientFormData as incomplete', () => {
    const proms = [{ someOtherProp: true }]
    const style = getCompletionStyle(proms)
    expect(style.background).toContain('0%')
  })
})

// ---------------------------------------------------------------------------
// getFormId
// ---------------------------------------------------------------------------
describe('getFormId', () => {
  it('returns null for null/undefined input', () => {
    expect(getFormId(null)).toBeNull()
    expect(getFormId(undefined)).toBeNull()
  })

  it('returns null for non-object input', () => {
    expect(getFormId('string')).toBeNull()
    expect(getFormId(42)).toBeNull()
  })

  it('returns id when present as direct string', () => {
    expect(getFormId({ id: 'form-abc' })).toBe('form-abc')
  })

  it('returns null for empty string id', () => {
    expect(getFormId({ id: '' })).toBeNull()
  })

  it('extracts nested id.id', () => {
    expect(getFormId({ id: { id: 'nested-id' } })).toBe('nested-id')
  })

  it('extracts nested id._id when id.id is absent', () => {
    expect(getFormId({ id: { _id: 'mongo-id' } })).toBe('mongo-id')
  })

  it('prefers id.id over id._id', () => {
    expect(getFormId({ id: { id: 'prefer-me', _id: 'fallback' } })).toBe('prefer-me')
  })

  it('returns null when nested id has no recognisable key', () => {
    expect(getFormId({ id: { unknown: 'value' } })).toBeNull()
  })

  it('returns null when form has no id property', () => {
    expect(getFormId({ title: 'My Form' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getFormTitle
// ---------------------------------------------------------------------------
describe('getFormTitle', () => {
  it('returns fallback for null input', () => {
    expect(getFormTitle(null, 'Untitled')).toBe('Untitled')
  })

  it('returns fallback for non-object input', () => {
    expect(getFormTitle('string', 'Untitled')).toBe('Untitled')
  })

  it('returns title when present', () => {
    expect(getFormTitle({ title: 'VAS Pain Score' }, 'Untitled')).toBe('VAS Pain Score')
  })

  it('returns fallback when title is empty string', () => {
    expect(getFormTitle({ title: '' }, 'Untitled')).toBe('Untitled')
  })

  it('returns fallback when title is absent', () => {
    expect(getFormTitle({ someOtherProp: true }, 'Untitled')).toBe('Untitled')
  })

  it('returns empty string as default fallback when none supplied', () => {
    expect(getFormTitle(null)).toBe('')
  })
})

// ---------------------------------------------------------------------------
// getCaseIdFromPatientCase
// ---------------------------------------------------------------------------
describe('getCaseIdFromPatientCase', () => {
  it('returns the string directly when patientCase is a plain string', () => {
    expect(getCaseIdFromPatientCase('case-id-123')).toBe('case-id-123')
  })

  it('returns null for an empty string', () => {
    expect(getCaseIdFromPatientCase('')).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(getCaseIdFromPatientCase(null)).toBeNull()
    expect(getCaseIdFromPatientCase(undefined)).toBeNull()
  })

  it('returns _id when present in object', () => {
    expect(getCaseIdFromPatientCase({ _id: 'mongo-case-id' })).toBe('mongo-case-id')
  })

  it('returns id when _id is absent', () => {
    expect(getCaseIdFromPatientCase({ id: 'case-id-456' })).toBe('case-id-456')
  })

  it('prefers _id over id', () => {
    expect(getCaseIdFromPatientCase({ _id: 'prefer-_id', id: 'fallback-id' })).toBe('prefer-_id')
  })

  it('returns null when object has neither _id nor id', () => {
    expect(getCaseIdFromPatientCase({ name: 'case' })).toBeNull()
  })

  it('returns null for empty _id string', () => {
    expect(getCaseIdFromPatientCase({ _id: '' })).toBeNull()
  })
})
