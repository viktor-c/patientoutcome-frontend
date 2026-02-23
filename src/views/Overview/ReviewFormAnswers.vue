<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'
import { type Form, type ScoringData } from '@/types'
import { type FormSubmissionData } from '@/forms/types'
import { useNotifierStore } from '@/stores/notifierStore'
import FormProgressCard from '@/components/FormProgressCard.vue'

import { ResponseError } from '@/api'
import { formApi } from '@/api'
import { logger } from '@/services/logger'

const componentName = 'ReviewFormAnswers.vue'
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notifierStore = useNotifierStore()
const { formatLocalizedCustomDate } = useDateFormat()

// Get formId from route params
const formId = route.params.formId as string

const getIdFromUnknown = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const idObj = value as Record<string, unknown>
    return String(idObj._id || idObj.id || '')
  }
  return String(value ?? '')
}

const getFormRecord = () => (form.value || {}) as Record<string, unknown>

// State
const form = ref<Form | null>(null)
const formData = ref<unknown>({})
const originalFormData = ref<unknown>({})
const formScoring = ref<ScoringData | null>(null)
const formCompletionStatus = ref<'draft' | 'incomplete' | 'complete'>("draft")
const loading = ref(true)
const saving = ref(false)

// Computed properties for display
const patientId = computed(() => {
  if (!form.value?.caseId) return t('common.notAvailable')

  // Handle both string and object cases for caseId (which represents patientId)
  const caseId = form.value.caseId
  if (typeof caseId === 'string') {
    return caseId
  } else if (caseId && typeof caseId === 'object') {
    const idObj = caseId as Record<string, unknown>
    return String(idObj._id || idObj.id || '')
  }
  return String(caseId)
})
const consultationId = computed(() => {
  if (!form.value?.consultationId) return t('common.notAvailable')

  // Handle both string and object cases for consultationId
  const consId = form.value.consultationId
  if (typeof consId === 'string') {
    return consId
  } else if (consId && typeof consId === 'object') {
    const idObj = consId as Record<string, unknown>
    return String(idObj._id || idObj.id || '')
  }
  return String(consId)
})
const consultationDate = computed(() => {
  // This will need to be adapted based on actual data structure
  return t('common.notAvailable')
})
const completedDate = computed(() => {
  if (!form.value?.patientFormData?.completedAt) return t('common.notAvailable')
  return formatLocalizedCustomDate(form.value.patientFormData.completedAt, 'DD.MM.YYYY HH:mm:ss')
})
const lastUpdatedDate = computed(() => {
  if (!form.value?.updatedAt) return t('common.notAvailable')
  return formatLocalizedCustomDate(form.value.updatedAt, 'DD.MM.YYYY HH:mm:ss')
})

const formStartTime = computed(() => {
  // Use patientFormData.beginFill if available, otherwise formStartTime
  const startTime = form.value?.patientFormData?.beginFill || (getFormRecord().formStartTime as string | undefined)
  if (!startTime) return t('common.notAvailable')
  return formatLocalizedCustomDate(startTime, 'DD.MM.YYYY HH:mm:ss')
})

const formDuration = computed(() => {
  // Try to use completionTimeSeconds first
  const seconds = Number(getFormRecord().completionTimeSeconds || 0)
  if (seconds && seconds > 0) {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${String(secs).padStart(2, '0')} min`
  }
  
  // Calculate from start and end times if completionTimeSeconds is not available
  const startTime = form.value?.patientFormData?.beginFill || (getFormRecord().formStartTime as string | undefined)
  const endTime = form.value?.patientFormData?.completedAt
  
  if (!startTime || !endTime) return t('common.notAvailable')
  
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const durationSeconds = Math.floor((end - start) / 1000)
  
  if (durationSeconds <= 0) return t('common.notAvailable')
  
  const minutes = Math.floor(durationSeconds / 60)
  const secs = Math.floor(durationSeconds % 60)
  return `${minutes}:${String(secs).padStart(2, '0')} min`
})

const hasChanges = computed(() => {
  return JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
})

// Extract the template ID (handle both string and populated object)
const templateId = computed(() => {
  if (!form.value) return ''

  const formTemplateId = getFormRecord().formTemplateId

  // If it's already a string, return it
  if (typeof formTemplateId === 'string') {
    return formTemplateId
  }

  // If it's an object with _id or id, extract the string
  if (formTemplateId && typeof formTemplateId === 'object') {
    const templateObj = formTemplateId as Record<string, unknown>
    return String(templateObj._id || templateObj.id || '')
  }

  // Fallback to form's own _id
  return String(getFormRecord()._id || '')
})

// Load form data
onMounted(async () => {
  try {
    const response = await formApi.getFormById({ formId })
    const formReponseData = response.responseObject as Form
    if (response.responseObject) {
      logger.debug("Form response data is", formReponseData)
      logger.debug("Form caseId (patientId) is ", formReponseData.caseId)
      logger.debug("Form consultationId is ", formReponseData.consultationId)
      logger.debug("Form data is ", formReponseData.patientFormData)
      logger.debug("Form completion status is, ", formReponseData.patientFormData?.fillStatus)

      // FIX: Unwrap any incorrectly nested data structure
      // Check if formData has a 'body' wrapper (from old corrupted data)
      originalFormData.value = formReponseData.patientFormData?.rawFormData || {}
      formCompletionStatus.value = formReponseData.patientFormData?.fillStatus ? formReponseData.patientFormData.fillStatus : "draft"
      form.value = formReponseData as unknown as Form
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error(`${componentName}: Failed to load form:`, errorMessage)
    notifierStore.notify(t('reviewForm.loadError'), 'error')
  } finally {
    loading.value = false
  }
})

// Handle form data changes - receives FormSubmissionData from plugin
const handleFormDataChange = (submissionData: FormSubmissionData) => {
  logger.debug(`${componentName}: Form data changed:`, submissionData)
  // Store full submission data
  formData.value = submissionData
  formScoring.value = submissionData as unknown as ScoringData
  formCompletionStatus.value = submissionData.fillStatus

}

// Save changes
const saveChanges = async () => {
  if (!hasChanges.value) {
    notifierStore.notify(t('reviewForm.noChanges'), 'info')
    return
  }

  saving.value = true
  try {
    // Prepare update payload with PatientFormData structure
    const updatePayload: Parameters<typeof formApi.updateForm>[0] = {
      formId,
      updateFormRequest: {
        patientFormData: formData.value as never
      }
    }
    logger.debug('=== ReviewFormAnswers FRONTEND: Data being sent to API ===')
    logger.debug('Full payload:', JSON.stringify(updatePayload, null, 2))
    logger.debug('========================================')

    await formApi.updateForm(updatePayload)

    // Update original data after successful save
    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    notifierStore.notify(t('reviewForm.saveSuccess'), 'success')

    // Navigate to consultation overview if we have a consultation ID
    if (form.value?.consultationId) {
      // Handle both string and object cases for consultationId
      const consId = form.value.consultationId
      const consultationId = getIdFromUnknown(consId)

      logger.debug('Navigating to consultation overview with ID:', consultationId)
      router.push({
        name: 'consultationoverview',
        params: { consultationId }
      })
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error(`${componentName}: Failed to save form:`, errorMessage)
    notifierStore.notify(t('reviewForm.saveError'), 'error')
  } finally {
    saving.value = false
  }
}

// Cancel changes
const cancelChanges = () => {
  if (hasChanges.value) {
    // Reset the form data and force re-render
    formData.value = JSON.parse(JSON.stringify(originalFormData.value))
    notifierStore.notify(t('reviewForm.changesCancelled'), 'info')
  }
}

// Go back
const goBack = () => {
  if (hasChanges.value) {
    if (confirm(t('reviewForm.unsavedChangesWarning'))) {
      router.back()
    }
  } else {
    router.back()
  }
}
</script>

<template>
  <v-container>
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">{{ t('reviewForm.loading') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="!form" class="text-center py-8">
      <v-icon color="error" size="64">mdi-alert-circle</v-icon>
      <h2 class="mt-4">{{ t('reviewForm.notFound') }}</h2>
      <v-btn @click="goBack" class="mt-4">{{ t('notFound.goBack') }}</v-btn>
    </div>

    <!-- Form content -->
    <div v-else>
      <!-- Header with form info -->
      <v-card class="mb-6">
        <v-card-title class="d-flex align-center">
          <v-btn
                 icon="mdi-arrow-left"
                 variant="text"
                 @click="goBack"
                 class="me-2"></v-btn>
          {{ t('reviewForm.title') }}
          <v-spacer></v-spacer>
          <v-chip
                  :color="hasChanges ? 'warning' : 'success'"
                  variant="outlined">
            {{ hasChanges ? t('reviewForm.hasChanges') : t('reviewForm.saved') }}
          </v-chip>
        </v-card-title>

        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">

              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  <v-list-item-title>{{ t('reviewForm.patientId') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patientId }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-calendar-check</v-icon>
                  </template>
                  <v-list-item-title>{{ t('reviewForm.consultationId') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ consultationId }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-calendar</v-icon>
                  </template>
                  <v-list-item-title>{{ t('reviewForm.consultationDate') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ consultationDate }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="form.patientFormData?.beginFill || (form as any)?.formStartTime">
                  <template #prepend>
                    <v-icon>mdi-play-circle</v-icon>
                  </template>
                  <v-list-item-title>{{ t('reviewForm.formStartTime') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ formStartTime }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="(form.patientFormData?.beginFill || (form as any)?.formStartTime) && (form.patientFormData?.completedAt || (form as any)?.completionTimeSeconds)">
                  <template #prepend>
                    <v-icon>mdi-timer</v-icon>
                  </template>
                  <v-list-item-title>{{ t('reviewForm.formDuration') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ formDuration }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="form.patientFormData?.completedAt">
                  <template #prepend>
                    <v-icon>mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>{{ t('reviewForm.completedDate') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ completedDate }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-update</v-icon>
                  </template>
                  <v-list-item-title>{{ t('reviewForm.lastUpdated') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ lastUpdatedDate }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Form content -->
      <v-card>
        <v-card-text class="px-4 py-6">
          <PluginFormRenderer
                              :template-id="templateId"
                              :form-id="formId"
                              :show-version-controls="true"
                              :current-version="(form as any)?.currentVersion || 1"
                              :model-value="form?.patientFormData ?? null"
                              @update:model-value="handleFormDataChange" />
        </v-card-text>

        <!-- Display scoring if available -->
        <v-card-text v-if="formScoring" class="px-4 pt-0">
          <FormProgressCard
                            :scoring="formScoring"
                            :title="t('forms.subscales.overallProgress')"
                            :showSubmitButton="false" />
        </v-card-text>

        <!-- Action buttons -->
        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>

          <v-btn
                 variant="outlined"
                 @click="cancelChanges"
                 :disabled="!hasChanges || saving">
            {{ t('buttons.cancel') }}
          </v-btn>

          <v-btn
                 color="primary"
                 @click="saveChanges"
                 :disabled="!hasChanges"
                 :loading="saving">
            {{ t('buttons.saveChanges') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </v-container>
</template>

<style scoped>
.v-card {
  border-radius: 12px;
}

.v-card-title {
  font-weight: 600;
}

.v-list-item {
  padding-inline: 0;
}
</style>
