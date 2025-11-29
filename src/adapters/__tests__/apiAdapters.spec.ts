import { describe, it, expect } from 'vitest'
import { mapApiFormToForm, mapApiFormsToForms, mapApiPatientCase, mapApiSurgeries } from '../apiAdapters'
import type { FindAllCodes200ResponseResponseObjectInnerConsultationIdPromsInner as FormFromApi } from '@/api'

describe('apiAdapters', () => {
  describe('mapApiFormToForm', () => {
    it('should map API form to internal Form structure', () => {
      const apiForm = {
        id: 'form-123',
        title: 'Test Form',
        description: 'Test Description',
        formSchema: { type: 'object' },
        formSchemaUI: {},
        formData: { question1: { answer: 'test' } },
        formFillStatus: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
      } as FormFromApi

      const result = mapApiFormToForm(apiForm)

      expect(result.id).toBe('form-123')
      expect(result._id).toBe('form-123')
      expect(result.title).toBe('Test Form')
      expect(result.formFillStatus).toBe('completed')
    })

    it('should handle null/undefined fields gracefully', () => {
      const apiForm = {
        id: null,
        title: '',
      } as unknown as FormFromApi

      const result = mapApiFormToForm(apiForm)

      expect(result.id).toBeNull()
      expect(result._id).toBe('')
      expect(result.title).toBe('')
    })
  })

  describe('mapApiFormsToForms', () => {
    it('should filter out null/undefined forms and map valid ones', () => {
      const apiForms = [
        { id: 'form-1', title: 'Form 1' },
        null,
        undefined,
        { id: 'form-2', title: 'Form 2' },
      ] as (FormFromApi | null | undefined)[]

      const result = mapApiFormsToForms(apiForms)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('form-1')
      expect(result[1].id).toBe('form-2')
    })

    it('should handle empty array', () => {
      const result = mapApiFormsToForms([])
      expect(result).toEqual([])
    })
  })

  describe('mapApiPatientCase', () => {
    it('should normalize patient field to ID string', () => {
      const apiCase = {
        id: 'case-123',
        patient: { _id: 'patient-456', name: 'Test Patient' },
        surgeries: [],
        supervisors: [],
      } as any

      const result = mapApiPatientCase(apiCase)

      expect(result.id).toBe('case-123')
      expect(result.patient).toBe('patient-456')
    })

    it('should normalize surgeries and supervisors to ID arrays', () => {
      const apiCase = {
        id: 'case-123',
        patient: 'patient-456',
        surgeries: [{ id: 'surg-1', _id: 'surg-1' }, 'surg-2', { id: 'surg-3' }],
        supervisors: [{ id: 'user-1' }, 'user-2'],
      } as any

      const result = mapApiPatientCase(apiCase)

      expect(result.surgeries).toEqual(['surg-1', 'surg-2', 'surg-3'])
      expect(result.supervisors).toEqual(['user-1', 'user-2'])
    })
  })

  describe('mapApiSurgeries', () => {
    it('should map surgery array with anaesthesia type', () => {
      const apiSurgeries = [
        {
          id: 'surg-1',
          diagnosis: ['Fracture'],
          side: 'left',
          surgeryDate: '2024-01-15',
          anaesthesiaType: {
            general: true,
            regional: false,
            local: false,
            sedation: false,
            other: null,
          },
          patientCase: 'case-123',
        },
      ] as any

      const result = mapApiSurgeries(apiSurgeries)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('surg-1')
      expect(result[0].side).toBe('left')
      expect(result[0].anaesthesiaType?.general).toBe(true)
    })

    it('should handle empty surgeries array', () => {
      const result = mapApiSurgeries([])
      expect(result).toEqual([])
    })
  })
})
