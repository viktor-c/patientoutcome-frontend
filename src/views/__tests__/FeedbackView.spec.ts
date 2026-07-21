/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import FeedbackView from '../FeedbackView.vue'
import { feedbackApi } from '@/api'
import en from '@/locales/en'
import de from '@/locales/de'

vi.mock('@/api', async () => {
  const actual = await vi.importActual('@/api')
  return {
    ...actual,
    feedbackApi: {
      getCaptcha: vi.fn(),
      submitFeedback: vi.fn(),
    },
  }
})

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de },
})

describe('FeedbackView.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>
  let router: ReturnType<typeof createRouter>

  const mockCaptchaResponse = {
    success: true,
    message: '',
    responseObject: {
      captchaId: 'captcha-123',
      question: '5 + 3',
    },
    statusCode: 200,
  }

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives,
    })

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/feedback', name: 'Feedback', component: FeedbackView },
        { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
      ],
    })

    vi.clearAllMocks()
    vi.mocked(feedbackApi.getCaptcha).mockResolvedValue(mockCaptchaResponse as any)
  })

  describe('Initialization', () => {
    it('should render feedback form', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(wrapper.find('.feedback-container').exists()).toBe(true)
      expect(wrapper.text()).toContain('Feedback')
    })

    it('should fetch captcha on mount', async () => {
      router.push('/feedback')
      await router.isReady()

      mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(feedbackApi.getCaptcha).toHaveBeenCalled()
    })

    it('should display captcha question', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('5 + 3')
    })

    it('should handle captcha fetch error', async () => {
      vi.mocked(feedbackApi.getCaptcha).mockRejectedValue(new Error('Network error'))

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      // Should display error state
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Form Fields', () => {
    it('should have name input field', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const nameField = wrapper.find('input[type="text"]')
      expect(nameField.exists()).toBe(true)
    })

    it('should have email input field', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const emailField = wrapper.find('input[type="email"]')
      expect(emailField.exists()).toBe(true)
    })

    it('should have message textarea', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const messageField = wrapper.find('textarea')
      expect(messageField.exists()).toBe(true)
    })

    it('should have captcha answer field', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const captchaField = wrapper.find('input[type="number"]')
      expect(captchaField.exists()).toBe(true)
    })

    it('should allow updating form fields', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.name = 'John Doe'
      vm.form.email = 'john@example.com'
      vm.form.message = 'This is a test feedback message'
      vm.form.captchaAnswer = '8'

      await wrapper.vm.$nextTick()

      expect(vm.form.name).toBe('John Doe')
      expect(vm.form.email).toBe('john@example.com')
      expect(vm.form.message).toBe('This is a test feedback message')
      expect(vm.form.captchaAnswer).toBe('8')
    })
  })

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      const emailRules = vm.emailRules

      // Valid email
      expect(emailRules[0]('test@example.com')).toBe(true)

      // Empty email (should be optional)
      expect(emailRules[0]('')).toBe(true)

      // Invalid email
      expect(emailRules[0]('invalid-email')).not.toBe(true)
    })

    it('should require message', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      const messageRules = vm.messageRules

      // Empty message should fail
      expect(messageRules[0]('')).not.toBe(true)

      // Valid message
      expect(messageRules[0]('Valid message')).toBe(true)
    })

    it('should require minimum message length', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      const messageRules = vm.messageRules

      // Short message should fail
      expect(messageRules[1]('Short')).not.toBe(true)

      // Long enough message
      expect(messageRules[1]('This is a valid message')).toBe(true)
    })

    it('should require captcha answer', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      const captchaRules = vm.captchaRules

      // Empty captcha should fail
      expect(captchaRules[0]('')).not.toBe(true)

      // Valid captcha
      expect(captchaRules[0]('8')).toBe(true)
    })

    it('should disable submit button when form is invalid', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.valid = false

      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeDefined()
    })

    it('should enable submit button when form is valid', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.valid = true
      vm.captchaId = 'captcha-123'

      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Captcha Management', () => {
    it('should display captcha refresh button', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const refreshButtons = wrapper.findAll('button')
      const refreshButton = refreshButtons.find((btn) =>
        btn.find('.v-icon').text().includes('mdi-refresh')
      )

      expect(refreshButton).toBeDefined()
    })

    it('should refresh captcha when clicking refresh button', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      vi.clearAllMocks()
      vi.mocked(feedbackApi.getCaptcha).mockResolvedValue({
        ...mockCaptchaResponse,
        responseObject: {
          captchaId: 'captcha-456',
          question: '10 + 5',
        },
      } as any)

      const vm = wrapper.vm as any
      await vm.fetchCaptcha()
      await flushPromises()

      expect(feedbackApi.getCaptcha).toHaveBeenCalled()
      expect(vm.captchaQuestion).toBe('10 + 5')
    })

    it('should clear captcha answer when refreshing', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.captchaAnswer = '8'

      await vm.fetchCaptcha()
      await flushPromises()

      expect(vm.form.captchaAnswer).toBe('')
    })

    it('should show loading state while fetching captcha', async () => {
      let resolveCaptcha: any
      const captchaPromise = new Promise((resolve) => {
        resolveCaptcha = resolve
      })
      vi.mocked(feedbackApi.getCaptcha).mockReturnValue(captchaPromise as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      // Check loading state
      const vm = wrapper.vm as any
      expect(vm.captchaLoading).toBe(true)

      // Resolve promise
      resolveCaptcha(mockCaptchaResponse)
      await flushPromises()

      expect(vm.captchaLoading).toBe(false)
    })

    it('should handle captcha fetch failure gracefully', async () => {
      vi.mocked(feedbackApi.getCaptcha).mockRejectedValue(new Error('Captcha error'))

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.captchaId).toBe('')
      expect(vm.captchaQuestion).toBeTruthy()
    })
  })

  describe('Form Submission', () => {
    it('should submit feedback with valid data', async () => {
      vi.mocked(feedbackApi.submitFeedback).mockResolvedValue({
        success: true,
        message: 'Feedback submitted',
        responseObject: null,
        statusCode: 200,
      } as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.name = 'John Doe'
      vm.form.email = 'john@example.com'
      vm.form.message = 'Great application!'
      vm.form.captchaAnswer = '8'
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: vi.fn(),
      }

      await vm.submitFeedback()
      await flushPromises()

      expect(feedbackApi.submitFeedback).toHaveBeenCalledWith({
        submitFeedbackRequest: expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Great application!',
          captchaId: 'captcha-123',
          captchaAnswer: '8',
        }),
      })
    })

    it('should show success message on successful submission', async () => {
      vi.mocked(feedbackApi.submitFeedback).mockResolvedValue({
        success: true,
        message: 'Success',
        responseObject: null,
        statusCode: 200,
      } as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.message = 'Valid feedback message'
      vm.form.captchaAnswer = '8'
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: vi.fn(),
      }

      await vm.submitFeedback()
      await flushPromises()

      expect(vm.submitSuccess).toBe(true)
    })

    it('should reset form after successful submission', async () => {
      vi.mocked(feedbackApi.submitFeedback).mockResolvedValue({
        success: true,
        message: 'Success',
        responseObject: null,
        statusCode: 200,
      } as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.name = 'Test Name'
      vm.form.email = 'test@example.com'
      vm.form.message = 'Test message for feedback'
      vm.form.captchaAnswer = '8'

      const mockReset = vi.fn()
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: mockReset,
      }

      await vm.submitFeedback()
      await flushPromises()

      expect(vm.form.name).toBe('')
      expect(vm.form.email).toBe('')
      expect(vm.form.message).toBe('')
      expect(vm.form.captchaAnswer).toBe('')
      expect(mockReset).toHaveBeenCalled()
    })

    it('should show error message on submission failure', async () => {
      vi.mocked(feedbackApi.submitFeedback).mockResolvedValue({
        success: false,
        message: 'Captcha incorrect',
        responseObject: null,
        statusCode: 400,
      } as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.message = 'Test feedback message'
      vm.form.captchaAnswer = '99'
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: vi.fn(),
      }

      await vm.submitFeedback()
      await flushPromises()

      expect(vm.submitError).toBeTruthy()
    })

    it('should refresh captcha after submission failure', async () => {
      vi.mocked(feedbackApi.submitFeedback).mockResolvedValue({
        success: false,
        message: 'Error',
        responseObject: null,
        statusCode: 400,
      } as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      vi.clearAllMocks()

      const vm = wrapper.vm as any
      vm.form.message = 'Valid feedback message'
      vm.form.captchaAnswer = '8'
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: vi.fn(),
      }

      await vm.submitFeedback()
      await flushPromises()

      expect(feedbackApi.getCaptcha).toHaveBeenCalled()
    })

    it('should not submit if form validation fails', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: false }),
      }

      await vm.submitFeedback()
      await flushPromises()

      expect(feedbackApi.submitFeedback).not.toHaveBeenCalled()
    })

    it('should disable submit button while submitting', async () => {
      let resolveSubmit: any
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve
      })
      vi.mocked(feedbackApi.submitFeedback).mockReturnValue(submitPromise as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.message = 'Valid message here'
      vm.form.captchaAnswer = '8'
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: vi.fn(),
      }

      const submitPromiseCall = vm.submitFeedback()

      // Check loading state
      expect(vm.loading).toBe(true)

      // Resolve
      resolveSubmit({
        success: true,
        message: '',
        responseObject: null,
        statusCode: 200,
      })
      await submitPromiseCall
      await flushPromises()

      expect(vm.loading).toBe(false)
    })

    it('should include locale in submission', async () => {
      vi.mocked(feedbackApi.submitFeedback).mockResolvedValue({
        success: true,
        message: '',
        responseObject: null,
        statusCode: 200,
      } as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.message = 'Feedback message'
      vm.form.captchaAnswer = '8'
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: vi.fn(),
      }

      await vm.submitFeedback()
      await flushPromises()

      expect(feedbackApi.submitFeedback).toHaveBeenCalledWith({
        submitFeedbackRequest: expect.objectContaining({
          locale: 'en',
        }),
      })
    })
  })

  describe('Navigation', () => {
    it('should have link back to login', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const link = wrapper.find('a[href="/login"]')
      expect(link.exists()).toBe(true)
    })

    it('should navigate to login after successful submission', async () => {
      vi.useFakeTimers()

      vi.mocked(feedbackApi.submitFeedback).mockResolvedValue({
        success: true,
        message: '',
        responseObject: null,
        statusCode: 200,
      } as any)

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.message = 'Valid feedback message'
      vm.form.captchaAnswer = '8'
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: vi.fn(),
      }

      await vm.submitFeedback()
      await flushPromises()

      // Fast-forward timer
      vi.advanceTimersByTime(1500)
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('Login')

      vi.useRealTimers()
    })
  })

  describe('Edge Cases', () => {
    it('should handle network error during submission', async () => {
      vi.mocked(feedbackApi.submitFeedback).mockRejectedValue(new Error('Network error'))

      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.form.message = 'Valid message'
      vm.form.captchaAnswer = '8'
      vm.formRef = {
        validate: vi.fn().mockResolvedValue({ valid: true }),
        reset: vi.fn(),
      }

      await vm.submitFeedback()
      await flushPromises()

      expect(vm.submitError).toBeTruthy()
    })

    it('should handle very long message', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      const longMessage = 'A'.repeat(5000)
      vm.form.message = longMessage

      await wrapper.vm.$nextTick()

      expect(vm.form.message).toBe(longMessage)
    })

    it('should handle special characters in message', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      const specialMessage = '<script>alert("xss")</script> Test & "quotes" \'single\''
      vm.form.message = specialMessage

      await wrapper.vm.$nextTick()

      expect(vm.form.message).toBe(specialMessage)
    })

    it('should close success alert', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.submitSuccess = true

      await wrapper.vm.$nextTick()

      vm.submitSuccess = false

      expect(vm.submitSuccess).toBe(false)
    })

    it('should close error alert', async () => {
      router.push('/feedback')
      await router.isReady()

      const wrapper = mount(FeedbackView, {
        global: {
          plugins: [vuetify, router, i18n],
        },
      })

      await flushPromises()

      const vm = wrapper.vm as any
      vm.submitError = 'Test error'

      await wrapper.vm.$nextTick()

      vm.submitError = ''

      expect(vm.submitError).toBe('')
    })
  })
})
