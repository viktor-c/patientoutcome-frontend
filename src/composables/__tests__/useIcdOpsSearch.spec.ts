import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useIcdOpsSearch } from '@/composables/useIcdOpsSearch'
import type { IcdOpsPaginatedResponse } from '@/services/icdopsService'

// ──────────────────────────────────────────────────────────────
// Mock the icdopsService module
// ──────────────────────────────────────────────────────────────

const mockSearchIcd = vi.fn()
const mockSearchOps = vi.fn()

vi.mock('@/services/icdopsService', () => ({
  searchIcd: (...args: any[]) => mockSearchIcd(...args),
  searchOps: (...args: any[]) => mockSearchOps(...args),
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
    const mockResult = createMockResult('icd')
    mockSearchIcd.mockResolvedValue(mockResult)

    const { query, items, totalResults, hasMore } = useIcdOpsSearch('icd', {
      debounceMs: 100,
    })

    query.value = 'Cholera'
    await nextTick()

    // Should not have searched yet (debounce)
    expect(mockSearchIcd).not.toHaveBeenCalled()

    // Advance past debounce
    vi.advanceTimersByTime(150)
    await vi.runAllTimersAsync()
    await nextTick()

    expect(mockSearchIcd).toHaveBeenCalledWith({
      query: 'Cholera',
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

    // Trigger initial search
    await search('test')
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

    await search('test')
    expect(items.value.length).toBe(10)

    clear()
    expect(query.value).toBe('')
    expect(items.value).toEqual([])
    expect(totalResults.value).toBe(0)
  })

  it('handles search errors gracefully', async () => {
    mockSearchIcd.mockRejectedValue(new Error('Network error'))

    const { search, items, error } = useIcdOpsSearch('icd')

    await search('test')

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

    await search('test')

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
})
