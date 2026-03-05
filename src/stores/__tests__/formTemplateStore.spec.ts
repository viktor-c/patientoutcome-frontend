import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFormTemplateStore } from '@/stores/formTemplateStore'
import type { GetFormTemplatesShortlist200ResponseResponseObjectInner as FormTemplateShortList } from '@/api'

const createTemplate = (id: string, title: string): FormTemplateShortList => ({
  id: id as unknown as FormTemplateShortList['id'],
  title,
  description: '',
  accessLevel: 'patient',
})

// Mock the API
const mockGetFormTemplatesShortlist = vi.fn()

vi.mock('@/api', () => ({
  formtemplateApi: {
    getFormTemplatesShortlist: () => mockGetFormTemplatesShortlist(),
  },
}))

describe('formTemplateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockTemplates: FormTemplateShortList[] = [
    createTemplate('template-1', 'AOFAS Score'),
    createTemplate('template-2', 'MOXFQ Score'),
    createTemplate('template-3', 'VAS Pain Scale'),
  ]

  describe('initial state', () => {
    it('should have empty templates on creation', () => {
      const store = useFormTemplateStore()
      expect(store.templates).toEqual([])
    })

    it('should have loaded as false initially', () => {
      const store = useFormTemplateStore()
      expect(store.loaded).toBe(false)
    })

    it('should have loading as false initially', () => {
      const store = useFormTemplateStore()
      expect(store.loading).toBe(false)
    })

    it('should have empty templateLookup initially', () => {
      const store = useFormTemplateStore()
      expect(store.templateLookup).toEqual({})
    })
  })

  describe('fetchIfNeeded', () => {
    it('should fetch templates when not loaded', async () => {
      mockGetFormTemplatesShortlist.mockResolvedValue({
        responseObject: mockTemplates,
      })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()

      expect(mockGetFormTemplatesShortlist).toHaveBeenCalledOnce()
      expect(store.templates).toEqual(mockTemplates)
      expect(store.loaded).toBe(true)
    })

    it('should not fetch again if already loaded', async () => {
      mockGetFormTemplatesShortlist.mockResolvedValue({
        responseObject: mockTemplates,
      })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()
      await store.fetchIfNeeded()

      expect(mockGetFormTemplatesShortlist).toHaveBeenCalledOnce()
    })

    it('should not duplicate fetch if called concurrently', async () => {
      let resolvePromise: (value: unknown) => void
      mockGetFormTemplatesShortlist.mockReturnValue(
        new Promise(resolve => {
          resolvePromise = resolve
        })
      )

      const store = useFormTemplateStore()
      
      // Start two concurrent fetches
      const fetch1 = store.fetchIfNeeded()
      const fetch2 = store.fetchIfNeeded()

      // Only one call should be made
      expect(mockGetFormTemplatesShortlist).toHaveBeenCalledOnce()

      // Resolve the promise
      resolvePromise!({ responseObject: mockTemplates })
      await Promise.all([fetch1, fetch2])

      expect(store.templates).toEqual(mockTemplates)
    })

    it('should handle API errors gracefully', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockGetFormTemplatesShortlist.mockRejectedValue(new Error('Network error'))

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()

      expect(consoleWarn).toHaveBeenCalled()
      expect(store.templates).toEqual([])
      expect(store.loading).toBe(false)
      
      consoleWarn.mockRestore()
    })

    it('should handle empty response', async () => {
      mockGetFormTemplatesShortlist.mockResolvedValue({
        responseObject: [],
      })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()

      expect(store.templates).toEqual([])
      expect(store.loaded).toBe(true)
    })

    it('should handle null response', async () => {
      mockGetFormTemplatesShortlist.mockResolvedValue({
        responseObject: null,
      })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()

      expect(store.templates).toEqual([])
      expect(store.loaded).toBe(true)
    })
  })

  describe('refresh', () => {
    it('should force a new fetch even if loaded', async () => {
      mockGetFormTemplatesShortlist.mockResolvedValue({
        responseObject: mockTemplates,
      })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()
      expect(mockGetFormTemplatesShortlist).toHaveBeenCalledOnce()

      // Refresh should fetch again
      await store.refresh()
      expect(mockGetFormTemplatesShortlist).toHaveBeenCalledTimes(2)
    })

    it('should update templates with fresh data', async () => {
      const initialTemplates = [createTemplate('template-1', 'Old Title')]
      const updatedTemplates = [createTemplate('template-1', 'New Title')]

      mockGetFormTemplatesShortlist
        .mockResolvedValueOnce({ responseObject: initialTemplates })
        .mockResolvedValueOnce({ responseObject: updatedTemplates })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()
      expect(store.templates[0].title).toBe('Old Title')

      await store.refresh()
      expect(store.templates[0].title).toBe('New Title')
    })
  })

  describe('templateLookup', () => {
    it('should create id to title map from templates', async () => {
      mockGetFormTemplatesShortlist.mockResolvedValue({
        responseObject: mockTemplates,
      })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()

      expect(store.templateLookup).toEqual({
        'template-1': 'AOFAS Score',
        'template-2': 'MOXFQ Score',
        'template-3': 'VAS Pain Scale',
      })
    })

    it('should update when templates change', async () => {
      mockGetFormTemplatesShortlist.mockResolvedValue({
        responseObject: [createTemplate('template-1', 'Initial')],
      })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()
      expect(store.templateLookup['template-1']).toBe('Initial')

      // Update templates directly
      store.templates = [createTemplate('template-1', 'Updated')]
      expect(store.templateLookup['template-1']).toBe('Updated')
    })

    it('should handle templates without titles', async () => {
      mockGetFormTemplatesShortlist.mockResolvedValue({
        responseObject: [
          createTemplate('template-1', 'Has Title'),
          createTemplate('template-2', ''),
          {
            id: 'template-3' as unknown as FormTemplateShortList['id'],
            title: '',
            description: '',
            accessLevel: 'patient',
          },
        ],
      })

      const store = useFormTemplateStore()
      await store.fetchIfNeeded()

      expect(store.templateLookup['template-1']).toBe('Has Title')
      expect(store.templateLookup['template-2']).toBe('')
      expect(store.templateLookup['template-3']).toBe('')
    })
  })
})
