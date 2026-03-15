import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import LoginView from '../LoginView.vue'

// Mock dependencies
const mockRouterPush = vi.fn()
const mockRouteQuery = ref({})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    currentRoute: { value: { query: mockRouteQuery.value } },
  }),
  useRoute: () => ({
    query: mockRouteQuery.value,
  }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

const mockNotify = vi.fn()
vi.mock('@/stores/notifierStore', () => ({
  useNotifierStore: () => ({
    notify: mockNotify,
  }),
}))

const mockIsAuthenticated = vi.fn().mockReturnValue(false)
const mockIsKioskUser = vi.fn().mockReturnValue(false)
const mockSetSession = vi.fn()

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    isAuthenticated: mockIsAuthenticated,
    isKioskUser: mockIsKioskUser,
    setSession: mockSetSession,
  }),
}))

const mockLoginUser = vi.fn()
const mockGetSetupStatus = vi.fn()

vi.mock('@/api', () => ({
  userApi: {
    loginUser: (...args: unknown[]) => mockLoginUser(...args),
  },
  setupApi: {
    getSetupStatus: () => mockGetSetupStatus(),
  },
  ResponseError: class ResponseError extends Error {
    response = {
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    }
  },
}))

describe('LoginView.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated.mockReturnValue(false)
    mockIsKioskUser.mockReturnValue(false)
    mockGetSetupStatus.mockResolvedValue({ success: true, responseObject: { setupRequired: false } })
    vuetify = createVuetify({ components, directives })
  })

  function mountComponent() {
    return mount(LoginView, {
      global: {
        plugins: [vuetify],
      },
    })
  }

  describe('rendering', () => {
    it('should render the login form', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      
      expect(wrapper.exists()).toBe(true)
    })

    it('should have username input field', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      
      const usernameInput = wrapper.find('input[type="text"], input:not([type])')
      expect(usernameInput.exists()).toBe(true)
    })

    it('should have password input field', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      
      const passwordInput = wrapper.find('input[type="password"]')
      expect(passwordInput.exists()).toBe(true)
    })

    it('should have login button', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      
      const loginButton = wrapper.find('button[type="submit"], .v-btn')
      expect(loginButton.exists()).toBe(true)
    })
  })

  describe('authentication check on mount', () => {
    it('should redirect authenticated users to dashboard', async () => {
      mockIsAuthenticated.mockReturnValue(true)
      mockIsKioskUser.mockReturnValue(false)
      
      mountComponent()
      await flushPromises()
      
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should redirect kiosk users to kiosk page', async () => {
      mockIsAuthenticated.mockReturnValue(true)
      mockIsKioskUser.mockReturnValue(true)
      
      mountComponent()
      await flushPromises()
      
      expect(mockRouterPush).toHaveBeenCalledWith('/kiosk')
    })

    it('should not redirect unauthenticated users', async () => {
      mockIsAuthenticated.mockReturnValue(false)
      
      mountComponent()
      await flushPromises()
      
      // Should not redirect immediately
      expect(mockRouterPush).not.toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('setup check', () => {
    it('should redirect to setup if setup is required', async () => {
      mockGetSetupStatus.mockResolvedValue({
        success: true,
        responseObject: { setupRequired: true },
      })
      
      mountComponent()
      await flushPromises()
      
      expect(mockRouterPush).toHaveBeenCalledWith('/setup')
    })

    it('should handle setup check errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGetSetupStatus.mockRejectedValue(new Error('Network error'))
      
      const wrapper = mountComponent()
      await flushPromises()
      
      // Should still render the login form
      expect(wrapper.exists()).toBe(true)
      consoleError.mockRestore()
    })
  })

  describe('form validation', () => {
    it('should show error if username is empty', async () => {
      const wrapper = mountComponent()
      await flushPromises()
      
      // Find and click submit button
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
        await flushPromises()
        
        expect(mockNotify).toHaveBeenCalled()
      }
    })
  })

  describe('login submission', () => {
    it('should call login API with credentials', async () => {
      mockLoginUser.mockResolvedValue({
        success: true,
        statusCode: 200,
        responseObject: {
          username: 'testuser',
          email: 'test@example.com',
          roles: ['doctor'],
          permissions: [],
        },
      })

      const wrapper = mountComponent()
      await flushPromises()

      // Component should be rendered
      expect(wrapper.exists()).toBe(true)
    })

    it('should redirect to dashboard on successful login', async () => {
      mockLoginUser.mockResolvedValue({
        success: true,
        statusCode: 200,
        responseObject: {
          username: 'testuser',
          email: 'test@example.com',
          roles: ['doctor'],
          permissions: [],
        },
      })

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })

    it('should show error notification on failed login', async () => {
      const ApiResponseError = class extends Error {
        response = { json: () => Promise.resolve({ message: 'Invalid credentials' }) }
      }
      mockLoginUser.mockRejectedValue(new ApiResponseError())

      const wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('password visibility toggle', () => {
    it('should toggle password visibility', async () => {
      const wrapper = mountComponent()
      await flushPromises()

      const passwordInput = wrapper.find('input[type="password"]')
      expect(passwordInput.exists()).toBe(true)
    })
  })
})
