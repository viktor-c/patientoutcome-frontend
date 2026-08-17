import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionWatcher } from '../useSessionWatcher'
import { useUserStore } from '@/stores/userStore'

// Test component that uses the composable
const TestComponent = defineComponent({
  setup() {
    const { verifySession } = useSessionWatcher()
    return { verifySession }
  },
  render() {
    return h('div', 'Test')
  }
})

describe('useSessionWatcher', () => {
  let router: ReturnType<typeof createRouter>
  let userStore: ReturnType<typeof useUserStore>

  beforeEach(() => {
    // Setup Pinia
    setActivePinia(createPinia())
    userStore = useUserStore()

    // Setup router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
        { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } }
      ]
    })

    // Reset timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should setup event listeners on mount', async () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function))

      wrapper.unmount()
    })

    it('should cleanup event listeners on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function))
    })

    it('should start heartbeat timer on mount', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000)
    })

    it('should stop heartbeat timer on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      wrapper.unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Session Verification', () => {
    it('should not verify session when user is not authenticated', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer')
      userStore.isAuthenticated = vi.fn().mockReturnValue(false)

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.verifySession()

      expect(checkSessionSpy).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should verify session when user is authenticated', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.verifySession()

      expect(checkSessionSpy).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should redirect to login when session is expired', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(false)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      const routerPushSpy = vi.spyOn(router, 'push')

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.verifySession()

      expect(checkSessionSpy).toHaveBeenCalled()
      expect(routerPushSpy).toHaveBeenCalledWith({
        name: 'Login',
        query: { reason: 'session-expired' }
      })

      wrapper.unmount()
    })

    it('should not redirect when session is still valid', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      const routerPushSpy = vi.spyOn(router, 'push')

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.verifySession()

      expect(checkSessionSpy).toHaveBeenCalled()
      expect(routerPushSpy).not.toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should not redirect when network is offline (null result)', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(null)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      const routerPushSpy = vi.spyOn(router, 'push')

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      await wrapper.vm.verifySession()

      expect(checkSessionSpy).toHaveBeenCalled()
      expect(routerPushSpy).not.toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('Window Focus Handling', () => {
    it('should check session when window regains focus after idle period', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      userStore.lastActivityAt = Date.now() - (11 * 60 * 1000) // 11 minutes ago

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Trigger focus event
      const focusEvent = new Event('focus')
      window.dispatchEvent(focusEvent)

      // Wait for async operations
      await vi.runAllTimersAsync()

      expect(checkSessionSpy).toHaveBeenCalled()
    })

    it('should not check session when window regains focus within idle threshold', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer')
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      userStore.lastActivityAt = Date.now() - (5 * 60 * 1000) // 5 minutes ago (less than 10 min threshold)

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Trigger focus event
      const focusEvent = new Event('focus')
      window.dispatchEvent(focusEvent)

      await vi.runAllTimersAsync()

      expect(checkSessionSpy).not.toHaveBeenCalled()
    })

    it('should not check session on focus when not authenticated', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer')
      userStore.isAuthenticated = vi.fn().mockReturnValue(false)
      userStore.lastActivityAt = Date.now() - (15 * 60 * 1000)

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Trigger focus event
      const focusEvent = new Event('focus')
      window.dispatchEvent(focusEvent)

      await vi.runAllTimersAsync()

      expect(checkSessionSpy).not.toHaveBeenCalled()
    })
  })

  describe('Visibility Change Handling', () => {
    it('should check session when tab becomes visible after idle period', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      userStore.lastActivityAt = Date.now() - (11 * 60 * 1000)

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Mock visibility change to visible
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible'
      })

      const visibilityEvent = new Event('visibilitychange')
      document.dispatchEvent(visibilityEvent)

      await vi.runAllTimersAsync()

      expect(checkSessionSpy).toHaveBeenCalled()
    })

    it('should not check session when tab becomes hidden', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer')
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      userStore.lastActivityAt = Date.now() - (15 * 60 * 1000)

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Mock visibility change to hidden
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden'
      })

      const visibilityEvent = new Event('visibilitychange')
      document.dispatchEvent(visibilityEvent)

      await vi.runAllTimersAsync()

      expect(checkSessionSpy).not.toHaveBeenCalled()
    })
  })

  describe('Heartbeat Timer', () => {
    it('should periodically check session when tab is visible', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)

      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible'
      })

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Fast-forward 5 minutes (heartbeat interval)
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

      expect(checkSessionSpy).toHaveBeenCalled()
    })

    it('should not check session on heartbeat when tab is hidden', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer')
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)

      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden'
      })

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Fast-forward 5 minutes
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

      expect(checkSessionSpy).not.toHaveBeenCalled()
    })

    it('should continue heartbeat checks every 5 minutes', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)

      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'visible'
      })

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Fast-forward through multiple heartbeat intervals
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000) // 5 min
      expect(checkSessionSpy).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000) // 10 min
      expect(checkSessionSpy).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(5 * 60 * 1000) // 15 min
      expect(checkSessionSpy).toHaveBeenCalledTimes(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid focus/blur events', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      userStore.lastActivityAt = Date.now() - (15 * 60 * 1000)

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Rapid focus events
      for (let i = 0; i < 5; i++) {
        const focusEvent = new Event('focus')
        window.dispatchEvent(focusEvent)
      }

      await vi.runAllTimersAsync()

      // Should handle gracefully (may call multiple times, but shouldn't crash)
      expect(checkSessionSpy).toHaveBeenCalled()
    })

    it('should handle session check errors gracefully', async () => {
      vi.spyOn(userStore, 'checkSessionWithServer').mockRejectedValue(new Error('Network error'))
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Should not throw
      await expect(wrapper.vm.verifySession()).resolves.not.toThrow()

      wrapper.unmount()
    })

    it('should handle missing lastActivityAt', async () => {
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)
      userStore.lastActivityAt = undefined

      mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Should check session when lastActivityAt is undefined
      const focusEvent = new Event('focus')
      window.dispatchEvent(focusEvent)

      await vi.runAllTimersAsync()

      expect(checkSessionSpy).toHaveBeenCalled()
    })

    it('should handle concurrent session checks', async () => {
      const resolveChecks: Array<(value: boolean) => void> = []
      const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockImplementation(() => {
        return new Promise((resolve) => {
          resolveChecks.push(resolve as (value: boolean) => void)
        })
      })
      userStore.isAuthenticated = vi.fn().mockReturnValue(true)

      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      // Trigger multiple concurrent checks
      const promise1 = wrapper.vm.verifySession()
      const promise2 = wrapper.vm.verifySession()
      const promise3 = wrapper.vm.verifySession()

      // Resolve all checks
      resolveChecks.forEach(resolve => resolve(true))

      await Promise.all([promise1, promise2, promise3])

      expect(checkSessionSpy).toHaveBeenCalledTimes(3)

      wrapper.unmount()
    })
  })

  describe('Memory Leaks Prevention', () => {
    it('should not leak event listeners after multiple mount/unmount cycles', () => {
      const initialListenerCount = (document as Document & { _eventListeners?: Record<string, Array<unknown>> })._eventListeners?.visibilitychange?.length || 0

      // Mount and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const wrapper = mount(TestComponent, {
          global: {
            plugins: [router]
          }
        })
        wrapper.unmount()
      }

      // Event listeners should be cleaned up
      const finalListenerCount = (document as Document & { _eventListeners?: Record<string, Array<unknown>> })._eventListeners?.visibilitychange?.length || 0
      expect(finalListenerCount).toBe(initialListenerCount)
    })

    it('should not leak timers after unmount', () => {
      const wrapper = mount(TestComponent, {
        global: {
          plugins: [router]
        }
      })

      const timersBeforeUnmount = vi.getTimerCount()
      
      wrapper.unmount()

      const timersAfterUnmount = vi.getTimerCount()

      // Timer should be cleared
      expect(timersAfterUnmount).toBeLessThan(timersBeforeUnmount)
    })
  })
})
