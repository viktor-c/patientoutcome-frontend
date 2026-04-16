const STORAGE_KEY = 'postLoginRedirectPath'

function isSafeInternalPath(path: string | undefined): path is string {
  if (!path) {
    return false
  }

  // Only allow app-internal relative paths to avoid open redirects.
  return path.startsWith('/') && !path.startsWith('//')
}

export function savePostLoginRedirect(path: string | undefined): void {
  if (!isSafeInternalPath(path)) {
    return
  }

  if (path.startsWith('/login')) {
    return
  }

  localStorage.setItem(STORAGE_KEY, path)
}

export function getPostLoginRedirect(): string | undefined {
  const path = localStorage.getItem(STORAGE_KEY) ?? undefined
  return isSafeInternalPath(path) ? path : undefined
}

export function clearPostLoginRedirect(): void {
  localStorage.removeItem(STORAGE_KEY)
}
