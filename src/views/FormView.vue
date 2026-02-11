<script setup lang="ts">
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ResponseError, formApi } from '@/api'

import type { Form } from '@/types/index'
import type { FormData as PluginFormData } from '@/forms/types'
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
const handleFormDataChange = async (formData: PluginFormData, formIndex: number) => {
  const form = forms.value[formIndex]
  if (!form || !form._id) return

  try {
    // Update local state immediately
    form.formData = formData as unknown as Form['formData']
    
    // Auto-save to backend (debounced in real implementation)
    savingStates.value[formIndex] = true
    
    await formApi.updateForm({
      formId: form._id,
      updateFormRequest: {
        formData: formData as unknown as Record<string, unknown>,
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
    // Update local state
    form.scoring = scoring
    
    // Save scoring to backend
    await formApi.updateForm({
      formId: form._id,
      updateFormRequest: {
        scoring: scoring as unknown as Record<string, unknown>,
      },
    })
    
    logger.debug('Form scoring saved', { formId: form._id, formIndex })
  } catch (err) {
    logger.error('Failed to save form scoring', { error: err, formIndex })
  }
}

// Navigation handlers
const handleGotoPreviousForm = (formIndex: number) => {
  if (formIndex > 0) {
    tab.value = String(formIndex - 1)
  }
}

const handleGotoNextForm = (formIndex: number) => {
  if (formIndex < forms.value.length - 1) {
    tab.value = String(formIndex + 1)
  } else {
    // Go to the finish tab
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
  <v-container class="w-75">
    <!-- Loading state -->
    <v-card v-if="loading" class="pa-4">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4">{{ t('forms.consultation.loading') }}</p>
    </v-card>

    <!-- Error state -->
    <v-card v-else-if="error" color="error" class="pa-4">
      <v-card-title>{{ t('forms.consultation.error') }}</v-card-title>
      <v-card-text>{{ error }}</v-card-text>
    </v-card>

    <!-- Main content -->
    <v-card v-else>
      <v-tabs v-model="tab" bg-color="primary">
        <v-tab v-for="(form, index) in forms" :key="index" :value="String(index)">
          <span>{{ form.title || t('forms.consultation.untitledForm') }}</span>
          <v-icon v-if="savingStates[index]" size="small" class="ml-2">mdi-loading mdi-spin</v-icon>
          <v-icon v-else-if="form.formFillStatus === 'completed'" size="small" class="ml-2" color="success">
            mdi-check-circle
          </v-icon>
        </v-tab>
        <v-tab :value="String(forms.length)">
          {{ t('forms.consultation.finish') }}
        </v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="tab">
          <!-- Form tabs -->
          <v-tabs-window-item v-for="(form, index) in forms" :key="index" :value="String(index)">
            <div class="form-container">
              <!-- Plugin-based form rendering -->
              <PluginFormRenderer
                v-if="canUsePlugin(form) && form.formTemplateId"
                :template-id="form.formTemplateId"
                :model-value="(form.formData as unknown as PluginFormData) || {}"
                :locale="locale"
                :readonly="form.formFillStatus === 'completed'"
                @update:model-value="(data) => handleFormDataChange(data, index)"
.form-container {
  min-height: 400px;
}

.form-navigation {
  display: flex;
  gap: 1rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.finish-container {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

@media (max-width: 600px) {
  /* Minimize container padding */
  .v-container {
    padding: 0px !important;
  }

  /* Make any fixed-width container full width on small screens (e.g., .w-75 -> 100%) */
  .w-75 {
    width: 100% !important;
    max-width: 100% !important;
  }

  .form-navigation {
    flex-direction: column;
  }

  .finish-container {
    padding: 1rem })
                  }}
                </p>
                <p class="text-caption mt-2">
                  Template ID: {{ form.formTemplateId || t('forms.consultation.noTemplateId') }}
                </p>
              </v-alert>

              <!-- Navigation buttons -->
              <div class="form-navigation mt-6">
                <v-btn
                  v-if="index > 0"
                  variant="outlined"
                  color="primary"
                  @click="handleGotoPreviousForm(index)"
                >
                  <v-icon start>mdi-chevron-left</v-icon>
                  {{ t('buttons.previous') }}
                </v-btn>

                <v-spacer />

                <v-btn color="primary" @click="handleGotoNextForm(index)">
                  {{
                    index < forms.length - 1 ? t('buttons.next') : t('buttons.review')
                  }}
                  <v-icon end>mdi-chevron-right</v-icon>
                </v-btn>
              </div>
            </div>
          </v-tabs-window-item>

          <!-- Finish/Review tab -->
          <v-tabs-window-item :value="String(forms.length)">
            <div class="finish-container pa-6">
              <v-icon size="64" color="success" class="mb-4">mdi-check-circle-outline</v-icon>
              <h2 class="text-h4 mb-4">{{ t('forms.consultation.completed') }}</h2>
              <p class="text-body-1 mb-6">
                {{ t('forms.consultation.reviewMessage') }}
              </p>

              <!-- Form completion summary -->
              <v-card variant="outlined" class="mb-6">
                <v-card-title>{{ t('forms.consultation.summary') }}</v-card-title>
                <v-list>
                  <v-list-item
                    v-for="(form, index) in forms"
                    :key="index"
                    @click="tab = String(index)"
                  >
                    <template #prepend>
                      <v-icon v-if="form.formFillStatus === 'completed'" color="success">
                        mdi-check-circle
                      </v-icon>
                      <v-icon v-else color="warning">mdi-alert-circle</v-icon>
                    </template>
                    <v-list-item-title>{{ form.title }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{
                        form.formFillStatus === 'completed'
                          ? t('forms.consultation.statusCompleted')
                          : t('forms.consultation.statusIncomplete')
                      }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>

              <!-- Action buttons -->
              <div class="d-flex gap-4">
                <v-btn
                  variant="outlined"
                  color="primary"
                  @click="tab = String(forms.length - 1)"
                >
                  <v-icon start>mdi-chevron-left</v-icon>
                  {{ t('buttons.back') }}
                </v-btn>
                
                <v-btn color="primary" size="large" @click="handleSubmitAll">
                  {{ t('buttons.submit') }}
                  <v-icon end>mdi-send</v-icon>
                </v-btn>
              </div>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>
    </v-card>
  </v-container>
</template>
<style scoped>
@media (max-width: 600px) {

  /* Minimize container padding */
  .v-container {
    padding: 0px !important;
  }

  /* Make any fixed-width container full width on small screens (e.g., .w-75 -> 100%) */
  .w-75 {
    width: 100% !important;
    max-width: 100% !important;
  }
}
</style>