import { ref, computed } from 'vue'
import { useFormTemplateStore } from '@/stores'
import { mapApiFormsToForms } from '@/adapters/apiAdapters'
import { extractConsultationForms } from '@/utils/consultationForms'
import { logger } from '@/services/logger'
import type { Consultation } from '@/api'
import type { Form } from '@/types'

export function useConsultationFlow() {
  const formTemplateStore = useFormTemplateStore()

  const allForms = ref<Form[]>([])
  const completedForms = computed(() => allForms.value.filter(f => isFormComplete(f)))
  const pendingForms = computed(() => allForms.value.filter(f => !isFormComplete(f)))

  const isFormComplete = (form: Form) => {
    // Check various common status fields from different API versions/sources
    const status = form.formFillStatus || (form.patientFormData as any)?.fillStatus
    return status === 'complete' || status === 'completed'
  }

  /**
   * Processes a consultation object to extract and normalize forms.
   * Enriches titles from the form template cache if missing.
   */
  const processConsultation = async (consultation: Consultation) => {
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
      const mappedForms = mapApiFormsToForms(consultation.proms as any)

      // Final merge of titles if mapApiFormToForm missed them
      allForms.value = mappedForms.map((f, idx) => {
        if (!f.title && formsWithTitles[idx]?.title) {
          f.title = formsWithTitles[idx].title
        }
        return f
      })

      logger.debug(`Processed consultation: ${allForms.value.length} forms total, ${completedForms.value.length} completed`)
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
