/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ActivityLogView from '../ActivityLogView.vue'
import en from '@/locales/en'
import de from '@/locales/de'

const mockNotify = vi.fn()

vi.mock('@/stores/notifierStore', () => ({
  useNotifierStore: () => ({
    notify: mockNotify,
  }),
}))

vi.mock('@/utils/apiBaseUrl', () => ({
  resolveApiBaseUrl: vi.fn(() => 'http://localhost:3000'),
}))

// Mock EventSource
class MockEventSource {
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  readyState = 0
  CONNECTING = 0
  OPEN = 1
  CLOSED = 2

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = this.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  close() {
    this.readyState = this.CLOSED
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  // Helper method to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

let mockEventSourceInstance: MockEventSource | null = null

global.EventSource = vi.fn((url: string, options?: unknown) => {
  mockEventSourceInstance = new MockEventSource(url, options)
  return mockEventSourceInstance
}) as unknown as typeof EventSource

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de },
})

describe('ActivityLogView.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createVuetify({
      components,
      directives,
    })
    vi.clearAllMocks()
    mockEventSourceInstance = null
  })

  afterEach(() => {
    if (mockEventSourceInstance) {
      mockEventSourceInstance.close()
      mockEventSourceInstance = null
    }
  })

  describe('Initialization', () => {
    it('should render activity log dashboard', () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      expect(wrapper.find('.activity-log-dashboard').exists()).toBe(true)
      expect(wrapper.text()).toContain('Activity Log Dashboard')
    })

    it('should connect to EventSource on mount', async () => {
      mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      expect(global.EventSource).toHaveBeenCalledWith(
        'http://localhost:3000/activitylog/stream',
        { withCredentials: true }
      )
    })

    it('should show disconnected state initially', () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      expect(wrapper.text()).toContain('Disconnected')
    })

    it('should show connected state after EventSource opens', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('Connected')
    })

    it('should close EventSource on unmount', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      const closeSpy = vi.spyOn(mockEventSourceInstance!, 'close')

      wrapper.unmount()

      expect(closeSpy).toHaveBeenCalled()
    })
  })

  describe('Log Display', () => {
    it('should display received activity logs', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      const mockLog = {
        timestamp: new Date().toISOString(),
        username: 'testuser',
        action: 'User logged in',
        type: 'login',
        color: 'success',
      }

      mockEventSourceInstance!.simulateMessage(mockLog)
      await wrapper.vm.$nextTick()
      await flushPromises()

      expect(wrapper.text()).toContain('testuser')
      expect(wrapper.text()).toContain('User logged in')
    })

    it('should show log count', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      // Initially 0 logs
      expect(wrapper.text()).toContain('0 logs')

      // Add logs
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user1',
        action: 'Action 1',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user2',
        action: 'Action 2',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('2 logs')
    })

    it('should display log details when available', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'admin',
        action: 'Deleted user',
        details: 'Deleted user with ID: 123',
        type: 'warning',
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Deleted user with ID: 123')
    })

    it('should show newest logs first', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: '2024-01-01T10:00:00Z',
        username: 'user1',
        action: 'First action',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      mockEventSourceInstance!.simulateMessage({
        timestamp: '2024-01-01T11:00:00Z',
        username: 'user2',
        action: 'Second action',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      const filtered = vm.filteredLogs
      expect(filtered[0].action).toBe('Second action')
      expect(filtered[1].action).toBe('First action')
    })

    it('should display correct icon for each log type', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any

      expect(vm.getIconForType('login')).toBe('mdi-login')
      expect(vm.getIconForType('roleSwitch')).toBe('mdi-swap-horizontal')
      expect(vm.getIconForType('dashboard')).toBe('mdi-view-dashboard')
      expect(vm.getIconForType('formOpen')).toBe('mdi-file-document-edit')
      expect(vm.getIconForType('formSubmit')).toBe('mdi-check-circle')
      expect(vm.getIconForType('info')).toBe('mdi-information')
      expect(vm.getIconForType('warning')).toBe('mdi-alert')
      expect(vm.getIconForType('error')).toBe('mdi-alert-circle')
    })

    it('should format timestamp correctly', () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any
      const timestamp = '2024-01-15T14:30:45Z'
      const formatted = vm.formatTime(timestamp)

      // Should be in HH:MM:SS format
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('Filtering', () => {
    beforeEach(async () => {
      // Helper to setup logs for filtering tests
    })

    it('should filter logs by search query - username', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'alice',
        action: 'Action 1',
        type: 'info',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'bob',
        action: 'Action 2',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.searchQuery = 'alice'
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(1)
      expect(vm.filteredLogs[0].username).toBe('alice')
    })

    it('should filter logs by search query - action', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user1',
        action: 'logged in',
        type: 'login',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user2',
        action: 'submitted form',
        type: 'formSubmit',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.searchQuery = 'form'
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(1)
      expect(vm.filteredLogs[0].action).toBe('submitted form')
    })

    it('should filter logs by search query - details', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user1',
        action: 'Action',
        details: 'patient ID 123',
        type: 'info',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user2',
        action: 'Action',
        details: 'surgery ID 456',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.searchQuery = 'surgery'
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(1)
      expect(vm.filteredLogs[0].details).toContain('surgery')
    })

    it('should filter logs by type', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user1',
        action: 'Action 1',
        type: 'login',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user2',
        action: 'Action 2',
        type: 'error',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user3',
        action: 'Action 3',
        type: 'login',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.selectedTypes = ['login']
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(2)
      expect(vm.filteredLogs.every((log: any) => log.type === 'login')).toBe(true)
    })

    it('should filter by multiple types', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user1',
        action: 'Action 1',
        type: 'login',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user2',
        action: 'Action 2',
        type: 'error',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user3',
        action: 'Action 3',
        type: 'warning',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.selectedTypes = ['error', 'warning']
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(2)
    })

    it('should combine search query and type filters', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'alice',
        action: 'logged in',
        type: 'login',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'bob',
        action: 'logged in',
        type: 'login',
      })
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'alice',
        action: 'error occurred',
        type: 'error',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.searchQuery = 'alice'
      vm.selectedTypes = ['login']
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(1)
      expect(vm.filteredLogs[0].username).toBe('alice')
      expect(vm.filteredLogs[0].type).toBe('login')
    })

    it('should be case-insensitive in search', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'TestUser',
        action: 'Test Action',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.searchQuery = 'testuser'
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(1)
    })
  })

  describe('Connection Management', () => {
    it('should have reconnect button', () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const buttons = wrapper.findAll('button')
      const reconnectButton = buttons.find((btn) =>
        btn.find('.v-icon').text().includes('mdi-refresh')
      )

      expect(reconnectButton).toBeDefined()
    })

    it('should disable reconnect button when connected', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.isConnected).toBe(true)

      // Reconnect button should be disabled
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const reconnectButton = buttons.find((btn: any) => btn.props('icon') === 'mdi-refresh')

      expect(reconnectButton!.props('disabled')).toBe(true)
    })

    it('should reconnect when reconnect button clicked', async () => {
      vi.useFakeTimers()

      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any

      // Simulate disconnect
      vm.isConnected = false
      await wrapper.vm.$nextTick()

      vi.clearAllMocks()

      // Trigger reconnect
      await vm.reconnect()

      expect(mockNotify).toHaveBeenCalledWith('Reconnecting to activity log...', 'info')
      expect(vm.logs).toEqual([])

      vi.useRealTimers()
    })

    it('should handle connection errors and retry', async () => {
      vi.useFakeTimers()

      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      vi.clearAllMocks()

      // Simulate error
      mockEventSourceInstance!.simulateError()
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.isConnected).toBe(false)
      expect(mockNotify).toHaveBeenCalledWith(
        'Connection to activity log lost. Retrying...',
        'info'
      )

      // Fast forward to reconnect attempt
      vi.advanceTimersByTime(5000)
      await flushPromises()

      vi.useRealTimers()
    })

    it('should ignore connected type messages', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        type: 'connected',
        message: 'Connected to stream',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.logs.length).toBe(0)
    })
  })

  describe('Log Management', () => {
    it('should have clear logs button', () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const buttons = wrapper.findAll('button')
      const clearButton = buttons.find((btn) =>
        btn.find('.v-icon').text().includes('mdi-delete')
      )

      expect(clearButton).toBeDefined()
    })

    it('should clear logs when clear button clicked', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      // Add some logs
      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user1',
        action: 'Action 1',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.logs.length).toBe(1)

      vm.clearLogs()
      await wrapper.vm.$nextTick()

      expect(vm.logs.length).toBe(0)
      expect(mockNotify).toHaveBeenCalledWith('Local logs cleared', 'success')
    })
  })

  describe('Auto-scroll', () => {
    it('should have auto-scroll toggle', () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      expect(wrapper.text()).toContain('Auto-scroll')
    })

    it('should have auto-scroll enabled by default', () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any
      expect(vm.autoScroll).toBe(true)
    })

    it('should allow toggling auto-scroll', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      const vm = wrapper.vm as any
      expect(vm.autoScroll).toBe(true)

      vm.autoScroll = false
      await wrapper.vm.$nextTick()

      expect(vm.autoScroll).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed JSON in message', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Simulate malformed message
      if (mockEventSourceInstance!.onmessage) {
        mockEventSourceInstance!.onmessage(
          new MessageEvent('message', { data: 'not valid json' })
        )
      }
      await wrapper.vm.$nextTick()

      expect(consoleSpy).toHaveBeenCalledWith('Error parsing event data:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should handle logs with missing fields', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        // Missing username, action, type
      })
      await wrapper.vm.$nextTick()

      // Should not crash
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle large number of logs', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      // Add 1000 logs
      for (let i = 0; i < 1000; i++) {
        mockEventSourceInstance!.simulateMessage({
          timestamp: new Date().toISOString(),
          username: `user${i}`,
          action: `Action ${i}`,
          type: 'info',
        })
      }
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.logs.length).toBe(1000)
    })

    it('should handle empty search results', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'alice',
        action: 'Action',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.searchQuery = 'nonexistent'
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(0)
    })

    it('should handle special characters in search', async () => {
      const wrapper = mount(ActivityLogView, {
        global: {
          plugins: [vuetify, i18n],
        },
      })

      await flushPromises()

      mockEventSourceInstance!.simulateMessage({
        timestamp: new Date().toISOString(),
        username: 'user@example.com',
        action: 'Special [chars]',
        type: 'info',
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.searchQuery = '@example'
      await wrapper.vm.$nextTick()

      expect(vm.filteredLogs.length).toBe(1)
    })
  })
})
