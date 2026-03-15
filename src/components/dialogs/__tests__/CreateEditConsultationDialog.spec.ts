import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreateEditConsultationDialog from '../CreateEditConsultationDialog.vue'
import { consultationApi, formtemplateApi, userApi, codeApi } from '@/api'
import type { ApiConsultationFlexible, ApiConsultationProm } from '@/types'
import en from '@/locales/en'

type FormTemplatesShortlistResponse = Awaited<ReturnType<typeof formtemplateApi.getFormTemplatesShortlist>>
type UsersResponse = Awaited<ReturnType<typeof userApi.getUsers>>
type CodesResponse = Awaited<ReturnType<typeof codeApi.getAllAvailableCodes>>
type CreateConsultationResponse = Awaited<ReturnType<typeof consultationApi.createConsultation>>

interface DialogVm {
  selectedFormTemplates: string[]
  form: {
    reasonForConsultation: string[]
    dateAndTime: string | null
    proms: Array<{ title?: string | null; formTemplateId?: string | null }>
  }
  submit: () => Promise<void>
  isEditMode: boolean
}

describe('CreateEditConsultationDialog.vue', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('augments consultation returned from API with template titles', async () => {
    const fakeTemplates = [{ id: 'tpl-123', title: 'My Form' }]
    vi.spyOn(formtemplateApi, 'getFormTemplatesShortlist').mockResolvedValue({ responseObject: fakeTemplates } as unknown as FormTemplatesShortlistResponse)
    vi.spyOn(userApi, 'getUsers').mockResolvedValue({ responseObject: [] } as unknown as UsersResponse)
    vi.spyOn(codeApi, 'getAllAvailableCodes').mockResolvedValue({ responseObject: [] } as unknown as CodesResponse)

    const createdConsultation = {
      id: 'c1',
      proms: [{ formTemplateId: 'tpl-123' }]
    }
    vi.spyOn(consultationApi, 'createConsultation').mockResolvedValue({ responseObject: createdConsultation } as unknown as CreateConsultationResponse)

    // the component uses vue-i18n; tests need to install the plugin
    const { createI18n } = await import('vue-i18n')
    const { createPinia } = await import('pinia')
    const { createVuetify } = await import('vuetify')
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
    const pinia = createPinia()
    const vuetify = createVuetify()

    const wrapper = mount(CreateEditConsultationDialog, {
      global: { plugins: [i18n, pinia, vuetify] },
      props: { patientId: 'p1', caseId: 'case1' },
    })

    // allow onMounted hooks to complete
    await flushPromises()

    const vm = wrapper.vm as unknown as DialogVm

    // select the template so the formTemplates array will not be empty either
    vm.selectedFormTemplates = ['tpl-123']
    // populate enough data to satisfy validation rules
    vm.form.reasonForConsultation = ['planned']
    vm.form.dateAndTime = new Date().toISOString()

    // trigger save via exposed method
    await vm.submit()
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toHaveLength(1)
    const result = emitted![0][0] as { proms?: Array<{ title?: string | null }> }
    // after augmentation, the prom object should have a title filled in
    const proms = result.proms ?? []
    expect(proms).toHaveLength(1)
    expect(proms[0]?.title).toBe('My Form')
  })

  it('initialises in edit mode and populates form title when consultation prop is provided', async () => {
    const fakeTemplates = [{ id: 'tpl-abc', title: 'Edit Form' }]
    vi.spyOn(formtemplateApi, 'getFormTemplatesShortlist').mockResolvedValue({ responseObject: fakeTemplates } as unknown as FormTemplatesShortlistResponse)
    vi.spyOn(userApi, 'getUsers').mockResolvedValue({ responseObject: [] } as unknown as UsersResponse)
    vi.spyOn(codeApi, 'getAllAvailableCodes').mockResolvedValue({ responseObject: [] } as unknown as CodesResponse)

    const { createI18n } = await import('vue-i18n')
    const { createPinia } = await import('pinia')
    const { createVuetify } = await import('vuetify')
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
    const pinia = createPinia()
    const vuetify = createVuetify()

    const wrapper = mount(CreateEditConsultationDialog, {
      global: { plugins: [i18n, pinia, vuetify] },
      props: { patientId: 'p1', caseId: 'case1', consultation: null },
    })

    await flushPromises()

    // now simulate selecting an existing consultation for editing
    const existing: ApiConsultationFlexible = {
      id: 'e1',
      proms: [{ formTemplateId: 'tpl-abc' }] as unknown as ApiConsultationProm[],
      patientCaseId: 'case1',
      dateAndTime: new Date().toISOString(),
      reasonForConsultation: [],
      notes: [],
      images: [],
      visitedBy: [],
    }
    await wrapper.setProps({ consultation: existing })
    await flushPromises()

    const vm = wrapper.vm as unknown as DialogVm
    expect(vm.isEditMode).toBe(true)
    expect(vm.selectedFormTemplates).toEqual(['tpl-abc'])
    const prom = vm.form.proms[0]
    expect(prom.title).toBe('Edit Form')
  })
})
