import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import FormCompletionInfoView from '../FormCompletionInfoView.vue'

const routeQuery = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))

vi.mock('vue-router', () => ({
  useRoute: () => computed(() => ({ query: routeQuery.value })).value,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/NotificationPreferences.vue', () => ({
  default: {
    name: 'NotificationPreferences',
    props: {
      caseAccessToken: {
        type: String,
        required: false,
      },
    },
    template: '<div class="notification-preferences-stub">{{ caseAccessToken }}</div>',
  },
}))

describe('FormCompletionInfoView.vue', () => {
  const vuetify = createVuetify({ components, directives })

  beforeEach(() => {
    routeQuery.value = {}
  })

  it('prefers caseAccessToken from the route query when present', () => {
    routeQuery.value = {
      externalCode: 'CONSULT01',
      caseAccessToken: 'CASE01',
    }

    const wrapper = mount(FormCompletionInfoView, {
      global: {
        plugins: [vuetify],
      },
    })
    const notificationPreferences = wrapper.findComponent({ name: 'NotificationPreferences' })

    expect(notificationPreferences.exists()).toBe(true)
    expect(notificationPreferences.props('caseAccessToken')).toBe('CASE01')
  })

  it('falls back to externalCode when no explicit caseAccessToken is provided', () => {
    routeQuery.value = {
      externalCode: 'CONSULT01',
    }

    const wrapper = mount(FormCompletionInfoView, {
      global: {
        plugins: [vuetify],
      },
    })
    const notificationPreferences = wrapper.findComponent({ name: 'NotificationPreferences' })

    expect(notificationPreferences.exists()).toBe(true)
    expect(notificationPreferences.props('caseAccessToken')).toBe('CONSULT01')
  })
})