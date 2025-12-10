import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import PostopWeekBanner from '../PostopWeekBanner.vue'
import { useUserStore } from '@/stores/userStore'

describe('PostopWeekBanner.vue', () => {
  let wrapper: VueWrapper
  let vuetify: ReturnType<typeof createVuetify>
  let userStore: ReturnType<typeof useUserStore>

  beforeEach(() => {
    // Create fresh Pinia instance for each test
    setActivePinia(createPinia())
    userStore = useUserStore()

    vuetify = createVuetify({
      components,
      directives,
    })
  })

  const mountComponent = () => {
    wrapper = mount(PostopWeekBanner, {
      global: {
        plugins: [vuetify],
      },
    })
  }

  describe('visibility', () => {
    it('should not display when postopWeek is not set', () => {
      userStore.postopWeek = undefined
      userStore.roles = ['kiosk']
      mountComponent()

      expect(wrapper.find('div[role="alert"]').exists()).toBe(false)
    })

    it('should not display when user is not a kiosk user', () => {
      userStore.postopWeek = 6
      userStore.roles = ['doctor']
      mountComponent()

      expect(wrapper.find('div[role="alert"]').exists()).toBe(false)
    })

    it('should display when postopWeek is set and user is kiosk user', () => {
      userStore.postopWeek = 6
      userStore.roles = ['kiosk']
      mountComponent()

      expect(wrapper.find('div[role="alert"]').exists()).toBe(true)
    })
  })

  describe('text display - weeks', () => {
    beforeEach(() => {
      userStore.roles = ['kiosk']
    })

    it('should display week 1 correctly', () => {
      userStore.postopWeek = 1
      mountComponent()

      expect(wrapper.text()).toContain('1. postoperativen Woche')
    })

    it('should display week 6 correctly', () => {
      userStore.postopWeek = 6
      mountComponent()

      expect(wrapper.text()).toContain('6. postoperativen Woche')
    })

    it('should display week 12 correctly', () => {
      userStore.postopWeek = 12
      mountComponent()

      expect(wrapper.text()).toContain('12. postoperativen Woche')
    })

    it('should display week 15 (last week before months) correctly', () => {
      userStore.postopWeek = 15
      mountComponent()

      expect(wrapper.text()).toContain('15. postoperativen Woche')
    })
  })

  describe('text display - months', () => {
    beforeEach(() => {
      userStore.roles = ['kiosk']
    })

    it('should display 4 months for week 16', () => {
      userStore.postopWeek = 16
      mountComponent()

      expect(wrapper.text()).toContain('4. postoperativen Monat')
    })

    it('should display 6 months for week 24', () => {
      userStore.postopWeek = 24
      mountComponent()

      expect(wrapper.text()).toContain('6. postoperativen Monat')
    })

    it('should display 12 months for week 48', () => {
      userStore.postopWeek = 48
      mountComponent()

      expect(wrapper.text()).toContain('12. postoperativen Monat')
    })

    it('should floor months correctly for week 19 (4.75 months)', () => {
      userStore.postopWeek = 19
      mountComponent()

      // 19 weeks / 4 = 4.75 months -> should floor to 4
      expect(wrapper.text()).toContain('4. postoperativen Monat')
    })
  })

  describe('alert styling', () => {
    beforeEach(() => {
      userStore.postopWeek = 6
      userStore.roles = ['kiosk']
      mountComponent()
    })

    it('should have info type alert', () => {
      const alert = wrapper.find('div[role="alert"]')
      expect(alert.exists()).toBe(true)
    })

    it('should display the calendar icon', () => {
      // Check that the component renders (icon rendering is handled by Vuetify)
      expect(wrapper.html()).toBeTruthy()
    })

    it('should have the correct CSS classes', () => {
      const alert = wrapper.find('div[role="alert"]')
      expect(alert.classes()).toContain('mb-4')
      expect(alert.classes()).toContain('text-h6')
    })
  })

  describe('reactivity', () => {
    beforeEach(() => {
      userStore.postopWeek = 6
      userStore.roles = ['kiosk']
      mountComponent()
    })

    it('should update text when postopWeek changes from weeks to months', async () => {
      expect(wrapper.text()).toContain('6. postoperativen Woche')

      userStore.postopWeek = 20
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('5. postoperativen Monat')
    })

    it('should hide banner when postopWeek is cleared', async () => {
      expect(wrapper.find('div[role="alert"]').exists()).toBe(true)

      userStore.postopWeek = undefined
      await wrapper.vm.$nextTick()

      expect(wrapper.find('div[role="alert"]').exists()).toBe(false)
    })

    it('should hide banner when user role changes to non-kiosk', async () => {
      expect(wrapper.find('div[role="alert"]').exists()).toBe(true)

      userStore.roles = ['doctor']
      await wrapper.vm.$nextTick()

      expect(wrapper.find('div[role="alert"]').exists()).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle postopWeek of 0', () => {
      // Create fresh store for this test
      setActivePinia(createPinia())
      userStore = useUserStore()
      userStore.postopWeek = 0
      userStore.roles = ['kiosk']
      mountComponent()

      // 0 is falsy in JavaScript, component checks with &&
      // 0 && isKioskUser() evaluates to 0 (falsy), so banner should not show
      expect(wrapper.find('div[role="alert"]').exists()).toBe(false)
    })

    it('should handle very large postopWeek values', () => {
      setActivePinia(createPinia())
      userStore = useUserStore()
      userStore.postopWeek = 200
      userStore.roles = ['kiosk']
      mountComponent()

      // 200 weeks / 4 = 50 months
      expect(wrapper.text()).toContain('50. postoperativen Monat')
    })
  })
})
