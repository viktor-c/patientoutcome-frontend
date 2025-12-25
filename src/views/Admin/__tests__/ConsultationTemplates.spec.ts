/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ConsultationTemplates from '../ConsultationTemplates.vue'
import { blueprintApi, formtemplateApi } from '@/api'
import en from '@/locales/en'
import de from '@/locales/de'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de }
})

describe('ConsultationTemplates.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>
  let wrapper: VueWrapper<any>

  const mockTemplates = [
    {
      id: '1',
      v: 1,
      createdOn: '2024-01-01',
      createdBy: 'admin',
      blueprintFor: 'consultation',
      title: 'Template 1',
      timeDelta: '+6W',
      description: 'Test template 1',
      content: {
        formTemplates: ['form1', 'form2'],
        notes: [{ note: 'Test note', dateCreated: '2024-01-01' }]
      },
      tags: ['consultation', 'template']
    },
    {
      id: '2',
      v: 1,
      createdOn: '2024-01-02',
      createdBy: 'admin',
      blueprintFor: 'consultation',
      title: 'Archived Template',
      timeDelta: '+3M',
      description: 'Archived template',
      content: {
        formTemplates: ['form1'],
        notes: []
      },
      tags: ['consultation', 'template', 'archived']
    }
  ]

  const mockFormTemplates = [
    { id: 'form1', title: 'MOXFQ', description: 'Manchester-Oxford Foot Questionnaire' },
    { id: 'form2', title: 'EQ-5D', description: 'EuroQol 5 Dimension' },
    { id: 'form3', title: 'SF-36', description: 'Short Form 36' }
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
    vi.spyOn(blueprintApi, 'getBlueprints').mockResolvedValue({
      responseObject: { blueprints: mockTemplates }
    } as any)

    vi.spyOn(formtemplateApi, 'getFormTemplatesShortlist').mockResolvedValue({
      responseObject: mockFormTemplates
    } as any)
  })

  const mountComponent = () => {
    return mount(ConsultationTemplates, {
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

      expect(wrapper.text()).toContain('Consultation Templates')
    })

    it('fetches templates on mount', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.getBlueprints).toHaveBeenCalledWith({
        blueprintFor: 'consultation',
        limit: '100'
      })
    })

    it('fetches form templates on mount', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(formtemplateApi.getFormTemplatesShortlist).toHaveBeenCalled()
    })

    it('displays active templates by default', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Template 1')
      expect(wrapper.text()).not.toContain('Archived Template')
    })
  })

  describe('Show/Hide Archived Templates', () => {
    it('shows archived templates when toggle is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const toggleButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Show Archived')
      )
      expect(toggleButton).toBeDefined()
      
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Template 1')
      expect(wrapper.text()).toContain('Archived Template')
    })

    it('hides archived templates when toggle is clicked again', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const toggleButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Show Archived')
      )
      
      // Show archived
      await toggleButton?.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Archived Template')

      // Hide archived again
      const hideButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Hide Archived')
      )
      await hideButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain('Archived Template')
    })
  })

  describe('Create Template Dialog', () => {
    it('opens create dialog when add button is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const addButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add Template')
      )
      await addButton?.trigger('click')
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.dialog).toBe(true)
      expect(vm.editedIndex).toBe(-1)
    })

    it('closes dialog when cancel is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const addButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add Template')
      )
      await addButton?.trigger('click')
      await wrapper.vm.$nextTick()

      const cancelButton = wrapper.findAll('button').find(btn => 
        btn.text() === 'Cancel'
      )
      await cancelButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain('Create Template')
    })

    it('creates new template when form is submitted', async () => {
      vi.spyOn(blueprintApi, 'createBlueprint').mockResolvedValue({
        responseObject: { id: '3' }
      } as any)

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Open dialog
      const addButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add Template')
      )
      await addButton?.trigger('click')
      await wrapper.vm.$nextTick()

      // Fill form
      const vm = wrapper.vm as any
      vm.editedTemplate.title = 'New Template'
      vm.editedTemplate.description = 'New description'
      vm.editedTemplate.timeDelta = '+1Y'
      vm.editedTemplate.notes = 'Test notes'
      vm.selectedFormTemplates = ['form1', 'form2']

      await wrapper.vm.$nextTick()

      // Submit
      await vm.saveTemplate()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.createBlueprint).toHaveBeenCalledWith({
        createBlueprintRequest: expect.objectContaining({
          blueprintFor: 'consultation',
          title: 'New Template',
          description: 'New description',
          timeDelta: '+1Y',
          content: expect.objectContaining({
            formTemplates: ['form1', 'form2']
          })
        })
      })
    })
  })

  describe('Edit Template Dialog', () => {
    it('opens edit dialog when row is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const template = vm.templates[0]
      
      vm.handleRowClick({} as PointerEvent, { item: template })
      await wrapper.vm.$nextTick()

      expect(vm.dialog).toBe(true)
      expect(vm.editedIndex).toBeGreaterThan(-1)
    })

    it('does not open edit dialog when archived row is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      
      // Show archived first
      vm.showArchived = true
      await wrapper.vm.$nextTick()

      const archivedTemplate = vm.templates.find((t: any) => t.isArchived)
      vm.handleRowClick({} as PointerEvent, { item: archivedTemplate })
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).not.toContain('Edit Template')
    })

    it('shows warning when form templates are changed', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const template = vm.templates[0]
      
      vm.openEditDialog(template)
      await wrapper.vm.$nextTick()

      // Initially no warning
      expect(vm.formTemplatesChanged).toBe(false)

      // Change form templates
      vm.selectedFormTemplates = ['form1'] // Remove form2
      await wrapper.vm.$nextTick()

      // Warning should be triggered
      expect(vm.formTemplatesChanged).toBe(true)
    })

    it('updates template when form is submitted', async () => {
      vi.spyOn(blueprintApi, 'updateBlueprint').mockResolvedValue({
        responseObject: { id: '1' }
      } as any)

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const template = vm.templates[0]
      
      vm.openEditDialog(template)
      await wrapper.vm.$nextTick()

      // Modify template
      vm.editedTemplate.title = 'Updated Template'
      await wrapper.vm.$nextTick()

      // Submit
      await vm.saveTemplate()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '1',
        updateBlueprintRequest: expect.objectContaining({
          title: 'Updated Template'
        })
      })
    })
  })

  describe('Archive Template', () => {
    it('opens archive confirmation dialog when delete button is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const template = vm.templates[0]
      
      vm.confirmArchive(template)
      await wrapper.vm.$nextTick()

      expect(vm.archiveDialog).toBe(true)
      expect(vm.templateToArchive).toBe(template)
    })

    it('shows second confirmation dialog', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const template = vm.templates[0]
      
      vm.confirmArchive(template)
      await wrapper.vm.$nextTick()

      vm.confirmArchiveSecondStep()
      await wrapper.vm.$nextTick()

      expect(vm.archiveDialog).toBe(false)
      expect(vm.archiveDialogSecond).toBe(true)
    })

    it('archives template when confirmed', async () => {
      vi.spyOn(blueprintApi, 'updateBlueprint').mockResolvedValue({
        responseObject: { id: '1' }
      } as any)

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const template = vm.templates[0]
      
      vm.templateToArchive = template
      await vm.archiveTemplate()
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '1',
        updateBlueprintRequest: {
          tags: expect.arrayContaining(['archived'])
        }
      })
    })

    it('cancels archive when cancel is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const template = vm.templates[0]
      
      vm.confirmArchive(template)
      await wrapper.vm.$nextTick()

      vm.cancelArchive()
      await wrapper.vm.$nextTick()

      expect(vm.archiveDialog).toBe(false)
      expect(vm.archiveDialogSecond).toBe(false)
      expect(vm.templateToArchive).toBeNull()
    })
  })

  describe('Unarchive Template', () => {
    it('unarchives template when restore button is clicked', async () => {
      vi.spyOn(blueprintApi, 'updateBlueprint').mockResolvedValue({
        responseObject: { id: '2' }
      } as any)

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      
      // Show archived
      vm.showArchived = true
      await wrapper.vm.$nextTick()

      const archivedTemplate = vm.templates.find((t: any) => t.isArchived)
      await vm.unarchiveTemplate(archivedTemplate)
      await wrapper.vm.$nextTick()

      expect(blueprintApi.updateBlueprint).toHaveBeenCalledWith({
        id: '2',
        updateBlueprintRequest: {
          tags: expect.not.arrayContaining(['archived'])
        }
      })
    })
  })

  describe('Form Template Display', () => {
    it('displays form template names in chips', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('MOXFQ')
      expect(wrapper.text()).toContain('EQ-5D')
    })

    it('shows "No forms selected" when no form templates', async () => {
      const templatesWithoutForms = [{
        ...mockTemplates[0],
        content: { ...mockTemplates[0].content, formTemplates: [] }
      }]

      vi.spyOn(blueprintApi, 'getBlueprints').mockResolvedValue({
        responseObject: { blueprints: templatesWithoutForms }
      } as any)

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('No forms selected')
    })

    it('resolves form template names by ID', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const name = vm.getFormTemplateName('form1')
      
      expect(name).toBe('MOXFQ')
    })

    it('returns ID when form template not found', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const name = vm.getFormTemplateName('unknown-id')
      
      expect(name).toBe('unknown-id')
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      // Open create dialog
      const addButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add Template')
      )
      await addButton?.trigger('click')
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      
      // Try to save without filling fields
      const result = await vm.formRef.validate()
      
      expect(result.valid).toBe(false)
    })

    it('validates time delta format', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      
      // Valid formats
      expect(vm.rules.timeDelta('+6W')).toBe(true)
      expect(vm.rules.timeDelta('+3M')).toBe(true)
      expect(vm.rules.timeDelta('+1Y')).toBe(true)
      expect(vm.rules.timeDelta('+7d')).toBe(true)
      expect(vm.rules.timeDelta('-2W')).toBe(true)
      expect(vm.rules.timeDelta('6W')).toBe(true) // Also valid without sign

      // Invalid formats
      expect(typeof vm.rules.timeDelta('+6')).toBe('string') // Returns error message
      expect(typeof vm.rules.timeDelta('invalid')).toBe('string') // Returns error message
      expect(typeof vm.rules.timeDelta('')).toBe('string') // Returns error message for empty
    })
  })

  describe('Action Button Click Prevention', () => {
    it('prevents row click when action button is clicked', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const openEditDialogSpy = vi.spyOn(vm, 'openEditDialog')
      
      // Simulate clicking delete button (should not trigger edit)
      const template = vm.templates[0]
      vm.confirmArchive(template)
      await wrapper.vm.$nextTick()

      expect(openEditDialogSpy).not.toHaveBeenCalled()
      expect(vm.archiveDialog).toBe(true)
    })
  })
})
