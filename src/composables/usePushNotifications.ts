import { computed, ref, readonly } from 'vue'
import { apiBasePath } from '@/api'

/**
 * usePushNotifications
 *
 * Composable that manages the full Web Push subscription lifecycle:
 *   1. Register the service worker (sw.js in /public)
 *   2. Fetch the VAPID public key from the backend
 *   3. Request browser notification permission
 *   4. Create a PushManager subscription and POST it to the backend
 *   5. Support unsubscription
 *
 * Usage (admin app):
 *   const { supported, permission, subscribed, subscribe, unsubscribe } = usePushNotifications()
 *   await subscribe()          // prompts permission + registers push
 *
 * Usage (patient case-code flow):
 *   await subscribe({ caseAccessToken: '<token>' })
 *
 * Returns reactive state so UI components can adapt (show enable-button vs
 * "notifications active" indicator etc.).
 */

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'
export type PushSupportStatus =
  | 'supported'
  | 'insecure-context'
  | 'ios-home-screen-required'
  | 'unsupported-browser'

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

function detectPushSupportStatus(): PushSupportStatus {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unsupported-browser'
  }

  if (!window.isSecureContext) {
    return 'insecure-context'
  }

  if (isIosDevice() && !isStandaloneDisplayMode()) {
    return 'ios-home-screen-required'
  }

  const browserSupportsPushApis =
    'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window

  return browserSupportsPushApis ? 'supported' : 'unsupported-browser'
}

export function usePushNotifications() {
  const supportStatus = ref<PushSupportStatus>(detectPushSupportStatus())
  const supported = computed(() => supportStatus.value === 'supported')

  const permission = ref<PushPermission>(
    supported.value ? (Notification.permission as PushPermission) : 'unsupported',
  )

  const subscribed = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function refreshSupportState(): void {
    supportStatus.value = detectPushSupportStatus()
    permission.value = supported.value ? (Notification.permission as PushPermission) : 'unsupported'
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    return reg
  }

  /** Convert a VAPID base64url key to a Uint8Array for PushManager.subscribe */
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
  }

  async function fetchVapidPublicKey(): Promise<string | null> {
    try {
      const res = await fetch(`${apiBasePath}/notifications/vapid-public-key`, { credentials: 'include' })
      if (!res.ok) return null
      const data = await res.json()
      return data.vapidPublicKey ?? null
    } catch {
      return null
    }
  }

  async function postSubscription(
    sub: PushSubscription,
    caseAccessToken?: string | null,
  ): Promise<boolean> {
    const serialized = sub.toJSON()
    if (!serialized.endpoint || !serialized.keys?.auth || !serialized.keys?.p256dh) {
      return false
    }

    const body = {
      endpoint: serialized.endpoint,
      keys: serialized.keys,
      caseAccessToken: caseAccessToken ?? null,
      userAgent: navigator.userAgent,
    }

    try {
      const res = await fetch(`${apiBasePath}/notifications/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function deleteSubscription(sub: PushSubscription): Promise<void> {
    try {
      await fetch(`${apiBasePath}/notifications/subscribe`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
    } catch {
      // best-effort
    }
  }

  async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return null
    return reg.pushManager.getSubscription()
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Ask for permission and subscribe to push notifications.
   *
   * @param options.caseAccessToken  Patient case-code session token (patient flow only)
   */
  async function subscribe(options: { caseAccessToken?: string | null } = {}): Promise<void> {
    refreshSupportState()

    if (!supported.value) {
      error.value = 'Push notifications are not supported in this browser.'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Step 1: Request notification permission
      const perm = await Notification.requestPermission()
      permission.value = perm as PushPermission

      if (perm !== 'granted') {
        error.value = 'Notification permission was not granted.'
        return
      }

      // Step 2: Get VAPID public key from backend
      const vapidKey = await fetchVapidPublicKey()
      if (!vapidKey) {
        error.value = 'Push notifications are not configured on this server.'
        return
      }

      // Step 3: Register service worker & create push subscription
      const reg = await getServiceWorkerRegistration()
      const existingSub = await reg.pushManager.getSubscription()

      let pushSub = existingSub
      if (!pushSub) {
        pushSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }

      // Step 4: POST subscription to backend
      const ok = await postSubscription(pushSub, options.caseAccessToken)
      subscribed.value = ok

      if (!ok) {
        error.value = 'Failed to register push subscription with the server.'
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'An unexpected error occurred.'
    } finally {
      loading.value = false
    }
  }

  /**
   * Unsubscribe from push notifications (remove from browser and server).
   */
  async function unsubscribe(): Promise<void> {
    refreshSupportState()
    loading.value = true
    error.value = null

    try {
      const reg = await getServiceWorkerRegistration()
      const pushSub = await reg.pushManager.getSubscription()

      if (pushSub) {
        await deleteSubscription(pushSub)
        await pushSub.unsubscribe()
      }
      subscribed.value = false
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unsubscribe failed.'
    } finally {
      loading.value = false
    }
  }

  async function sendTestNotification(): Promise<boolean> {
    refreshSupportState()
    loading.value = true
    error.value = null

    try {
      const pushSub = await getCurrentPushSubscription()
      if (!pushSub) {
        error.value = 'No active push subscription found for this browser.'
        return false
      }

      const res = await fetch(`${apiBasePath}/notifications/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: pushSub.endpoint,
          url: window.location.href,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        error.value = data.message || 'Failed to send test push notification.'
        return false
      }

      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to send test push notification.'
      return false
    } finally {
      loading.value = false
    }
  }

  /** Check whether the browser already has an active subscription. */
  async function checkCurrentSubscription(): Promise<void> {
    refreshSupportState()
    if (!supported.value) return
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) { subscribed.value = false; return }
      const sub = await reg.pushManager.getSubscription()
      subscribed.value = Boolean(sub) && permission.value === 'granted'
    } catch {
      subscribed.value = false
    }
  }

  return {
    supported: readonly(supported),
    supportStatus: readonly(supportStatus),
    permission: readonly(permission),
    subscribed,
    loading: readonly(loading),
    error: readonly(error),
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkCurrentSubscription,
  }
}
