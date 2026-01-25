<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import LanguageSelector from '@/components/LanguageSelector.vue'
import PatientForm from '@/components/PatientForm.vue'
import { ResponseError } from '@/api'
import { mapApiFormsToForms } from '@/adapters/apiAdapters'
import { useNotifierStore } from '@/stores/notifierStore'

import type { Form, FormData } from '@/types/index'

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
console.debug(`external code ${externalCode}, consultation ID ${consultationId}`)
const router = useRouter()

// Use centralized API instance
import { consultationApi, codeApi } from '@/api'

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
    console.debug('Fetching consultation forms...')
    // Fetch consultation ID using the code
    const consultationResponse = externalCode
      ? await consultationApi.getConsultationByCode({ code: externalCode })
      : await consultationApi.getConsultationById({ consultationId: consultationId || '' })
    console.debug('response from consultationApi:', consultationResponse)
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

    console.debug(`Found ${completedForms.value.length} completed forms and ${forms.value.length} pending forms`)

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
    console.error('Error fetching consultation forms:', errorMessage)
    // errorMessage.value = t('alerts.consultation.fetchFormsFailed');
  } finally {
    isLoading.value = false
    if (forms.value.length === 0 && completedForms.value.length === 0) {
      router.go(-1)
      notifierStore.notify(t('flow.noFormsAvailable'), 'error')
    }
  }
})

// Handle form data changes
const processFormData = (formData: FormData, formIndex: number) => {
  console.debug(`Form data changed for form ${formIndex}:`, formData)
  // Store the form data  - scoring is now handled by the renderer
  forms.value[formIndex].formData = formData
}

// Handle form submission
const submitForm = () => {
  console.debug(`Form ${currentFormIndex.value} submitted.`)
  if (currentFormIndex.value < forms.value.length - 1) {
    currentFormIndex.value++
    // Reset scroll position for the next form
    y.value = 0
  } else if (isReviewMode.value) {
    // In review mode, go to review complete screen
    currentFormIndex.value++
    y.value = 0
  } else {
    // All new forms are filled, show review option
    showReviewOption.value = true
    y.value = 0
  }
}

const startCountdown = () => {
  let countdown = 4 // 4 seconds
  const interval = setInterval(() => {
    countdown--
    countdownProgress.value = (countdown / 4) * 100
    if (countdown <= 0) {
      clearInterval(interval)
      router.push('/')
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
      console.debug(`Code ${externalCode} deactivated successfully`)
    }
    isFinalized.value = true
    showSuccessMessage.value = true
    showReviewOption.value = false
    startCountdown()
  } catch (error) {
    console.error('Error deactivating code:', error)
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
            <p class="mb-4">{{ t('flow.reviewQuestion') }}</p>
          </v-card-text>
          <v-card-actions class="justify-center flex-wrap ga-4">
            <v-btn
                   color="primary"
                   variant="outlined"
                   size="large"
                   @click="startReview">
              <v-icon start>mdi-eye</v-icon>
              {{ t('flow.reviewAnswers') }}
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
          <PatientForm
                       :markdownHeader="currentForm.markdownHeader || ''"
                       :markdownFooter="currentForm.markdownFooter || ''"
                       :formSchema="currentForm.formSchema || {}"
                       :formSchemaUI="currentForm.formSchemaUI || { type: 'VerticalLayout', elements: [] } as any"
                       :formData="currentForm.formData || {}"
                       :translations="(currentForm as any).translations"
                       :form-id="currentForm._id || ''"
                       :formArrayIdx="currentFormIndex"
                       @formDataChange="(data) => processFormData(data, currentFormIndex)"
                       @submit-form="submitForm"
                       @goto-previous-form="gotoPreviousForm"
                       :key="currentForm._id" />
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
