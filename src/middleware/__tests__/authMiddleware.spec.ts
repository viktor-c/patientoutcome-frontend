import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authMiddleware } from '@/middleware/authMiddleware'
import type { ResponseContext, RequestContext } from '@/api/runtime'
import router from '@/router'

// Mock dependencies - factories run at mock time
const mockClearSession = vi.fn()
const mockUpdateLastActivity = vi.fn()
const mockIsAuthenticated = vi.fn(() => true)

vi.mock('@/stores/userStore', () => ({
  useUserStore: vi.fn(() => ({
    clearSession: mockClearSession,
    updateLastActivity: mockUpdateLastActivity,
    isAuthenticated: mockIsAuthenticated,
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

  describe('updateLastActivity', () => {
    it('should call updateLastActivity for authenticated users on success', async () => {
      mockIsAuthenticated.mockReturnValue(true)
      const context = createMockContext(200)
      await authMiddleware.post!(context)

      expect(mockUpdateLastActivity).toHaveBeenCalled()
    })

    it('should NOT call updateLastActivity when user is not authenticated', async () => {
      mockIsAuthenticated.mockReturnValue(false)
      const context = createMockContext(200)
      await authMiddleware.post!(context)

      expect(mockUpdateLastActivity).not.toHaveBeenCalled()
    })
  })

  describe('401 on /user/login endpoint', () => {
    it('should return the response directly without redirecting', async () => {
      const loginContext = createMockContext(401)
      // Override url to simulate login endpoint
      const loginCtx: ResponseContext = {
        ...loginContext,
        url: 'http://api.example.com/user/login',
      }
      const result = await authMiddleware.post!(loginCtx)

      expect(result).toBe(loginCtx.response)
      expect(router.push).not.toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// pre hook
// ---------------------------------------------------------------------------
describe('authMiddleware – pre hook', () => {
  function createRequestContext(overrides?: Partial<RequestContext>): RequestContext {
    return {
      url: 'http://api.example.com/consultations',
      init: {},
      fetch: () => Promise.resolve(new Response()),
      ...overrides,
    }
  }

  it('sets cache to "no-store"', async () => {
    const ctx = createRequestContext()
    const result = await authMiddleware.pre!(ctx)
    expect(result?.init?.cache).toBe('no-store')
  })

  it('preserves the original url', async () => {
    const ctx = createRequestContext({ url: 'http://api.example.com/patients/123' })
    const result = await authMiddleware.pre!(ctx)
    expect(result?.url).toBe('http://api.example.com/patients/123')
  })

  it('preserves existing init properties (method, headers, credentials)', async () => {
    const ctx = createRequestContext({
      init: {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        credentials: 'include',
      },
    })
    const result = await authMiddleware.pre!(ctx)
    expect(result?.init?.method).toBe('POST')
    expect((result?.init?.headers as Record<string, string>)?.Authorization).toBe('Bearer token')
    expect(result?.init?.credentials).toBe('include')
  })

  it('overrides any pre-existing cache value', async () => {
    // Callers should not be able to accidentally set cache: 'default'
    const ctx = createRequestContext({ init: { cache: 'default' } })
    const result = await authMiddleware.pre!(ctx)
    expect(result?.init?.cache).toBe('no-store')
  })
})
