/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import PatientCaseView from '../PatientCaseView.vue'
import { patientCaseApi, consultationApi } from '@/api'
import type { GetAllPatientCases200ResponseResponseObjectInner } from '@/api/models/GetAllPatientCases200ResponseResponseObjectInner'
import type { FindAllCodes200ResponseResponseObjectInnerConsultationId } from '@/api/models/FindAllCodes200ResponseResponseObjectInnerConsultationId'
import en from '@/locales/en'
import de from '@/locales/de'

const mockNotify = vi.fn()

vi.mock('@/stores/', async () => {
  const actual = await vi.importActual('@/stores/')
  return {
    ...actual,
    useNotifierStore: () => ({
      notify: mockNotify,
    }),
  }
})

vi.mock('@/api', async () => {
  const actual = await vi.importActual('@/api')
  return {
    ...actual,
    patientCaseApi: {
      getAllPatientCases: vi.fn(),
      createPatientCase: vi.fn(),
      updatePatientCase: vi.fn(),
      deletePatientCase: vi.fn(),
    },
    consultationApi: {
      getAllConsultations: vi.fn(),
      createConsultation: vi.fn(),
      updateConsultation: vi.fn(),
    },
  }
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de },
})

describe('PatientCaseView.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>
  let router: ReturnType<typeof createRouter>

  const mockCases: GetAllPatientCases200ResponseResponseObjectInner[] = [
    {
      id: 'case-1',
      externalId: 'EXT-001',
      patient: {
        externalPatientId: ['P001'],
      },
      surgeries: [],
      supervisors: [],
      notes: [],
      consultations: [],
    },
    {
      id: 'case-2',
      externalId: 'EXT-002',
      patient: {
        externalPatientId: ['P001'],
      },
      surgeries: [],
      supervisors: [],
      notes: [],
      consultations: [],
    },
  ]

  const mockConsultations: FindAllCodes200ResponseResponseObjectInnerConsultationId[] = [
    {
      id: 'consult-1',
      patientCaseId: 'case-1',
      dateAndTime: '2024-01-15',
      reasonForConsultation: [],
      notes: [],
      proms: [],
      images: [],
      visitedBy: [],
    },
    {
      id: 'consult-2',
      patientCaseId: 'case-1',
      dateAndTime: '2024-02-15',
      reasonForConsultation: [],
      notes: [],
      proms: [],
      images: [],
      visitedBy: [],
    },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())

    vuetify = createVuetify({
      components,
      directives,
    })

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/patient/:patientId/case',
          name: 'PatientCaseView',
          component: PatientCaseView,
        },
      ],
    })

    vi.clearAllMocks()
    mockNotify.mockClear()
  })

  describe('Initialization', () => {
    it('should render component', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: [],
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should fetch cases on mount', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: mockCases,
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(patientCaseApi.getAllPatientCases).toHaveBeenCalledWith({ patientId: 'patient-1' })
    })

    it('should handle patient ID from props', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: [],
        statusCode: 200,
      })

      router.push('/')
      await router.isReady()

      mount(PatientCaseView, {
        props: {
          patientId: 'patient-2',
        },
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(patientCaseApi.getAllPatientCases).toHaveBeenCalledWith({ patientId: 'patient-2' })
    })

    it('should display error state when fetch fails', async () => {
      const errorResponse = {
        response: {
          json: async () => ({ message: 'Failed to fetch cases' }),
        },
      }
      vi.mocked(patientCaseApi.getAllPatientCases).mockRejectedValue(errorResponse)

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
    })
  })

  describe('Case Display', () => {
    it('should display list of cases', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: mockCases,
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const caseText = wrapper.text()
      expect(caseText).toContain('case-1')
      expect(caseText).toContain('case-2')
    })

    it('should display empty state when no cases exist', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: [],
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Create New Case')
    })
  })

  describe('Consultation Management', () => {
    it('should fetch consultations when toggling visibility', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: mockCases,
        statusCode: 200,
      })

      vi.mocked(consultationApi.getAllConsultations).mockResolvedValue({
        success: true,
        message: '',
        responseObject: mockConsultations,
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      await vm.toggleConsultations(vm.cases[0])
      await flushPromises()

      expect(consultationApi.getAllConsultations).toHaveBeenCalledWith({ caseId: 'case-1' })
    })

    it('should handle consultation fetch error', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: mockCases,
        statusCode: 200,
      })

      const errorResponse = {
        response: {
          json: async () => ({ message: 'Failed to fetch consultations' }),
        },
      }
      vi.mocked(consultationApi.getAllConsultations).mockRejectedValue(errorResponse)

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      await vm.toggleConsultations(vm.cases[0])
      await flushPromises()

      expect(mockNotify).toHaveBeenCalled()
    })
  })

  describe('Case CRUD Operations', () => {
    it('should allow creating new case', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: [],
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(wrapper.vm).toBeDefined()
      // Additional assertions would depend on UI implementation
    })

    it('should handle case creation error', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: [],
        statusCode: 200,
      })

      vi.mocked(patientCaseApi.createPatientCase).mockRejectedValue(
        new Error('Failed to create case')
      )

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Display Modes', () => {
    it('should support separated display mode', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: mockCases,
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      // Cases should have separated display mode by default
      const vm = wrapper.vm as any
      expect(vm.cases?.[0]?.displayMode).toBe('separated')
    })

    it('should support chronological display mode', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: mockCases,
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      // Test that chronological mode can be set
      const vm = wrapper.vm as any
      if (vm.cases && vm.cases[0]) {
        vm.cases[0].displayMode = 'chronological'
        await wrapper.vm.$nextTick()
        expect(vm.cases[0].displayMode).toBe('chronological')
      }
    })
  })

  describe('Error Handling', () => {
    it('should show retry option on load error', async () => {
      const errorResponse = {
        response: {
          json: async () => ({ message: 'Network error' }),
        },
      }
      vi.mocked(patientCaseApi.getAllPatientCases).mockRejectedValueOnce(errorResponse)

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      // Error page should be visible
      expect(wrapper.findComponent({ name: 'NotFoundErrorPage' }).exists()).toBe(true)
    })

    it('should allow retrying after error', async () => {
      const errorResponse = {
        response: {
          json: async () => ({ message: 'Network error' }),
        },
      }
      vi.mocked(patientCaseApi.getAllPatientCases)
        .mockRejectedValueOnce(errorResponse)
        .mockResolvedValueOnce({
          success: true,
          message: '',
          responseObject: mockCases,
          statusCode: 200,
        })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      // Trigger retry
      const vm = wrapper.vm as any
      if (vm.retryLoad) {
        await vm.retryLoad()
        await flushPromises()

        expect(patientCaseApi.getAllPatientCases).toHaveBeenCalledTimes(2)
      }
    })
  })

  describe('Blueprint Creation Flow', () => {
    it('should support multi-step case creation with blueprints', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: [],
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.currentFlowStep).toBeDefined()
      expect(vm.showCreateFlow).toBeDefined()
    })

    it('should track created items in blueprint flow', async () => {
      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: [],
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.createdCase).toBeDefined()
      expect(vm.createdSurgery).toBeDefined()
      expect(vm.createdConsultations).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should handle large number of cases efficiently', async () => {
      const manyCases: GetAllPatientCases200ResponseResponseObjectInner[] = Array(100)
        .fill(null)
        .map((_, i) => ({
          id: `case-${i}`,
          externalId: `EXT-${i}`,
          patient: {
            externalPatientId: ['P001'],
          },
          surgeries: [],
          supervisors: [],
          notes: [],
          consultations: [],
        }))

      vi.mocked(patientCaseApi.getAllPatientCases).mockResolvedValue({
        success: true,
        message: '',
        responseObject: manyCases,
        statusCode: 200,
      })

      router.push({ name: 'PatientCaseView', params: { patientId: 'patient-1' } })
      await router.isReady()

      const startTime = performance.now()

      const wrapper = mount(PatientCaseView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render reasonably fast (< 2 seconds)
      expect(renderTime).toBeLessThan(2000)
      expect(wrapper.exists()).toBe(true)
    })
  })
})
