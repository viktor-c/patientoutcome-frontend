import { ref, watch, type Ref } from 'vue'
import {
  searchIcd,
  searchOps,
  type IcdOpsEntry,
  type IcdOpsPaginatedResponse,
  type SearchOptions,
} from '@/services/icdopsService'

/**
 * Composable for ICD-10-GM and OPS code search with infinite scroll support.
 *
 * Features:
 * - Debounced search on input change
 * - Automatic pagination via `loadMore()`
 * - Loading / error states
 * - Works with v-autocomplete / v-combobox infinite-scroll patterns
 *
 * @param type - 'icd' for ICD-10-GM, 'ops' for OPS
 * @param options - Optional configuration
 * @returns Reactive state and methods for binding to Vuetify components
 */
export function useIcdOpsSearch(
  type: 'icd' | 'ops',
  options: {
    /** Items per page (default 10) */
    limit?: number
    /** Kind filter (default 'category') */
    kind?: 'chapter' | 'block' | 'category' | 'all'
    /** Debounce delay in ms (default 300) */
    debounceMs?: number
    /** Minimum characters before searching (default 1) */
    minChars?: number
  } = {},
) {
  const { limit = 10, kind = 'category', debounceMs = 300, minChars = 1 } = options

  // ─── Reactive state ────────────────────────────────────

  /** Current search query */
  const query = ref('')
  /** Search results (accumulated across pages for infinite scroll) */
  const items: Ref<IcdOpsEntry[]> = ref([])
  /** Currently loading? */
  const loading = ref(false)
  /** Error message if last request failed */
  const error = ref<string | null>(null)
  /** Current page */
  const currentPage = ref(1)
  /** Total pages from last response */
  const totalPages = ref(1)
  /** Total results count */
  const totalResults = ref(0)
  /** Whether there are more pages to load */
  const hasMore = ref(false)
  /** Data version from backend */
  const version = ref('')

  // ─── Debounce timer ────────────────────────────────────

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // ─── Methods ───────────────────────────────────────────

  const searchFn = type === 'icd' ? searchIcd : searchOps

  /**
   * Execute a search (resets pagination).
   * Called automatically when `query` changes, but can also be called manually.
   */
  async function search(searchQuery?: string): Promise<void> {
    const q = searchQuery ?? query.value
    if (q.length < minChars) {
      items.value = []
      totalResults.value = 0
      totalPages.value = 1
      currentPage.value = 1
      hasMore.value = false
      return
    }

    loading.value = true
    error.value = null
    currentPage.value = 1

    try {
      const result = await searchFn({ query: q, page: 1, limit, kind })
      items.value = result.items
      totalResults.value = result.total
      totalPages.value = result.totalPages
      currentPage.value = result.page
      hasMore.value = result.page < result.totalPages
      version.value = result.version
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search failed'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Load the next page of results (appends to existing items).
   * Use this for infinite scroll / "load more" behaviour.
   */
  async function loadMore(): Promise<void> {
    if (loading.value || !hasMore.value) return

    const nextPage = currentPage.value + 1
    loading.value = true

    try {
      const result = await searchFn({
        query: query.value,
        page: nextPage,
        limit,
        kind,
      })
      items.value = [...items.value, ...result.items]
      currentPage.value = result.page
      totalPages.value = result.totalPages
      hasMore.value = result.page < result.totalPages
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load more results'
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear all results and reset state.
   */
  function clear(): void {
    query.value = ''
    items.value = []
    totalResults.value = 0
    totalPages.value = 1
    currentPage.value = 1
    hasMore.value = false
    error.value = null
  }

  // ─── Auto-search on query change (debounced) ──────────

  watch(query, (newQuery) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (newQuery.length < minChars) {
      items.value = []
      totalResults.value = 0
      hasMore.value = false
      return
    }
    debounceTimer = setTimeout(() => {
      search(newQuery)
    }, debounceMs)
  })

  // ─── Return ────────────────────────────────────────────

  return {
    /** Bind to v-model of search input */
    query,
    /** Bind to :items of v-autocomplete */
    items,
    /** Show a loading indicator */
    loading,
    /** Display error message */
    error,
    /** Current page number */
    currentPage,
    /** Total available pages */
    totalPages,
    /** Total matches */
    totalResults,
    /** Whether more pages are available */
    hasMore,
    /** Data version (e.g. "2026") */
    version,
    /** Trigger a search manually */
    search,
    /** Load next page (infinite scroll) */
    loadMore,
    /** Reset everything */
    clear,
  }
}
