import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'
import type { FormPlugin, FormData } from '@/forms/types'
import type { PatientFormData } from '@/types'
import type { ScoringData } from '@/types/backend/scoring'
import { h } from 'vue'
import type { Component } from 'vue'

// Mock the registry module
const mockGetFormPlugin = vi.fn()
vi.mock('@/forms/registry', () => ({
  getFormPlugin: (id: string) => mockGetFormPlugin(id)
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    hasRole: () => false
  })
}))

// Create a mock form component
const MockFormComponent: Component = {
  name: 'MockFormComponent',
  props: {
    modelValue: {
      type: Object,
      required: true
    },
    readonly: Boolean,
    locale: String
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', {
      class: 'mock-form',
      'data-testid': 'mock-form-component'
    }, [
      h('div', { class: 'form-data' }, JSON.stringify(props.modelValue)),
      h('button', {
        onClick: () => emit('update:modelValue', { test: { q1: 1 } })
      }, 'Update Data')
    ])
  }
}

// Create a mock plugin
const createMockPlugin = (): FormPlugin => ({
  metadata: {
    id: 'test-plugin-id',
    name: 'Test Plugin',
    description: 'A test plugin',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  component: MockFormComponent,
  translations: {
    en: { 'test.key': 'Test Value' },
    de: { 'test.key': 'Test Wert' }
  },
  calculateScore: (data: FormData): ScoringData => ({
    rawFormData: data,
    subscales: {},
    totalScore: {
      name: 'Total',
      rawScore: 0,
      normalizedScore: 0,
      maxScore: 0,
      answeredQuestions: 0,
      totalQuestions: 0,
      completionPercentage: 0,
      isComplete: false
    }
  }),
  validateFormData: () => true,
  getInitialData: () => ({ test: { q1: null } })
})

describe('PluginFormRenderer.vue', () => {
  let wrapper: VueWrapper
  let vuetify: ReturnType<typeof createVuetify>
  let mockPlugin: FormPlugin

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives,
    })

    mockPlugin = createMockPlugin()
    mockGetFormPlugin.mockClear()
  })

  const mountComponent = (props: {
    templateId: string
    modelValue: PatientFormData | null
    readonly?: boolean
    locale?: string
  }) => {
    return mount(PluginFormRenderer, {
      props,
      global: {
        plugins: [vuetify],
      },
    })
  }

  describe('Plugin Loading', () => {
    it('should load plugin by templateId', () => {
      mockGetFormPlugin.mockReturnValue(mockPlugin)

      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: { test: { q1: null } } as unknown as PatientFormData
      })

      expect(mockGetFormPlugin).toHaveBeenCalledWith('test-plugin-id')
      expect(wrapper.find('[data-testid="mock-form-component"]').exists()).toBe(true)
    })

    it('should show error message when plugin not found', async () => {
      mockGetFormPlugin.mockReturnValue(undefined)

      wrapper = mountComponent({
        templateId: 'non-existent-plugin',
        modelValue: {} as unknown as PatientFormData
      })

      await wrapper.vm.$nextTick()

      const alert = wrapper.find('.v-alert')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Form Not Available')
      expect(alert.text()).toContain('non-existent-plugin')
    })

    it('should log error when plugin not found', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
      mockGetFormPlugin.mockReturnValue(undefined)

      wrapper = mountComponent({
        templateId: 'missing-plugin',
        modelValue: {} as unknown as PatientFormData
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PluginFormRenderer] Plugin not found: missing-plugin')
      )

      consoleSpy.mockRestore()
    })

    it('should log success when plugin loaded', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockGetFormPlugin.mockReturnValue(mockPlugin)

      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PluginFormRenderer] Loaded plugin: Test Plugin')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Props Passing', () => {
    beforeEach(() => {
      mockGetFormPlugin.mockReturnValue(mockPlugin)
    })

    it('should pass modelValue prop to plugin component', () => {
      const formData = { test: { q1: 2 } }

      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {
          rawFormData: formData,
          fillStatus: 'draft',
          beginFill: null,
          completedAt: null
        } as unknown as PatientFormData
      })

      const mockForm = wrapper.findComponent(MockFormComponent)
      expect(mockForm.props('modelValue')).toEqual(formData)
    })

    it('should pass readonly prop to plugin component', () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData,
        readonly: true
      })

      const mockForm = wrapper.findComponent(MockFormComponent)
      expect(mockForm.props('readonly')).toBe(true)
    })

    it('should default readonly to false', () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData
      })

      const mockForm = wrapper.findComponent(MockFormComponent)
      expect(mockForm.props('readonly')).toBe(false)
    })

    it('should pass locale prop to plugin component', () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData,
        locale: 'de'
      })

      const mockForm = wrapper.findComponent(MockFormComponent)
      expect(mockForm.props('locale')).toBe('de')
    })

    it('should default locale to "en"', () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData
      })

      const mockForm = wrapper.findComponent(MockFormComponent)
      expect(mockForm.props('locale')).toBe('en')
    })
  })

  describe('Event Handling', () => {
    beforeEach(() => {
      mockGetFormPlugin.mockReturnValue(mockPlugin)
    })

    it('should emit update:modelValue when plugin component emits it', async () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData
      })

      const updateButton = wrapper.find('button')
      await updateButton.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(
        expect.objectContaining({
          test: { q1: 1 },
          beginFill: expect.any(Date)
        })
      )
    })
  })

  describe('Reactivity', () => {
    beforeEach(() => {
      mockGetFormPlugin.mockReturnValue(mockPlugin)
    })

    it('should update plugin component when modelValue prop changes', async () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {
          rawFormData: { test: { q1: 1 } },
          fillStatus: 'draft',
          beginFill: null,
          completedAt: null
        } as unknown as PatientFormData
      })

      const newData = { test: { q1: 2 } }
      await wrapper.setProps({
        modelValue: {
          rawFormData: newData,
          fillStatus: 'draft',
          beginFill: null,
          completedAt: null
        } as unknown as PatientFormData
      })

      const mockForm = wrapper.findComponent(MockFormComponent)
      expect(mockForm.props('modelValue')).toEqual(newData)
    })

    it('should update plugin component when readonly prop changes', async () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData,
        readonly: false
      })

      await wrapper.setProps({ readonly: true })

      const mockForm = wrapper.findComponent(MockFormComponent)
      expect(mockForm.props('readonly')).toBe(true)
    })

    it('should update plugin component when locale prop changes', async () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData,
        locale: 'en'
      })

      await wrapper.setProps({ locale: 'de' })

      const mockForm = wrapper.findComponent(MockFormComponent)
      expect(mockForm.props('locale')).toBe('de')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty modelValue', () => {
      mockGetFormPlugin.mockReturnValue(mockPlugin)

      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData
      })

      expect(wrapper.find('[data-testid="mock-form-component"]').exists()).toBe(true)
    })

    it('should handle plugin with missing component gracefully', () => {
      const brokenPlugin = { ...mockPlugin, component: undefined }
      mockGetFormPlugin.mockReturnValue(brokenPlugin as unknown as FormPlugin)

      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData
      })

      // Should show loading state or handle gracefully
      expect(wrapper.find('.v-progress-circular').exists() ||
        wrapper.find('.v-alert').exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockGetFormPlugin.mockReturnValue(mockPlugin)
    })

    it('should have proper wrapper element', () => {
      wrapper = mountComponent({
        templateId: 'test-plugin-id',
        modelValue: {} as unknown as PatientFormData
      })

      expect(wrapper.find('.plugin-form-renderer').exists()).toBe(true)
    })

    it('should display error alert with proper semantics', () => {
      mockGetFormPlugin.mockReturnValue(undefined)

      wrapper = mountComponent({
        templateId: 'missing',
        modelValue: {} as unknown as PatientFormData
      })

      const alert = wrapper.find('.v-alert')
      expect(alert.exists()).toBe(true)
      // Vuetify's v-alert with type="error" adds appropriate classes
      expect(alert.classes()).toContain('v-alert')
    })
  })
})
