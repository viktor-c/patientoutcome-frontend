import { describe, it, expect } from 'vitest'
import { extractConsultationForms, ConsultationPromWithTitle } from '../consultationForms'
import type { Consultation } from '@/api'

describe('consultationForms util', () => {
  it('returns empty list for null or undefined consultation', () => {
    expect(extractConsultationForms(null)).toEqual([])
    expect(extractConsultationForms(undefined)).toEqual([])
  })

  it('ignores non-array proms', () => {
    const c = { proms: 'not-an-array' } as unknown as Consultation
    expect(extractConsultationForms(c)).toEqual([])
  })

  it('extracts id and title when both are present', () => {
    const c: Consultation = {
      patientCaseId: 'case',
      dateAndTime: '',
      reasonForConsultation: [],
      notes: [],
      proms: [
        { id: 'form-1', title: 'Form One' },
        { id: 'form-2', title: 'Form Two' },
      ] as any,
      images: [],
      visitedBy: [],
    }
    const forms = extractConsultationForms(c)
    expect(forms).toEqual([
      { id: 'form-1', title: 'Form One' },
      { id: 'form-2', title: 'Form Two' },
    ])
  })

  it('uses templateLookup to fill missing titles', () => {
    const c: Consultation = {
      patientCaseId: 'case',
      dateAndTime: '',
      reasonForConsultation: [],
      notes: [],
      proms: [
        { formTemplateId: 'tpl-1' },
        { formTemplateId: 'tpl-2' },
      ] as any,
      images: [],
      visitedBy: [],
    }
    const lookup = { 'tpl-1': 'Template One', 'tpl-2': 'Template Two' }
    const forms = extractConsultationForms(c, lookup)
    expect(forms).toEqual([
      { id: 'tpl-1', title: 'Template One' },
      { id: 'tpl-2', title: 'Template Two' },
    ])
  })

  it('falls back to id when title cannot be determined', () => {
    const c: Consultation = {
      patientCaseId: 'case',
      dateAndTime: '',
      reasonForConsultation: [],
      notes: [],
      proms: [
        { formTemplateId: 'tpl-foo' },
        { id: 'explicit-id' },
      ] as any,
      images: [],
      visitedBy: [],
    }
    const forms = extractConsultationForms(c)
    expect(forms).toEqual([
      { id: 'tpl-foo', title: 'tpl-foo' },
      { id: 'explicit-id', title: 'explicit-id' },
    ])
  })

  it('ignores strange prom values', () => {
    const c: Consultation = {
      patientCaseId: 'case',
      dateAndTime: '',
      reasonForConsultation: [],
      notes: [],
      proms: [null, undefined, 'string'] as any,
      images: [],
      visitedBy: [],
    }
    expect(extractConsultationForms(c)).toEqual([])
  })
})
