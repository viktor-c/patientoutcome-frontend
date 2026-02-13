<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSelector from '@/components/LanguageSelector.vue'
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'
import { ResponseError } from '@/api'
import { mapApiFormsToForms } from '@/adapters/apiAdapters'
import { useNotifierStore } from '@/stores/notifierStore'
import { logger } from '@/services/logger'

import type { Form } from '@/types/index'
import type { FormSubmissionData } from '@/forms/types'

import { useWindowScroll, useWindowSize } from '@vueuse/core'
const { height } = useWindowSize()
const { y } = useWindowScroll()
import { useElementSize } from '@vueuse/core'
import { useTemplateRef } from 'vue'
const el = useTemplateRef('formContainer')
const { height: containerHeight } = useElementSize(el)

const { t } = useI18n()

// Define props for the component
const { consultationId, externalCode } = defineProps<{ consultationId?: string; externalCode?: string }>()
logger.debug(`external code ${externalCode}, consultation ID ${consultationId}`)
const router = useRouter()

import { consultationApi, codeApi, formApi } from '@/api'

// State for forms
const forms = ref<Form[]>([])
const currentFormIndex = ref(0) // Track the current form index
//const currentForm = ref<Form | null>(null); // Current form being displayed

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const showSuccessMessage = ref(false)
const countdownProgress = ref(100) // Countdown progress for redirection
const showReviewOption = ref(false) // Show review option after all forms are filled
const completedForms = ref<Form[]>([]) // Forms that were already completed before
const allForms = ref<Form[]>([]) // All forms including completed ones for review
const isReviewMode = ref(false) // True when reviewing completed forms
const isFinalized = ref(false) // True after code is deactivated

const notifierStore = useNotifierStore()

onMounted(async () => {
  try {
    logger.debug('Fetching consultation forms...')
    // Fetch consultation ID using the code
    const consultationResponse = externalCode
      ? await consultationApi.getConsultationByCode({ code: externalCode })
      : await consultationApi.getConsultationById({ consultationId: consultationId || '' })
    logger.debug('response from consultationApi:', consultationResponse)
    if (!consultationResponse.responseObject) {
      throw new Error('Consultation not found for the provided code.')
    }

    // Fetch forms for the consultation
    // Map API-generated forms to our internal Form shape using adapter
    const mappedForms = mapApiFormsToForms(consultationResponse.responseObject.proms || [])
    allForms.value = mappedForms

    // Separate completed forms from pending forms
    completedForms.value = mappedForms.filter(f => f.formFillStatus === 'completed')
    forms.value = mappedForms.filter(f => f.formFillStatus !== 'completed')

    logger.debug(`Found ${completedForms.value.length} completed forms and ${forms.value.length} pending forms`)

    // If all forms are already completed, show review option directly
    if (forms.value.length === 0 && completedForms.value.length > 0) {
      showReviewOption.value = true
    }

    currentFormIndex.value = 0 // Reset to the first form
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('Error fetching consultation forms:', errorMessage)
    // errorMessage.value = t('alerts.consultation.fetchFormsFailed');
  } finally {
    isLoading.value = false
    if (forms.value.length === 0 && completedForms.value.length === 0) {
      router.go(-1)
      notifierStore.notify(t('flow.noFormsAvailable'), 'error')
    }
  }
})

// Handle form data changes - receives FormSubmissionData from plugin
const processFormData = (submissionData: FormSubmissionData, formIndex: number) => {
  const currentFormId = forms.value[formIndex]?._id
  logger.debug(`ShowConsultationForms: processFormData called - formIndex=${formIndex}, formId=${currentFormId}`)
  logger.debug(`ShowConsultationForms: Received submission data:`, submissionData)

  if (!currentFormId || !submissionData) return

  // Store the raw form data (extract rawData from FormSubmissionData)
  if (currentFormId) {
    logger.debug(`ShowConsultationForms: Updating forms[${formIndex}].formData with rawData`)
    forms.value[formIndex].formData = submissionData.rawData as unknown as Form['formData']
    forms.value[formIndex].scoring = submissionData.scoring // Store scoring data if available
    forms.value[formIndex].formFillStatus = submissionData.isComplete ? 'completed' : 'incomplete' // Mark form as incomplete until submission
    // Also update in allForms to keep data in sync
    const allFormIndex = allForms.value.findIndex(f => f._id === currentFormId)
    if (allFormIndex !== -1) {
      logger.debug(`ShowConsultationForms: Also updating allForms[${allFormIndex}].formData`)
      allForms.value[allFormIndex].formData = submissionData.rawData as unknown as Form['formData']
      allForms.value[allFormIndex].scoring = submissionData.scoring
      allForms.value[allFormIndex].formFillStatus = submissionData.isComplete ? 'completed' : 'incomplete'
    }
  }
}

// Computed: count of incomplete forms
const incompleteForms = computed(() => {
  const incomplete: string[] = []
  for (const form of forms.value) {
    const formId = form._id
    if (!formId) continue
    // Check if form data exists and has values
    const hasData = form.formData && Object.keys(form.formData).length > 0

    // Check if all fields are filled
    let isComplete = false
    if (hasData && typeof form.formData === 'object') {
      isComplete = Object.values(form.formData).every(section => {
        if (typeof section === 'object' && section !== null) {
          return Object.values(section).every(value => value !== null && value !== '')
        }
        return false
      })
    }

    // Form is incomplete if not completed
    if (!isComplete) {
      incomplete.push(formId)
    }
  }
  return incomplete
})

// Handle form submission
const submitForm = async () => {
  logger.debug(`========== submitForm() called ==========`)
  logger.debug(`Current form index: ${currentFormIndex.value}, Total forms: ${forms.value.length}`)

  const currentForm = forms.value[currentFormIndex.value]
  if (!currentForm) {
    logger.error('ShowConsultationForms: Current form not found')
    notifierStore.notify(t('alerts.form.submitFailed'), 'error')
    return
  }

  if (!currentForm._id) {
    logger.error('ShowConsultationForms: Form ID missing, cannot save form data')
    notifierStore.notify(t('alerts.form.submitFailed'), 'error')
    return
  }

  try {
    // Save the form data to the backend
    logger.debug(`Saving form ${currentFormIndex.value}: ${currentForm._id}`)

    // form data should be saved even if the form is incomplete
    const updatePayload = {
      formId: currentForm._id,
      updateFormRequest: {
        code: externalCode ? externalCode : "", // Include code if available for authorization
        formData: currentForm.formData || {},
        scoring: currentForm.scoring || undefined,
        formFillStatus: currentForm.formFillStatus,
      }
    }

    logger.debug('Form submission payload:', JSON.stringify(updatePayload, null, 2))

    await formApi.updateForm(updatePayload)
    logger.info(`Form ${currentForm._id} saved successfully`)
    notifierStore.notify(t('alerts.form.saved'), 'success')
  } catch (error: unknown) {
    logger.error(`Failed to save form ${currentForm._id}:`, error)
    let errorMessage = t('alerts.form.submitFailed')
    if (error instanceof ResponseError) {
      try {
        const errorData = await error.response.json()
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = error.message || errorMessage
      }
    }
    notifierStore.notify(errorMessage, 'error')
    return
  }

  // Proceed to next form only after successful save
  logger.debug(`Form ${currentFormIndex.value} submitted.`)
  if (currentFormIndex.value < forms.value.length - 1) {
    logger.debug(`Moving to next form: ${currentFormIndex.value} -> ${currentFormIndex.value + 1}`)
    currentFormIndex.value++
    // Reset scroll position for the next form
    y.value = 0
  } else if (isReviewMode.value) {
    logger.debug(`In review mode, moving past last form`)
    // In review mode, go to review complete screen
    currentFormIndex.value++
    y.value = 0
  } else {
    logger.debug(`All forms filled, showing review option`)
    // All new forms are filled, show review option
    showReviewOption.value = true
    y.value = 0
  }
  logger.debug(`========== submitForm() done ==========`)
}

const startCountdown = () => {
  let countdown = 4 // 4 seconds
  const interval = setInterval(() => {
    countdown--
    countdownProgress.value = (countdown / 4) * 100
    if (countdown <= 0) {
      clearInterval(interval)
      router.push({ name: 'completioninfo' })
    }
  }, 1000)
}

// Start reviewing previously completed forms
const startReview = () => {
  isReviewMode.value = true
  // Combine completed forms with newly filled forms for review
  forms.value = allForms.value
  currentFormIndex.value = 0
  showReviewOption.value = false
  y.value = 0
}

// Finalize and deactivate the code
const finalizeAndClose = async () => {
  try {
    if (externalCode) {
      await codeApi.deactivateCode({ code: externalCode })
      logger.debug(`Code ${externalCode} deactivated successfully`)
    }
    isFinalized.value = true
    showSuccessMessage.value = true
    showReviewOption.value = false
    startCountdown()
  } catch (error) {
    logger.error('Error deactivating code:', error)
    // Still show success even if deactivation fails - forms are saved
    showSuccessMessage.value = true
    showReviewOption.value = false
    startCountdown()
  }
}

// Skip review and finalize directly
const skipReviewAndFinalize = () => {
  finalizeAndClose()
}

const currentForm = computed(() => {
  return forms.value[currentFormIndex.value] || null
})

// Calculate form fill progress
const formFillProgress = ref(0)

const onScroll = () => {
  const totalForms = forms.value.length
  if (totalForms === 0) return 0
  const formProgress = currentFormIndex.value / forms.value.length //float value between 0 and 1
  const oneFormRatio = 1 / forms.value.length //ratio of one form in the total progress
  //containerHeightis the height of the container with the forms
  // y is the current scroll position
  // height is the height of the window
  const scrollProgress = Math.min(1, y.value / (containerHeight.value - height.value + 0.01))
  formFillProgress.value = (formProgress + oneFormRatio * scrollProgress) * 100
  //console.debug(`Form fill progress: ${formProgress}, Scroll progress on the page: ${scrollProgress}, Value of progress bar: ${formFillProgress.value}`);
}

const gotoPreviousForm = () => {
  if (currentFormIndex.value > 0) {
    currentFormIndex.value--
    y.value = 0 // Reset scroll position for the previous form
  }
}

const isSmallScreen = computed(() => window.innerWidth < 1300)
</script>

<template>
  <!-- Fixed Language Selector -->
  <div class="language-selector-floating">
    <LanguageSelector />
  </div>
  <v-container v-if="isLoading" class="loading-container">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
  </v-container>
  <v-container v-else :class="isSmallScreen ? 'w-100' : 'w-75'">
    <v-container class="progress-bar-container">
      <v-progress-linear color="green" :model-value="formFillProgress" :height="8"></v-progress-linear>
    </v-container>
    <v-container>
      <transition name="slide-down">
        <v-card v-if="errorMessage">
          <v-card-text class="error">{{ errorMessage }}</v-card-text>
        </v-card>
        <v-card v-else-if="showSuccessMessage" class="pa-6">
          <h1 class="success-message">{{ t('flow.allFormsFilled') }}</h1>
          <p class="text-center text-grey mt-2">{{ t('flow.redirectingMessage') }}</p>
          <v-progress-linear :model-value="countdownProgress" color="blue" :height="8" class="mt-4"></v-progress-linear>
        </v-card>
        <v-card v-else-if="showReviewOption" class="pa-6">
          <v-card-title class="text-h5 text-center">
            {{ t('flow.formsCompleted') }}
          </v-card-title>
          <v-card-text class="text-center">
            <p v-if="completedForms.length > 0" class="mb-4">
              {{ t('flow.previouslyFilledForms', { count: completedForms.length }) }}
            </p>
            <!-- Show incomplete forms warning -->
            <v-alert
                     v-if="incompleteForms.length > 0"
                     type="warning"
                     variant="tonal"
                     class="mb-4 text-left">
              <div class="d-flex flex-column">
                <strong>{{ t('flow.incompleteFormsWarning', { count: incompleteForms.length }) }}</strong>
                <span class="text-body-2 mt-2">{{ t('flow.incompleteFormsExplanation') }}</span>
              </div>
            </v-alert>
            <v-alert
                     v-else
                     type="success"
                     variant="tonal"
                     class="mb-4">
              {{ t('flow.allFormsComplete') }}
            </v-alert>
            <p class="mb-4">{{ t('flow.reviewQuestion') }}</p>
          </v-card-text>
          <v-card-actions class="justify-center flex-wrap ga-4">
            <v-btn
                   color="primary"
                   variant="outlined"
                   size="large"
                   @click="startReview">
              <v-icon start>mdi-eye</v-icon>
              {{ incompleteForms.length > 0 ? t('flow.reviewIncompleteAnswers') : t('flow.reviewAnswers') }}
            </v-btn>
            <v-btn
                   color="success"
                   variant="flat"
                   size="large"
                   @click="skipReviewAndFinalize">
              <v-icon start>mdi-check</v-icon>
              {{ t('flow.finishWithoutReview') }}
            </v-btn>
          </v-card-actions>
        </v-card>
        <v-card v-else-if="isReviewMode && currentFormIndex >= forms.length" class="pa-6">
          <v-card-title class="text-h5 text-center">
            {{ t('flow.reviewComplete') }}
          </v-card-title>
          <v-card-text class="text-center">
            <p>{{ t('flow.reviewCompleteMessage') }}</p>
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn
                   color="success"
                   variant="flat"
                   size="large"
                   @click="finalizeAndClose">
              <v-icon start>mdi-check</v-icon>
              {{ t('flow.finishAndClose') }}
            </v-btn>
          </v-card-actions>
        </v-card>
        <v-card v-else-if="currentForm" v-scroll="onScroll" ref="formContainer">
          <v-chip v-if="isReviewMode" color="info" class="ma-2" size="small">
            {{ t('flow.reviewModeLabel') }}
          </v-chip>
          <PluginFormRenderer
                              :key="currentForm._id"
                              :template-id="currentForm.formTemplateId || currentForm._id || ''"
                              :model-value="(currentForm.formData as any) || {}"
                              @update:model-value="(data) => processFormData(data, currentFormIndex)" />

          <!-- Navigation buttons -->
          <v-card-actions class="px-6 py-4 d-flex justify-space-between">
            <v-btn
                   v-if="currentFormIndex > 0"
                   variant="outlined"
                   color="primary"
                   @click="gotoPreviousForm">
              <v-icon start>mdi-arrow-left</v-icon>
              {{ t('common.previous', 'Previous') }}
            </v-btn>
            <v-spacer v-else />

            <v-btn
                   color="primary"
                   variant="flat"
                   @click="submitForm">
              <v-icon end>mdi-arrow-right</v-icon>
              {{ currentFormIndex === forms.length - 1 ? t('common.review', 'Review') : t('common.next', 'Next') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </transition>
    </v-container>
  </v-container>
</template>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.progress-bar-container {
  position: fixed;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  z-index: 1;
  display: flex;
  justify-content: center;
}

.language-selector-floating {
  position: fixed;
  top: 20px;
  right: 15%;
  z-index: 10;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.small-container {
  height: 80px;
  overflow-y: auto;
}

.success-message {
  text-align: center;
  font-size: 2rem;
  margin-top: 20px;
}

.slide-down-enter-active {
  transition: transform 0.5s ease-out;
}

.slide-down-leave-active {
  transition: transform 0.5s ease-in;
}

.slide-down-enter,
.slide-down-leave-to {
  transform: translateY(-100%);
}
</style>
