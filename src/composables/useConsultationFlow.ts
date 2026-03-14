import { ref, computed } from 'vue'
import { useFormTemplateStore } from '@/stores'
import { mapApiFormsToForms } from '@/adapters/apiAdapters'
import { extractConsultationForms } from '@/utils/consultationForms'
import { logger } from '@/services/logger'
import type { ApiConsultationFlexible, ApiConsultationForm, ApiConsultationProm, Form } from '@/types'

const isConsultationFormProm = (prom: ApiConsultationProm): prom is ApiConsultationForm => {
  if (!prom || typeof prom !== 'object') return false
  const promRecord = prom as Record<string, unknown>
  return 'patientFormData' in promRecord && 'consultationId' in promRecord
}

export function useConsultationFlow() {
  const formTemplateStore = useFormTemplateStore()

  const allForms = ref<Form[]>([])
  const completedForms = computed(() => allForms.value.filter(f => isFormComplete(f)))
  const pendingForms = computed(() => allForms.value.filter(f => !isFormComplete(f)))

  const isFormComplete = (form: Form) => {
    // Check various common status fields from different API versions/sources
    const patientFormDataRecord =
      form.patientFormData && typeof form.patientFormData === 'object'
        ? (form.patientFormData as unknown as Record<string, unknown>)
        : null
    const fillStatus =
      patientFormDataRecord && typeof patientFormDataRecord.fillStatus === 'string'
        ? patientFormDataRecord.fillStatus
        : undefined
    const status = form.formFillStatus || fillStatus
    return status === 'complete' || status === 'completed'
  }

  /**
   * Processes a consultation object to extract and normalize forms.
   * Enriches titles from the form template cache if missing.
   */
  const processConsultation = async (consultation: ApiConsultationFlexible | null | undefined) => {
    if (!consultation || !consultation.proms) {
      allForms.value = []
      return
    }

    try {
      // Ensure template cache is warm
      await formTemplateStore.fetchIfNeeded()
      const tempLookup = formTemplateStore.templateLookup

      // Enrich missing titles in the raw objects before mapping
      const formsWithTitles = extractConsultationForms(consultation, tempLookup)

      // We map the raw proms to our internal Form shape
      const formProms = consultation.proms.filter(isConsultationFormProm)
      const mappedForms = mapApiFormsToForms(formProms)

      // Final merge of titles if mapApiFormToForm missed them
      const mergedForms = mappedForms.map((f, idx) => {
        if (!f.title && formsWithTitles[idx]?.title) {
          f.title = formsWithTitles[idx].title
        }
        return f
      })

      // This composable is used in patient-facing views (KioskView, ShowConsultationForms).
      // Only forms with accessLevel 'patient' (or no accessLevel, defaulting to patient) should
      // be presented to the patient. Clinician-only forms (accessLevel 'authenticated') are
      // excluded from the patient flow.
      allForms.value = mergedForms.filter(f => {
        const level = f.accessLevel
        return !level || level === 'patient'
      })

      logger.debug(`Processed consultation: ${allForms.value.length} patient-accessible forms (${mergedForms.length} total), ${completedForms.value.length} completed`)
    } catch (error) {
      logger.error('Error processing consultation forms:', error)
      allForms.value = []
    }
  }

  const getFirstIncompleteFormId = () => {
    return pendingForms.value[0]?.id || pendingForms.value[0]?._id
  }

  return {
    allForms,
    completedForms,
    pendingForms,
    processConsultation,
    getFirstIncompleteFormId,
    isFormComplete
  }
}
