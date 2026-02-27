import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick, ref } from 'vue'
import IcdOpsSearchField from '../IcdOpsSearchField.vue'
import type { IcdOpsPaginatedResponse } from '@/services/icdopsService'

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
  search: mockSearch,
  loadMore: mockLoadMore,
  clear: mockClear,
}

vi.mock('@/composables/useIcdOpsSearch', () => ({
  useIcdOpsSearch: () => mockState,
}))

describe('IcdOpsSearchField.vue', () => {
  let vuetify: ReturnType<typeof createVuetify>

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

    vuetify = createVuetify({ components, directives })
  })

  function mountComponent(props: Record<string, unknown> = {}) {
    return mount(IcdOpsSearchField, {
      props: {
        type: 'icd',
        ...props,
      },
      global: {
        plugins: [vuetify],
      },
    })
  }

  it('renders with default props', () => {
    const wrapper = mountComponent()
    expect(wrapper.exists()).toBe(true)
    // Should render a v-autocomplete
    expect(wrapper.findComponent({ name: 'VAutocomplete' }).exists()).toBe(true)
  })

  it('renders with custom label', () => {
    const wrapper = mountComponent({ label: 'Diagnosis Code' })
    expect(wrapper.html()).toContain('Diagnosis Code')
  })

  it('shows items from the composable', async () => {
    mockState.items.value = [
      { code: 'A00', label: 'Cholera', kind: 'category' },
      { code: 'A01', label: 'Typhus', kind: 'category' },
    ]
    mockState.totalResults.value = 2

    const wrapper = mountComponent()
    await nextTick()

    // Items are passed to v-autocomplete
    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
    expect(autocomplete.props('items')).toHaveLength(2)
  })

  it('shows loading state', async () => {
    mockState.loading.value = true

    const wrapper = mountComponent()
    await nextTick()

    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
    expect(autocomplete.props('loading')).toBe(true)
  })

  it('shows error messages', async () => {
    mockState.error.value = 'Search failed'

    const wrapper = mountComponent()
    await nextTick()

    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
    expect(autocomplete.props('errorMessages')).toEqual(['Search failed'])
  })

  it('emits update:modelValue when selection changes', async () => {
    const wrapper = mountComponent()
    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })

    // Simulate selection change
    await autocomplete.vm.$emit('update:modelValue', 'A00')
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('accepts ICD type', () => {
    const wrapper = mountComponent({ type: 'icd' })
    expect(wrapper.exists()).toBe(true)
  })

  it('accepts OPS type', () => {
    const wrapper = mountComponent({ type: 'ops' })
    expect(wrapper.exists()).toBe(true)
  })

  it('respects disabled prop', () => {
    const wrapper = mountComponent({ disabled: true })
    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
    expect(autocomplete.props('disabled')).toBe(true)
  })

  it('respects readonly prop', () => {
    const wrapper = mountComponent({ readonly: true })
    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
    expect(autocomplete.props('readonly')).toBe(true)
  })

  it('applies clearable prop', () => {
    const wrapper = mountComponent({ clearable: true })
    const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
    expect(autocomplete.props('clearable')).toBe(true)
  })

  describe('multiple selection mode', () => {
    it('enables multiple selection when multiple prop is true', () => {
      const wrapper = mountComponent({ multiple: true })
      const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
      expect(autocomplete.props('multiple')).toBe(true)
    })

    it('enables chips when chips prop is true', () => {
      const wrapper = mountComponent({ multiple: true, chips: true })
      const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
      expect(autocomplete.props('chips')).toBe(true)
    })

    it('enables closable-chips when closableChips prop is true', () => {
      const wrapper = mountComponent({ multiple: true, chips: true, closableChips: true })
      const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
      expect(autocomplete.props('closableChips')).toBe(true)
    })

    it('accepts array modelValue for multiple mode', async () => {
      const initialValues = ['A00', 'A01']
      const wrapper = mountComponent({ multiple: true, modelValue: initialValues })
      expect(wrapper.exists()).toBe(true)
    })

    it('emits array when multiple selections are made', async () => {
      const wrapper = mountComponent({ multiple: true })
      const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })

      // Simulate multiple selections
      await autocomplete.vm.$emit('update:modelValue', ['A00', 'A01'])
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emittedValues = wrapper.emitted('update:modelValue')
      expect(emittedValues).toBeDefined()
      expect(emittedValues![emittedValues!.length - 1][0]).toEqual(['A00', 'A01'])
    })
  })

  describe('returnObject mode', () => {
    it('returns full object when returnObject is true', async () => {
      const wrapper = mountComponent({ returnObject: true })
      const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
      expect(autocomplete.props('returnObject')).toBe(true)
    })

    it('handles object modelValue when returnObject is true', async () => {
      const objectValue = { code: 'A00', label: 'Cholera', kind: 'category' }
      const wrapper = mountComponent({ returnObject: true, modelValue: objectValue })
      expect(wrapper.exists()).toBe(true)
    })

    it('emits full object for multiple with returnObject', async () => {
      const objectValues = [
        { code: 'A00', label: 'Cholera', kind: 'category' },
        { code: 'A01', label: 'Typhus', kind: 'category' },
      ]
      const wrapper = mountComponent({ multiple: true, returnObject: true })
      const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })

      await autocomplete.vm.$emit('update:modelValue', objectValues)
      await nextTick()

      const emittedValues = wrapper.emitted('update:modelValue')
      expect(emittedValues).toBeDefined()
      expect(emittedValues![emittedValues!.length - 1][0]).toEqual(objectValues)
    })
  })

  describe('density and variant', () => {
    it('applies density prop', () => {
      const wrapper = mountComponent({ density: 'comfortable' })
      const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
      expect(autocomplete.props('density')).toBe('comfortable')
    })

    it('applies variant prop', () => {
      const wrapper = mountComponent({ variant: 'filled' })
      const autocomplete = wrapper.findComponent({ name: 'VAutocomplete' })
      expect(autocomplete.props('variant')).toBe('filled')
    })
  })
})
