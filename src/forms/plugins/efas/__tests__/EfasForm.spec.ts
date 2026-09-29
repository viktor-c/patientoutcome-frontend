import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import EfasForm from '../EfasForm.vue'
import { getInitialData } from '../scoring'

function mountComponent() {
  const vuetify = createVuetify({ components, directives })
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { en },
  })

  return mount(EfasForm, {
    props: {
      modelValue: getInitialData(),
      locale: 'en',
    },
    global: {
      plugins: [vuetify, i18n],
    },
  })
}

describe('EfasForm', () => {
  it('stores 0 when an unanswered track is activated and then shows the slider', async () => {
    const wrapper = mountComponent()

    const unansweredTracks = wrapper.findAll('.slider-activation-track')
    expect(unansweredTracks.length).toBeGreaterThan(0)
    const initialTrackCount = unansweredTracks.length

    await unansweredTracks[0].trigger('pointerdown', {
      clientX: 0,
    })

    const emissions = wrapper.emitted('update:modelValue')
    expect(emissions).toBeTruthy()

    const payload = emissions?.[0]?.[0]
    expect(payload.rawFormData.standardfragebogen.q1).toBe(0)
    expect(payload.fillStatus).toBe('incomplete')

    await wrapper.setProps({
      modelValue: payload.rawFormData,
    })

    expect(wrapper.findAll('.slider-activation-track')).toHaveLength(initialTrackCount - 2)
    expect(wrapper.find('.v-slider').exists()).toBe(true)
  })
})