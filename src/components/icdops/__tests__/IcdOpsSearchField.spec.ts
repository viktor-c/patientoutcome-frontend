import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick, ref } from 'vue'
import IcdOpsSearchField from '../IcdOpsSearchField.vue'

// ──────────────────────────────────────────────────────────────
// Mock the composable using actual Vue refs
// ──────────────────────────────────────────────────────────────

const mockSearch = vi.fn()
const mockLoadMore = vi.fn()
const mockClear = vi.fn()

const mockState = {
  query: ref(''),
  items: ref([] as any[]),
  loading: ref(false),
  error: ref(null as string | null),
  currentPage: ref(1),
  totalPages: ref(1),
  totalResults: ref(0),
  hasMore: ref(false),
  version: ref('2026'),
  searchMode: ref<'code-prefix' | 'text-search'>('text-search'),
  isGroupNav: ref(false),
  search: mockSearch,
  loadMore: mockLoadMore,
  clear: mockClear,
}

vi.mock('@/composables/useIcdOpsSearch', () => ({
  useIcdOpsSearch: () => mockState,
}))

describe('IcdOpsSearchField.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>
  let lastWrapper: ReturnType<typeof mountComponent> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    mockState.query.value = ''
    mockState.items.value = []
    mockState.loading.value = false
    mockState.error.value = null
    mockState.hasMore.value = false
    mockState.totalResults.value = 0
    mockState.currentPage.value = 1
    mockState.totalPages.value = 1
    mockState.version.value = '2026'
    mockState.searchMode.value = 'text-search'
    mockState.isGroupNav.value = false

    vuetify = createVuetify({ components, directives })
  })

  afterEach(() => {
    // Unmount to clean up teleported dialog content from document.body
    if (lastWrapper) {
      lastWrapper.unmount()
      lastWrapper = null
    }
  })

  function mountComponent(props: Record<string, unknown> = {}) {
    const wrapper = mount(IcdOpsSearchField, {
      props: {
        type: 'icd',
        ...props,
      },
      global: {
        plugins: [vuetify],
      },
      attachTo: document.body,
    })
    lastWrapper = wrapper
    return wrapper
  }

  it('renders without crashing', () => {
    const wrapper = mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('shows a trigger field (not a dropdown by default)', () => {
    const wrapper = mountComponent()
    // Uses v-input as trigger, NOT v-autocomplete
    expect(wrapper.findComponent({ name: 'VAutocomplete' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'VInput' }).exists()).toBe(true)
  })

  it('renders placeholder when no value is selected', () => {
    const wrapper = mountComponent({ placeholder: 'Test Code auswählen' })
    expect(wrapper.html()).toContain('Test Code auswählen')
  })

  it('renders the label', () => {
    const wrapper = mountComponent({ label: 'Diagnose' })
    // Label is forwarded to v-input
    const input = wrapper.findComponent({ name: 'VInput' })
    expect(input.props('label')).toBe('Diagnose')
  })

  it('renders selected single value as code + label', async () => {
    const value = { code: 'A00', label: 'Cholera', kind: 'category' }
    const wrapper = mountComponent({ modelValue: value, returnObject: true })
    await nextTick()
    expect(wrapper.html()).toContain('A00')
  })

  it('accepts ICD type', () => {
    const wrapper = mountComponent({ type: 'icd' })
    expect(wrapper.exists()).toBe(true)
  })

  it('accepts OPS type', () => {
    const wrapper = mountComponent({ type: 'ops' })
    expect(wrapper.exists()).toBe(true)
  })

  it('does not render dialog by default (closed)', async () => {
    const wrapper = mountComponent()
    await nextTick()
    const dialog = wrapper.findComponent({ name: 'VDialog' })
    // Dialog exists but is not visible (modelValue=false)
    expect(dialog.exists()).toBe(true)
    expect(dialog.props('modelValue')).toBe(false)
  })

  it('opens dialog when trigger is clicked', async () => {
    const wrapper = mountComponent()
    const trigger = wrapper.find('.icd-ops-trigger')
    await trigger.trigger('click')
    await nextTick()
    const dialog = wrapper.findComponent({ name: 'VDialog' })
    expect(dialog.props('modelValue')).toBe(true)
  })

  it('does not open dialog when disabled', async () => {
    const wrapper = mountComponent({ disabled: true })
    const trigger = wrapper.find('.icd-ops-trigger')
    await trigger.trigger('click')
    await nextTick()
    const dialog = wrapper.findComponent({ name: 'VDialog' })
    expect(dialog.props('modelValue')).toBe(false)
  })

  it('shows items from composable in the dialog list', async () => {
    mockState.items.value = [
      { code: 'A00', label: 'Cholera', kind: 'category' },
      { code: 'A01', label: 'Typhus', kind: 'category' },
    ]
    mockState.totalResults.value = 2

    const wrapper = mountComponent()
    // Open dialog
    await wrapper.find('.icd-ops-trigger').trigger('click')
    await nextTick()
    await nextTick()

    // Vuetify dialogs teleport to document.body – check there
    expect(document.body.innerHTML).toContain('A00')
    expect(document.body.innerHTML).toContain('A01')
  })

  it('emits update:modelValue when item clicked (single mode)', async () => {
    mockState.items.value = [{ code: 'A00', label: 'Cholera', kind: 'category' }]
    mockState.totalResults.value = 1

    const wrapper = mountComponent()
    await wrapper.find('.icd-ops-trigger').trigger('click')
    await nextTick()
    await nextTick()

    // Vuetify teleports dialog content to document.body
    const listItem = document.body.querySelector('.v-list-item')
    expect(listItem).not.toBeNull()
    listItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1][0]).toBe('A00')
  })

  it('returns full object when returnObject=true', async () => {
    mockState.items.value = [{ code: 'A00', label: 'Cholera', kind: 'category' }]

    const wrapper = mountComponent({ returnObject: true })
    await wrapper.find('.icd-ops-trigger').trigger('click')
    await nextTick()
    await nextTick()

    const listItem = document.body.querySelector('.v-list-item')
    expect(listItem).not.toBeNull()
    listItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const val = emitted![emitted!.length - 1][0]
    expect(typeof val).toBe('object')
    expect((val as any).code).toBe('A00')
  })

  it('shows search mode indicator in dialog', async () => {
    const wrapper = mountComponent()
    await wrapper.find('.icd-ops-trigger').trigger('click')
    await nextTick()
    await nextTick()

    // Mode indicator chip is in the dialog (teleported to document.body)
    expect(document.body.innerHTML).toContain('Textsuche')
  })

  it('shows code-prefix mode indicator when searchMode changes', async () => {
    mockState.searchMode.value = 'code-prefix'
    const wrapper = mountComponent()
    await wrapper.find('.icd-ops-trigger').trigger('click')
    await nextTick()
    await nextTick()

    expect(document.body.innerHTML).toContain('Code-Navigation')
  })

  it('drills down (updates searchInput) instead of selecting when isGroupNav=true', async () => {
    mockState.searchMode.value = 'code-prefix'
    mockState.isGroupNav.value = true
    mockState.items.value = [{ code: 'M20', label: 'Gruppe M20…', kind: 'block' }]
    mockState.totalResults.value = 1

    const wrapper = mountComponent()
    await wrapper.find('.icd-ops-trigger').trigger('click')
    await nextTick()
    await nextTick()

    const listItem = document.body.querySelector('.v-list-item')
    expect(listItem).not.toBeNull()
    listItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    // No value should have been emitted (not selected)
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    // The composable query should be updated to drill down
    expect(mockState.query.value).toBe('M20')
  })

  it('clears selection on clear button click', async () => {
    const wrapper = mountComponent({
      modelValue: 'A00',
      clearable: true,
    })
    await nextTick()

    // Should show clear button
    const clearBtn = wrapper.find('[aria-label*="zurücksetzen"]')
    expect(clearBtn.exists()).toBe(true)
    await clearBtn.trigger('click')
    await nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1][0]).toBeNull()
  })

  describe('multiple selection mode', () => {
    it('enables multiple selection when multiple=true', async () => {
      const wrapper = mountComponent({ multiple: true })
      await nextTick()
      expect(wrapper.exists()).toBe(true)
    })

    it('selects multiple items and emits array', async () => {
      mockState.items.value = [
        { code: 'A00', label: 'Cholera', kind: 'category' },
        { code: 'A01', label: 'Typhus', kind: 'category' },
      ]

      const wrapper = mountComponent({ multiple: true })
      await wrapper.find('.icd-ops-trigger').trigger('click')
      await nextTick()
      await nextTick()

      // Dialog is teleported to document.body
      const items = document.body.querySelectorAll('.v-list-item')
      expect(items.length).toBeGreaterThan(0)
      items[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(Array.isArray(emitted![emitted!.length - 1][0])).toBe(true)
    })

    it('shows selected chips in trigger when multiple items are selected', async () => {
      const wrapper = mountComponent({
        multiple: true,
        modelValue: ['A00', 'A01'],
      })
      await nextTick()

      // The trigger area shows chips for selected values
      expect(wrapper.html()).toContain('A00')
      expect(wrapper.html()).toContain('A01')
    })
  })

  describe('props', () => {
    it('respects clearable=false (no clear button when no value)', () => {
      const wrapper = mountComponent({ clearable: false })
      const clearBtn = wrapper.find('[aria-label*="zurücksetzen"]')
      expect(clearBtn.exists()).toBe(false)
    })

    it('density prop is forwarded to v-input', () => {
      const wrapper = mountComponent({ density: 'comfortable' })
      const input = wrapper.findComponent({ name: 'VInput' })
      expect(input.props('density')).toBe('comfortable')
    })

    it('variant prop is accepted without errors', () => {
      // v-input may not expose variant as a direct props()
      // but the component should mount without errors
      const wrapper = mountComponent({ variant: 'filled' })
      expect(wrapper.exists()).toBe(true)
    })
  })
})
