import { getBackendBuildInfoRaw, type BackendBuildInfo } from '@/api'

export interface BuildInfoState {
  frontendVersion: string
  frontendBuildRef: string
  backendVersion: string
  backendBuildRef: string
}

let cachedPromise: Promise<BuildInfoState> | null = null

function shortRef(value: string | undefined): string {
  if (!value) return 'unknown'
  if (value.length <= 12) return value
  return value.slice(0, 12)
}

export async function getBuildInfo(): Promise<BuildInfoState> {
  if (!cachedPromise) {
    cachedPromise = (async () => {
      const frontendVersion = String(import.meta.env.VITE_APP_VERSION || 'unknown')
      const frontendBuildRef = shortRef(String(import.meta.env.VITE_BUILD_REF || 'unknown'))

      const backendInfo: BackendBuildInfo | null = await getBackendBuildInfoRaw()
      const backendVersion = backendInfo?.appVersion || 'unknown'
      const backendBuildRef = shortRef(backendInfo?.buildRef || 'unknown')

      return {
        frontendVersion,
        frontendBuildRef,
        backendVersion,
        backendBuildRef,
      }
    })()
  }

  return cachedPromise
}
