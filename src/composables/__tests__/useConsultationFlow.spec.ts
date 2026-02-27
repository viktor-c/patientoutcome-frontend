import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConsultationFlow } from '@/composables/useConsultationFlow'
import { setActivePinia, createPinia } from 'pinia'
import type { Consultation } from '@/api'

// Mock dependencies
const mockFetchIfNeeded = vi.fn()
const mockTemplateLookup = { 'template-1': 'AOFAS Score', 'template-2': 'VAS Scale' }

vi.mock('@/stores', () => ({
  useFormTemplateStore: () => ({
    fetchIfNeeded: mockFetchIfNeeded,
    templateLookup: mockTemplateLookup,
  }),
}))

vi.mock('@/adapters/apiAdapters', () => ({
  mapApiFormsToForms: vi.fn((proms) => 
    proms.map((p: any, idx: number) => ({
      id: p.id || `form-${idx}`,
      _id: p._id,
      title: p.title || '',
      formFillStatus: p.formFillStatus || 'incomplete',
      accessLevel: p.accessLevel || 'patient',
      patientFormData: p.patientFormData || {},
    }))
  ),
}))

vi.mock('@/utils/consultationForms', () => ({
  extractConsultationForms: vi.fn((consultation, lookup) => 
    (consultation.proms || []).map((p: any) => ({
      ...p,
      title: p.title || lookup[p.formTemplateId] || 'Unknown Form',
    }))
  ),
}))

vi.mock('@/services/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('useConsultationFlow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockFetchIfNeeded.mockResolvedValue(undefined)
  })

  describe('initial state', () => {
    it('should have empty allForms initially', () => {
      const { allForms } = useConsultationFlow()
      expect(allForms.value).toEqual([])
    })

    it('should have empty completedForms initially', () => {
      const { completedForms } = useConsultationFlow()
      expect(completedForms.value).toEqual([])
    })

    it('should have empty pendingForms initially', () => {
      const { pendingForms } = useConsultationFlow()
      expect(pendingForms.value).toEqual([])
    })
  })

  describe('isFormComplete', () => {
    it('should return true for complete status', () => {
      const { isFormComplete } = useConsultationFlow()
      
      expect(isFormComplete({ formFillStatus: 'complete' } as any)).toBe(true)
      expect(isFormComplete({ formFillStatus: 'completed' } as any)).toBe(true)
    })

    it('should return false for incomplete status', () => {
      const { isFormComplete } = useConsultationFlow()
      
      expect(isFormComplete({ formFillStatus: 'incomplete' } as any)).toBe(false)
      expect(isFormComplete({ formFillStatus: 'pending' } as any)).toBe(false)
    })

    it('should check patientFormData.fillStatus as fallback', () => {
      const { isFormComplete } = useConsultationFlow()
      
      expect(isFormComplete({ patientFormData: { fillStatus: 'complete' } } as any)).toBe(true)
      expect(isFormComplete({ patientFormData: { fillStatus: 'pending' } } as any)).toBe(false)
    })
  })

  describe('processConsultation', () => {
    it('should process consultation with forms', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      const consultation: Consultation = {
        id: 'consultation-1',
        proms: [
          { id: 'form-1', title: 'AOFAS', formFillStatus: 'complete', accessLevel: 'patient' },
          { id: 'form-2', title: 'VAS', formFillStatus: 'incomplete', accessLevel: 'patient' },
        ],
      } as any

      await processConsultation(consultation)

      expect(mockFetchIfNeeded).toHaveBeenCalled()
      expect(allForms.value.length).toBeGreaterThan(0)
    })

    it('should filter out authenticated-only forms', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      const consultation: Consultation = {
        id: 'consultation-1',
        proms: [
          { id: 'form-1', title: 'Patient Form', accessLevel: 'patient' },
          { id: 'form-2', title: 'Clinician Form', accessLevel: 'authenticated' },
        ],
      } as any

      await processConsultation(consultation)

      // Only patient forms should be included
      const authForms = allForms.value.filter((f: any) => f.accessLevel === 'authenticated')
      expect(authForms.length).toBe(0)
    })

    it('should handle null consultation', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      await processConsultation(null as any)

      expect(allForms.value).toEqual([])
    })

    it('should handle consultation without proms', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      const consultation: Partial<Consultation> = {
        id: 'consultation-1',
        proms: undefined,
      }

      await processConsultation(consultation as Consultation)

      expect(allForms.value).toEqual([])
    })

    it('should handle empty proms array', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      const consultation: Consultation = {
        id: 'consultation-1',
        proms: [],
      } as any

      await processConsultation(consultation)

      expect(allForms.value).toEqual([])
    })
  })

  describe('getFirstIncompleteFormId', () => {
    it('should return first pending form id', async () => {
      const { processConsultation, getFirstIncompleteFormId, pendingForms } = useConsultationFlow()

      const consultation: Consultation = {
        id: 'consultation-1',
        proms: [
          { id: 'form-1', formFillStatus: 'complete', accessLevel: 'patient' },
          { id: 'form-2', formFillStatus: 'incomplete', accessLevel: 'patient' },
          { id: 'form-3', formFillStatus: 'incomplete', accessLevel: 'patient' },
        ],
      } as any

      await processConsultation(consultation)

      // Get first incomplete form
      const firstIncomplete = getFirstIncompleteFormId()
      expect(firstIncomplete).toBeDefined()
    })

    it('should return undefined when no pending forms', async () => {
      const { processConsultation, getFirstIncompleteFormId } = useConsultationFlow()

      const consultation: Consultation = {
        id: 'consultation-1',
        proms: [
          { id: 'form-1', formFillStatus: 'complete', accessLevel: 'patient' },
        ],
      } as any

      await processConsultation(consultation)

      const result = getFirstIncompleteFormId()
      expect(result).toBeUndefined()
    })
  })

  describe('computed properties', () => {
    it('should correctly separate completed and pending forms', async () => {
      const { processConsultation, completedForms, pendingForms } = useConsultationFlow()

      const consultation: Consultation = {
        id: 'consultation-1',
        proms: [
          { id: 'form-1', formFillStatus: 'complete', accessLevel: 'patient' },
          { id: 'form-2', formFillStatus: 'completed', accessLevel: 'patient' },
          { id: 'form-3', formFillStatus: 'incomplete', accessLevel: 'patient' },
        ],
      } as any

      await processConsultation(consultation)

      // Should have 2 completed and 1 pending
      expect(completedForms.value.length).toBe(2)
      expect(pendingForms.value.length).toBe(1)
    })
  })
})
