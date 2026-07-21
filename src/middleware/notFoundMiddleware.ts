import type { Middleware, ResponseContext } from '@/api/runtime'
import router from '@/router'

let isRedirectingToNotFound = false

const REDIRECT_ELIGIBLE_ROUTE_NAMES = new Set([
  'patientoverview',
  'patientcaselanding',
  'consultationoverview',
  'consultation',
  'formview',
  'reviewform',
])

/**
 * Redirects to a shared "entity not found" page whenever a 404 is returned
 * while the user is on an entity-detail route.
 */
export const notFoundMiddleware: Middleware = {
  post: async (context: ResponseContext): Promise<Response | void> => {
    const response = context.response
    if (response.status !== 404) {
      return response
    }

    const currentRoute = router.currentRoute.value
    const currentRouteName = String(currentRoute.name || '')

    if (currentRouteName === 'EntityNotFound') {
      return response
    }

    if (!REDIRECT_ELIGIBLE_ROUTE_NAMES.has(currentRouteName)) {
      return response
    }

    if (isRedirectingToNotFound) {
      return response
    }

    isRedirectingToNotFound = true
    try {
      await router.replace({
        name: 'EntityNotFound',
        query: {
          from: currentRoute.fullPath,
          status: '404',
        },
      })
    } finally {
      isRedirectingToNotFound = false
    }

    return response
  },
}
