<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { JsonForms, type JsonFormsChangeEvent } from '@jsonforms/vue'
import { type JsonSchema, type UISchemaElement } from '@jsonforms/core'
import { extendedVuetifyRenderers } from '@jsonforms/vue-vuetify'
import { markRaw } from 'vue'
import { type FormData, type ScoringData } from '@/types'
import { useNotifierStore } from '@/stores/notifierStore'
import FormProgressCard from '@/components/FormProgressCard.vue'

import { ResponseError, type FindAllCodes200ResponseResponseObjectInnerConsultationIdPromsInner } from '@/api'
import { formApi } from '@/api'

import { entry as EfasQuestionSliderControlRenderer } from '@/components/forms/EfasQuestionSliderControlRenderer.entry'
import { entry as AofasControlRenderer } from '@/components/forms/AofasControlRenderer.entry'
import { entry as MoxfqTableRenderer } from '@/components/forms/MoxfqTableRenderer.entry'
import { entry as VASControlRenderer } from '@/components/forms/VASControlRenderer.entry'
import { entry as VisaaControlRenderer } from '@/components/forms/VisaaControlRenderer.entry'

// JsonForms setup
const renderers = markRaw([
  ...extendedVuetifyRenderers,
  EfasQuestionSliderControlRenderer,
  AofasControlRenderer,
  MoxfqTableRenderer,
  VASControlRenderer,
  VisaaControlRenderer
])

const componentName = 'ReviewFormAnswers.vue'
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notifierStore = useNotifierStore()

// Get formId from route params
const formId = route.params.formId as string

// State
const form = ref<FindAllCodes200ResponseResponseObjectInnerConsultationIdPromsInner | null>(null)
const formData = ref<FormData>({})
const originalFormData = ref<FormData>({})
const formScoring = ref<ScoringData | null>(null)
const loading = ref(true)
const saving = ref(false)
const jsonFormsKey = ref(0) // Force re-render when needed

// JsonForms i18n setup using backend translations
const { locale } = useI18n()

const translator = (key: string, defaultMessage?: string): string => {
  console.debug("JSONForms translator called with:", { key, defaultMessage })
  console.debug("Available form translations:", form.value?.translations)

  // Try to get translation from backend translations first
  const backendTranslations = form.value?.translations as Record<string, Record<string, unknown>> | undefined
  if (backendTranslations) {
    const currentLocale = locale.value
    const localeTranslations = backendTranslations[currentLocale] || backendTranslations['en'] || {}

    // Navigate through nested translation keys (e.g., "moxfq.questions.q1")
    let value: unknown = localeTranslations

    if (value && typeof value === 'object' && value !== null && key in value) {
      value = (value as Record<string, unknown>)[key]
      if (typeof value !== 'string') {
        return defaultMessage || key
      }
      return String(value) || defaultMessage || key
    }
    else return defaultMessage || key

  }

  // Final fallback
  console.debug(`Using fallback for ${key}:`, defaultMessage || key)
  return defaultMessage || key
}

const jsonFormsI18n = computed(() => ({
  locale: locale.value,
  translate: translator
}))

// Computed properties for display
const patientId = computed(() => {
  if (!form.value?.caseId) return t('common.notAvailable')

  // Handle both string and object cases for caseId (which represents patientId)
  if (typeof form.value.caseId === 'string') {
    return form.value.caseId
  } else if (typeof form.value.caseId === 'object' && form.value.caseId !== null) {
    const idObj = form.value.caseId as Record<string, unknown>
    return String(idObj._id || idObj.id || form.value.caseId)
  } else {
    return String(form.value.caseId)
  }
})
const consultationId = computed(() => {
  if (!form.value?.consultationId) return t('common.notAvailable')

  // Handle both string and object cases for consultationId
  if (typeof form.value.consultationId === 'string') {
    return form.value.consultationId
  } else if (typeof form.value.consultationId === 'object' && form.value.consultationId !== null) {
    const idObj = form.value.consultationId as Record<string, unknown>
    return String(idObj._id || idObj.id || form.value.consultationId)
  } else {
    return String(form.value.consultationId)
  }
})
const consultationDate = computed(() => {
  // This will need to be adapted based on actual data structure
  return t('common.notAvailable')
})
const completedDate = computed(() => {
  if (!form.value?.completedAt) return t('common.notAvailable')
  return new Date(form.value.completedAt).toLocaleString()
})
const lastUpdatedDate = computed(() => {
  if (!form.value?.updatedAt) return t('common.notAvailable')
  return new Date(form.value.updatedAt).toLocaleString()
})

const hasChanges = computed(() => {
  return JSON.stringify(formData.value) !== JSON.stringify(originalFormData.value)
})

// Load form data
onMounted(async () => {
  try {
    const response = await formApi.getFormById({ formId })
    form.value = response.responseObject || null
    if (form.value) {
      console.debug("Form schema is ", form.value.formSchema)
      console.debug("Form ui-schema is ", form.value.formSchemaUI)
      console.debug("Form translations are ", form.value.translations)
      console.debug("Form caseId (patientId) is ", form.value.caseId)
      console.debug("Form consultationId is ", form.value.consultationId)

      // Ensure we have form data, even if empty
      let initialFormData = form.value.formData as FormData || {}

      // FIX: Unwrap any incorrectly nested data structure
      // Check if formData has a 'body' wrapper (from old corrupted data)
      if (initialFormData && typeof initialFormData === 'object' && 'body' in initialFormData) {
        console.warn('⚠️  Detected nested body structure in loaded form data, unwrapping...')
        const nestedData = initialFormData as Record<string, unknown>
        const bodyContent = nestedData.body
        if (bodyContent && typeof bodyContent === 'object' && 'formData' in bodyContent) {
          // Use body.formData as the actual form data
          const bodyRecord = bodyContent as Record<string, unknown>
          initialFormData = bodyRecord.formData as FormData
        } else if (bodyContent) {
          // Use body directly
          initialFormData = bodyContent as FormData
        }
        console.log('Unwrapped formData:', initialFormData)
      }

      formData.value = initialFormData
      originalFormData.value = JSON.parse(JSON.stringify(initialFormData))

      // Force re-render to ensure JsonForms picks up the initial data
      jsonFormsKey.value += 1
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to load form:`, errorMessage)
    notifierStore.notify(t('reviewForm.loadError'), 'error')
  } finally {
    loading.value = false
  }
})

const onChange = (event: JsonFormsChangeEvent) => {
  console.debug(`${componentName}: Form data changed:`, event.data)
  if (event.data.rawData) {
    console.debug(`${componentName}: Received ScoringData from renderer:`, formScoring.value)
    formScoring.value = event.data as ScoringData
    formData.value = formScoring.value.rawData as FormData
  }
  else {
    console.debug(`${componentName}: rawData NOT present in event.data, using event.data as formData`)
    // formData.value = event.data as formData
    // formScoring.value.rawData = formData.value
    //formScoring.value = null
  }
}

// Save changes
const saveChanges = async () => {
  if (!hasChanges.value) {
    notifierStore.notify(t('reviewForm.noChanges'), 'info')
    return
  }

  saving.value = true
  try {
    // Debug: Log the data being sent
    const updatePayload = {
      formId,
      updateFormRequest: {
        formData: formData.value,
        scoring: formScoring.value || undefined
      }
    }
    console.log('=== ReviewFormAnswers FRONTEND: Data being sent to API ===')
    console.log('Full payload:', JSON.stringify(updatePayload, null, 2))
    console.log('formData.value:', JSON.stringify(formData.value, null, 2))
    console.log('formScoring.value:', JSON.stringify(formScoring.value, null, 2))
    console.log('updateFormRequest:', JSON.stringify(updatePayload.updateFormRequest, null, 2))
    console.log('========================================')

    await formApi.updateForm(updatePayload)

    // Update original data after successful save
    originalFormData.value = JSON.parse(JSON.stringify(formData.value))
    notifierStore.notify(t('reviewForm.saveSuccess'), 'success')

    // Navigate to consultation overview if we have a consultation ID
    if (form.value?.consultationId) {
      // Handle both string and object cases for consultationId
      let consultationId: string

      if (typeof form.value.consultationId === 'string') {
        consultationId = form.value.consultationId
      } else if (typeof form.value.consultationId === 'object' && form.value.consultationId !== null) {
        const idObj = form.value.consultationId as Record<string, unknown>
        consultationId = String(idObj._id || idObj.id || form.value.consultationId)
      } else {
        consultationId = String(form.value.consultationId)
      }

      console.debug('Navigating to consultation overview with ID:', consultationId)
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
    console.error(`${componentName}: Failed to save form:`, errorMessage)
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
    jsonFormsKey.value += 1 // Force JsonForms to re-render
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

                <v-list-item v-if="form.completedAt">
                  <template #prepend>
                    <v-icon>mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>{{ t('reviewForm.completedAt') }}</v-list-item-title>
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
          <json-forms
                      :data="formData"
                      @change="onChange"
                      :renderers="renderers"
                      :schema="form.formSchema as JsonSchema"
                      :uischema="form.formSchemaUI as UISchemaElement"
                      :i18n="jsonFormsI18n"
                      :key="jsonFormsKey" />
        </v-card-text>

        <!-- Display scoring if available -->
        <v-card-text v-if="formScoring" class="px-4 pt-0">
          <FormProgressCard
                            :scoring="formScoring"
                            :title="t('forms.scoring.overallProgress')"
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
@import '@jsonforms/vue-vuetify/lib/jsonforms-vue-vuetify.css';

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
