import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionWatcher } from '../useSessionWatcher'
import { useUserStore } from '@/stores/userStore'

const TestComponent = defineComponent({
  setup() {
    const { verifySession } = useSessionWatcher()
    return { verifySession }
  },
  render() {
    return h('div', 'Test')
  },
})

describe('useSessionWatcher', () => {
  let router: ReturnType<typeof createRouter>
  let userStore: ReturnType<typeof useUserStore>
  let mountedWrappers: VueWrapper[]

  const mountWatcher = () => {
    const wrapper = mount(TestComponent, {
      global: {
        plugins: [router],
      },
    })

    mountedWrappers.push(wrapper)
    return wrapper
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    userStore = useUserStore()
    mountedWrappers = []

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
        { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
      ],
    })

    vi.useFakeTimers()
  })

  afterEach(() => {
    mountedWrappers.forEach((wrapper) => wrapper.unmount())
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('registers and cleans up listeners plus heartbeat timer', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
    const windowAddEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const setIntervalSpy = vi.spyOn(global, 'setInterval')
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const wrapper = mountWatcher()

    expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(windowAddEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function))
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000)

    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function))
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('skips verification when the user is not authenticated', async () => {
    const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer')
    userStore.isAuthenticated = vi.fn().mockReturnValue(false)

    const wrapper = mountWatcher()
    await wrapper.vm.verifySession()

    expect(checkSessionSpy).not.toHaveBeenCalled()
  })

  it('redirects to login when server verification reports an expired session', async () => {
    vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(false)
    userStore.isAuthenticated = vi.fn().mockReturnValue(true)
    const routerPushSpy = vi.spyOn(router, 'push')

    const wrapper = mountWatcher()
    await wrapper.vm.verifySession()

    expect(routerPushSpy).toHaveBeenCalledWith({
      name: 'Login',
      query: { reason: 'session-expired' },
    })
  })

  it('swallows verification errors gracefully', async () => {
    vi.spyOn(userStore, 'checkSessionWithServer').mockRejectedValue(new Error('Network error'))
    userStore.isAuthenticated = vi.fn().mockReturnValue(true)

    const wrapper = mountWatcher()

    await expect(wrapper.vm.verifySession()).resolves.toBeUndefined()
  })

  it('checks the session on focus after the idle threshold', async () => {
    const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
    userStore.isAuthenticated = vi.fn().mockReturnValue(true)
    userStore.lastActivityAt = Date.now() - 11 * 60 * 1000

    mountWatcher()
    window.dispatchEvent(new Event('focus'))
    await Promise.resolve()

    expect(checkSessionSpy).toHaveBeenCalledTimes(1)
  })

  it('does not check the session on focus before the idle threshold', async () => {
    const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer')
    userStore.isAuthenticated = vi.fn().mockReturnValue(true)
    userStore.lastActivityAt = Date.now() - 5 * 60 * 1000

    mountWatcher()
    window.dispatchEvent(new Event('focus'))
    await Promise.resolve()

    expect(checkSessionSpy).not.toHaveBeenCalled()
  })

  it('treats a missing lastActivityAt as idle time', async () => {
    const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
    userStore.isAuthenticated = vi.fn().mockReturnValue(true)
    userStore.lastActivityAt = undefined as unknown as number

    mountWatcher()
    window.dispatchEvent(new Event('focus'))
    await Promise.resolve()

    expect(checkSessionSpy).toHaveBeenCalledTimes(1)
  })

  it('checks the session when the tab becomes visible after idling', async () => {
    const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
    userStore.isAuthenticated = vi.fn().mockReturnValue(true)
    userStore.lastActivityAt = Date.now() - 11 * 60 * 1000

    mountWatcher()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(checkSessionSpy).toHaveBeenCalledTimes(1)
  })

  it('does not check the session when the tab becomes hidden', async () => {
    const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer')
    userStore.isAuthenticated = vi.fn().mockReturnValue(true)
    userStore.lastActivityAt = Date.now() - 11 * 60 * 1000

    mountWatcher()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(checkSessionSpy).not.toHaveBeenCalled()
  })

  it('runs the heartbeat only while the tab is visible', async () => {
    const checkSessionSpy = vi.spyOn(userStore, 'checkSessionWithServer').mockResolvedValue(true)
    userStore.isAuthenticated = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    mountWatcher()
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

    expect(checkSessionSpy).toHaveBeenCalledTimes(1)

    checkSessionSpy.mockClear()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

    expect(checkSessionSpy).not.toHaveBeenCalled()
  })
})
