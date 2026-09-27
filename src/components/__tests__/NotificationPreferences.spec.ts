import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import NotificationPreferences from '../NotificationPreferences.vue'

const supported = ref(true)
const supportStatus = ref<'supported' | 'insecure-context' | 'ios-home-screen-required' | 'unsupported-browser'>('supported')
const permission = ref<'default' | 'granted' | 'denied' | 'unsupported'>('default')
const subscribed = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const subscribe = vi.fn().mockResolvedValue(undefined)
const unsubscribe = vi.fn().mockResolvedValue(undefined)
const sendTestNotification = vi.fn().mockResolvedValue(true)
const checkCurrentSubscription = vi.fn().mockResolvedValue(undefined)
const isInstalled = ref(false)
const isIos = ref(false)
const canPromptInstall = ref(false)
const installMode = ref<'installed' | 'prompt' | 'ios-manual' | 'browser-manual'>('browser-manual')
const promptInstall = vi.fn().mockResolvedValue(true)
const refreshInstalledState = vi.fn()

vi.mock('@/composables/usePushNotifications', () => ({
  usePushNotifications: () => ({
    supported: computed(() => supported.value),
    supportStatus: computed(() => supportStatus.value),
    permission: computed(() => permission.value),
    subscribed,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkCurrentSubscription,
  }),
}))

vi.mock('@/composables/usePwaInstall', () => ({
  usePwaInstall: () => ({
    isInstalled: computed(() => isInstalled.value),
    isIos: computed(() => isIos.value),
    canPromptInstall: computed(() => canPromptInstall.value),
    installMode: computed(() => installMode.value),
    promptInstall,
    refreshInstalledState,
  }),
}))

describe('NotificationPreferences.vue', () => {
  const vuetify = createVuetify({ components, directives })
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        notifications: {
          title: 'notifications.title',
          activeDescription: 'notifications.activeDescription',
          disabled: 'notifications.disabled',
          enabled: 'notifications.enabled',
          inactiveDescription: 'notifications.inactiveDescription',
          permissionDenied: 'notifications.permissionDenied',
          supportInsecureContext: 'notifications.supportInsecureContext',
          installDescription: 'notifications.installDescription',
          installBrowserInstructions: 'notifications.installBrowserInstructions',
          installButton: 'notifications.installButton',
          installAccepted: 'notifications.installAccepted',
          testDescription: 'notifications.testDescription',
          testButton: 'notifications.testButton',
          testSent: 'notifications.testSent',
        },
      },
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    supported.value = true
    supportStatus.value = 'supported'
    permission.value = 'default'
    subscribed.value = false
    loading.value = false
    error.value = null
    isInstalled.value = false
    isIos.value = false
    canPromptInstall.value = false
    installMode.value = 'browser-manual'
  })

  it('checks the current subscription state on mount', async () => {
    mount(NotificationPreferences, {
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    expect(checkCurrentSubscription).toHaveBeenCalledOnce()
  })

  it('forwards the patient case-access token when enabling notifications', async () => {
    const wrapper = mount(NotificationPreferences, {
      props: { caseAccessToken: 'CASE01' },
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    wrapper.findComponent({ name: 'VSwitch' }).vm.$emit('update:modelValue', true)
    await flushPromises()

    expect(subscribe).toHaveBeenCalledWith({ caseAccessToken: 'CASE01' })
  })

  it('calls unsubscribe when the switch is turned off', async () => {
    const wrapper = mount(NotificationPreferences, {
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    wrapper.findComponent({ name: 'VSwitch' }).vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('renders the permission denied state', async () => {
    permission.value = 'denied'

    const wrapper = mount(NotificationPreferences, {
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('notifications.permissionDenied')
  })

  it('renders the insecure-context support message', async () => {
    supported.value = false
    supportStatus.value = 'insecure-context'

    const wrapper = mount(NotificationPreferences, {
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('notifications.supportInsecureContext')
  })

  it('shows the install button when a browser install prompt is available', async () => {
    canPromptInstall.value = true
    installMode.value = 'prompt'

    const wrapper = mount(NotificationPreferences, {
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    const installButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('notifications.installButton'))

    expect(installButton).toBeDefined()

    await installButton!.trigger('click')
    await flushPromises()

    expect(promptInstall).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('notifications.installAccepted')
  })

  it('shows and uses the dev test button when subscribed', async () => {
    subscribed.value = true
    permission.value = 'granted'

    const wrapper = mount(NotificationPreferences, {
      global: {
        plugins: [vuetify, i18n],
      },
    })

    await flushPromises()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const testButton = buttons.find((button) => button.text().includes('notifications.testButton'))
    expect(testButton).toBeDefined()

    await testButton!.trigger('click')
    await flushPromises()

    expect(sendTestNotification).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('notifications.testSent')
  })
})