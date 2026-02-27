import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  searchIcd,
  searchOps,
  isCacheValid,
  clearIcdOpsCache,
  type IcdOpsPaginatedResponse,
  type IcdOpsServiceResponse,
} from '@/services/icdopsService'

// ──────────────────────────────────────────────────────────────
// ICD-OPS Service Tests
//
// Tests the search functions, cache logic, and error handling.
// Uses mocked fetch to simulate backend responses.
// ──────────────────────────────────────────────────────────────

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function createMockResponse(data: IcdOpsPaginatedResponse): IcdOpsServiceResponse {
  return {
    success: true,
    message: `Found ${data.total} entries`,
    responseObject: data,
    statusCode: 200,
  }
}

function createMockPaginatedData(
  type: 'icd' | 'ops',
  total = 25,
  page = 1,
  limit = 10,
): IcdOpsPaginatedResponse {
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const count = Math.min(limit, total - startIndex)

  const items = Array.from({ length: count }, (_, i) => ({
    code: type === 'icd' ? `A${String(startIndex + i).padStart(2, '0')}` : `1-${String(startIndex + i).padStart(3, '0')}`,
    label: `Test entry ${startIndex + i + 1}`,
    kind: 'category' as const,
  }))

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    version: '2026',
    type,
  }
}

describe('icdopsService', () => {
  beforeEach(() => {
    // Clear all mocks and localStorage before each test
    vi.clearAllMocks()
    localStorage.clear()
    clearIcdOpsCache()
  })

  // ─── Cache validity ──────────────────────────────────

  describe('isCacheValid', () => {
    it('returns false when no cache meta exists', () => {
      expect(isCacheValid()).toBe(false)
    })

    it('returns true for fresh cache', () => {
      localStorage.setItem(
        'icdops_cache_meta',
        JSON.stringify({
          lastUpdated: Date.now(),
          year: new Date().getFullYear(),
          version: '2026',
        }),
      )
      expect(isCacheValid()).toBe(true)
    })

    it('returns false for cache older than 6 months', () => {
      const sevenMonthsAgo = Date.now() - 7 * 30 * 24 * 60 * 60 * 1000
      localStorage.setItem(
        'icdops_cache_meta',
        JSON.stringify({
          lastUpdated: sevenMonthsAgo,
          year: new Date().getFullYear(),
          version: '2026',
        }),
      )
      expect(isCacheValid()).toBe(false)
    })

    it('returns false for cache from previous year', () => {
      localStorage.setItem(
        'icdops_cache_meta',
        JSON.stringify({
          lastUpdated: Date.now(),
          year: new Date().getFullYear() - 1,
          version: '2026',
        }),
      )
      expect(isCacheValid()).toBe(false)
    })
  })

  // ─── clearIcdOpsCache ────────────────────────────────

  describe('clearIcdOpsCache', () => {
    it('removes all ICD-OPS cache entries', () => {
      localStorage.setItem('icdops_cache_meta', '{}')
      localStorage.setItem('icdops_cache_icd_test_p1_l10_kcategory', '{}')
      localStorage.setItem('icdops_cache_ops_test_p1_l10_kcategory', '{}')
      localStorage.setItem('other_key', 'keep me')

      clearIcdOpsCache()

      expect(localStorage.getItem('icdops_cache_meta')).toBeNull()
      expect(localStorage.getItem('icdops_cache_icd_test_p1_l10_kcategory')).toBeNull()
      expect(localStorage.getItem('icdops_cache_ops_test_p1_l10_kcategory')).toBeNull()
      // Other keys should be preserved
      expect(localStorage.getItem('other_key')).toBe('keep me')
    })
  })

  // ─── searchIcd ───────────────────────────────────────

  describe('searchIcd', () => {
    it('fetches results from the API', async () => {
      const mockData = createMockPaginatedData('icd', 5, 1, 10) // total=5, 1 page → no prefetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockResponse(mockData)),
      })

      const result = await searchIcd({ query: 'Cholera' })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.type).toBe('icd')
      expect(result.version).toBe('2026')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('uses cache for repeated queries', async () => {
      const mockData = createMockPaginatedData('icd', 5, 1, 10) // total 5 → 1 page → no prefetch
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockResponse(mockData)),
      })

      // First call – should hit the API
      await searchIcd({ query: 'test_cache' })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call – should use cache
      const result = await searchIcd({ query: 'test_cache' })
      expect(result.items.length).toBeGreaterThan(0)
      // fetch should still only have been called once (cache hit)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('returns empty result on API failure with no cache', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await searchIcd({ query: 'failing_query' })

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.type).toBe('icd')
    })

    it('returns stale cache on API failure', async () => {
      // First: populate cache with a successful call
      const mockData = createMockPaginatedData('icd', 3, 1, 10)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockResponse(mockData)),
      })
      await searchIcd({ query: 'stale_test' })

      // Invalidate the cache meta so it won't serve from fresh cache
      localStorage.removeItem('icdops_cache_meta')

      // Second: API fails
      mockFetch.mockRejectedValueOnce(new Error('Server down'))
      const result = await searchIcd({ query: 'stale_test' })

      // Should get stale cached data
      expect(result.items.length).toBe(3)
    })

    it('passes correct query parameters', async () => {
      const mockData = createMockPaginatedData('icd', 5, 2, 5)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockResponse(mockData)),
      })

      await searchIcd({ query: 'A00', page: 2, limit: 5, kind: 'all' })

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('q=A00')
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('limit=5')
      expect(calledUrl).toContain('kind=all')
      expect(calledUrl).toContain('/icdops/icd/search')
    })
  })

  // ─── searchOps ───────────────────────────────────────

  describe('searchOps', () => {
    it('fetches OPS results from the API', async () => {
      const mockData = createMockPaginatedData('ops', 5, 1, 10) // total=5, 1 page → no prefetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockResponse(mockData)),
      })

      const result = await searchOps({ query: 'Untersuchung' })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.type).toBe('ops')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('/icdops/ops/search')
    })

    it('uses separate cache from ICD', async () => {
      // Use totals ≤ limit so no prefetch for page 2 is triggered
      const icdData = createMockPaginatedData('icd', 3, 1, 10)
      const opsData = createMockPaginatedData('ops', 5, 1, 10)

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockResponse(icdData)),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockResponse(opsData)),
        })

      const icdResult = await searchIcd({ query: 'shared_query' })
      const opsResult = await searchOps({ query: 'shared_query' })

      expect(icdResult.type).toBe('icd')
      expect(opsResult.type).toBe('ops')
      expect(icdResult.items.length).toBe(3)
      expect(opsResult.items.length).toBe(5)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
