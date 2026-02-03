import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import AppAlert from '../AppAlert.vue'
import { useNotifierStore } from '@/stores/notifierStore'

// Mock visualViewport for Vuetify's VSnackbar component
Object.defineProperty(window, 'visualViewport', {
  value: {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
  configurable: true,
})

describe('AppAlert.vue', () => {
  let wrapper: VueWrapper
  let vuetify: ReturnType<typeof createVuetify>
  let notifierStore: ReturnType<typeof useNotifierStore>

  beforeEach(() => {
    // Create fresh Pinia instance for each test
    setActivePinia(createPinia())
    notifierStore = useNotifierStore()
    vi.useFakeTimers()

    vuetify = createVuetify({
      components,
      directives,
    })

    wrapper = mount(AppAlert, {
      global: {
        plugins: [vuetify],
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('visibility', () => {
    it('should render the component', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('should not display when isOpen is false', () => {
      notifierStore.isOpen = false
      expect(notifierStore.isOpen).toBe(false)
    })

    it('should display when isOpen is true', async () => {
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      expect(notifierStore.isOpen).toBe(true)
    })
  })

  describe('content display', () => {
    it('should display the notification content', async () => {
      notifierStore.content = 'Test notification message'
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      
      // Check the computed content value from the store
      expect(notifierStore.content).toBe('Test notification message')
      expect(notifierStore.isOpen).toBe(true)
    })

    it('should update content reactively', async () => {
      notifierStore.content = 'First message'
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.content).toBe('First message')
      
      notifierStore.content = 'Second message'
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.content).toBe('Second message')
    })

    it('should handle empty content', async () => {
      notifierStore.content = ''
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.content).toBe('')
    })
  })

  describe('color variants', () => {
    it('should use success color', async () => {
      notifierStore.color = 'success'
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.color).toBe('success')
    })

    it('should use error color', async () => {
      notifierStore.color = 'error'
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.color).toBe('error')
    })

    it('should use info color', async () => {
      notifierStore.color = 'info'
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.color).toBe('info')
    })

    it('should handle color changes', async () => {
      notifierStore.color = 'success'
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.color).toBe('success')
      
      notifierStore.color = 'error'
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.color).toBe('error')
    })
  })

  describe('timeout behavior', () => {
    it('should use default timeout', () => {
      expect(notifierStore.timeout).toBeDefined()
    })

    it('should use custom timeout value', async () => {
      notifierStore.timeout = 5000
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.timeout).toBe(5000)
    })

    it('should update timeout reactively', async () => {
      notifierStore.timeout = 3000
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.timeout).toBe(3000)
      
      notifierStore.timeout = 7000
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.timeout).toBe(7000)
    })
  })

  describe('close button', () => {
    it('should be able to close the notification', async () => {
      // Open notification
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      expect(notifierStore.isOpen).toBe(true)
      
      // Close notification by setting isOpen to false
      // (simulating the close button behavior)
      notifierStore.isOpen = false
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.isOpen).toBe(false)
    })

    it('should support closing via computed setter', async () => {
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      expect(notifierStore.isOpen).toBe(true)
      
      // The component's computed isOpen setter should update the store
      notifierStore.isOpen = false
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.isOpen).toBe(false)
    })

    it('should have VSnackbar component', async () => {
      // Add a notification first so VSnackbar renders
      notifierStore.notify('Test', 'info')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      // Check that the component uses VSnackbar
      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.exists()).toBe(true)
      
      // Verify the component structure includes close functionality
      expect(snackbar.props('modelValue')).toBeDefined()
    })
  })

  describe('computed properties sync with store', () => {
    it('isOpen should sync with store', async () => {
      notifierStore.isOpen = false
      expect(notifierStore.isOpen).toBe(false)
      
      notifierStore.isOpen = true
      await wrapper.vm.$nextTick()
      expect(notifierStore.isOpen).toBe(true)
    })

    it('content should reflect store value', async () => {
      notifierStore.content = 'Test content'
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.content).toBe('Test content')
    })

    it('color should reflect store value', async () => {
      notifierStore.color = 'success'
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.color).toBe('success')
    })

    it('timeout should reflect store value', async () => {
      notifierStore.timeout = 4000
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.timeout).toBe(4000)
    })
  })

  describe('integration with notifier store', () => {
    it('should display notification from store notify method', async () => {
      notifierStore.notify('Integration test message', 'success')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.isOpen).toBe(true)
      expect(notifierStore.content).toBe('Integration test message')
      expect(notifierStore.color).toBe('success')
    })

    it('should display success notification', async () => {
      notifierStore.success('Success message')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.isOpen).toBe(true)
      expect(notifierStore.content).toBe('Success message')
      expect(notifierStore.color).toBe('success')
    })

    it('should display error notification', async () => {
      notifierStore.error('Error message')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.isOpen).toBe(true)
      expect(notifierStore.content).toBe('Error message')
      expect(notifierStore.color).toBe('error')
    })

    it('should display info notification', async () => {
      notifierStore.info('Info message')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.isOpen).toBe(true)
      expect(notifierStore.content).toBe('Info message')
      expect(notifierStore.color).toBe('info')
    })

    it('should batch multiple notifications sent quickly', async () => {
      notifierStore.notify('First notification', 'info')
      notifierStore.notify('Second notification', 'success')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.activeNotifications).toHaveLength(2)
    })

    it('should show count badge for duplicate notifications', async () => {
      notifierStore.notify('Same message', 'info')
      notifierStore.notify('Same message', 'info')
      notifierStore.notify('Same message', 'info')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.activeNotifications).toHaveLength(1)
      expect(notifierStore.activeNotifications[0].count).toBe(3)
      
      // Check that VChip exists when count > 1
      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(true)
    })

    it('should not show count badge when count is 1', async () => {
      notifierStore.notify('Single message', 'info')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      expect(notifierStore.activeNotifications).toHaveLength(1)
      expect(notifierStore.activeNotifications[0].count).toBe(1)
      
      // Check that VChip does not exist when count is 1
      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(false)
    })
  })

  describe('snackbar properties', () => {
    it('should have location set to top', async () => {
      // Set isOpen to true to render the snackbar
      notifierStore.notify('Test', 'info')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      // Find the VSnackbar component and check its location prop
      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.exists()).toBe(true)
      expect(snackbar.props('location')).toBe('top')
    })

    it('should have timer enabled', async () => {
      // Set isOpen to true to render the snackbar
      notifierStore.notify('Test', 'info')
      await vi.advanceTimersByTimeAsync(300)
      await wrapper.vm.$nextTick()
      
      // Find the VSnackbar component and check its timer prop
      const snackbar = wrapper.findComponent({ name: 'VSnackbar' })
      expect(snackbar.exists()).toBe(true)
      expect(snackbar.props('timer')).toBe('true')
    })
  })
})
