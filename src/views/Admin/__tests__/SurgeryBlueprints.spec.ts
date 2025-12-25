/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import SurgeryBlueprints from '../SurgeryBlueprints.vue'
import { blueprintApi } from '@/api'
import en from '@/locales/en'
import de from '@/locales/de'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de }
})

describe('SurgeryBlueprints.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>
  let wrapper: VueWrapper<any>

  const mockSurgeryBlueprints = [
    {
      id: '1',
      v: 1,
      createdOn: '2024-01-01',
      createdBy: 'admin',
      blueprintFor: 'surgery',
      title: 'Hallux Valgus Correction',
      timeDelta: '0',
      description: 'Standard hallux valgus correction procedure',
      content: {
        diagnosis: ['Hallux Valgus'],
        diagnosisICD10: ['M20.1'],
        therapy: 'Scarf Osteotomy',
        OPSCodes: ['5-788.00'],
        consultations: ['cons1', 'cons2'],
        additionalData: [{ note: 'Pre-op planning required', dateCreated: '2024-01-01' }]
      },
      tags: ['surgery', 'template']
    },
    {
      id: '2',
      v: 1,
      createdOn: '2024-01-02',
      createdBy: 'admin',
      blueprintFor: 'surgery',
      title: 'Archived Surgery',
      timeDelta: '0',
      description: 'Archived procedure',
      content: {
        diagnosis: ['Test'],
        therapy: 'Test Therapy',
        consultations: []
      },
      tags: ['surgery', 'template', 'archived']
    }
  ]

  const mockConsultationBlueprints = [
    { id: 'cons1', title: '6 Week Follow-up', description: '6 week post-op consultation' },
    { id: 'cons2', title: '3 Month Follow-up', description: '3 month post-op consultation' },
    { id: 'cons3', title: '6 Month Follow-up', description: '6 month post-op consultation' }
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createVuetify({ components, directives })

    // Mock ResizeObserver
    global.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    }

    // Mock visualViewport for Vuetify dialogs
    Object.defineProperty(window, 'visualViewport', {
      value: {
        width: 1024,
        height: 768,
        offsetLeft: 0,
        offsetTop: 0,
        scale: 1,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      writable: true,
      configurable: true
    })

    // Mock API calls
    vi.spyOn(blueprintApi, 'getBlueprints').mockImplementation((params: any) => {
      if (params.blueprintFor === 'surgery') {
        return Promise.resolve({
          responseObject: { blueprints: mockSurgeryBlueprints }
        } as any)
      } else if (params.blueprintFor === 'consultation') {
        return Promise.resolve({
          responseObject: {
            blueprints: mockConsultationBlueprints.map(cb => ({
              ...cb,
              blueprintFor: 'consultation',
              tags: ['consultation']
            }))
          }
        } as any)
      }
      return Promise.resolve({ responseObject: { blueprints: [] } } as any)
    })

    vi.spyOn(blueprintApi, 'createBlueprint').mockResolvedValue({
      responseObject: { id: '3' }
    } as any)

    vi.spyOn(blueprintApi, 'updateBlueprint').mockResolvedValue({
      responseObject: {}
    } as any)
  })

  const mountComponent = () => {
    return mount(SurgeryBlueprints, {
      global: {
        plugins: [vuetify, i18n],
        stubs: {
          'v-data-table': false
        }
      }
    })
  }

  describe('Component Initialization', () => {
    it('renders the component with title', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Surgery Blueprints')
    })

    it('fetches surgery blueprints on mount', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.getBlueprints).toHaveBeenCalledWith({
        blueprintFor: 'surgery',
        limit: '100'
      })
    })

    it('fetches consultation blueprints on mount', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.getBlueprints).toHaveBeenCalledWith({
        blueprintFor: 'consultation',
        limit: '100'
      })
    })

    it('displays active blueprints by default', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Hallux Valgus Correction')
      expect(wrapper.text()).not.toContain('Archived Surgery')
    })

    it('displays consultation blueprint names for surgery', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('6 Week Follow-up')
      expect(wrapper.text()).toContain('3 Month Follow-up')
    })
  })

  describe('Show/Hide Archived Blueprints', () => {
    it('shows archived blueprints when toggle is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const toggleButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Show Archived')
      )
      expect(toggleButton).toBeDefined()

      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Hallux Valgus Correction')
      expect(wrapper.text()).toContain('Archived Surgery')
    })

    it('hides archived blueprints when toggle is clicked again', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const toggleButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Show Archived')
      )

      // Show archived
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Archived Surgery')

      // Hide archived again
      const hideButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Hide Archived')
      )
      await hideButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain('Archived Surgery')
    })
  })

  describe('Create Blueprint Dialog', () => {
    it('opens create dialog when add button is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const addButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Add Blueprint')
      )
      await addButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialog).toBe(true)
      expect(wrapper.vm.editedIndex).toBe(-1)
    })

    it('creates a new blueprint with valid data', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.openCreateDialog()
      await wrapper.vm.$nextTick()

      // Set form values
      wrapper.vm.editedBlueprint = {
        title: 'New Surgery',
        description: 'New surgery description',
        therapy: 'New Therapy',
        diagnosis: ['New Diagnosis'],
        diagnosisICD10: ['M20.2'],
        opsCodes: ['5-788.01'],
        notes: 'Test notes'
      }
      wrapper.vm.selectedConsultationBlueprints = ['cons1']

      // Mock form validation
      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.createBlueprint).toHaveBeenCalledWith({
        createBlueprintRequest: expect.objectContaining({
          blueprintFor: 'surgery',
          title: 'New Surgery',
          description: 'New surgery description'
        })
      })
    })

    it('closes dialog on cancel', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.openCreateDialog()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialog).toBe(true)

      wrapper.vm.closeDialog()
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 350))

      expect(wrapper.vm.dialog).toBe(false)
    })
  })

  describe('Edit Blueprint', () => {
    it('opens edit dialog when clicking on a blueprint row', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Simulate row click
      const blueprint = { ...mockSurgeryBlueprints[0], isArchived: false }
      wrapper.vm.handleRowClick(null as any, { item: blueprint })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialog).toBe(true)
      expect(wrapper.vm.editedBlueprint.title).toBe('Hallux Valgus Correction')
    })

    it('does not open edit dialog for archived blueprints', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const archivedBlueprint = { ...mockSurgeryBlueprints[1], isArchived: true }
      wrapper.vm.handleRowClick(null as any, { item: archivedBlueprint })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialog).toBe(false)
    })

    it('updates blueprint with valid data', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Map blueprint with isArchived flag
      const blueprint = {
        ...mockSurgeryBlueprints[0],
        isArchived: false
      }
      wrapper.vm.blueprints = [blueprint]
      wrapper.vm.openEditDialog(blueprint)
      await wrapper.vm.$nextTick()

      wrapper.vm.editedBlueprint.title = 'Updated Surgery'

      // Mock form validation
      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '1',
        updateBlueprintRequest: expect.objectContaining({
          title: 'Updated Surgery'
        })
      })
    })
  })

  describe('Archive Blueprint', () => {
    it('opens archive confirmation dialog', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = mockSurgeryBlueprints[0]
      wrapper.vm.confirmArchive(blueprint)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.archiveDialog).toBe(true)
      expect(wrapper.vm.blueprintToArchive).toStrictEqual(blueprint)
    })

    it('shows final archive confirmation', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = mockSurgeryBlueprints[0]
      wrapper.vm.confirmArchive(blueprint)
      await wrapper.vm.$nextTick()

      wrapper.vm.showFinalArchiveConfirmation()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.archiveDialog).toBe(false)
      expect(wrapper.vm.archiveDialogSecond).toBe(true)
    })

    it('archives blueprint successfully', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = mockSurgeryBlueprints[0]
      wrapper.vm.blueprintToArchive = blueprint

      await wrapper.vm.archiveBlueprint()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '1',
        updateBlueprintRequest: {
          tags: expect.arrayContaining(['archived'])
        }
      })
    })

    it('cancels archive operation', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = mockSurgeryBlueprints[0]
      wrapper.vm.confirmArchive(blueprint)
      await wrapper.vm.$nextTick()

      wrapper.vm.cancelArchive()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.archiveDialog).toBe(false)
      expect(wrapper.vm.archiveDialogSecond).toBe(false)
      expect(wrapper.vm.blueprintToArchive).toBe(null)
    })
  })

  describe('Unarchive Blueprint', () => {
    it('unarchives blueprint successfully', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const archivedBlueprint = mockSurgeryBlueprints[1]
      await wrapper.vm.unarchiveBlueprint(archivedBlueprint)
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '2',
        updateBlueprintRequest: {
          tags: expect.not.arrayContaining(['archived'])
        }
      })
    })
  })

  describe('Validation', () => {
    it('validates required fields', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const rules = wrapper.vm.rules

      // Test required rule with empty string
      expect(rules.required('')).toBe('This field is required')

      // Test required rule with value
      expect(rules.required('Value')).toBe(true)

      // Test required rule with empty array
      expect(rules.required([])).toBe('This field is required')

      // Test required rule with array with values
      expect(rules.required(['Value'])).toBe(true)
    })

    it('does not save when validation fails', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.openCreateDialog()
      await wrapper.vm.$nextTick()

      // Mock form validation to fail
      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: false })
      }

      await wrapper.vm.saveBlueprint()

      expect(blueprintApi.createBlueprint).not.toHaveBeenCalled()
    })
  })

  describe('Helper Functions', () => {
    it('gets consultation blueprint name by id', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const name = wrapper.vm.getConsultationBlueprintName('cons1')
      expect(name).toBe('6 Week Follow-up')
    })

    it('returns id when consultation blueprint not found', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const name = wrapper.vm.getConsultationBlueprintName('unknown')
      expect(name).toBe('unknown')
    })
  })

  describe('Error Handling', () => {
    it('handles fetch error gracefully', async () => {
      vi.spyOn(blueprintApi, 'getBlueprints').mockRejectedValue(new Error('Network error'))
      vi.spyOn(console, 'error').mockImplementation(() => { })

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(console.error).toHaveBeenCalledWith(
        'Error fetching surgery blueprints:',
        expect.any(Error)
      )
    })

    it('handles create error gracefully', async () => {
      vi.spyOn(blueprintApi, 'createBlueprint').mockRejectedValue(new Error('Create failed'))
      vi.spyOn(console, 'error').mockImplementation(() => { })

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.editedBlueprint = {
        title: 'New Surgery',
        description: 'Description',
        therapy: 'Therapy',
        diagnosis: ['Diagnosis'],
        diagnosisICD10: [],
        opsCodes: [],
        notes: ''
      }

      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()
      await wrapper.vm.$nextTick()

      expect(console.error).toHaveBeenCalledWith(
        'Error saving surgery blueprint:',
        expect.any(Error)
      )
    })
  })

  describe('Computed Properties', () => {
    it('computes dialog title for create mode', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      wrapper.vm.editedIndex = -1
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialogTitle).toContain('Create')
    })

    it('computes dialog title for edit mode', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      wrapper.vm.editedIndex = 0
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialogTitle).toContain('Edit')
    })

    it('filters blueprints based on archived status', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Initially hide archived
      expect(wrapper.vm.filteredBlueprints.length).toBe(1)
      expect(wrapper.vm.filteredBlueprints[0].title).toBe('Hallux Valgus Correction')

      // Show archived
      wrapper.vm.showArchived = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filteredBlueprints.length).toBe(2)
    })
  })
})
