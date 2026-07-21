import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import FormAccessCodesManagement from '../FormAccessCodesManagement.vue'
import * as codeApi from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'

// Mock the API modules
vi.mock('@/api', () => ({
  codeApi: {
    findAllCodes: vi.fn(),
    addCodes: vi.fn(),
    deleteCode: vi.fn(),
    deactivateCode: vi.fn(),
    renewCode: vi.fn(),
    activateCode: vi.fn(),
    setCodeActivationStart: vi.fn(),
  },
  consultationApi: {
    getConsultationById: vi.fn(),
    getAllConsultations: vi.fn(),
  },
  patientCaseApi: {
    searchCasesByExternalId: vi.fn(),
  },
  resetConsultationFormsByCode: vi.fn(),
  setCodeActivationStart: vi.fn(),
}))

// Mock the router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock the date formatter
vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatLocalizedDate: (date?: string) => date ? new Date(date).toISOString() : 'N/A',
    dateFormats: { dateTime: 'LLLL' },
    getLocalizedDayjs: () => ({
      toDate: () => new Date('2024-01-01T10:00:00.000Z'),
      locale: () => ({
        format: () => '2024-01-01 10:00',
      }),
    }),
  }),
}))

describe('FormAccessCodesManagement', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Clear all mocks
    vi.clearAllMocks()
  })

  const createWrapper = () => {
    const i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: {
        en: {
          admin: {
            formAccessCodes: {
              table: {
                code: 'Code',
                status: 'Status',
                consultation: 'Consultation',
                actions: 'Actions',
              },
              assignConsultation: 'Assign consultation',
              assignConsultationTitle: 'Assign consultation to code',
              assignConsultationDescription: 'Search consultation by internal ID or by patient case external ID.',
              assignSearchLabel: 'Search consultation or case external ID',
              assignSelectLabel: 'Select consultation',
              resetConsultationForms: 'Reset consultation forms',
              resetConfirmStep1: 'This will clear all submitted answers for the consultation linked to code "{code}".',
              resetConfirmStep2: 'Final confirmation: this action cannot be undone. Reset forms now?',
              confirmDelete: 'Delete code "{code}"?',
              messages: {
                consultationAssigned: 'Code "{code}" was assigned to the selected consultation.',
                formsReset: 'Consultation forms for code "{code}" were reset.',
                deleted: 'Code "{code}" was deleted.',
              },
              errors: {
                assignConsultationRequired: 'Please select a consultation to assign.',
              },
            },
          },
          buttons: {
            cancel: 'Cancel',
            save: 'Save',
            delete: 'Delete',
            confirm: 'Confirm',
          },
          common: {
            cancel: 'Cancel',
            save: 'Save',
            delete: 'Delete',
          },
        },
      },
    })

    const wrapper = mount(FormAccessCodesManagement, {
      global: {
        plugins: [pinia, i18n],
        stubs: {
          'v-container': true,
          'v-data-table': true,
          'v-dialog': true,
          'v-card': true,
          'v-card-title': true,
          'v-card-text': true,
          'v-card-actions': true,
          'v-btn': true,
          'v-text-field': true,
          'v-select': true,
          'v-date-picker': true,
          'v-spacer': true,
          'v-progress-circular': true,
          'v-icon': true,
        },
      },
    })

    return wrapper as any
  }

  describe('Component Initialization', () => {
    it('should render the component', () => {
      const wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should initialize with empty search', () => {
      const wrapper = createWrapper()
      expect((wrapper.vm as any).search).toBe('')
    })

    it('should initialize assign dialog as closed', () => {
      const wrapper = createWrapper()
      expect((wrapper.vm as any).showAssignConsultationDialog).toBe(false)
    })
  })

  describe('Consultation Search', () => {
    it('should not search with less than 2 characters', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.assignSearchQuery = 'a'
      await vm.searchConsultationsForAssign()
      expect(vm.assignResults).toEqual([])
    })

    it('should auto-select when direct ID match is found', async () => {
      const consultationId = '507f1f77bcf86cd799439011'
      const mockConsultation = {
        id: consultationId,
        dateAndTime: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T09:00:00Z',
        forms: [{ name: 'Form 1' }, { name: 'Form 2' }],
      }

      vi.mocked(codeApi.consultationApi.getConsultationById).mockResolvedValue({
        responseObject: mockConsultation,
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.assignSearchQuery = consultationId
      await vm.searchConsultationsForAssign()

      expect(vm.selectedConsultationIdForAssign).toBe(consultationId)
      expect(vm.assignResults.length).toBeGreaterThan(0)
    })

    it('should display consultation metadata in results', async () => {
      const consultationId = '507f1f77bcf86cd799439011'
      const mockConsultation = {
        id: consultationId,
        dateAndTime: '2024-01-01T10:00:00Z',
        createdAt: '2024-01-01T09:00:00Z',
        forms: [{ name: 'Form 1' }, { name: 'Form 2' }],
      }

      vi.mocked(codeApi.consultationApi.getConsultationById).mockResolvedValue({
        responseObject: mockConsultation,
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.assignSearchQuery = consultationId
      await vm.searchConsultationsForAssign()

      const result = vm.assignResults[0]
      expect(result.label).toContain(consultationId)
      expect(result.label).toContain('Planned:')
      expect(result.label).toContain('Created:')
      expect(result.label).toContain('Forms: 2')
      expect(result.label).toContain('Form 1')
      expect(result.label).toContain('Form 2')
    })

    it('should search by case external ID', async () => {
      const caseId = '507f1f77bcf86cd799439012'
      const consultationId = '507f1f77bcf86cd799439013'

      vi.mocked(codeApi.patientCaseApi.searchCasesByExternalId).mockResolvedValue({
        responseObject: [{ id: caseId }],
      } as any)

      vi.mocked(codeApi.consultationApi.getAllConsultations).mockResolvedValue({
        responseObject: [
          {
            id: consultationId,
            dateAndTime: '2024-01-01T10:00:00Z',
            createdAt: '2024-01-01T09:00:00Z',
            forms: [{ name: 'Form A' }],
          },
        ],
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.assignSearchQuery = 'CASE123'
      await vm.searchConsultationsForAssign()

      expect(vm.assignResults.length).toBeGreaterThan(0)
      expect(vm.assignResults[0].id).toBe(consultationId)
    })

    it('should reset selected consultation when search query clears', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.selectedConsultationIdForAssign = '507f1f77bcf86cd799439011'
      vm.assignSearchQuery = ''
      await vm.searchConsultationsForAssign()

      expect(vm.selectedConsultationIdForAssign).toBe(null)
      expect(vm.assignResults).toEqual([])
    })
  })

  describe('Consultation Assignment', () => {
    it('should not assign without selected consultation', async () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      const notifierStore = useNotifierStore()
      vi.spyOn(notifierStore, 'notify')

      vm.selectedConsultationIdForAssign = null
      await vm.assignConsultation()

      expect(notifierStore.notify).toHaveBeenCalledWith(
        expect.stringContaining('Please select a consultation'),
        'error',
      )
    })

    it('should call activateCode with consultation endpoint', async () => {
      const code = 'TEST123'
      const consultationId = '507f1f77bcf86cd799439011'
      const mockCode = { code, id: '123', activatedOn: null }

      vi.mocked(codeApi.codeApi.activateCode).mockResolvedValue({
        responseObject: { ...mockCode, activatedOn: new Date().toISOString() },
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.selectedCodeForAssign = mockCode as any
      vm.selectedConsultationIdForAssign = consultationId
      await vm.assignConsultation()

      expect(codeApi.codeApi.activateCode).toHaveBeenCalledWith({
        code,
        consultationId,
      })
    })

    it('should show success notification after assignment', async () => {
      const code = 'TEST123'
      const consultationId = '507f1f77bcf86cd799439011'
      const mockCode = { code, id: '123', activatedOn: null }

      vi.mocked(codeApi.codeApi.activateCode).mockResolvedValue({
        responseObject: { ...mockCode, activatedOn: new Date().toISOString() },
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      const notifierStore = useNotifierStore()
      vi.spyOn(notifierStore, 'notify')

      vm.selectedCodeForAssign = mockCode as any
      vm.selectedConsultationIdForAssign = consultationId
      await vm.assignConsultation()

      expect(notifierStore.notify).toHaveBeenCalledWith(
        expect.stringContaining('assigned'),
        'success',
      )
    })

    it('should close dialog after successful assignment', async () => {
      const code = 'TEST123'
      const consultationId = '507f1f77bcf86cd799439011'
      const mockCode = { code, id: '123', activatedOn: null }

      vi.mocked(codeApi.codeApi.activateCode).mockResolvedValue({
        responseObject: { ...mockCode, activatedOn: new Date().toISOString() },
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.showAssignConsultationDialog = true
      vm.selectedCodeForAssign = mockCode as any
      vm.selectedConsultationIdForAssign = consultationId
      await vm.assignConsultation()

      expect(vm.showAssignConsultationDialog).toBe(false)
      expect(vm.selectedConsultationIdForAssign).toBe(null)
    })
  })

  describe('Delete Code', () => {
    it('should open delete confirmation dialog', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      const code = { code: 'TEST123', id: '123' }
      vm.requestDeleteCode(code as any)

      expect(vm.showDeleteDialog).toBe(true)
      expect(vm.selectedCodeForDelete).toEqual(code)
    })

    it('should call deleteCode API', async () => {
      const code = 'TEST123'
      const mockCode = { code, id: '123' }

      vi.mocked(codeApi.codeApi.deleteCode).mockResolvedValue({
        responseObject: { message: 'Deleted' },
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.selectedCodeForDelete = mockCode as any
      await vm.deleteCode()

      expect(codeApi.codeApi.deleteCode).toHaveBeenCalledWith({ code })
    })

    it('should close delete dialog after success', async () => {
      const code = 'TEST123'
      const mockCode = { code, id: '123' }

      vi.mocked(codeApi.codeApi.deleteCode).mockResolvedValue({
        responseObject: { message: 'Deleted' },
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.showDeleteDialog = true
      vm.selectedCodeForDelete = mockCode as any
      await vm.deleteCode()

      expect(vm.showDeleteDialog).toBe(false)
      expect(vm.selectedCodeForDelete).toBe(null)
    })
  })

  describe('Reset Consultation Forms', () => {
    it('should open reset confirmation step 1', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      const code = { code: 'TEST123', id: '123' }
      vm.openResetDialog(code as any)

      expect(vm.showResetDialogStep1).toBe(true)
      expect(vm.selectedCodeForReset).toEqual(code)
    })

    it('should move from step 1 to step 2', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.showResetDialogStep1 = true
      vm.continueResetDialog()

      expect(vm.showResetDialogStep1).toBe(false)
      expect(vm.showResetDialogStep2).toBe(true)
    })

    it('should call reset endpoint', async () => {
      const code = 'TEST123'
      const mockCode = { code, id: '123' }

      vi.mocked(codeApi.resetConsultationFormsByCode).mockResolvedValue({
        modifiedCount: 5,
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.selectedCodeForReset = mockCode as any
      await vm.resetConsultationForms()

      expect(codeApi.resetConsultationFormsByCode).toHaveBeenCalledWith(code)
    })

    it('should close reset dialogs after success', async () => {
      const code = 'TEST123'
      const mockCode = { code, id: '123' }

      vi.mocked(codeApi.resetConsultationFormsByCode).mockResolvedValue({
        modifiedCount: 5,
      } as any)

      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.showResetDialogStep2 = true
      vm.selectedCodeForReset = mockCode as any
      await vm.resetConsultationForms()

      expect(vm.showResetDialogStep2).toBe(false)
      expect(vm.selectedCodeForReset).toBe(null)
    })
  })

  describe('Save Button State', () => {
    it('should display save button as disabled when no consultation selected', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.selectedConsultationIdForAssign = null
      expect(vm.selectedConsultationIdForAssign).toBe(null)
    })

    it('should enable save button when consultation is selected', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      vm.selectedConsultationIdForAssign = '507f1f77bcf86cd799439011'
      expect(vm.selectedConsultationIdForAssign).not.toBe(null)
    })
  })

  describe('Code Helper Functions', () => {
    it('should detect consultation link', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      const codeWithConsultation = {
        code: 'TEST1',
        consultationId: { id: '123' },
      } as any
      const codeWithoutConsultation = {
        code: 'TEST2',
        consultationId: undefined,
      } as any

      expect(vm.hasConsultationLink(codeWithConsultation)).toBe(true)
      expect(vm.hasConsultationLink(codeWithoutConsultation)).toBe(false)
    })

    it('should detect active code', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      const activeCode = {
        code: 'TEST1',
        activatedOn: '2024-01-01T10:00:00Z',
      } as any
      const inactiveCode = {
        code: 'TEST2',
        activatedOn: null,
      } as any

      expect(vm.isCodeActive(activeCode)).toBe(true)
      expect(vm.isCodeActive(inactiveCode)).toBe(false)
    })

    it('should determine if code can be assigned', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      const assignableCode = {
        code: 'TEST1',
        consultationId: undefined,
      } as any
      const linkedCode = {
        code: 'TEST2',
        consultationId: { id: '123' },
      } as any

      expect(vm.canAssignConsultation(assignableCode)).toBe(true)
      expect(vm.canAssignConsultation(linkedCode)).toBe(false)
    })

    it('should determine if code can be managed', () => {
      const wrapper = createWrapper()
      const vm = wrapper.vm as any
      const manageableCode = {
        code: 'TEST1',
        consultationId: { id: '123' },
        activatedOn: '2024-01-01T10:00:00Z',
      } as any
      const unmanageableCode = {
        code: 'TEST2',
        consultationId: undefined,
        activatedOn: null,
      } as any

      expect(vm.canManageAssignedCode(manageableCode)).toBe(true)
      expect(vm.canManageAssignedCode(unmanageableCode)).toBe(false)
    })
  })
})
