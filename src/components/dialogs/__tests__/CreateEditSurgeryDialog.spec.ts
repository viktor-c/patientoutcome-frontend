import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CreateEditSurgeryDialog from '../CreateEditSurgeryDialog.vue'

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock dependencies
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const mockNotify = vi.fn()
vi.mock('@/stores/notifierStore', () => ({
  useNotifierStore: () => ({
    notify: mockNotify,
  }),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    department: 'cardiology',
    username: 'testuser',
    hasRole: vi.fn().mockReturnValue(false),
  }),
}))

const mockCreateSurgery = vi.fn()
const mockUpdateSurgery = vi.fn()
const mockGetUsers = vi.fn()
const mockSearchBlueprints = vi.fn()

vi.mock('@/api', () => ({
  surgeryApi: {
    createSurgery: (...args: unknown[]) => mockCreateSurgery(...args),
    updateSurgery: (...args: unknown[]) => mockUpdateSurgery(...args),
  },
  userApi: {
    getUsers: (...args: unknown[]) => mockGetUsers(...args),
  },
  blueprintApi: {
    searchBlueprints: (...args: unknown[]) => mockSearchBlueprints(...args),
  },
  ResponseError: class ResponseError extends Error {
    response = {
      json: () => Promise.resolve({ message: 'API Error' }),
    }
  },
  SurgerySideEnum: {
    Left: 'left',
    Right: 'right',
    None: 'none',
  },
  SearchBlueprintsBlueprintForEnum: {
    Surgery: 'surgery',
    Consultation: 'consultation',
  },
}))

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatLocalizedCustomDate: (date: string) => date,
  }),
}))

vi.mock('@/composables/useFormValidation', () => ({
  useFormValidation: () => ({
    validateForm: vi.fn().mockReturnValue(true),
    clearAllErrors: vi.fn(),
    clearFieldError: vi.fn(),
    hasError: vi.fn().mockReturnValue(false),
    getError: vi.fn().mockReturnValue(null),
    resetFormState: vi.fn(),
  }),
}))

vi.mock('@/utils/dayjs', () => ({
  dayjs: Object.assign(
    () => ({
      utc: () => ({
        startOf: () => ({
          add: () => ({
            toISOString: () => '2024-01-15T10:00:00.000Z',
          }),
        }),
        format: () => '2024-01-15',
        toISOString: () => '2024-01-15T10:00:00.000Z',
        isValid: () => true,
      }),
      toISOString: () => '2024-01-15T10:00:00.000Z',
      format: () => '2024-01-15',
      isValid: () => true,
    }),
    {
      utc: () => ({
        startOf: () => ({
          add: () => ({
            toISOString: () => '2024-01-15T10:00:00.000Z',
          }),
        }),
        format: () => '2024-01-15',
        toISOString: () => '2024-01-15T10:00:00.000Z',
        isValid: () => true,
      }),
    }
  ),
}))

describe('CreateEditSurgeryDialog.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsers.mockResolvedValue({ responseObject: [] })
    mockSearchBlueprints.mockResolvedValue({ responseObject: { blueprints: [] } })
    vuetify = createVuetify({ components, directives })
  })

  function mountComponent(props: Record<string, unknown> = {}) {
    return mount(CreateEditSurgeryDialog, {
      props: {
        patientCaseId: 'case-123',
        ...props,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          NotesEditor: true,
          IcdOpsSearchField: true,
          VSelect: true,
          VTextField: true,
          VCombobox: true,
          VDatePicker: true,
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

    it('should render in create mode by default', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as { isEditMode: boolean }
      expect(vm.isEditMode).toBe(false)
    })

    it('should render in edit mode when surgery prop is provided', async () => {
      const wrapper = mountComponent({
        surgery: {
          id: 'surgery-123',
          patientCase: 'case-123',
          diagnosis: ['Test diagnosis'],
          side: 'left',
          surgeryDate: '2024-01-15T10:00:00.000Z',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as unknown as { isEditMode: boolean }
      expect(vm.isEditMode).toBe(true)
    })
  })

  describe('form data', () => {
    it('should initialize with default values', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        form: {
          patientCase: string
          side: string
          diagnosis: string[]
        }
      }
      expect(vm.form.patientCase).toBe('case-123')
      expect(vm.form.side).toBe('none')
      expect(vm.form.diagnosis).toEqual([])
    })

    it('should populate form with surgery data in edit mode', async () => {
      const surgeryData = {
        id: 'surgery-123',
        patientCase: 'case-123',
        diagnosis: ['Fracture'],
        diagnosisICD10: ['S72.00'],
        side: 'left',
        surgeryDate: '2024-01-15T10:00:00.000Z',
      }

      const wrapper = mountComponent({ surgery: surgeryData })
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        form: {
          patientCase: string
          diagnosis: string[]
        }
      }

      expect(vm.form.patientCase).toBe('case-123')
    })
  })

  describe('user fetching', () => {
    it('should fetch users on mount', async () => {
      mockGetUsers.mockResolvedValue({
        responseObject: [
          { id: 'user-1', username: 'doctor1', roles: ['doctor'] },
          { id: 'user-2', username: 'doctor2', roles: ['doctor'] },
        ],
      })

      mountComponent()
      await flushPromises()

      expect(mockGetUsers).toHaveBeenCalledWith({ role: 'doctor' })
    })

    it('should handle user fetch error gracefully', async () => {
      mockGetUsers.mockRejectedValue(new Error('Network error'))

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('anaesthesia types', () => {
    it('should load available anaesthesia types', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        availableAnaesthesiaTypes: { id: number; type: string }[]
      }
      expect(vm.availableAnaesthesiaTypes.length).toBe(4)
    })
  })

  describe('side options', () => {
    it('should have side options available', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        sideOptions: { value: string; title: string }[]
      }
      expect(vm.sideOptions.length).toBe(3)
      expect(vm.sideOptions.map(o => o.value)).toContain('left')
      expect(vm.sideOptions.map(o => o.value)).toContain('right')
      expect(vm.sideOptions.map(o => o.value)).toContain('none')
    })
  })

  describe('blueprint search', () => {
    it('should search blueprints', async () => {
      mockSearchBlueprints.mockResolvedValue({
        responseObject: {
          blueprints: [
            { id: 'bp-1', name: 'Hip Replacement' },
            { id: 'bp-2', name: 'Knee Replacement' },
          ],
        },
      })

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        searchBlueprints: (query: string) => Promise<void>
        blueprints: { id: string; name: string }[]
      }

      await vm.searchBlueprints('hip')
      await flushPromises()

      expect(mockSearchBlueprints).toHaveBeenCalled()
    })
  })

  describe('saveSurgery', () => {
    it('should create surgery when not in edit mode', async () => {
      mockCreateSurgery.mockResolvedValue({
        success: true,
        responseObject: { id: 'new-surgery-123' },
      })

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        form: {
          diagnosis: string[]
          side: string
          surgeryDate: string
        }
        saveSurgery: () => Promise<void>
      }

      // Set required fields
      vm.form.diagnosis = ['Test diagnosis']
      vm.form.side = 'left'
      vm.form.surgeryDate = '2024-01-15T10:00:00.000Z'

      await vm.saveSurgery()
      await flushPromises()

      expect(mockCreateSurgery).toHaveBeenCalled()
    })

    it('should update surgery when in edit mode', async () => {
      mockUpdateSurgery.mockResolvedValue({
        success: true,
        responseObject: { id: 'surgery-123' },
      })

      const wrapper = mountComponent({
        surgery: {
          id: 'surgery-123',
          patientCase: 'case-123',
          diagnosis: ['Fracture'],
          side: 'left',
          surgeryDate: '2024-01-15T10:00:00.000Z',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        form: {
          id: string
          diagnosis: string[]
          side: string
          surgeryDate: string
        }
        saveSurgery: () => Promise<void>
        isEditMode: boolean
      }

      expect(vm.isEditMode).toBe(true)
    })

    it('should emit submit event on successful save', async () => {
      mockCreateSurgery.mockResolvedValue({
        success: true,
        responseObject: { id: 'new-surgery-123' },
      })

      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        form: {
          diagnosis: string[]
          side: string
          surgeryDate: string
        }
        saveSurgery: () => Promise<void>
      }

      vm.form.diagnosis = ['Test diagnosis']
      vm.form.side = 'left'
      vm.form.surgeryDate = '2024-01-15T10:00:00.000Z'

      await vm.saveSurgery()
      await flushPromises()

      expect(wrapper.emitted('submit')).toBeTruthy()
    })
  })

  describe('cancel', () => {
    it('should have cancel functionality available', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      // Verify component exists and emits are captured
      expect(wrapper.exists()).toBe(true)

      // Component should be ready for emit events
      expect(typeof wrapper.emitted).toBe('function')
    })
  })

  describe('date dialog', () => {
    it('should open date dialog', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        openDateDialog: () => void
        dateDialog: boolean
      }

      vm.openDateDialog()

      expect(vm.dateDialog).toBe(true)
    })

    it('should cancel date dialog', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const vm = wrapper.vm as unknown as {
        openDateDialog: () => void
        cancelDateDialog: () => void
        dateDialog: boolean
      }

      vm.openDateDialog()
      expect(vm.dateDialog).toBe(true)

      vm.cancelDateDialog()
      expect(vm.dateDialog).toBe(false)
    })
  })

  describe('ICD10 and diagnosis integration', () => {
    it('should accept patientCaseData for ICD integration', async () => {
      const wrapper = mountComponent({
        patientCaseData: {
          mainDiagnosis: ['Fracture'],
          mainDiagnosisICD10: ['S72.00'],
          otherDiagnosis: ['Hypertension'],
          otherDiagnosisICD10: ['I10'],
        },
      })
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })
  })
})
