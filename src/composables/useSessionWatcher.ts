/**
 * @file useSessionWatcher
 * @description Composable that proactively monitors whether the user's server session is still
 * valid and handles expiry gracefully – before the user is surprised by a 401 on a write operation.
 *
 * Strategy:
 *  1. On every `visibilitychange` / `focus` event (tab becomes active again), check whether the
 *     tab was idle for longer than CHECK_AFTER_IDLE_MS (default 10 min). If yes, call
 *     `GET /user/session` on the backend to verify the session is still alive.
 *  2. A periodic heartbeat (HEARTBEAT_INTERVAL_MS, default 5 min) runs while the tab is visible,
 *     so long-lived open tabs also stay aware of the session state.
 *  3. When the session watcher detects an expired session it clears the local state and redirects
 *     to the login page with `?reason=session-expired`, exactly as the authMiddleware does for
 *     reactive 401 responses.
 *
 * Note: calling `GET /user/session` also refreshes the rolling session cookie on the server,
 * so the heartbeat itself prevents silent expiry for active users.
 */

import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

/** Check once the tab has been idle for this many milliseconds (default: 10 minutes). */
const CHECK_AFTER_IDLE_MS = 10 * 60 * 1000

/** Re-check on a periodic timer while the tab is visible (default: 5 minutes). */
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000

export function useSessionWatcher() {
  const userStore = useUserStore()
  const router = useRouter()

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  /** Probe the server and redirect to login if the session has expired. */
  async function verifySession() {
    if (!userStore.isAuthenticated()) return // nothing to check

    const result = await userStore.checkSessionWithServer()
    if (result === false) {
      // Session expired on the server – redirect to login
      await router.push({ name: 'Login', query: { reason: 'session-expired' } })
    }
    // result === null  -> network offline, keep the user on the page
    // result === true  -> session is still valid, lastActivityAt updated inside the store
  }

  /** Called when the browser tab regains visibility or focus. */
  async function onWindowFocus() {
    if (!userStore.isAuthenticated()) return

    const idleMs = Date.now() - (userStore.lastActivityAt ?? 0)
    if (idleMs >= CHECK_AFTER_IDLE_MS) {
      await verifySession()
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await verifySession()
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  async function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      await onWindowFocus()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onWindowFocus)
    startHeartbeat()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('focus', onWindowFocus)
    stopHeartbeat()
  })

  return { verifySession }
}
