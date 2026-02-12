<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'
import { type FormData, type ScoringData } from '@/types'
import { useNotifierStore } from '@/stores/notifierStore'
import FormProgressCard from '@/components/FormProgressCard.vue'

import { ResponseError, type FindAllCodes200ResponseResponseObjectInnerConsultationIdPromsInner } from '@/api'
import { formApi } from '@/api'

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

const handleFormDataChange = (newFormData: FormData) => {
  console.debug(`${componentName}: Form data changed:`, newFormData)
  formData.value = newFormData
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
          <PluginFormRenderer
                      :template-id="(form as any)?.formTemplateId || (form as any)?._id || ''"
                      :model-value="formData"
                      @update:model-value="handleFormDataChange" />
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
