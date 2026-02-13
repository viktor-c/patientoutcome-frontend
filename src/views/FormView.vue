<script setup lang="ts">
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ResponseError, formApi } from '@/api'

import type { Form } from '@/types/index'
import type { FormSubmissionData } from '@/forms/types'
import type { ScoringData } from '@/types/backend/scoring'
import { mapApiFormToForm } from '@/adapters/apiAdapters'
import { consultationApi } from '@/api'
import { logger } from '@/services/logger'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

// Route parameters
const consultationId = route.params.consultationId as string

// State for forms
const forms = ref<Form[]>([])
const tab = ref('0') // Tab index for navigation
const loading = ref(true)
const error = ref<string | null>(null)
const savingStates = ref<Record<number, boolean>>({})

// Fetch consultation data and populate forms
onMounted(async () => {
  try {
    loading.value = true
    const response = await consultationApi.getConsultationById({ consultationId })
    const consultationData = response.responseObject

    if (!consultationData) {
      error.value = 'No consultation data found'
      logger.error('No consultation data found', { consultationId })
      return
    }

    // Map API forms to internal Form type
    forms.value = (consultationData.proms || []).map(mapApiFormToForm)
    logger.info('FormView: Forms loaded', { count: forms.value.length })
  } catch (err: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (err instanceof ResponseError) {
      errorMessage = (await err.response.json()).message
    }
    error.value = errorMessage
    logger.error('Failed to fetch consultation data:', errorMessage)
  } finally {
    loading.value = false
  }
})

// Check if a form can use plugin system
const canUsePlugin = (form: Form): boolean => {
  return !!form.formTemplateId
}

// Get current form
const currentForm = computed(() => {
  const index = Number.parseInt(tab.value, 10)
  return forms.value[index] || null
})

// Handle form data changes with auto-save
const handleFormDataChange = async (submissionData: FormSubmissionData, formIndex: number) => {
  const form = forms.value[formIndex]
  if (!form || !form._id) return

  try {
    // Update local state immediately - store the full submission data
    form.formData = submissionData.rawData as unknown as Form['formData']

    // Auto-save to backend with full FormSubmissionData structure
    savingStates.value[formIndex] = true

    await formApi.updateForm({
      formId: form._id,
      updateFormRequest: {
        formData: submissionData.rawData as unknown as Record<string, unknown>,
        scoring: submissionData.scoring,
        formFillStatus: submissionData.isComplete ? 'completed' : 'incomplete',
      },
    })

    logger.debug('Form data auto-saved', { formId: form._id, formIndex })
  } catch (err) {
    logger.error('Failed to save form data', { error: err, formIndex })
  } finally {
    savingStates.value[formIndex] = false
  }
}

// Handle scoring changes
const handleScoreChange = async (scoring: ScoringData, formIndex: number) => {
  const form = forms.value[formIndex]
  if (!form || !form._id) return

  try {
    logger.debug('Scoring data received', { formIndex, scoring })
    // Optionally save scoring if needed
  } catch (err) {
    logger.error('Failed to handle scoring', { error: err, formIndex })
  }
}

// Handle validation changes
const handleValidationChange = (isValid: boolean, formIndex: number) => {
  logger.debug('Form validation status', { formIndex, isValid })
}

// Navigate to previous form
const handleGotoPreviousForm = (formIndex: number) => {
  if (formIndex > 0) {
    tab.value = String(formIndex - 1)
  }
}

// Navigate to next form
const handleGotoNextForm = (formIndex: number) => {
  if (formIndex < forms.value.length - 1) {
    tab.value = String(formIndex + 1)
  } else {
    // Go to finish tab
    tab.value = String(forms.value.length)
  }
}

// Handle final submission
const handleSubmitAll = async () => {
  try {
    // Mark all forms as completed
    await Promise.all(
      forms.value.map((form) =>
        form._id
          ? formApi.updateForm({
            formId: form._id,
            updateFormRequest: {
              formFillStatus: 'completed',
              formEndTime: new Date().toISOString(),
            },
          })
          : Promise.resolve()
      )
    )

    logger.info('All forms submitted successfully')

    // Navigate back to consultation overview
    router.push(`/consultations/${consultationId}`)
  } catch (err) {
    logger.error('Failed to submit forms', { error: err })
    error.value = 'Failed to submit forms. Please try again.'
  }
}
</script>

<template>
  <v-container class="py-6">
    <v-row>
      <v-col cols="12">
        <h1 class="mb-4 text-h4">{{ t('form.title', 'Forms') }}</h1>

        <!-- Loading indicator -->
        <v-progress-linear v-if="loading" indeterminate color="primary" />

        <!-- Error display -->
        <v-alert v-if="error" type="error" closable @click="error = null" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- Forms tabs -->
        <v-tabs v-if="!loading && forms.length > 0" v-model="tab" class="mb-4">
          <v-tab v-for="(form, index) in forms" :key="form._id || index" :value="String(index)">
            <span class="text-caption">{{ form.title || `Form ${index + 1}` }}</span>
          </v-tab>
          <v-tab :value="String(forms.length)">
            <span class="text-caption">{{ t('form.summary', 'Summary') }}</span>
          </v-tab>
        </v-tabs>

        <!-- Form content tab -->
        <v-window v-model="tab" v-if="forms.length > 0">
          <v-window-item v-for="(form, formIndex) in forms" :key="form._id || formIndex" :value="String(formIndex)">
            <div class="form-container">
              <v-card class="pa-6">
                <template v-if="canUsePlugin(form) && form.formTemplateId && form.formData">
                  <!-- Plugin-based form renderer -->
                  <PluginFormRenderer
                                      :template-id="form.formTemplateId"
                                      :model-value="(form.formData as any)"
                                      :locale="locale"
                                      @update:model-value="(data) => handleFormDataChange(data, formIndex)"
                                      @validation-change="(valid: boolean) => handleValidationChange(valid, formIndex)" />
                </template>

                <!-- Fallback for legacy forms -->
                <div v-else class="alert-fallback">
                  <v-alert type="warning">
                    {{ t('form.legacyNotSupported', 'This form is not yet supported in the new form system') }}
                  </v-alert>
                </div>
              </v-card>
            </div>
          </v-window-item>

          <!-- Summary tab -->
          <v-window-item :value="String(forms.length)">
            <v-card class="pa-6">
              <h2 class="text-h5 mb-4">{{ t('form.reviewAnswers', 'Review Your Answers') }}</h2>

              <!-- Show all form submissions -->
              <v-expansion-panels class="mb-4">
                <v-expansion-panel v-for="(form, idx) in forms" :key="form._id || idx">
                  <template #title>
                    <span>{{ form.title || `Form ${idx + 1}` }}</span>
                  </template>
                  <template #text>
                    <pre class="text-body2">{{ JSON.stringify(form.formData, null, 2) }}</pre>
                  </template>
                </v-expansion-panel>
              </v-expansion-panels>

              <!-- Submit button -->
              <div class="d-flex gap-2">
                <v-btn variant="outlined" @click="tab = String(forms.length - 1)">
                  {{ t('common.back', 'Back') }}
                </v-btn>
                <v-btn color="success" @click="handleSubmitAll">
                  {{ t('form.submit', 'Submit All Forms') }}
                </v-btn>
              </div>
            </v-card>
          </v-window-item>
        </v-window>
      </v-col>
    </v-row>
  </v-container>
</template>
<style scoped>
.form-view {
  min-height: 100vh;
  background-color: #fafafa;
}

.form-container {
  min-height: 400px;
}

.alert-fallback {
  padding: 2rem;
}

@media (max-width: 600px) {
  .form-view {
    padding: 0;
  }
}
</style>