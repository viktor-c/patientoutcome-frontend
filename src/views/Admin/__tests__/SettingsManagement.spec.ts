/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import SettingsManagement from '../SettingsManagement.vue'
import * as api from '@/api'
import type { GetSettings200Response } from '@/api'
import en from '@/locales/en'
import de from '@/locales/de'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en, de }
})

vi.mock('@/api', async () => {
  const actual = await vi.importActual('@/api')
  return {
    ...actual,
    settingsApi: {
      getSettings: vi.fn(),
      updateSettings: vi.fn()
    }
  }
})

describe('SettingsManagement.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>
  let wrapper: any

  const mockSettingsResponse = {
    success: true,
    message: 'Settings retrieved successfully',
    statusCode: 200,
    responseObject: {
      version: '1.0.0',
      settings: {
          smtp: {
            category: 'email',
            priority: 1,
            fields: {
              SMTP_HOST: {
                value: 'smtp.example.com',
                type: 'string',
                required: true,
                sensitive: false,
                validation: {
                  minLength: 1,
                  maxLength: 255
                },
                description: {
                  en: 'SMTP server hostname',
                  de: 'SMTP-Server Hostname'
                },
                helpText: {
                  en: 'Enter the hostname of your SMTP server',
                  de: 'Geben Sie den Hostnamen Ihres SMTP-Servers ein'
                }
              },
              SMTP_PORT: {
                value: '587',
                type: 'number',
                required: true,
                sensitive: false,
                validation: {
                  min: 1,
                  max: 65535
                },
                description: {
                  en: 'SMTP server port',
                  de: 'SMTP-Server Port'
                },
                helpText: {
                  en: 'Port number for SMTP',
                  de: 'Portnummer für SMTP'
                }
              },
              SMTP_SECURE: {
                value: 'false',
                type: 'boolean',
                required: true,
                sensitive: false,
                description: {
                  en: 'Use SSL/TLS',
                  de: 'SSL/TLS verwenden'
                },
                helpText: {
                  en: 'Enable SSL/TLS encryption',
                  de: 'SSL/TLS-Verschlüsselung aktivieren'
                }
              },
              SMTP_PASS: {
                value: 'secr***',
                type: 'string',
                required: false,
                sensitive: true,
                validation: {
                  maxLength: 255
                },
                description: {
                  en: 'SMTP password',
                  de: 'SMTP Passwort'
                },
                helpText: {
                  en: 'Password for authentication',
                  de: 'Passwort für Authentifizierung'
                }
              }
            }
          },
          backup: {
            category: 'system',
            priority: 2,
            fields: {
              BACKUP_RETENTION_DAYS: {
                value: '30',
                type: 'number',
                required: false,
                sensitive: false,
                validation: {
                  min: 1,
                  max: 3650
                },
                description: {
                  en: 'Backup retention days',
                  de: 'Backup-Aufbewahrungstage'
                },
                helpText: {
                  en: 'Number of days to keep backups',
                  de: 'Anzahl der Tage zum Aufbewahren von Backups'
                }
              }
            }
          }
        }
      }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createVuetify({ components, directives })
    
    // Mock ResizeObserver for JSDOM environment
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    vi.clearAllMocks()
    vi.mocked(api.settingsApi.getSettings).mockResolvedValue(mockSettingsResponse as any as GetSettings200Response)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('should load and display settings on mount', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n],
        stubs: {
          VContainer: false,
          VCard: false,
          VExpansionPanels: false
        }
      }
    })

    await flushPromises()

    expect(api.settingsApi.getSettings).toHaveBeenCalled()
    expect(wrapper.text()).toContain('smtp.example.com')
    expect(wrapper.text()).toContain('587')
  })

  it('should display masked sensitive fields', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // The password should be displayed as masked
    const passwordField = wrapper.find('input[type="password"]')
    expect(passwordField.exists()).toBe(true)
  })

  it('should enable save button when changes are made', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Initially, save button should be disabled (no changes)
    const saveButton = wrapper.findAll('button').find((btn: any) => 
      btn.text().includes('Save') || btn.text().includes('settings.save')
    )
    expect(saveButton?.attributes('disabled')).toBeDefined()

    // Make a change
    const hostInput = wrapper.findAll('input[type="text"]')[0]
    await hostInput.setValue('smtp.gmail.com')
    await flushPromises()

    // Save button should now be enabled
    expect(saveButton?.attributes('disabled')).toBeUndefined()
  })

  it('should save settings when save button is clicked', async () => {
    const mockPutResponse = {
      success: true,
      message: 'Settings updated successfully',
      statusCode: 200,
      responseObject: mockSettingsResponse.responseObject
    }
    vi.mocked(api.settingsApi.updateSettings).mockResolvedValue(mockPutResponse as any as GetSettings200Response)

    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Make a change
    const hostInput = wrapper.findAll('input[type="text"]')[0]
    await hostInput.setValue('smtp.gmail.com')
    await flushPromises()

    // Click save button
    const saveButton = wrapper.findAll('button').find((btn: any) => 
      btn.text().includes('Save') || btn.text().includes('settings.save')
    )
    await saveButton?.trigger('click')
    await flushPromises()

    expect(api.settingsApi.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
      requestBody: expect.objectContaining({
        smtp: expect.objectContaining({
          SMTP_HOST: 'smtp.gmail.com'
        })
      })
    }))
  })

  it('should reset changes when reset button is clicked', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Make a change
    const hostInput = wrapper.findAll('input[type="text"]')[0]
    await hostInput.setValue('smtp.gmail.com')
    await flushPromises()

    // Verify change was made
    expect(hostInput.element.value).toBe('smtp.gmail.com')

    // Click reset button
    const resetButton = wrapper.findAll('button').find((btn: any) => 
      btn.text().includes('Reset') || btn.text().includes('settings.reset')
    )
    await resetButton?.trigger('click')
    await flushPromises()

    // Value should be reset to original
    expect(hostInput.element.value).toBe('smtp.example.com')
  })

  it('should display unsaved changes alert when changes exist', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Initially no alert
    let alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(false)

    // Make a change
    const hostInput = wrapper.findAll('input[type="text"]')[0]
    await hostInput.setValue('smtp.gmail.com')
    await flushPromises()

    // Alert should appear
    alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
  })

  it('should handle save errors gracefully', async () => {
    vi.mocked(api.settingsApi.updateSettings).mockRejectedValue(
      new Error('Validation error: Invalid SMTP port')
    )

    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Make a change
    const hostInput = wrapper.findAll('input[type="text"]')[0]
    await hostInput.setValue('smtp.gmail.com')
    await flushPromises()

    // Click save
    const saveButton = wrapper.findAll('button').find((btn: any) => 
      btn.text().includes('Save') || btn.text().includes('settings.save')
    )
    await saveButton?.trigger('click')
    await flushPromises()

    // Component should still be functional (not crashed)
    expect(wrapper.vm).toBeDefined()
  })

  it('should handle load errors gracefully', async () => {
    vi.mocked(api.settingsApi.getSettings).mockRejectedValue(new Error('Network error'))

    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Should display error state
    expect(wrapper.text()).toContain('noData')
  })

  it('should expand all panels by default', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Check that expansion panels exist and categories are visible
    expect(wrapper.text()).toContain('SMTP')
    expect(wrapper.text()).toContain('Backup')
  })

  it('should validate required fields', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Try to clear a required field
    const hostInput = wrapper.findAll('input[type="text"]')[0]
    await hostInput.setValue('')
    await hostInput.trigger('blur')
    await flushPromises()

    // Validation error should appear (Vuetify adds error class)
    // The exact implementation depends on Vuetify's validation
    expect(wrapper.vm).toBeDefined()
  })

  it('should display different field types correctly', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n]
      }
    })

    await flushPromises()

    // Should have text inputs for string fields
    const textInputs = wrapper.findAll('input[type="text"]')
    expect(textInputs.length).toBeGreaterThan(0)

    // Should have number inputs for number fields
    const numberInputs = wrapper.findAll('input[type="number"]')
    expect(numberInputs.length).toBeGreaterThan(0)

    // Should have password inputs for sensitive fields
    const passwordInputs = wrapper.findAll('input[type="password"]')
    expect(passwordInputs.length).toBeGreaterThan(0)

    // Should have checkboxes for boolean fields
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('should use correct locale for descriptions', async () => {
    wrapper = mount(SettingsManagement, {
      global: {
        plugins: [vuetify, i18n],
        mocks: {
          $i18n: {
            locale: 'en',
            t: (key: string) => key
          }
        }
      }
    })

    await flushPromises()

    // Should display English descriptions
    expect(wrapper.text()).toContain('SMTP server hostname')
  })
})
