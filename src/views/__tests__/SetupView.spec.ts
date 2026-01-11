/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import SetupView from '../SetupView.vue'
import en from '@/locales/en'
import de from '@/locales/de'
import { setupApi } from '@/api'

// Mock the router
const mockPush = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush
    })
  }
})

describe('SetupView', () => {
  let vuetify: ReturnType<typeof createVuetify>
  let i18n: ReturnType<typeof createI18n>
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives
    })

    i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: { en, de }
    })

    pinia = createPinia()
    setActivePinia(pinia)

    // Mock ResizeObserver for JSDOM environment
    global.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    }

    vi.clearAllMocks()
  })

  it('renders the setup wizard', async () => {
    vi.spyOn(setupApi, 'getSetupStatus').mockResolvedValue({
      success: true,
      responseObject: {
        data: {
          setupRequired: true,
          hasAdminUser: false,
          hasAnyUsers: false,
          databaseConnected: true
        }
      }
    } as any)
    vi.spyOn(setupApi, 'getSetupDatabaseStats').mockResolvedValue({
      success: true,
      responseObject: {
        data: { users: 0 }
      }
    } as any)

    const wrapper = mount(SetupView, {
      global: {
        plugins: [vuetify, i18n, pinia]
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.v-stepper').exists()).toBe(true)
  })

  it('displays language selector', async () => {
    vi.spyOn(setupApi, 'getSetupStatus').mockResolvedValue({
      success: true,
      responseObject: {
        data: {
          setupRequired: true,
          hasAdminUser: false,
          hasAnyUsers: false,
          databaseConnected: true
        }
      }
    } as any)
    vi.spyOn(setupApi, 'getSetupDatabaseStats').mockResolvedValue({
      success: true,
      responseObject: {
        data: { users: 0 }
      }
    } as any)

    const wrapper = mount(SetupView, {
      global: {
        plugins: [vuetify, i18n, pinia]
      }
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('EN')
  })

  it('redirects to login if setup is not required', async () => {
    vi.spyOn(setupApi, 'getSetupStatus').mockResolvedValue({
      success: true,
      responseObject: {
        data: {
          setupRequired: false,
          hasAdminUser: true,
          hasAnyUsers: true,
          databaseConnected: true
        }
      }
    } as any)
    vi.spyOn(setupApi, 'getSetupDatabaseStats').mockResolvedValue({
      success: true,
      responseObject: {
        data: { users: 1 }
      }
    } as any)

    mount(SetupView, {
      global: {
        plugins: [vuetify, i18n, pinia]
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows loading state initially', () => {
    vi.spyOn(setupApi, 'getSetupStatus').mockImplementation(() => new Promise(() => {}))
    vi.spyOn(setupApi, 'getSetupDatabaseStats').mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(SetupView, {
      global: {
        plugins: [vuetify, i18n, pinia]
      }
    })

    expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
  })

  it('has 3 steps in the stepper', async () => {
    vi.spyOn(setupApi, 'getSetupStatus').mockResolvedValue({
      success: true,
      responseObject: {
        data: {
          setupRequired: true,
          hasAdminUser: false,
          hasAnyUsers: false,
          databaseConnected: true
        }
      }
    } as any)
    vi.spyOn(setupApi, 'getSetupDatabaseStats').mockResolvedValue({
      success: true,
      responseObject: {
        data: { users: 0 }
      }
    } as any)

    const wrapper = mount(SetupView, {
      global: {
        plugins: [vuetify, i18n, pinia]
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))
    await wrapper.vm.$nextTick()

    const stepperItems = wrapper.findAll('.v-stepper-item')
    expect(stepperItems.length).toBe(3)
  })
})
