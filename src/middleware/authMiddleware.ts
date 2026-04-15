import type { Middleware, ResponseContext } from '@/api/runtime'
import { useUserStore } from '@/stores/userStore'
import router from '@/router'
import { savePostLoginRedirect } from '@/utils/postLoginRedirect'

// Flag to prevent multiple simultaneous logout attempts
let isLoggingOut = false

/**
 * Middleware to handle authentication errors globally.
 * - 401 Unauthorized: User is not logged in -> logout and redirect to login
 * - 403 Forbidden: User is logged in but lacks permission -> let component handle it
 * - 2xx / other: Updates the locally-tracked session expiry (rolling sessions).
 */
export const authMiddleware: Middleware = {
  post: async (context: ResponseContext): Promise<Response | void> => {
    const response = context.response

    // 401 = Not authenticated -> logout user
    if (response.status === 401) {
      console.warn('401 Unauthorized: User is not logged in. Logging out.')

      // Prevent infinite loop by checking if we're already in the logout process
      if (isLoggingOut) {
        console.warn('Already logging out, skipping duplicate logout attempt.')
        throw new Error('Unauthorized: Already logging out')
      }

      isLoggingOut = true

      try {
        // Access the user store
        const userStore = useUserStore()

        // Clear user session locally (don't call API to avoid infinite loop)
        userStore.clearSession()

        const currentPath = router.currentRoute.value.fullPath
        if (currentPath && !currentPath.startsWith('/login')) {
          savePostLoginRedirect(currentPath)
        }

        // Redirect to login page
        await router.push({
          name: 'Login',
          query: {
            reason: 'session-expired',
            ...(currentPath && !currentPath.startsWith('/login') ? { redirect: currentPath } : {}),
          },
        })
      } catch (error) {
        console.error('Error during logout redirect:', error)
      } finally {
        isLoggingOut = false
      }

      // Throw error to reject the promise and stop processing
      throw new Error('Unauthorized: Session expired. Please log in again.')
    }

    // 403 = Authenticated but not authorized -> let component handle it
    if (response.status === 403) {
      console.warn('403 Forbidden: User lacks permission for this resource.')
      // Return response so component can handle the error appropriately
      return response
    }

    // For any successful response: keep the locally-tracked session expiry in sync.
    // The backend uses rolling sessions, so each successful request resets the server
    // cookie lifetime; we mirror that here so the session watcher stays accurate.
    try {
      const userStore = useUserStore()
      if (userStore.isAuthenticated()) {
        userStore.updateLastActivity()
      }
    } catch {
      // Store not ready yet – ignore
    }

    // Return the response for successful requests
    return response
  },
}
