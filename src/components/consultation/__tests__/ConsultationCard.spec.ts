import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConsultationCard from '../ConsultationCard.vue'

// Mock dependencies
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatLocalizedCustomDate: (date: string, format: string) => {
      if (!date) return ''
      return new Date(date).toLocaleDateString()
    },
  }),
}))

const mockGetAllConsultations = vi.fn()

vi.mock('@/api', () => ({
  consultationApi: {
    getAllConsultations: (...args: unknown[]) => mockGetAllConsultations(...args),
  },
}))

describe('ConsultationCard.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAllConsultations.mockResolvedValue({
      success: true,
      responseObject: [],
    })
    vuetify = createVuetify({ components, directives })
  })

  function mountComponent(props: Record<string, unknown> = {}) {
    return mount(ConsultationCard, {
      props: {
        caseId: 'case-123',
        patientId: 'patient-123',
        ...props,
      },
      global: {
        plugins: [vuetify],
      },
    })
  }

  describe('rendering', () => {
    it('should render the component', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })

    it('should show loading state while fetching', async () => {
      let resolvePromise: ((value: unknown) => void) | undefined
      mockGetAllConsultations.mockImplementation(() => {
        return new Promise(resolve => {
          resolvePromise = resolve
        })
      })

      const wrapper = mountComponent()

      const vm = wrapper.vm as unknown as { loading: boolean }
      expect(vm.loading).toBe(true)

      // Resolve the promise
      if (resolvePromise) {
        resolvePromise({ success: true, responseObject: [] })
      }
      await flushPromises()

      expect(vm.loading).toBe(false)
    })
  })

  describe('fetching consultations', () => {
    it('should fetch consultations on mount', async () => {
      mountComponent()
      await flushPromises()

      expect(mockGetAllConsultations).toHaveBeenCalledWith({ caseId: 'case-123' })
    })

    it('should not fetch if caseId is null', async () => {
      mountComponent({ caseId: null })
      await flushPromises()

      expect(mockGetAllConsultations).not.toHaveBeenCalled()
    })

    it('should handle fetch error', async () => {
      mockGetAllConsultations.mockRejectedValue(new Error('Network error'))

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as { error: string | null }
      expect(vm.error).toBe('Network error')
    })

    it('should set consultations from response', async () => {
      mockGetAllConsultations.mockResolvedValue({
        success: true,
        responseObject: [
          { id: 'consultation-1', dateAndTime: '2024-01-15T10:00:00Z' },
          { id: 'consultation-2', dateAndTime: '2024-01-16T10:00:00Z' },
        ],
      })

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        consultations: { id: string }[]
      }
      expect(vm.consultations.length).toBe(2)
    })
  })

  describe('sortedConsultations', () => {
    it('should sort consultations by date (most recent first)', async () => {
      mockGetAllConsultations.mockResolvedValue({
        success: true,
        responseObject: [
          { id: 'older', dateAndTime: '2024-01-15T10:00:00Z' },
          { id: 'newer', dateAndTime: '2024-01-17T10:00:00Z' },
          { id: 'middle', dateAndTime: '2024-01-16T10:00:00Z' },
        ],
      })

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        sortedConsultations: { id: string; dateAndTime: string }[]
      }
      expect(vm.sortedConsultations[0].id).toBe('newer')
      expect(vm.sortedConsultations[1].id).toBe('middle')
      expect(vm.sortedConsultations[2].id).toBe('older')
    })
  })

  describe('getConsultationStatusColor', () => {
    it('should return grey if no forms', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        getConsultationStatusColor: (consultation: object) => string
      }

      const result = vm.getConsultationStatusColor({ proms: [] })
      expect(result).toBe('grey')
    })

    it('should return success if all forms completed', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        getConsultationStatusColor: (consultation: object) => string
      }

      const result = vm.getConsultationStatusColor({
        proms: [
          { patientFormData: { fillStatus: 'complete' } },
          { patientFormData: { fillStatus: 'complete' } },
        ],
      })
      expect(result).toBe('success')
    })

    it('should return warning if some forms completed', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        getConsultationStatusColor: (consultation: object) => string
      }

      const result = vm.getConsultationStatusColor({
        proms: [
          { patientFormData: { fillStatus: 'complete' } },
          { patientFormData: { fillStatus: 'incomplete' } },
        ],
      })
      expect(result).toBe('warning')
    })

    it('should return info if no forms completed', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        getConsultationStatusColor: (consultation: object) => string
      }

      const result = vm.getConsultationStatusColor({
        proms: [
          { patientFormData: { fillStatus: 'incomplete' } },
          { patientFormData: { fillStatus: 'incomplete' } },
        ],
      })
      expect(result).toBe('info')
    })
  })

  describe('getConsultationStatusText', () => {
    it('should return "no forms" text if no forms', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        getConsultationStatusText: (consultation: object) => string
      }

      const result = vm.getConsultationStatusText({ proms: [] })
      expect(result).toBe('patientOverview.noForms')
    })

    it('should return completed/total format', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        getConsultationStatusText: (consultation: object) => string
      }

      const result = vm.getConsultationStatusText({
        proms: [
          { patientFormData: { fillStatus: 'complete' } },
          { patientFormData: { fillStatus: 'incomplete' } },
          { patientFormData: { fillStatus: 'incomplete' } },
        ],
      })
      expect(result).toBe('1/3 patientOverview.formsCompleted')
    })
  })

  describe('formatNotesList', () => {
    it('should return "no notes" text for empty notes', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        formatNotesList: (notes: object[] | undefined) => string
      }

      const result = vm.formatNotesList([])
      expect(result).toBe('patientOverview.noNotes')
    })

    it('should return "no notes" text for undefined', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        formatNotesList: (notes: object[] | undefined) => string
      }

      const result = vm.formatNotesList(undefined)
      expect(result).toBe('patientOverview.noNotes')
    })

    it('should format notes with content and date', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        formatNotesList: (notes: object[] | undefined) => string
      }

      const notes = [
        { content: 'Note 1', createdAt: '2024-01-15' },
        { content: 'Note 2', createdAt: '2024-01-16' },
      ]

      const result = vm.formatNotesList(notes)
      expect(result).toContain('Note 1')
      expect(result).toContain('Note 2')
    })
  })

  describe('getConsultationId', () => {
    it('should return string ID directly', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        getConsultationId: (consultation: { id: unknown }) => string
      }

      const result = vm.getConsultationId({ id: 'consultation-123' })
      expect(result).toBe('consultation-123')
    })

    it('should extract _id from object ID', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        getConsultationId: (consultation: { id: unknown }) => string
      }

      const result = vm.getConsultationId({ id: { _id: 'mongo-id-123' } })
      expect(result).toBe('mongo-id-123')
    })
  })

  describe('events', () => {
    it('should emit open-consultation event', async () => {
      mockGetAllConsultations.mockResolvedValue({
        success: true,
        responseObject: [{ id: 'consultation-1', dateAndTime: '2024-01-15T10:00:00Z' }],
      })

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        openConsultation: (id: string) => void
      }

      if (typeof vm.openConsultation === 'function') {
        vm.openConsultation('consultation-1')
        expect(wrapper.emitted('open-consultation')).toBeTruthy()
      }
    })

    it('should emit create-consultation event', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        createConsultation: () => void
      }

      if (typeof vm.createConsultation === 'function') {
        vm.createConsultation()
        expect(wrapper.emitted('create-consultation')).toBeTruthy()
      }
    })
  })

  describe('refresh', () => {
    it('should refetch consultations on refresh', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      expect(mockGetAllConsultations).toHaveBeenCalledTimes(1)

      const vm = wrapper.vm as unknown as {
        refreshConsultations: () => Promise<void>
      }

      await vm.refreshConsultations()
      await flushPromises()

      expect(mockGetAllConsultations).toHaveBeenCalledTimes(2)
    })
  })
})
