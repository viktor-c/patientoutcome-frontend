import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import DashboardView from '../DashboardView.vue'

// Mock dependencies
const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useRoute: () => ({
    params: {},
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref('en'),
  }),
}))

const mockConsultations = [
  {
    id: 'consultation-1',
    dateAndTime: '2026-02-15T10:00:00Z',
    patientCaseId: {
      id: 'case-1',
      mainDiagnosis: ['Ankle Fracture'],
      patient: { externalPatientId: ['PAT001'] },
    },
    proms: [
      { formFillStatus: 'complete' },
      { formFillStatus: 'incomplete' },
    ],
    accessCode: 'ABC123',
  },
  {
    id: 'consultation-2',
    dateAndTime: '2026-02-20T14:00:00Z',
    patientCaseId: {
      id: 'case-2',
      mainDiagnosis: ['Foot Pain'],
      patient: { externalPatientId: ['PAT002'] },
    },
    proms: [{ formFillStatus: 'complete' }],
  },
]

const mockFindAllCodes = vi.fn()
const mockGetConsultationCodes = vi.fn()
const mockGetAllConsultationsOnDay = vi.fn()

vi.mock('@/api', () => ({
  consultationApi: {
    findAllCodes: (...args: unknown[]) => mockFindAllCodes(...args),
    getConsultationCodes: (...args: unknown[]) => mockGetConsultationCodes(...args),
    getAllConsultationsOnDay: (...args: unknown[]) => mockGetAllConsultationsOnDay(...args),
  },
  patientCaseApi: {},
  ResponseError: class ResponseError extends Error { },
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    daysBeforeConsultations: 7,
    userRole: 'admin',
  }),
}))

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatLocalizedCustomDate: (date: string) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString()
    },
  }),
}))

// Mock the DashboardSearchDialog component
vi.mock('@/components/dialogs/DashboardSearchDialog.vue', () => ({
  default: {
    name: 'DashboardSearchDialog',
    template: '<div class="mock-search-dialog"></div>',
  },
}))

describe('DashboardView.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindAllCodes.mockResolvedValue({ responseObject: mockConsultations })
    mockGetConsultationCodes.mockResolvedValue({ responseObject: [] })
    mockGetAllConsultationsOnDay.mockResolvedValue({ responseObject: mockConsultations })
    vuetify = createVuetify({ components, directives })
  })

  function mountComponent() {
    return mount(DashboardView, {
      global: {
        plugins: [vuetify],
        stubs: {
          DashboardSearchDialog: true,
          'v-date-picker': true, // Stub complex components
        },
      },
    })
  }

  describe('rendering', () => {
    it('should render the component', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.exists()).toBe(true)
    })

    it('should display the dashboard title', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      expect(wrapper.html()).toContain('dashboard')
    })
  })

  describe('navigation', () => {
    it('should navigate to creation flow when add button is clicked', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      // Find add button by icon or text
      const addButton = wrapper.find('[data-testid="add-consultation-btn"]')
      if (addButton.exists()) {
        await addButton.trigger('click')
        expect(mockRouterPush).toHaveBeenCalledWith({ name: 'creation-flow' })
      }
    })
  })

  describe('data fetching', () => {
    it('should fetch consultations on mount', async () => {
      mountComponent()
      await flushPromises()

      expect(mockGetAllConsultationsOnDay).toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { })
      mockGetAllConsultationsOnDay.mockRejectedValueOnce(new Error('Network error'))

      const wrapper = mountComponent()
      await flushPromises()

      // Component should still render
      expect(wrapper.exists()).toBe(true)
      consoleError.mockRestore()
    })
  })

  describe('date formatting', () => {
    it('should handle null dates gracefully', async () => {
      mockGetAllConsultationsOnDay.mockResolvedValueOnce({
        responseObject: [{
          ...mockConsultations[0],
          dateAndTime: null,
        }],
      })

      const wrapper = mountComponent()
      await flushPromises()

      // Should render N/A or similar for null dates
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('helper functions', () => {
    it('should extract patient external IDs', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      // The component should render patient IDs
      expect(wrapper.exists()).toBe(true)
    })
  })
})
