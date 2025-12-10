import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import LanguageSelector from '../LanguageSelector.vue'

describe('LanguageSelector.vue', () => {
  let wrapper: VueWrapper
  let i18n: ReturnType<typeof createI18n>
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    // Create fresh instances for each test
    i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: {
        en: { test: 'Test' },
        de: { test: 'Test' },
      },
    })

    vuetify = createVuetify({
      components,
      directives,
    })

    wrapper = mount(LanguageSelector, {
      global: {
        plugins: [i18n, vuetify],
      },
    })
  })

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('displays the current locale flag', () => {
    const button = wrapper.find('.language-btn')
    expect(button.exists()).toBe(true)
    // English flag should be displayed by default
    expect(button.text()).toContain('🇬🇧')
  })

  it('has two locale options (English and German)', () => {
    const vm = wrapper.vm as any
    expect(vm.locales).toHaveLength(2)
    expect(vm.locales[0].code).toBe('en')
    expect(vm.locales[1].code).toBe('de')
  })

  it('computes the current locale correctly', () => {
    const vm = wrapper.vm as any
    expect(vm.currentLocale.code).toBe('en')
    expect(vm.currentLocale.label).toBe('English')
    expect(vm.currentLocale.flag).toBe('🇬🇧')
  })

  it('changes locale when setLocale is called', async () => {
    const vm = wrapper.vm as any

    // Change to German
    vm.setLocale('de')
    await wrapper.vm.$nextTick()

    expect((i18n.global.locale as any).value).toBe('de')
    expect(vm.currentLocale.code).toBe('de')
    expect(vm.currentLocale.label).toBe('Deutsch')
    expect(vm.currentLocale.flag).toBe('🇩🇪')
  })

  it('falls back to first locale if current locale is not found', async () => {
    // Set an invalid locale
    (i18n.global.locale as any).value = 'fr' as any
    await wrapper.vm.$nextTick()

    const vm = wrapper.vm as any
    expect(vm.currentLocale.code).toBe('en') // Should fall back to English
  })

  it('has proper button attributes', () => {
    const button = wrapper.find('.language-btn')
    expect(button.attributes('title')).toBe('Change language')
    // Verify button exists with the correct class
    expect(button.exists()).toBe(true)
    expect(button.classes()).toContain('language-btn')
  })
})
