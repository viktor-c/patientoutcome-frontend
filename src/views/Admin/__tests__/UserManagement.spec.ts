/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import UserManagement from '../UserManagement.vue'
import { userApi, userDepartmentApi } from '@/api'
import en from '@/locales/en'
import de from '@/locales/de'

const mockNotify = vi.fn()

vi.mock('@/stores/', () => ({
  useNotifierStore: () => ({
    notify: mockNotify,
  }),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    username: 'admin-user',
  }),
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de }
})

describe('UserManagement.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

  const mockUsers = [
    {
      id: '1',
      username: 'alice',
      name: 'Alice',
      email: 'alice@example.com',
      department: ['dept-1'],
      roles: ['admin'],
      lastLogin: undefined,
    },
    {
      id: '2',
      username: 'bob',
      name: 'Bob',
      email: 'bob@example.com',
      department: ['dept-2'],
      roles: ['doctor'],
      lastLogin: undefined,
    },
  ]

  const mockDepartments = [
    { id: 'dept-1', name: 'Dept A', departmentType: 'department' },
    { id: 'dept-2', name: 'Dept B', departmentType: 'department' },
    { id: 'center-1', name: 'Center A', departmentType: 'center' },
  ]

  function mountComponent() {
    return mount(UserManagement, {
      global: {
        plugins: [vuetify, i18n],
      },
      attachTo: document.body,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vuetify = createVuetify({ components, directives })
    // Mock ResizeObserver for JSDOM environment used by Vitest
    // Vuetify uses ResizeObserver in some components
    global.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    }

    vi.spyOn(userApi, 'getUsers').mockResolvedValue({ responseObject: mockUsers } as any)
    vi.spyOn(userDepartmentApi, 'getAllDepartments').mockResolvedValue({
      success: true,
      responseObject: mockDepartments,
    } as any)
  })

  it('filters users when typing in search input', async () => {
    const wrapper = mountComponent()

    await flushPromises()

    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).toContain('bob')

    const input = wrapper.find('input[aria-label="user-search-input"]')
    expect(input.exists()).toBe(true)

    await input.setValue('alice')
    await flushPromises()

    expect(wrapper.text()).toContain('alice')
    expect(wrapper.text()).not.toContain('bob')

    wrapper.unmount()
  })

  it('opens add user dialog from add button', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const addUserButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('Add User'))

    expect(addUserButton).toBeTruthy()
    await addUserButton!.trigger('click')
    await flushPromises()

    expect(document.body.innerHTML).toContain('Add User')
    wrapper.unmount()
  })

  it('creates user via registration-code flow and reloads users', async () => {
    vi.spyOn(userApi, 'batchCreateRegistrationCodes').mockResolvedValue({
      success: true,
      message: 'ok',
      responseObject: { doctor: ['ABC-DEF-123'] },
      statusCode: 201,
    } as any)
    vi.spyOn(userApi, 'registerUser').mockResolvedValue({
      success: true,
      message: 'created',
      statusCode: 201,
    } as any)

    const wrapper = mountComponent()
    await flushPromises()

    const addUserButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().includes('Add User'))
    await addUserButton!.trigger('click')
    await flushPromises()

    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    const selects = wrapper.findAllComponents({ name: 'VSelect' })

    const usernameField = textFields.find((field) => field.props('label') === 'Username')
    const nameField = textFields.find((field) => field.props('label') === 'Name')
    const emailField = textFields.find((field) => field.props('label') === 'Email')
    const passwordField = textFields.find((field) => field.props('label') === 'Password')
    const confirmPasswordField = textFields.find((field) => field.props('label') === 'Confirm Password')

    const departmentSelect = selects.find((field) => field.props('label') === 'Department')
    const roleSelect = selects.find((field) => field.props('label') === 'Role Configuration')

    expect(usernameField).toBeTruthy()
    expect(nameField).toBeTruthy()
    expect(emailField).toBeTruthy()
    expect(passwordField).toBeTruthy()
    expect(confirmPasswordField).toBeTruthy()
    expect(departmentSelect).toBeTruthy()
    expect(roleSelect).toBeTruthy()

    usernameField!.vm.$emit('update:modelValue', 'newdoctor')
    nameField!.vm.$emit('update:modelValue', 'New Doctor')
    emailField!.vm.$emit('update:modelValue', 'newdoctor@example.com')
    passwordField!.vm.$emit('update:modelValue', 'secret123')
    confirmPasswordField!.vm.$emit('update:modelValue', 'secret123')
    departmentSelect!.vm.$emit('update:modelValue', 'dept-1')
    roleSelect!.vm.$emit('update:modelValue', 'doctor')
    await flushPromises()

    const createButton = wrapper.findAllComponents({ name: 'VBtn' })
      .find((button) => button.text().trim() === 'Create')
    expect(createButton).toBeTruthy()

    await createButton!.trigger('click')
    await flushPromises()

    expect(userApi.batchCreateRegistrationCodes).toHaveBeenCalledWith({
      batchCreateRegistrationCodesRequest: {
        roles: [{ role: 'doctor', count: 1 }],
        department: ['dept-1'],
        expiryType: 'years',
        expiryValue: 1,
      },
    })

    expect(userApi.registerUser).toHaveBeenCalledWith({
      registerUserRequest: {
        username: 'newdoctor',
        name: 'New Doctor',
        email: 'newdoctor@example.com',
        password: 'secret123',
        confirmPassword: 'secret123',
        registrationCode: 'ABC-DEF-123',
      },
    })

    expect(mockNotify).toHaveBeenCalledWith('User created successfully', 'success')
    expect(userApi.getUsers).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })
})
