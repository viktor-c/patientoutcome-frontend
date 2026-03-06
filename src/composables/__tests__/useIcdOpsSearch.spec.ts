import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useIcdOpsSearch } from '@/composables/useIcdOpsSearch'
import type { IcdOpsPaginatedResponse, IcdOpsPrefixResponse } from '@/services/icdopsService'

// ──────────────────────────────────────────────────────────────
// Mock the icdopsService module
// ──────────────────────────────────────────────────────────────

const mockSearchIcd = vi.fn()
const mockSearchOps = vi.fn()
const mockSearchIcdPrefix = vi.fn()
const mockSearchOpsPrefix = vi.fn()

vi.mock('@/services/icdopsService', () => ({
  searchIcd: (...args: any[]) => mockSearchIcd(...args),
  searchOps: (...args: any[]) => mockSearchOps(...args),
  searchIcdPrefix: (...args: any[]) => mockSearchIcdPrefix(...args),
  searchOpsPrefix: (...args: any[]) => mockSearchOpsPrefix(...args),
  // Real implementation inlined so composable's mode-detection works
  detectSearchMode: (type: 'icd' | 'ops', input: string) => {
    if (!input) return 'text-search'
    if (type === 'icd') return /^[A-Za-z]/.test(input) ? 'code-prefix' : 'text-search'
    return /^\d/.test(input) ? 'code-prefix' : 'text-search'
  },
}))

function createMockResult(
  type: 'icd' | 'ops',
  total = 25,
  page = 1,
  limit = 10,
): IcdOpsPaginatedResponse {
  const totalPages = Math.ceil(total / limit)
  const count = Math.min(limit, total - (page - 1) * limit)

  return {
    items: Array.from({ length: count }, (_, i) => ({
      code: `${type === 'icd' ? 'A' : '1-'}${String((page - 1) * limit + i).padStart(3, '0')}`,
      label: `Entry ${(page - 1) * limit + i + 1}`,
      kind: 'category' as const,
    })),
    total,
    page,
    limit,
    totalPages,
    version: '2026',
    type,
  }
}

describe('useIcdOpsSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('initializes with empty state', () => {
    const { items, loading, error, hasMore, totalResults } = useIcdOpsSearch('icd')

    expect(items.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(hasMore.value).toBe(false)
    expect(totalResults.value).toBe(0)
  })

  it('searches when query changes (debounced)', async () => {
    // OPS with a letter-start query → text-search mode (non-digit = text for OPS)
    const mockResult = createMockResult('ops')
    mockSearchOps.mockResolvedValue(mockResult)

    const { query, items, totalResults, hasMore } = useIcdOpsSearch('ops', {
      debounceMs: 100,
    })

    query.value = 'Untersuchung'
    await nextTick()

    // Should not have searched yet (debounce)
    expect(mockSearchOps).not.toHaveBeenCalled()

    // Advance past debounce
    vi.advanceTimersByTime(150)
    await vi.runAllTimersAsync()
    await nextTick()

    expect(mockSearchOps).toHaveBeenCalledWith({
      query: 'Untersuchung',
      page: 1,
      limit: 10,
      kind: 'category',
    })

    expect(items.value.length).toBe(10)
    expect(totalResults.value).toBe(25)
    expect(hasMore.value).toBe(true)
  })

  it('does not search when query is too short', async () => {
    const { query, items } = useIcdOpsSearch('icd', { minChars: 2 })

    query.value = 'A'
    await nextTick()
    vi.advanceTimersByTime(500)
    await nextTick()

    expect(mockSearchIcd).not.toHaveBeenCalled()
    expect(items.value).toEqual([])
  })

  it('loads more results on loadMore()', async () => {
    const page1 = createMockResult('icd', 25, 1, 10)
    const page2 = createMockResult('icd', 25, 2, 10)

    mockSearchIcd.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2)

    const { search, items, hasMore, loadMore } = useIcdOpsSearch('icd')

    // Trigger initial search — use digit-start to ensure text-search mode for ICD
    await search('1234')
    expect(items.value.length).toBe(10)
    expect(hasMore.value).toBe(true)

    // Load more
    await loadMore()
    expect(items.value.length).toBe(20)
    expect(mockSearchIcd).toHaveBeenCalledTimes(2)
  })

  it('clear() resets all state', async () => {
    const mockResult = createMockResult('icd')
    mockSearchIcd.mockResolvedValue(mockResult)

    const { search, items, totalResults, clear, query } = useIcdOpsSearch('icd')

    // Use digit-start query to trigger text-search mode for ICD
    await search('1234')
    expect(items.value.length).toBe(10)

    clear()
    expect(query.value).toBe('')
    expect(items.value).toEqual([])
    expect(totalResults.value).toBe(0)
  })

  it('handles search errors gracefully', async () => {
    mockSearchIcd.mockRejectedValue(new Error('Network error'))

    const { search, items, error } = useIcdOpsSearch('icd')

    // Use digit-start query to trigger text-search mode for ICD
    await search('1234')

    expect(items.value).toEqual([])
    expect(error.value).toBe('Network error')
  })

  it('uses OPS search function when type is ops', async () => {
    const mockResult = createMockResult('ops')
    mockSearchOps.mockResolvedValue(mockResult)

    const { search, items } = useIcdOpsSearch('ops')

    await search('Untersuchung')

    expect(mockSearchOps).toHaveBeenCalled()
    expect(mockSearchIcd).not.toHaveBeenCalled()
    expect(items.value.length).toBe(10)
  })

  it('prevents concurrent loadMore calls', async () => {
    const page1 = createMockResult('icd', 25, 1, 10)

    // Make the second call slow
    let resolveSecond: ((value: IcdOpsPaginatedResponse) => void) | undefined
    const slowPromise = new Promise<IcdOpsPaginatedResponse>((resolve) => {
      resolveSecond = resolve
    })

    mockSearchIcd.mockResolvedValueOnce(page1).mockReturnValueOnce(slowPromise)

    const { search, loadMore, loading } = useIcdOpsSearch('icd')

    // Use digit-start query to trigger text-search mode for ICD
    await search('1234')

    // Start loading more (but don't await)
    const loadPromise = loadMore()
    expect(loading.value).toBe(true)

    // Try to load more again while still loading – should be a no-op
    await loadMore()
    expect(mockSearchIcd).toHaveBeenCalledTimes(2) // only initial + 1 loadMore

    // Resolve the slow call
    resolveSecond!(createMockResult('icd', 25, 2, 10))
    await loadPromise
  })

  // ─── Search-mode detection ─────────────────────────────

  describe('search mode: code-prefix vs text-search', () => {
    function createMockPrefixResult(
      type: 'icd' | 'ops',
      items = 5,
    ): IcdOpsPrefixResponse {
      return {
        items: Array.from({ length: items }, (_, i) => ({
          code: type === 'icd' ? `M${i}0` : `5-${i}0`,
          label: `Group ${i}`,
          kind: 'category' as const,
        })),
        prefix: type === 'icd' ? 'M' : '5-',
        type,
        version: '2026',
        isGroup: true,
      }
    }

    it('uses prefix API when ICD query starts with a letter', async () => {
      const mockResult = createMockPrefixResult('icd')
      mockSearchIcdPrefix.mockResolvedValue(mockResult)

      const { search, items, searchMode } = useIcdOpsSearch('icd')
      await search('M')

      expect(mockSearchIcdPrefix).toHaveBeenCalledWith('M', 20)
      expect(mockSearchIcd).not.toHaveBeenCalled()
      expect(searchMode.value).toBe('code-prefix')
      expect(items.value.length).toBe(5)
    })

    it('uses text API when ICD query does not start with a letter', async () => {
      const mockResult = createMockResult('icd')
      mockSearchIcd.mockResolvedValue(mockResult)

      const { search, items, searchMode } = useIcdOpsSearch('icd')
      // Digit-start triggers text-search for ICD
      await search('1234')

      expect(mockSearchIcd).toHaveBeenCalled()
      expect(mockSearchIcdPrefix).not.toHaveBeenCalled()
      expect(searchMode.value).toBe('text-search')
      expect(items.value.length).toBeGreaterThan(0)
    })

    it('uses prefix API when OPS query starts with a digit', async () => {
      const mockResult = createMockPrefixResult('ops')
      mockSearchOpsPrefix.mockResolvedValue(mockResult)

      const { search, items, searchMode } = useIcdOpsSearch('ops')
      await search('5')

      expect(mockSearchOpsPrefix).toHaveBeenCalledWith('5', 20)
      expect(mockSearchOps).not.toHaveBeenCalled()
      expect(searchMode.value).toBe('code-prefix')
      expect(items.value.length).toBe(5)
    })

    it('uses text API when OPS query starts with a letter (description search)', async () => {
      const mockResult = createMockResult('ops')
      mockSearchOps.mockResolvedValue(mockResult)

      const { search, items, searchMode } = useIcdOpsSearch('ops')
      await search('Untersuchung')

      expect(mockSearchOps).toHaveBeenCalled()
      expect(mockSearchOpsPrefix).not.toHaveBeenCalled()
      expect(searchMode.value).toBe('text-search')
      expect(items.value.length).toBeGreaterThan(0)
    })

    it('prefix mode: hasMore is always false (no pagination)', async () => {
      const mockResult = createMockPrefixResult('icd')
      mockSearchIcdPrefix.mockResolvedValue(mockResult)

      const { search, hasMore, totalResults } = useIcdOpsSearch('icd')
      await search('M')

      expect(hasMore.value).toBe(false)
      expect(totalResults.value).toBe(5)
    })

    it('prefix mode: loadMore is a no-op', async () => {
      const mockResult = createMockPrefixResult('icd')
      mockSearchIcdPrefix.mockResolvedValue(mockResult)

      const { search, loadMore } = useIcdOpsSearch('icd')
      await search('M')

      // loadMore should do nothing in prefix mode
      await loadMore()
      // Only the initial prefix call, no loadMore call
      expect(mockSearchIcdPrefix).toHaveBeenCalledTimes(1)
      expect(mockSearchIcd).not.toHaveBeenCalled()
    })

    it('auto-debounce triggers prefix search on letter input', async () => {
      const mockResult = createMockPrefixResult('icd')
      mockSearchIcdPrefix.mockResolvedValue(mockResult)

      const { query, searchMode } = useIcdOpsSearch('icd', { debounceMs: 100 })

      query.value = 'M'
      await nextTick()

      expect(mockSearchIcdPrefix).not.toHaveBeenCalled() // debounce pending

      vi.advanceTimersByTime(150)
      await vi.runAllTimersAsync()
      await nextTick()

      expect(mockSearchIcdPrefix).toHaveBeenCalledWith('M', 20)
      expect(searchMode.value).toBe('code-prefix')
    })

    it('switches mode when query changes from letter to text', async () => {
      const prefixResult = createMockPrefixResult('icd')
      const textResult = createMockResult('icd')

      mockSearchIcdPrefix.mockResolvedValue(prefixResult)
      mockSearchIcd.mockResolvedValue(textResult)

      const { search, searchMode } = useIcdOpsSearch('icd')

      await search('M')
      expect(searchMode.value).toBe('code-prefix')

      // Digit-start triggers text-search for ICD
      await search('1234')
      expect(searchMode.value).toBe('text-search')
    })

    it('handles prefix search errors gracefully', async () => {
      mockSearchIcdPrefix.mockRejectedValue(new Error('Network error'))

      const { search, items, error } = useIcdOpsSearch('icd')
      await search('M')

      expect(items.value).toEqual([])
      // error.value is the Error message (err instanceof Error → err.message)
      expect(error.value).toBe('Network error')
    })
  })
})
