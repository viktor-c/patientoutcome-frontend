import { computed, onMounted, onUnmounted, readonly, ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type PwaInstallMode = 'installed' | 'prompt' | 'ios-manual' | 'browser-manual'

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function detectInstalledState(): boolean {
  if (typeof window === 'undefined') return false

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isInstalled = ref(detectInstalledState())
  const isIos = computed(() => isIosDevice())
  const canPromptInstall = computed(() => !isInstalled.value && deferredPrompt.value !== null)
  const installMode = computed<PwaInstallMode>(() => {
    if (isInstalled.value) return 'installed'
    if (canPromptInstall.value) return 'prompt'
    if (isIos.value) return 'ios-manual'
    return 'browser-manual'
  })

  let mediaQuery: MediaQueryList | null = null

  const refreshInstalledState = () => {
    isInstalled.value = detectInstalledState()
    if (isInstalled.value) {
      deferredPrompt.value = null
    }
  }

  const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
  }

  const onAppInstalled = () => {
    deferredPrompt.value = null
    refreshInstalledState()
  }

  async function promptInstall(): Promise<boolean> {
    if (!deferredPrompt.value) return false

    await deferredPrompt.value.prompt()
    const choice = await deferredPrompt.value.userChoice.catch(() => null)

    if (choice?.outcome === 'accepted') {
      deferredPrompt.value = null
      refreshInstalledState()
      return true
    }

    return false
  }

  onMounted(() => {
    refreshInstalledState()

    if (typeof window === 'undefined') return

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener?.('change', refreshInstalledState)
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }

    mediaQuery?.removeEventListener?.('change', refreshInstalledState)
    mediaQuery = null
  })

  return {
    isInstalled: readonly(isInstalled),
    isIos,
    canPromptInstall: readonly(canPromptInstall),
    installMode,
    promptInstall,
    refreshInstalledState,
  }
}