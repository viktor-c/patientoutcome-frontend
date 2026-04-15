import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authMiddleware } from '@/middleware/authMiddleware'
import type { ResponseContext } from '@/api/runtime'
import router from '@/router'

// Mock dependencies - factories run at mock time
vi.mock('@/stores/userStore', () => ({
  useUserStore: vi.fn(() => ({
    clearSession: vi.fn(),
  })),
}))

vi.mock('@/router', () => ({
  default: {
    push: vi.fn().mockResolvedValue(undefined),
    currentRoute: {
      value: {
        fullPath: '/patients/42/forms?version=latest',
      },
    },
  },
}))

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createMockContext(status: number, body = {}): ResponseContext {
    // 204 No Content cannot have a body
    const responseBody = status === 204 ? null : JSON.stringify(body)
    return {
      response: new Response(responseBody, {
        status,
        headers: status === 204 ? {} : { 'Content-Type': 'application/json' },
      }),
      init: {
        headers: {},
      },
      url: 'http://api.example.com/test',
      fetch: () => Promise.resolve(new Response()),
    }
  }

  describe('successful responses', () => {
    it('should return response for 200 status', async () => {
      const context = createMockContext(200)
      const result = await authMiddleware.post!(context)

      expect(result).toBe(context.response)
    })

    it('should return response for 201 status', async () => {
      const context = createMockContext(201)
      const result = await authMiddleware.post!(context)

      expect(result).toBe(context.response)
    })

    it('should return response for 204 status', async () => {
      const context = createMockContext(204)
      const result = await authMiddleware.post!(context)

      expect(result).toBe(context.response)
    })
  })

  describe('401 Unauthorized', () => {
    it('should throw error with appropriate message', async () => {
      const context = createMockContext(401)

      await expect(authMiddleware.post!(context)).rejects.toThrow()
    })

    it('should redirect to login on 401', async () => {
      const context = createMockContext(401)

      try {
        await authMiddleware.post!(context)
      } catch {
        // Expected to throw
      }

      expect(router.push).toHaveBeenCalledWith({
        name: 'Login',
        query: {
          reason: 'session-expired',
          redirect: '/patients/42/forms?version=latest',
        },
      })
    })
  })

  describe('403 Forbidden', () => {
    it('should return response for 403 status', async () => {
      const context = createMockContext(403)
      const result = await authMiddleware.post!(context)

      // 403 should return response for component to handle
      expect(result).toBe(context.response)
    })

    it('should not redirect for 403', async () => {
      vi.clearAllMocks()
      const context = createMockContext(403)
      await authMiddleware.post!(context)

      expect(router.push).not.toHaveBeenCalled()
    })
  })

  describe('other error statuses', () => {
    it('should return response for 400 Bad Request', async () => {
      const context = createMockContext(400)
      const result = await authMiddleware.post!(context)

      expect(result).toBe(context.response)
    })

    it('should return response for 404 Not Found', async () => {
      const context = createMockContext(404)
      const result = await authMiddleware.post!(context)

      expect(result).toBe(context.response)
    })

    it('should return response for 500 Internal Server Error', async () => {
      const context = createMockContext(500)
      const result = await authMiddleware.post!(context)

      expect(result).toBe(context.response)
    })
  })
})
