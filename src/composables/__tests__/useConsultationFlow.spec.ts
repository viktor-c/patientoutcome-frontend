import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useConsultationFlow } from '@/composables/useConsultationFlow'
import { setActivePinia, createPinia } from 'pinia'
import type { ApiConsultationFlexible, ApiConsultationProm, Form } from '@/types'

const asPromRecord = (prom: unknown): Record<string, unknown> => {
  if (prom && typeof prom === 'object') return prom as Record<string, unknown>
  return {}
}

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
    proms.map((prom: unknown, idx: number) => {
      const promRecord = asPromRecord(prom)
      return {
        id: (typeof promRecord.id === 'string' ? promRecord.id : undefined) || `form-${idx}`,
        _id: typeof promRecord._id === 'string' ? promRecord._id : undefined,
        title: typeof promRecord.title === 'string' ? promRecord.title : '',
        formFillStatus: typeof promRecord.formFillStatus === 'string' ? promRecord.formFillStatus : 'incomplete',
        accessLevel: typeof promRecord.accessLevel === 'string' ? promRecord.accessLevel : 'patient',
        patientFormData: (promRecord.patientFormData && typeof promRecord.patientFormData === 'object')
          ? promRecord.patientFormData
          : {},
      }
    })
  ),
}))

vi.mock('@/utils/consultationForms', () => ({
  extractConsultationForms: vi.fn((consultation, lookup) => 
    (consultation.proms || []).map((prom: unknown) => {
      const promRecord = asPromRecord(prom)
      const formTemplateId = typeof promRecord.formTemplateId === 'string' ? promRecord.formTemplateId : ''
      return {
        ...promRecord,
        title: (typeof promRecord.title === 'string' && promRecord.title.length > 0)
          ? promRecord.title
          : lookup[formTemplateId] || 'Unknown Form',
      }
    })
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
      
      expect(isFormComplete({ formFillStatus: 'complete' } as unknown as Form)).toBe(true)
      expect(isFormComplete({ formFillStatus: 'completed' } as unknown as Form)).toBe(true)
    })

    it('should return false for incomplete status', () => {
      const { isFormComplete } = useConsultationFlow()
      
      expect(isFormComplete({ formFillStatus: 'incomplete' } as unknown as Form)).toBe(false)
      expect(isFormComplete({ formFillStatus: 'pending' } as unknown as Form)).toBe(false)
    })

    it('should check patientFormData.fillStatus as fallback', () => {
      const { isFormComplete } = useConsultationFlow()
      
      expect(isFormComplete({ patientFormData: { fillStatus: 'complete' } } as unknown as Form)).toBe(true)
      expect(isFormComplete({ patientFormData: { fillStatus: 'pending' } } as unknown as Form)).toBe(false)
    })
  })

  describe('processConsultation', () => {
    it('should process consultation with forms', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      const consultation: ApiConsultationFlexible = {
        id: 'consultation-1',
        proms: [
          {
            id: 'form-1',
            consultationId: 'consultation-1',
            title: 'AOFAS',
            formFillStatus: 'complete',
            accessLevel: 'patient',
            patientFormData: {},
          },
          {
            id: 'form-2',
            consultationId: 'consultation-1',
            title: 'VAS',
            formFillStatus: 'incomplete',
            accessLevel: 'patient',
            patientFormData: {},
          },
        ] as unknown as ApiConsultationProm[],
        patientCaseId: 'case-1',
        dateAndTime: '2026-01-01T10:00:00.000Z',
        reasonForConsultation: [],
        notes: [],
        images: [],
        visitedBy: [],
      }

      await processConsultation(consultation)

      expect(mockFetchIfNeeded).toHaveBeenCalled()
      expect(allForms.value.length).toBeGreaterThan(0)
    })

    it('should filter out authenticated-only forms', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      const consultation: ApiConsultationFlexible = {
        id: 'consultation-1',
        proms: [
          {
            id: 'form-1',
            consultationId: 'consultation-1',
            title: 'Patient Form',
            accessLevel: 'patient',
            patientFormData: {},
          },
          {
            id: 'form-2',
            consultationId: 'consultation-1',
            title: 'Clinician Form',
            accessLevel: 'authenticated',
            patientFormData: {},
          },
        ] as unknown as ApiConsultationProm[],
        patientCaseId: 'case-1',
        dateAndTime: '2026-01-01T10:00:00.000Z',
        reasonForConsultation: [],
        notes: [],
        images: [],
        visitedBy: [],
      }

      await processConsultation(consultation)

      // Only patient forms should be included
      const authForms = allForms.value.filter((form) => form.accessLevel === 'authenticated')
      expect(authForms.length).toBe(0)
    })

    it('should handle null consultation', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      await processConsultation(null)

      expect(allForms.value).toEqual([])
    })

    it('should handle consultation without proms', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      const consultation: Partial<ApiConsultationFlexible> = {
        id: 'consultation-1',
        proms: undefined,
      }

      await processConsultation(consultation as ApiConsultationFlexible)

      expect(allForms.value).toEqual([])
    })

    it('should handle empty proms array', async () => {
      const { allForms, processConsultation } = useConsultationFlow()

      const consultation: ApiConsultationFlexible = {
        id: 'consultation-1',
        proms: [],
        patientCaseId: 'case-1',
        dateAndTime: '2026-01-01T10:00:00.000Z',
        reasonForConsultation: [],
        notes: [],
        images: [],
        visitedBy: [],
      }

      await processConsultation(consultation)

      expect(allForms.value).toEqual([])
    })
  })

  describe('getFirstIncompleteFormId', () => {
    it('should return first pending form id', async () => {
      const { processConsultation, getFirstIncompleteFormId } = useConsultationFlow()

      const consultation: ApiConsultationFlexible = {
        id: 'consultation-1',
        proms: [
          {
            id: 'form-1',
            consultationId: 'consultation-1',
            formFillStatus: 'complete',
            accessLevel: 'patient',
            patientFormData: {},
          },
          {
            id: 'form-2',
            consultationId: 'consultation-1',
            formFillStatus: 'incomplete',
            accessLevel: 'patient',
            patientFormData: {},
          },
          {
            id: 'form-3',
            consultationId: 'consultation-1',
            formFillStatus: 'incomplete',
            accessLevel: 'patient',
            patientFormData: {},
          },
        ] as unknown as ApiConsultationProm[],
        patientCaseId: 'case-1',
        dateAndTime: '2026-01-01T10:00:00.000Z',
        reasonForConsultation: [],
        notes: [],
        images: [],
        visitedBy: [],
      }

      await processConsultation(consultation)

      // Get first incomplete form
      const firstIncomplete = getFirstIncompleteFormId()
      expect(firstIncomplete).toBeDefined()
    })

    it('should return undefined when no pending forms', async () => {
      const { processConsultation, getFirstIncompleteFormId } = useConsultationFlow()

      const consultation: ApiConsultationFlexible = {
        id: 'consultation-1',
        proms: [
          {
            id: 'form-1',
            consultationId: 'consultation-1',
            formFillStatus: 'complete',
            accessLevel: 'patient',
            patientFormData: {},
          },
        ] as unknown as ApiConsultationProm[],
        patientCaseId: 'case-1',
        dateAndTime: '2026-01-01T10:00:00.000Z',
        reasonForConsultation: [],
        notes: [],
        images: [],
        visitedBy: [],
      }

      await processConsultation(consultation)

      const result = getFirstIncompleteFormId()
      expect(result).toBeUndefined()
    })
  })

  describe('computed properties', () => {
    it('should correctly separate completed and pending forms', async () => {
      const { processConsultation, completedForms, pendingForms } = useConsultationFlow()

      const consultation: ApiConsultationFlexible = {
        id: 'consultation-1',
        proms: [
          {
            id: 'form-1',
            consultationId: 'consultation-1',
            formFillStatus: 'complete',
            accessLevel: 'patient',
            patientFormData: {},
          },
          {
            id: 'form-2',
            consultationId: 'consultation-1',
            formFillStatus: 'completed',
            accessLevel: 'patient',
            patientFormData: {},
          },
          {
            id: 'form-3',
            consultationId: 'consultation-1',
            formFillStatus: 'incomplete',
            accessLevel: 'patient',
            patientFormData: {},
          },
        ] as unknown as ApiConsultationProm[],
        patientCaseId: 'case-1',
        dateAndTime: '2026-01-01T10:00:00.000Z',
        reasonForConsultation: [],
        notes: [],
        images: [],
        visitedBy: [],
      }

      await processConsultation(consultation)

      // Should have 2 completed and 1 pending
      expect(completedForms.value.length).toBe(2)
      expect(pendingForms.value.length).toBe(1)
    })
  })
})
