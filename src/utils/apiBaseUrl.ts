/**
 * Resolve the API base URL from runtime config or Vite env.
 *
 * This is intentionally strict: the configured value is used as-is (trimmed),
 * and no host-matching or automatic fallback is applied.
 */
export function resolveApiBaseUrl(rawBaseUrl?: string): string {
  const runtimeBaseUrl = typeof window !== 'undefined' ? window.__APP_CONFIG__?.VITE_API_URL : undefined
  const candidateBaseUrl = runtimeBaseUrl || rawBaseUrl

  if (!candidateBaseUrl) return ''

  const trimmed = candidateBaseUrl.trim().replace(/\/$/, '')
  return trimmed
}