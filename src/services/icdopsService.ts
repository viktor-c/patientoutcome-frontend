/**
 * ICD-OPS API Service
 *
 * Provides search functionality for ICD-10-GM and OPS classification codes.
 * Implements a localStorage-based cache with a 6-month TTL and
 * year-boundary invalidation (if cached data was fetched last year,
 * re-fetch automatically). The cache stores query results so that
 * repeated searches can be served instantly without network requests.
 *
 * When the backend is unavailable, stale cache data is still returned
 * to provide the best possible UX.
 */

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface IcdOpsEntry {
  code: string
  label: string
  kind: 'chapter' | 'block' | 'category'
}

export interface IcdOpsPaginatedResponse {
  items: IcdOpsEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
  version: string
  type: 'icd' | 'ops'
}

export interface IcdOpsServiceResponse {
  success: boolean
  message: string
  responseObject: IcdOpsPaginatedResponse
  statusCode: number
}

export interface IcdOpsStatusResponse {
  success: boolean
  message: string
  responseObject: {
    version: string
    loaded: boolean
    entryCount: number
  }
  statusCode: number
}

// ──────────────────────────────────────────────────────────────
// Cache Configuration
// ──────────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'icdops_cache_'
const CACHE_META_KEY = 'icdops_cache_meta'

/** 6 months in milliseconds */
const CACHE_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000

interface CacheMeta {
  /** Timestamp when the cache was last populated */
  lastUpdated: number
  /** The year the cache was populated in */
  year: number
  /** Data version from the backend (e.g. "2026") */
  version: string
}

interface CacheEntry {
  /** Timestamp when this entry was cached */
  timestamp: number
  /** The response data */
  data: IcdOpsPaginatedResponse
}

// ──────────────────────────────────────────────────────────────
// Cache helpers
// ──────────────────────────────────────────────────────────────

function getCacheMeta(): CacheMeta | null {
  try {
    const raw = localStorage.getItem(CACHE_META_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setCacheMeta(meta: CacheMeta): void {
  try {
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta))
  } catch {
    // localStorage full or unavailable – silently ignore
  }
}

/**
 * Build a unique cache key from the search parameters.
 */
function buildCacheKey(
  type: 'icd' | 'ops',
  query: string,
  page: number,
  limit: number,
  kind: string,
): string {
  return `${CACHE_KEY_PREFIX}${type}_${query.toLowerCase().trim()}_p${page}_l${limit}_k${kind}`
}

function getCacheEntry(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setCacheEntry(key: string, data: IcdOpsPaginatedResponse): void {
  try {
    const entry: CacheEntry = { timestamp: Date.now(), data }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage full – try to clear old entries then retry once
    clearOldCacheEntries()
    try {
      const entry: CacheEntry = { timestamp: Date.now(), data }
      localStorage.setItem(key, JSON.stringify(entry))
    } catch {
      // Still fails – give up silently
    }
  }
}

/**
 * Check if the cache is still valid.
 * Invalid if:
 *  - No meta exists
 *  - Cache is older than 6 months
 *  - Cache was populated in a previous calendar year
 */
export function isCacheValid(): boolean {
  const meta = getCacheMeta()
  if (!meta) return false

  const now = Date.now()
  const age = now - meta.lastUpdated

  // Older than 6 months?
  if (age > CACHE_TTL_MS) return false

  // Was the cache populated last year?
  const currentYear = new Date().getFullYear()
  if (meta.year < currentYear) return false

  return true
}

/**
 * Remove all ICD-OPS cache entries from localStorage.
 */
export function clearIcdOpsCache(): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith(CACHE_KEY_PREFIX) || key === CACHE_META_KEY)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}

/**
 * Remove cache entries older than 6 months to reclaim storage.
 */
function clearOldCacheEntries(): void {
  const now = Date.now()
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(CACHE_KEY_PREFIX)) {
      const entry = getCacheEntry(key)
      if (entry && now - entry.timestamp > CACHE_TTL_MS) {
        keysToRemove.push(key)
      }
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}

// ──────────────────────────────────────────────────────────────
// API helpers
// ──────────────────────────────────────────────────────────────

/**
 * Get the base URL for API calls.
 * In dev, reads from import.meta.env.VITE_API_URL; in production uses the configured URL.
 */
function getBaseUrl(): string {
  // During tests, import.meta.env may not be available
  try {
    const envUrl = import.meta.env?.VITE_API_URL
    if (envUrl) return envUrl.replace(/\/$/, '')
  } catch {
    // Fallback for non-Vite environments (SSR, tests)
  }
  return '/api'
}

async function fetchFromApi(url: string): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
}

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────

export interface SearchOptions {
  query: string
  page?: number
  limit?: number
  kind?: 'chapter' | 'block' | 'category' | 'all'
}

// ──────────────────────────────────────────────────────────────
// Search-mode detection
// ──────────────────────────────────────────────────────────────

/**
 * Determine whether the user's input is a code-prefix navigation query
 * or a free-text description search.
 *
 * ICD-10 codes always start with a letter (A-Z) → code-prefix mode.
 * OPS codes always start with a digit            → code-prefix mode.
 * Any other pattern                              → text-search mode.
 */
export function detectSearchMode(type: 'icd' | 'ops', input: string): 'code-prefix' | 'text-search' {
  if (!input || input.length === 0) return 'text-search'
  if (type === 'icd') {
    return /^[A-Za-z]/.test(input) ? 'code-prefix' : 'text-search'
  }
  // OPS: digit at position 0 → code-prefix; anything else → text-search
  return /^\d/.test(input) ? 'code-prefix' : 'text-search'
}

/**
 * Normalize a user-typed OPS prefix to the stored code format.
 * OPS codes are stored as "D-NNN.NN" (digit, hyphen, digits).
 *   "5"   → "5-"
 *   "52"  → "5-2"
 *   "521" → "5-21"
 */
export function normalizeOpsPrefix(input: string): string {
  const digits = input.replace(/-/g, '')
  if (!digits) return input
  if (digits.length === 1) return `${digits}-`
  return `${digits[0]}-${digits.slice(1)}`
}

// ──────────────────────────────────────────────────────────────
// Prefix response type
// ──────────────────────────────────────────────────────────────

export interface IcdOpsPrefixResponse {
  items: IcdOpsEntry[]
  prefix: string
  type: 'icd' | 'ops'
  version: string
  isGroup: boolean
}

export interface IcdOpsPrefixServiceResponse {
  success: boolean
  message: string
  responseObject: IcdOpsPrefixResponse
  statusCode: number
}



/**
 * Search ICD-10-GM codes. Uses localStorage cache when available
 * and falls back to the backend API.
 *
 * When the cache is invalid (>6 months or from a previous year),
 * the first 2 pages are pre-fetched and cached in the background.
 */
export async function searchIcd(options: SearchOptions): Promise<IcdOpsPaginatedResponse> {
  return searchClassification('icd', options)
}

/**
 * Search OPS codes. Uses localStorage cache when available
 * and falls back to the backend API.
 */
export async function searchOps(options: SearchOptions): Promise<IcdOpsPaginatedResponse> {
  return searchClassification('ops', options)
}

/**
 * Get the ICD data status from the backend.
 */
export async function getIcdStatus(): Promise<IcdOpsStatusResponse['responseObject']> {
  const base = getBaseUrl()
  const res = await fetchFromApi(`${base}/icdops/icd/status`)
  const data: IcdOpsStatusResponse = await res.json()
  return data.responseObject
}

/**
 * Get the OPS data status from the backend.
 */
export async function getOpsStatus(): Promise<IcdOpsStatusResponse['responseObject']> {
  const base = getBaseUrl()
  const res = await fetchFromApi(`${base}/icdops/ops/status`)
  const data: IcdOpsStatusResponse = await res.json()
  return data.responseObject
}

/**
 * Fetch ICD-10 hierarchical navigation results for a code prefix.
 * Short prefixes (1-2 chars) return one entry per next-level group.
 * Longer prefixes return all matching entries sorted broadest-first.
 */
export async function searchIcdPrefix(prefix: string, limit = 20): Promise<IcdOpsPrefixResponse> {
  return fetchPrefixFromApi('icd', prefix, limit)
}

/**
 * Fetch OPS hierarchical navigation results for a code prefix.
 * The hyphen is inserted automatically server-side: "52" → "5-2".
 */
export async function searchOpsPrefix(prefix: string, limit = 20): Promise<IcdOpsPrefixResponse> {
  return fetchPrefixFromApi('ops', prefix, limit)
}

// ──────────────────────────────────────────────────────────────
// Core search with cache
// ──────────────────────────────────────────────────────────────

async function searchClassification(
  type: 'icd' | 'ops',
  options: SearchOptions,
): Promise<IcdOpsPaginatedResponse> {
  const { query, page = 1, limit = 10, kind = 'category' } = options

  const cacheKey = buildCacheKey(type, query, page, limit, kind)
  const cacheValid = isCacheValid()

  // 1. Try cache first
  if (cacheValid) {
    const cached = getCacheEntry(cacheKey)
    if (cached) {
      return cached.data
    }
  }

  // 2. Fetch from backend
  try {
    const base = getBaseUrl()
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: String(limit),
      kind,
    })
    const res = await fetchFromApi(`${base}/icdops/${type}/search?${params}`)

    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`)
    }

    const data: IcdOpsServiceResponse = await res.json()
    const result = data.responseObject

    // Update cache
    setCacheEntry(cacheKey, result)
    setCacheMeta({
      lastUpdated: Date.now(),
      year: new Date().getFullYear(),
      version: result.version,
    })

    // Pre-fetch page 2 in the background if this is page 1 and cache was invalid
    if (page === 1 && !cacheValid && result.totalPages > 1) {
      prefetchPage(type, query, 2, limit, kind).catch(() => {
        // Silently ignore prefetch errors
      })
    }

    return result
  } catch (error) {
    // 3. If the API is down, try returning stale cache data
    const staleEntry = getCacheEntry(cacheKey)
    if (staleEntry) {
      console.warn(`[icdopsService] API unavailable, returning stale cache for "${query}"`)
      return staleEntry.data
    }

    // 4. Nothing available – return empty result
    console.error(`[icdopsService] Search failed for ${type}:`, error)
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      version: 'unknown',
      type,
    }
  }
}

/**
 * Pre-fetch a specific page and store it in the cache.
 */
async function prefetchPage(
  type: 'icd' | 'ops',
  query: string,
  page: number,
  limit: number,
  kind: string,
): Promise<void> {
  const cacheKey = buildCacheKey(type, query, page, limit, kind)
  const existing = getCacheEntry(cacheKey)
  if (existing) return // Already cached

  const base = getBaseUrl()
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
    kind,
  })
  const res = await fetchFromApi(`${base}/icdops/${type}/search?${params}`)
  if (res.ok) {
    const data: IcdOpsServiceResponse = await res.json()
    setCacheEntry(cacheKey, data.responseObject)
  }
}
/**
 * Fetch prefix/navigation results from the backend.
 * Prefix results are NOT cached in localStorage (they are fast, small, and
 * highly dependent on the exact input; caching adds minimal value here).
 */
async function fetchPrefixFromApi(
  type: 'icd' | 'ops',
  prefix: string,
  limit: number,
): Promise<IcdOpsPrefixResponse> {
  try {
    const base = getBaseUrl()
    const params = new URLSearchParams({ q: prefix, limit: String(limit) })
    const res = await fetchFromApi(`${base}/icdops/${type}/prefix?${params}`)

    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`)
    }

    const data: IcdOpsPrefixServiceResponse = await res.json()
    return data.responseObject
  } catch (error) {
    console.error(`[icdopsService] Prefix search failed for ${type}:`, error)
    return {
      items: [],
      prefix,
      type,
      version: 'unknown',
      isGroup: false,
    }
  }
}