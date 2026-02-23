import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GetFormTemplatesShortlist200ResponseResponseObjectInner as FormTemplateShortList } from '@/api'
import { formtemplateApi } from '@/api'

/**
 * Pinia store for the form-template shortlist.
 *
 * Templates do not change frequently, so we fetch them at most once per
 * browser session (until an explicit `refresh()` call).  Every component
 * that needs the list or the id→title lookup should call `fetchIfNeeded()`
 * on mount instead of calling the API directly.
 */
export const useFormTemplateStore = defineStore('formTemplate', () => {
  const templates = ref<FormTemplateShortList[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  /** Reactive id → title map, recomputed whenever `templates` changes. */
  const templateLookup = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const tpl of templates.value) {
      if (tpl.id) map[tpl.id as unknown as string] = tpl.title || ''
    }
    return map
  })

  /**
   * Fetches the shortlist from the API only when it has not been loaded yet.
   * Safe to call in parallel from multiple components – a second call while a
   * fetch is already in-flight will return immediately without issuing another
   * network request.
   */
  async function fetchIfNeeded(): Promise<void> {
    if (loaded.value || loading.value) return
    loading.value = true
    try {
      const resp = await formtemplateApi.getFormTemplatesShortlist()
      templates.value = resp.responseObject || []
      loaded.value = true
    } catch (err) {
      console.warn('[formTemplateStore] failed to load templates', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Forces a fresh fetch regardless of cache state (e.g. after an admin
   * creates or updates a form template).
   */
  async function refresh(): Promise<void> {
    loaded.value = false
    loading.value = false
    await fetchIfNeeded()
  }

  return { templates, loaded, loading, templateLookup, fetchIfNeeded, refresh }
})
