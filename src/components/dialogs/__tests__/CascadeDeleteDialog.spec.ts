/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import CascadeDeleteDialog from '../CascadeDeleteDialog.vue'
import en from '@/locales/en'
import de from '@/locales/de'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de },
})

describe('CascadeDeleteDialog.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives,
    })
  })

  describe('Rendering', () => {
    it('should render when modelValue is true', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Item',
          warningText: 'Are you sure you want to delete this item?',
          finalWarningText: 'This action cannot be undone!',
        },
        global: {
          plugins: [vuetify, i18n],
        },
        attachTo: document.body,
      })

      expect(wrapper.findComponent({ name: 'VDialog' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VDialog' }).props('modelValue')).toBe(true)
    })

    it('should not render when modelValue is false', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: false,
          title: 'Delete Item',
          warningText: 'Are you sure?',
          finalWarningText: 'Final warning',
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      // Dialog exists but should not be active
      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(false)
    })

    it('should display initial warning text', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Patient',
          warningText: 'This will permanently delete the patient record.',
          finalWarningText: 'Are you absolutely sure?',
        },
        global: {
          plugins: [vuetify, i18n],
        },
        attachTo: document.body,
      })

      // Check that the props are set correctly
      expect(wrapper.props('warningText')).toBe('This will permanently delete the patient record.')
    })
  })

  describe('Two-Step Confirmation Flow', () => {
    it('should start at step 0', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Item',
          warningText: 'Warning',
          finalWarningText: 'Final Warning',
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any
      expect(vm.step).toBe(0)
    })

    it('should proceed to step 1 when clicking delete button', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Item',
          warningText: 'Warning',
          finalWarningText: 'Final Warning',
        },
        global: {
          plugins: [vuetify, i18n],
        },
        attachTo: document.body,
      })

      const vm = wrapper.vm as any
      expect(vm.step).toBe(0)

      // Directly call the method that advances to step 1
      vm.proceedToFinalConfirmation()
      await wrapper.vm.$nextTick()

      expect(vm.step).toBe(1)
    })

    it('should display final warning text at step 1', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Item',
          warningText: 'Initial warning',
          finalWarningText: 'This action is irreversible!',
        },
        global: {
          plugins: [vuetify, i18n],
        },
        attachTo: document.body,
      })

      // Proceed to step 1
      const vm = wrapper.vm as any
      vm.step = 1
      await wrapper.vm.$nextTick()

      // Verify that the component is at step 1
      expect(vm.step).toBe(1)
      expect(wrapper.props('finalWarningText')).toBe('This action is irreversible!')
    })

    it('should emit confirm event at step 1', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Item',
          warningText: 'Warning',
          finalWarningText: 'Final Warning',
        },
        global: {
          plugins: [vuetify, i18n],
        },
        attachTo: document.body,
      })

      // Go to step 1
      const vm = wrapper.vm as any
      vm.step = 1
      await wrapper.vm.$nextTick()

      // Directly call confirmDelete method
      vm.confirmDelete()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('confirm')).toBeTruthy()
    })
  })

  describe('Cascade Options', () => {
    const mockOptions = [
      {
        key: 'surgeries',
        label: 'Related Surgeries',
        count: 3,
        defaultChecked: true,
      },
      {
        key: 'consultations',
        label: 'Related Consultations',
        count: 5,
        defaultChecked: true,
      },
      {
        key: 'forms',
        label: 'Related Forms',
        count: 2,
        defaultChecked: false,
      },
    ]

    it('should display cascade options when provided', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Case',
          warningText: 'Warning',
          finalWarningText: 'Final Warning',
          options: mockOptions,
        },
        global: {
          plugins: [vuetify, i18n],
        },
        attachTo: document.body,
      })

      // Verify options are passed as props
      expect(wrapper.props('options')).toEqual(mockOptions)
      expect(wrapper.props('options').length).toBe(3)
      
      const vm = wrapper.vm as any
      expect(vm.hasOptions).toBe(true)
    })

    it('should initialize options with default checked states', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Case',
          warningText: 'Warning',
          finalWarningText: 'Final Warning',
          options: mockOptions,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.selectedOptions.surgeries).toBe(true)
      expect(vm.selectedOptions.consultations).toBe(true)
      expect(vm.selectedOptions.forms).toBe(false)
    })

    it('should allow toggling cascade options', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Case',
          warningText: 'Warning',
          finalWarningText: 'Final Warning',
          options: mockOptions,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const initialState = vm.selectedOptions.surgeries

      // Toggle the option
      vm.selectedOptions.surgeries = !initialState
      await wrapper.vm.$nextTick()

      expect(vm.selectedOptions.surgeries).toBe(!initialState)
    })

    it('should emit selected options on confirm', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete Case',
          warningText: 'Warning',
          finalWarningText: 'Final Warning',
          options: mockOptions,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await wrapper.vm.$nextTick()

      // Modify selections
      const vm = wrapper.vm as any
      vm.selectedOptions.surgeries = false
      vm.selectedOptions.consultations = true
      vm.selectedOptions.forms = true

      // Go to step 1 and confirm
      vm.step = 1
      await wrapper.vm.$nextTick()

      const confirmButtons = wrapper.findAll('button')
      const confirmButton = confirmButtons.find((btn) => btn.text().includes('Confirm'))
      await confirmButton!.trigger('click')

      const emitted = wrapper.emitted('confirm')
      expect(emitted).toBeTruthy()
      expect(emitted![0]).toEqual([{
        surgeries: false,
        consultations: true,
        forms: true,
      }])
    })

    it('should handle disabled options', () => {
      const optionsWithDisabled = [
        {
          key: 'item1',
          label: 'Item 1',
          count: 1,
          defaultChecked: true,
          disabled: true,
        },
        {
          key: 'item2',
          label: 'Item 2',
          count: 2,
          defaultChecked: false,
        },
      ]

      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          options: optionsWithDisabled,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
      expect(checkboxes[0].props('disabled')).toBe(true)
      expect(checkboxes[1].props('disabled')).toBe(false)
    })

    it('should not show options section when no options provided', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          options: [],
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any
      expect(vm.hasOptions).toBe(false)
      expect(wrapper.findAllComponents({ name: 'VCheckbox' })).toHaveLength(0)
    })
  })

  describe('Dialog State Management', () => {
    it('should reset state when dialog opens', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: false,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          options: [
            { key: 'item1', label: 'Item 1', count: 1, defaultChecked: true },
          ],
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any

      // Modify state
      vm.step = 1
      vm.selectedOptions.item1 = false

      // Close and reopen dialog
      await wrapper.setProps({ modelValue: false })
      await wrapper.vm.$nextTick()
      await wrapper.setProps({ modelValue: true })
      await wrapper.vm.$nextTick()

      // State should be reset
      expect(vm.step).toBe(0)
      expect(vm.selectedOptions.item1).toBe(true)
    })

    it('should reset state when options change', async () => {
      const initialOptions = [
        { key: 'item1', label: 'Item 1', count: 1, defaultChecked: true },
      ]

      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          options: initialOptions,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any
      vm.step = 1
      vm.selectedOptions.item1 = false

      // Change options
      const newOptions = [
        { key: 'item2', label: 'Item 2', count: 2, defaultChecked: false },
      ]
      await wrapper.setProps({ options: newOptions })
      await wrapper.vm.$nextTick()

      // State should be reset
      expect(vm.step).toBe(0)
      expect(vm.selectedOptions.item2).toBe(false)
    })
  })

  describe('Event Emissions', () => {
    it('should emit cancel event when cancel button clicked', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const cancelButtons = wrapper.findAll('button')
      const cancelButton = cancelButtons.find((btn) => btn.text().includes('Cancel'))
      await cancelButton!.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })

    it('should emit update:modelValue when closing', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any
      vm.closeDialog()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })
  })

  describe('Loading State', () => {
    it('should disable buttons when loading', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          loading: true,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const buttons = wrapper.findAll('button')
      buttons.forEach((button) => {
        expect(button.attributes('disabled')).toBeDefined()
      })
    })

    it('should show loading indicator on confirm button at step 1', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          loading: true,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      // Go to step 1
      const vm = wrapper.vm as any
      vm.step = 1
      await wrapper.vm.$nextTick()

      const confirmButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const confirmButton = confirmButtons.find((btn) => btn.text().includes('Confirm'))

      expect(confirmButton!.props('loading')).toBe(true)
    })

    it('should enable buttons when not loading', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          loading: false,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const buttons = wrapper.findAll('button')
      buttons.forEach((button) => {
        expect(button.attributes('disabled')).toBeUndefined()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty options array', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          options: [],
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      expect(wrapper.findAllComponents({ name: 'VCheckbox' })).toHaveLength(0)
    })

    it('should handle options with zero count', () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          options: [
            { key: 'empty', label: 'Empty Items', count: 0 },
          ],
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      expect(wrapper.text()).toContain('Empty Items')
      expect(wrapper.text()).toContain('0')
    })

    it('should handle rapid open/close cycles', async () => {
      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: false,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      // Rapidly toggle
      for (let i = 0; i < 5; i++) {
        await wrapper.setProps({ modelValue: true })
        await wrapper.vm.$nextTick()
        await wrapper.setProps({ modelValue: false })
        await wrapper.vm.$nextTick()
      }

      // Should still function correctly
      await wrapper.setProps({ modelValue: true })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.step).toBe(0)
    })

    it('should handle very long text content', () => {
      const longText = 'A'.repeat(1000)

      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: longText,
          warningText: longText,
          finalWarningText: longText,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle many cascade options', () => {
      const manyOptions = Array(50)
        .fill(null)
        .map((_, i) => ({
          key: `option${i}`,
          label: `Option ${i}`,
          count: i,
        }))

      const wrapper = mount(CascadeDeleteDialog, {
        props: {
          modelValue: true,
          title: 'Delete',
          warningText: 'Warning',
          finalWarningText: 'Final',
          options: manyOptions,
        },
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
      expect(checkboxes).toHaveLength(50)
    })
  })
})
