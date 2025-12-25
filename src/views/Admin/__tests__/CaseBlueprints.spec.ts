/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import CaseBlueprints from '../CaseBlueprints.vue'
import { blueprintApi } from '@/api'
import en from '@/locales/en'
import de from '@/locales/de'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de }
})

describe('CaseBlueprints.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>
  let wrapper: VueWrapper<any>

  const mockCaseBlueprints = [
    {
      id: '1',
      v: 1,
      createdOn: '2024-01-01',
      createdBy: 'admin',
      blueprintFor: 'case',
      title: 'Standard Hallux Valgus Case',
      timeDelta: 'x',
      description: 'Standard case for hallux valgus treatment',
      content: {
        mainDiagnosis: ['Hallux Valgus'],
        mainDiagnosisICD10: ['M20.1'],
        studyDiagnosis: ['Moderate deformity'],
        studyDiagnosisICD10: ['M20.10'],
        otherDiagnosis: ['None'],
        otherDiagnosisICD10: [],
        surgeries: ['surgery1'],
        consultations: ['cons1', 'cons2'],
        medicalHistory: 'Previous conservative treatment failed',
        notes: [{ note: 'Standard protocol', dateCreated: '2024-01-01' }]
      },
      tags: ['case', 'patient-care', 'template']
    },
    {
      id: '2',
      v: 1,
      createdOn: '2024-01-02',
      createdBy: 'admin',
      blueprintFor: 'case',
      title: 'Archived Case',
      timeDelta: 'x',
      description: 'Archived case blueprint',
      content: {
        mainDiagnosis: ['Test'],
        surgeries: [],
        consultations: []
      },
      tags: ['case', 'patient-care', 'template', 'archived']
    }
  ]

  const mockSurgeryBlueprints = [
    { id: 'surgery1', title: 'Scarf Osteotomy', description: 'Standard scarf procedure' },
    { id: 'surgery2', title: 'Chevron Osteotomy', description: 'Standard chevron procedure' }
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
      if (params.blueprintFor === 'case') {
        return Promise.resolve({
          responseObject: { blueprints: mockCaseBlueprints }
        } as any)
      } else if (params.blueprintFor === 'surgery') {
        return Promise.resolve({
          responseObject: {
            blueprints: mockSurgeryBlueprints.map(sb => ({
              ...sb,
              blueprintFor: 'surgery',
              tags: ['surgery']
            }))
          }
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
    return mount(CaseBlueprints, {
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

      expect(wrapper.text()).toContain('Case Blueprints')
    })

    it('fetches case blueprints on mount', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.getBlueprints).toHaveBeenCalledWith({
        blueprintFor: 'case',
        limit: '100'
      })
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

      expect(wrapper.text()).toContain('Standard Hallux Valgus Case')
      expect(wrapper.text()).not.toContain('Archived Case')
    })

    it('displays diagnosis, surgery, and consultation information', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Hallux Valgus')
      expect(wrapper.text()).toContain('Scarf Osteotomy')
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

      expect(wrapper.text()).toContain('Standard Hallux Valgus Case')
      expect(wrapper.text()).toContain('Archived Case')
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
      expect(wrapper.text()).toContain('Archived Case')

      // Hide archived again
      const hideButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Hide Archived')
      )
      await hideButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain('Archived Case')
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
        title: 'New Case',
        description: 'New case description',
        mainDiagnosis: ['New Diagnosis'],
        mainDiagnosisICD10: ['M20.2'],
        studyDiagnosis: ['Study Dx'],
        studyDiagnosisICD10: ['M20.20'],
        otherDiagnosis: ['Other'],
        otherDiagnosisICD10: ['M20.21'],
        medicalHistory: 'Test history',
        notes: 'Test notes'
      }
      wrapper.vm.selectedSurgeryBlueprint = 'surgery1'
      wrapper.vm.selectedConsultationBlueprints = ['cons1']

      // Mock form validation
      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.createBlueprint).toHaveBeenCalledWith({
        createBlueprintRequest: expect.objectContaining({
          blueprintFor: 'case',
          title: 'New Case',
          description: 'New case description'
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
      const blueprint = { ...mockCaseBlueprints[0], isArchived: false }
      wrapper.vm.handleRowClick(null as any, { item: blueprint })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialog).toBe(true)
      expect(wrapper.vm.editedBlueprint.title).toBe('Standard Hallux Valgus Case')
    })

    it('does not open edit dialog for archived blueprints', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const archivedBlueprint = { ...mockCaseBlueprints[1], isArchived: true }
      wrapper.vm.handleRowClick(null as any, { item: archivedBlueprint })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dialog).toBe(false)
    })

    it('loads all blueprint data when editing', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = mockCaseBlueprints[0]
      wrapper.vm.openEditDialog(blueprint)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.editedBlueprint.title).toBe('Standard Hallux Valgus Case')
      expect(wrapper.vm.editedBlueprint.mainDiagnosis).toEqual(['Hallux Valgus'])
      expect(wrapper.vm.editedBlueprint.mainDiagnosisICD10).toEqual(['M20.1'])
      expect(wrapper.vm.editedBlueprint.studyDiagnosis).toEqual(['Moderate deformity'])
      expect(wrapper.vm.editedBlueprint.medicalHistory).toBe('Previous conservative treatment failed')
      expect(wrapper.vm.selectedSurgeryBlueprint).toBe('surgery1')
      expect(wrapper.vm.selectedConsultationBlueprints).toEqual(['cons1', 'cons2'])
    })

    it('updates blueprint with valid data', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = {
        ...mockCaseBlueprints[0],
        isArchived: false
      }
      wrapper.vm.blueprints = [blueprint]
      wrapper.vm.openEditDialog(blueprint)
      await wrapper.vm.$nextTick()

      wrapper.vm.editedBlueprint.title = 'Updated Case'

      // Mock form validation
      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '1',
        updateBlueprintRequest: expect.objectContaining({
          title: 'Updated Case'
        })
      })
    })

    it('preserves existing tags when updating', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = {
        ...mockCaseBlueprints[0],
        isArchived: false
      }
      wrapper.vm.blueprints = [blueprint]
      wrapper.vm.openEditDialog(blueprint)
      await wrapper.vm.$nextTick()

      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '1',
        updateBlueprintRequest: expect.objectContaining({
          tags: ['case', 'patient-care', 'template']
        })
      })
    })
  })

  describe('Archive Blueprint', () => {
    it('opens archive confirmation dialog', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = mockCaseBlueprints[0]
      wrapper.vm.confirmArchive(blueprint)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.archiveDialog).toBe(true)
      expect(wrapper.vm.blueprintToArchive).toStrictEqual(blueprint)
    })

    it('shows final archive confirmation', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = mockCaseBlueprints[0]
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

      const blueprint = mockCaseBlueprints[0]
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

      const blueprint = mockCaseBlueprints[0]
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

      const archivedBlueprint = mockCaseBlueprints[1]
      await wrapper.vm.unarchiveBlueprint(archivedBlueprint)
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '2',
        updateBlueprintRequest: {
          tags: expect.not.arrayContaining(['archived'])
        }
      })
    })

    it('does not unarchive if id is missing', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprintWithoutId = { ...mockCaseBlueprints[1], id: null }
      await wrapper.vm.unarchiveBlueprint(blueprintWithoutId)
      await wrapper.vm.$nextTick()

      // Should not call update if id is missing
      expect(blueprintApi.updateBlueprint).not.toHaveBeenCalledWith(
        expect.objectContaining({
          id: null
        })
      )
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
    it('gets surgery blueprint name by id', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const name = wrapper.vm.getSurgeryBlueprintName('surgery1')
      expect(name).toBe('Scarf Osteotomy')
    })

    it('returns id when surgery blueprint not found', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const name = wrapper.vm.getSurgeryBlueprintName('unknown')
      expect(name).toBe('unknown')
    })

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
        'Error fetching case blueprints:',
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
        title: 'New Case',
        description: 'Description',
        mainDiagnosis: ['Diagnosis'],
        mainDiagnosisICD10: [],
        studyDiagnosis: [],
        studyDiagnosisICD10: [],
        otherDiagnosis: [],
        otherDiagnosisICD10: [],
        medicalHistory: '',
        notes: ''
      }

      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()
      await wrapper.vm.$nextTick()

      expect(console.error).toHaveBeenCalledWith(
        'Error saving case blueprint:',
        expect.any(Error)
      )
    })

    it('handles archive error gracefully', async () => {
      vi.spyOn(blueprintApi, 'updateBlueprint').mockRejectedValue(new Error('Archive failed'))
      vi.spyOn(console, 'error').mockImplementation(() => { })

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const blueprint = mockCaseBlueprints[0]
      wrapper.vm.blueprintToArchive = blueprint

      await wrapper.vm.archiveBlueprint()
      await wrapper.vm.$nextTick()

      expect(console.error).toHaveBeenCalledWith(
        'Error archiving case blueprint:',
        expect.any(Error)
      )
    })

    it('handles unarchive error gracefully', async () => {
      vi.spyOn(blueprintApi, 'updateBlueprint').mockRejectedValue(new Error('Unarchive failed'))
      vi.spyOn(console, 'error').mockImplementation(() => { })

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const archivedBlueprint = mockCaseBlueprints[1]
      await wrapper.vm.unarchiveBlueprint(archivedBlueprint)
      await wrapper.vm.$nextTick()

      expect(console.error).toHaveBeenCalledWith(
        'Error unarchiving case blueprint:',
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
      expect(wrapper.vm.filteredBlueprints[0].title).toBe('Standard Hallux Valgus Case')

      // Show archived
      wrapper.vm.showArchived = true
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.filteredBlueprints.length).toBe(2)
    })
  })

  describe('Dialog Management', () => {
    it('resets form when closing dialog', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Open and fill form
      wrapper.vm.openCreateDialog()
      wrapper.vm.editedBlueprint.title = 'Test'
      wrapper.vm.selectedSurgeryBlueprint = 'surgery1'

      // Close dialog
      wrapper.vm.closeDialog()
      await new Promise(resolve => setTimeout(resolve, 350))

      expect(wrapper.vm.editedBlueprint.title).toBe('')
      expect(wrapper.vm.selectedSurgeryBlueprint).toBe(null)
      expect(wrapper.vm.editedIndex).toBe(-1)
    })

    it('opens create dialog with empty form', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.openCreateDialog()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.editedIndex).toBe(-1)
      expect(wrapper.vm.editedBlueprint.title).toBe('')
      expect(wrapper.vm.editedBlueprint.mainDiagnosis).toEqual([])
      expect(wrapper.vm.selectedSurgeryBlueprint).toBe(null)
      expect(wrapper.vm.selectedConsultationBlueprints).toEqual([])
      expect(wrapper.vm.dialog).toBe(true)
    })
  })

  describe('Data Structure', () => {
    it('correctly structures blueprint content when creating', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.editedBlueprint = {
        title: 'New Case',
        description: 'Description',
        mainDiagnosis: ['Dx1', 'Dx2'],
        mainDiagnosisICD10: ['ICD1'],
        studyDiagnosis: ['Study1'],
        studyDiagnosisICD10: ['SICD1'],
        otherDiagnosis: ['Other1'],
        otherDiagnosisICD10: ['OICD1'],
        medicalHistory: 'History',
        notes: 'Notes'
      }
      wrapper.vm.selectedSurgeryBlueprint = 'surgery1'
      wrapper.vm.selectedConsultationBlueprints = ['cons1', 'cons2']

      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()

      expect(blueprintApi.createBlueprint).toHaveBeenCalledWith({
        createBlueprintRequest: expect.objectContaining({
          content: expect.objectContaining({
            mainDiagnosis: ['Dx1', 'Dx2'],
            mainDiagnosisICD10: ['ICD1'],
            studyDiagnosis: ['Study1'],
            studyDiagnosisICD10: ['SICD1'],
            otherDiagnosis: ['Other1'],
            otherDiagnosisICD10: ['OICD1'],
            surgeries: ['surgery1'],
            consultations: ['cons1', 'cons2'],
            medicalHistory: 'History',
            notes: [expect.objectContaining({ note: 'Notes' })]
          })
        })
      })
    })

    it('handles empty notes array correctly', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      wrapper.vm.editedBlueprint = {
        title: 'New Case',
        description: 'Description',
        mainDiagnosis: ['Dx1'],
        mainDiagnosisICD10: [],
        studyDiagnosis: [],
        studyDiagnosisICD10: [],
        otherDiagnosis: [],
        otherDiagnosisICD10: [],
        medicalHistory: '',
        notes: ''
      }

      wrapper.vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true })
      }

      await wrapper.vm.saveBlueprint()

      expect(blueprintApi.createBlueprint).toHaveBeenCalledWith({
        createBlueprintRequest: expect.objectContaining({
          content: expect.objectContaining({
            notes: []
          })
        })
      })
    })
  })
})
