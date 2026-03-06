import { ref, watch, type Ref } from 'vue'
import {
  searchIcd,
  searchOps,
  searchIcdPrefix,
  searchOpsPrefix,
  detectSearchMode,
  type IcdOpsEntry,
  type IcdOpsPaginatedResponse,
  type SearchOptions,
} from '@/services/icdopsService'

// ──────────────────────────────────────────────────────────────
// Debounce delay from environment
// ──────────────────────────────────────────────────────────────

function getEnvDebounceMs(): number {
  try {
    const raw = import.meta.env?.VITE_ICD_OPS_DEBOUNCE_MS
    const parsed = Number(raw)
    if (!Number.isNaN(parsed) && parsed >= 0) return parsed
  } catch {
    // Non-Vite environment (SSR, tests) – use default
  }
  return 300
}

const ENV_DEBOUNCE_MS = getEnvDebounceMs()

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type SearchMode = 'code-prefix' | 'text-search'

// ──────────────────────────────────────────────────────────────
// Composable
// ──────────────────────────────────────────────────────────────

/**
 * Composable for ICD-10-GM and OPS code search with two modes:
 *
 * **Code-prefix mode** (automatic when input matches a code pattern):
 *   - ICD: input starts with a letter → hierarchical navigation (M→M0x, M2→M20-29…)
 *   - OPS: input starts with a digit  → hierarchical navigation (5→5-0x, 52→5-20…)
 *   - Returns next-level group representatives for short prefixes, or direct
 *     matches for longer ones. Does NOT use the paginated cache.
 *
 * **Text-search mode** (fallback for free-text queries):
 *   - OPS only: non-digit input triggers text search in code descriptions.
 *   - Also used when the backend cannot find code matches.
 *   - Supports infinite scroll / pagination.
 *
 * The debounce delay defaults to the `VITE_ICD_OPS_DEBOUNCE_MS` env variable
 * (falling back to 300 ms) but can be overridden per instance via `debounceMs`.
 *
 * @param type - 'icd' for ICD-10-GM, 'ops' for OPS
 * @param options - Optional configuration
 */
export function useIcdOpsSearch(
  type: 'icd' | 'ops',
  options: {
    /** Items per page for text-search mode (default 10) */
    limit?: number
    /** Kind filter for text-search mode (default 'category') */
    kind?: 'chapter' | 'block' | 'category' | 'all'
    /**
     * Debounce delay in ms. Defaults to `VITE_ICD_OPS_DEBOUNCE_MS` env var
     * (300 ms if not set). Use 0 to disable debounce in tests.
     */
    debounceMs?: number
    /** Minimum characters before searching (default 1) */
    minChars?: number
    /** Max items returned by prefix navigation (default 20) */
    prefixLimit?: number
  } = {},
) {
  const {
    limit = 10,
    kind = 'category',
    debounceMs = ENV_DEBOUNCE_MS,
    minChars = 1,
    prefixLimit = 20,
  } = options

  // ─── Reactive state ────────────────────────────────────

  /** Current search query */
  const query = ref('')
  /** Search results (accumulated across pages for infinite scroll) */
  const items: Ref<IcdOpsEntry[]> = ref([])
  /** Currently loading? */
  const loading = ref(false)
  /** Error message if last request failed */
  const error = ref<string | null>(null)
  /** Current page (text-search mode only) */
  const currentPage = ref(1)
  /** Total pages from last response (text-search mode only) */
  const totalPages = ref(1)
  /** Total results count */
  const totalResults = ref(0)
  /** Whether there are more pages to load (text-search mode only) */
  const hasMore = ref(false)
  /** Data version from backend */
  const version = ref('')
  /**
   * Current search mode.
   * 'code-prefix' → hierarchical code navigation (no pagination)
   * 'text-search'  → full-text search with pagination / infinite scroll
   */
  const searchMode = ref<SearchMode>('text-search')

  // ─── Debounce timer ────────────────────────────────────

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  // ─── Search functions ──────────────────────────────────

  const textSearchFn = type === 'icd' ? searchIcd : searchOps
  const prefixFn = type === 'icd' ? searchIcdPrefix : searchOpsPrefix

  /**
   * Execute a text-description search (resets pagination).
   */
  async function searchByText(searchQuery: string): Promise<void> {
    loading.value = true
    error.value = null
    currentPage.value = 1

    try {
      const result: IcdOpsPaginatedResponse = await textSearchFn({
        query: searchQuery,
        page: 1,
        limit,
        kind,
      } as SearchOptions)
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
   * Perform hierarchical prefix navigation.
   * Results are NOT paginated – `hasMore` is always false here.
   */
  async function searchByPrefix(prefix: string): Promise<void> {
    loading.value = true
    error.value = null
    currentPage.value = 1
    hasMore.value = false

    try {
      const result = await prefixFn(prefix, prefixLimit)
      items.value = result.items
      totalResults.value = result.items.length
      totalPages.value = 1
      version.value = result.version
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Prefix search failed'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Execute a search for the given query string (or current `query.value`).
   * Automatically selects code-prefix vs text-search mode and resets pagination.
   * Can be called manually; is also called automatically when `query` changes.
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

    const mode = detectSearchMode(type, q)
    searchMode.value = mode

    if (mode === 'code-prefix') {
      await searchByPrefix(q)
    } else {
      await searchByText(q)
    }
  }

  /**
   * Load the next page of results (appends to existing items).
   * Only meaningful in text-search mode. No-op in code-prefix mode.
   */
  async function loadMore(): Promise<void> {
    if (loading.value || !hasMore.value || searchMode.value === 'code-prefix') return

    const nextPage = currentPage.value + 1
    loading.value = true

    try {
      const result: IcdOpsPaginatedResponse = await textSearchFn({
        query: query.value,
        page: nextPage,
        limit,
        kind,
      } as SearchOptions)
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
    searchMode.value = 'text-search'
  }

  // ─── Auto-search on query change (debounced) ──────────

  watch(query, (newQuery) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (newQuery.length < minChars) {
      items.value = []
      totalResults.value = 0
      hasMore.value = false
      searchMode.value = 'text-search'
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
    /** Search results */
    items,
    /** Show a loading indicator */
    loading,
    /** Display error message */
    error,
    /** Current page number (text-search mode) */
    currentPage,
    /** Total available pages (text-search mode) */
    totalPages,
    /** Total matches */
    totalResults,
    /** Whether more pages are available (text-search mode only) */
    hasMore,
    /** Data version (e.g. "2026") */
    version,
    /**
     * Current search mode:
     * - 'code-prefix': hierarchical code navigation (letter-start for ICD, digit-start for OPS)
     * - 'text-search': full-text search in code descriptions
     */
    searchMode,
    /** Trigger a search manually */
    search,
    /** Load next page (infinite scroll, text-search mode only) */
    loadMore,
    /** Reset everything */
    clear,
  }
}
