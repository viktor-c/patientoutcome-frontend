import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CreateEditConsultationDialog from '../CreateEditConsultationDialog.vue'
import { consultationApi, formtemplateApi, userApi, codeApi } from '@/api'

describe('CreateEditConsultationDialog.vue', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('augments consultation returned from API with template titles', async () => {
    const fakeTemplates = [{ id: 'tpl-123', title: 'My Form' }]
    vi.spyOn(formtemplateApi, 'getFormTemplatesShortlist').mockResolvedValue({ responseObject: fakeTemplates } as any)
    vi.spyOn(userApi, 'getUsers').mockResolvedValue({ responseObject: [] } as any)
    vi.spyOn(codeApi, 'getAllAvailableCodes').mockResolvedValue({ responseObject: [] } as any)

    const createdConsultation = {
      id: 'c1',
      proms: [{ formTemplateId: 'tpl-123' }]
    }
    vi.spyOn(consultationApi, 'createConsultation').mockResolvedValue({ responseObject: createdConsultation } as any)

    // the component uses vue-i18n; tests need to install the plugin
    const { createI18n } = await import('vue-i18n')
    const { createPinia } = await import('pinia')
    const { createVuetify } = await import('vuetify')
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })
    const pinia = createPinia()
    const vuetify = createVuetify()

    const wrapper = mount(CreateEditConsultationDialog, {
      global: { plugins: [i18n, pinia, vuetify] },
      props: { patientId: 'p1', caseId: 'case1' },
    })

    // allow onMounted hooks to complete
    await flushPromises()

    // select the template so the formTemplates array will not be empty either
    wrapper.vm.selectedFormTemplates = ['tpl-123']
    // populate enough data to satisfy validation rules
    wrapper.vm.form.reasonForConsultation = ['planned']
    wrapper.vm.form.dateAndTime = new Date().toISOString()

    // trigger save via exposed method
    await wrapper.vm.submit()
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toHaveLength(1)
    const result = emitted![0][0] as any
    // after augmentation, the prom object should have a title filled in
    expect(result.proms).toBeDefined()
    expect(result.proms[0].title).toBe('My Form')
  })

  it('initialises in edit mode and populates form title when consultation prop is provided', async () => {
    const fakeTemplates = [{ id: 'tpl-abc', title: 'Edit Form' }]
    vi.spyOn(formtemplateApi, 'getFormTemplatesShortlist').mockResolvedValue({ responseObject: fakeTemplates } as any)
    vi.spyOn(userApi, 'getUsers').mockResolvedValue({ responseObject: [] } as any)
    vi.spyOn(codeApi, 'getAllAvailableCodes').mockResolvedValue({ responseObject: [] } as any)

    const { createI18n } = await import('vue-i18n')
    const { createPinia } = await import('pinia')
    const { createVuetify } = await import('vuetify')
    const i18n = createI18n({ locale: 'en', messages: { en: {} } })
    const pinia = createPinia()
    const vuetify = createVuetify()

    const wrapper = mount(CreateEditConsultationDialog, {
      global: { plugins: [i18n, pinia, vuetify] },
      props: { patientId: 'p1', caseId: 'case1', consultation: null },
    })

    await flushPromises()

    // now simulate selecting an existing consultation for editing
    const existing = { id: 'e1', proms: [{ formTemplateId: 'tpl-abc' }] }
    await wrapper.setProps({ consultation: existing })
    await flushPromises()

    expect(wrapper.vm.isEditMode).toBe(true)
    expect(wrapper.vm.selectedFormTemplates).toEqual(['tpl-abc'])
    const prom = (wrapper.vm.form.proms as any[])[0]
    expect(prom.title).toBe('Edit Form')
  })
})
