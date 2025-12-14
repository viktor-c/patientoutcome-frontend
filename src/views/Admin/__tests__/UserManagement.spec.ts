import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import UserManagement from '../UserManagement.vue'
import { userApi } from '@/api'

describe('UserManagement.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createVuetify({ components, directives })
    // Mock ResizeObserver for JSDOM environment used by Vitest
    // Vuetify uses ResizeObserver in some components
    // @ts-ignore
    global.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    }
  })

  it('filters users when typing in search input', async () => {
    // Mock the API response with two users
    const mockUsers = [
      { id: '1', username: 'alice', name: 'Alice', email: 'alice@example.com', department: 'Dept A', roles: ['admin'], lastLogin: undefined },
      { id: '2', username: 'bob', name: 'Bob', email: 'bob@example.com', department: 'Dept B', roles: ['doctor'], lastLogin: undefined },
    ]

    vi.spyOn(userApi, 'getUsers').mockResolvedValue({ responseObject: mockUsers } as any)

    const wrapper = mount(UserManagement, {
      global: {
        plugins: [vuetify],
      },
    })

    // Wait for onMounted and promise resolution
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // Both users should be visible initially
    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).toContain('bob')

    // Find the search input and type 'alice'
    const input = wrapper.find('input[aria-label="search-input"]')
    expect(input.exists()).toBe(true)

    await input.setValue('alice')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // After searching for 'alice', 'bob' should not be visible
    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).not.toContain('bob')
  })
})
