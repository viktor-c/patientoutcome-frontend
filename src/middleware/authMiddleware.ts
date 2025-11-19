import type { Middleware, ResponseContext } from '@/api/runtime'
import { useUserStore } from '@/stores/userStore'
import router from '@/router'

// Flag to prevent multiple simultaneous logout attempts
let isLoggingOut = false

/**
 * Middleware to handle authentication errors globally.
 * - 401 Unauthorized: User is not logged in -> logout and redirect to login
 * - 403 Forbidden: User is logged in but lacks permission -> let component handle it
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

        // Redirect to login page
        await router.push({ name: 'Login', query: { reason: 'session-expired' } })
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

    // Return the response for successful requests
    return response
  },
}
