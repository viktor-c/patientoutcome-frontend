import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GetFormTemplatesShortlist200ResponseResponseObjectInner as FormTemplateShortList } from '@/api'
import type { GetFormTemplates200ResponseResponseObjectInner as FormTemplateFull } from '@/api'
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
  // Cache of per-department full template lists (includes accessLevel and other fields)
  const departmentTemplates = ref<Record<string, FormTemplateFull[]>>({})
  const loaded = ref(false)
  const loading = ref(false)
  // Promise for an in-flight fetch so concurrent callers can await it
  let inflightFetch: Promise<void> | null = null

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
    if (loaded.value) return

    // If a fetch is already in progress, wait for it instead of returning
    // immediately. The previous implementation returned immediately when
    // `loading` was true which allowed callers to continue with empty
    // templates while a fetch was in-flight.
    if (inflightFetch) {
      return await inflightFetch
    }

    loading.value = true
    inflightFetch = (async () => {
      try {
        const resp = await formtemplateApi.getFormTemplatesShortlist()
        templates.value = resp.responseObject || []
        loaded.value = true
      } catch (err) {
        console.warn('[formTemplateStore] failed to load templates', err)
      } finally {
        loading.value = false
        inflightFetch = null
      }
    })()

    return await inflightFetch
  }

  /**
   * Fetch full templates for a specific department and cache them.
   * Safe to call in parallel – if a fetch for the same department is already
   * in-flight, callers will wait for it.
   */
  const inflightDeptFetches: Record<string, Promise<void> | null> = {}
  async function fetchForDepartment(departmentId: string): Promise<void> {
    if (!departmentId) return
    const existing = departmentTemplates.value[departmentId]
    if (existing && existing.length > 0) return

    if (inflightDeptFetches[departmentId]) {
      return await inflightDeptFetches[departmentId]
    }

    inflightDeptFetches[departmentId] = (async () => {
      try {
        const resp = await formtemplateApi.getFormTemplates({ departmentId })
        departmentTemplates.value[departmentId] = resp.responseObject || []

        // Merge any titles into the main shortlist cache so templateLookup
        // contains up-to-date titles for components that rely on it.
        for (const fullTpl of departmentTemplates.value[departmentId]) {
          if (fullTpl.id && fullTpl.title) {
            const exists = templates.value.find((t) => t.id === fullTpl.id)
            if (!exists) {
              templates.value.push({
                id: fullTpl.id as FormTemplateShortList['id'],
                title: fullTpl.title,
                description: fullTpl.description || '',
                accessLevel: (fullTpl.accessLevel ?? 'patient') as FormTemplateShortList['accessLevel'],
              })
            }
          }
        }
        // Mark loaded so fetchIfNeeded callers can rely on templates being present
        if (templates.value.length > 0) loaded.value = true
      } catch (err) {
        console.warn('[formTemplateStore] failed to load department templates', departmentId, err)
      } finally {
        inflightDeptFetches[departmentId] = null
      }
    })()

    return await inflightDeptFetches[departmentId]
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

  function getTemplatesForDepartment(departmentId?: string) {
    if (departmentId) return departmentTemplates.value[departmentId] ?? templates.value
    return templates.value
  }

  return { templates, loaded, loading, templateLookup, fetchIfNeeded, refresh, fetchForDepartment, getTemplatesForDepartment }
})
