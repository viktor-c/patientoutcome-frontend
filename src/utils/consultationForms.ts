import type { ApiConsultationFlexible } from '@/types'

export interface ConsultationPromWithTitle {
  id?: string | null
  title?: string | null
}

/**
 * Extracts a list of ID/title pairs for forms attached to a consultation.
 *
 * The backend used to return `proms` as the array of form objects.  Newer
 * workflows send `formTemplates` (just IDs) to the server which in turn
 * populates `proms` on the returned consultation.  Unfortunately the
 * generated TypeScript model only declares a handful of fields and the
 * objects that end up in `proms` sometimes only contain a
 * `formTemplateId` property and no human‑readable title.  When the UI
 * renders the form list we should still be able to show something useful
 * (ideally the template name).
 *
 * To keep the algorithm general we accept an optional lookup table mapping
 * template IDs to titles; the callers are free to supply their own cache.
 * If a title cannot be found anywhere we fall back to the ID itself which
 * prevents the "unknown form" message when only an opaque object is
 * returned.
 */
export function extractConsultationForms(
  consultation: ApiConsultationFlexible | null | undefined,
  templateLookup?: Record<string, string>
): ConsultationPromWithTitle[] {
  if (!consultation) return []
  const rawProms = consultation.proms
  if (!Array.isArray(rawProms)) return []

  const result: ConsultationPromWithTitle[] = []

  rawProms.forEach((prom: unknown) => {
    if (!prom || typeof prom !== 'object') return
    const rec = prom as Record<string, unknown>

    // determine an ID (the API uses a variety of fieldnames depending on
    // which path generated the object)
    let id: string | null = null
    if (typeof rec.id === 'string' && rec.id) id = rec.id
    else if (typeof rec._id === 'string' && rec._id) id = rec._id
    else if (typeof rec.formTemplateId === 'string' && rec.formTemplateId) id = rec.formTemplateId

    // determine a title
    let title: string | null = null
    if (typeof rec.title === 'string' && rec.title) {
      title = rec.title
    } else if (id && templateLookup && templateLookup[id]) {
      title = templateLookup[id]
    }

    // if we still don't have a title, use the ID as a last resort
    if (!title && id) {
      title = id
    }

    result.push({ id, title })
  })

  return result
}
