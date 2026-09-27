import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePushNotifications } from '../usePushNotifications'

vi.mock('@/api', () => ({
  apiBasePath: 'http://localhost:40001',
}))

describe('usePushNotifications', () => {
  const mockFetch = vi.fn()
  const mockUnsubscribe = vi.fn().mockResolvedValue(true)
  const mockSubscribe = vi.fn()
  const mockGetSubscription = vi.fn()
  const mockRegister = vi.fn()
  const mockGetRegistration = vi.fn()
  const mockRequestPermission = vi.fn()

  const pushSubscription = {
    endpoint: 'https://push.example/subscription',
    unsubscribe: mockUnsubscribe,
    toJSON: () => ({
      endpoint: 'https://push.example/subscription',
      keys: {
        auth: 'auth-key',
        p256dh: 'p256dh-key',
      },
    }),
  } as unknown as PushSubscription

  const registration = {
    pushManager: {
      getSubscription: mockGetSubscription,
      subscribe: mockSubscribe,
    },
  } as unknown as ServiceWorkerRegistration

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetSubscription.mockResolvedValue(null)
    mockSubscribe.mockResolvedValue(pushSubscription)
    mockRegister.mockResolvedValue(registration)
    mockGetRegistration.mockResolvedValue(registration)
    mockRequestPermission.mockResolvedValue('granted')

    vi.stubGlobal('fetch', mockFetch)
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: mockRequestPermission,
    })

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    })

    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: function PushManager() { },
    })

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: mockRegister,
        ready: Promise.resolve(registration),
        getRegistration: mockGetRegistration,
      },
    })
  })

  it('subscribes a patient flow and posts the case access token to the backend', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ vapidPublicKey: 'BPufmjqANikQGJxnR3hQaiYvmTqoqUzPw4FuEtM458TRpOEZiC4GihTigVUMqDc3Yx-50Yxpy3CpFD-yxP24A_U' }) })
      .mockResolvedValueOnce({ ok: true })

    const notifications = usePushNotifications()
    await notifications.subscribe({ caseAccessToken: 'CASE01' })

    expect(mockRequestPermission).toHaveBeenCalledOnce()
    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    expect(mockSubscribe).toHaveBeenCalledOnce()
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:40001/notifications/subscribe',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )

    const secondCall = mockFetch.mock.calls[1]?.[1]
    expect(secondCall).toBeDefined()
    const body = JSON.parse(String(secondCall?.body))
    expect(body.caseAccessToken).toBe('CASE01')
    expect(body.keys).toEqual({ auth: 'auth-key', p256dh: 'p256dh-key' })
    expect(notifications.subscribed.value).toBe(true)
  })

  it('surfaces an error when notification permission is denied', async () => {
    mockRequestPermission.mockResolvedValueOnce('denied')

    const notifications = usePushNotifications()
    await notifications.subscribe({ caseAccessToken: 'CASE01' })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(notifications.subscribed.value).toBe(false)
    expect(notifications.error.value).toBe('Notification permission was not granted.')
  })

  it('checks the current subscription state from the registered service worker', async () => {
    mockGetSubscription.mockResolvedValueOnce(pushSubscription)
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: mockRequestPermission,
    })

    const notifications = usePushNotifications()
    await notifications.checkCurrentSubscription()

    expect(mockGetRegistration).toHaveBeenCalledOnce()
    expect(notifications.subscribed.value).toBe(true)
  })

  it('unsubscribes locally and notifies the backend', async () => {
    mockGetSubscription.mockResolvedValueOnce(pushSubscription)
    mockFetch.mockResolvedValueOnce({ ok: true })

    const notifications = usePushNotifications()
    notifications.subscribed.value = true
    await notifications.unsubscribe()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:40001/notifications/subscribe',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ endpoint: 'https://push.example/subscription' }),
      }),
    )
    expect(mockUnsubscribe).toHaveBeenCalledOnce()
    expect(notifications.subscribed.value).toBe(false)
  })

  it('sends a development test push for the current browser subscription', async () => {
    mockGetSubscription.mockResolvedValueOnce(pushSubscription)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'sent' }) })

    const notifications = usePushNotifications()
    const ok = await notifications.sendTestNotification()

    expect(ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:40001/notifications/test',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
  })

  it('reports insecure contexts as unsupported for push', () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    })

    const notifications = usePushNotifications()

    expect(notifications.supportStatus.value).toBe('insecure-context')
    expect(notifications.supported.value).toBe(false)
  })
})