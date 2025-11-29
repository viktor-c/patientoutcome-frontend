<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
import { consultationApi } from '@/api'

// State for forms
const forms = ref<Form[]>([])
const currentFormIndex = ref(0) // Track the current form index
//const currentForm = ref<Form | null>(null); // Current form being displayed

const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const showSuccessMessage = ref(false)
const countdownProgress = ref(100) // Countdown progress for redirection

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
    forms.value = mapApiFormsToForms(consultationResponse.responseObject.proms || [])
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
    if (forms.value.length === 0) {
      router.go(-1)
      notifierStore.notify('Keine Formulare zur Verfügung für diesen Fall', 'error')
    }
  }
})

// Handle form data changes
const processFormData = (formData: FormData, formIndex: number) => {
  console.debug(`Form data changed for form ${formIndex}:`, formData)
  // Store the form data  - scoring is now handled by the renderer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forms.value[formIndex].formData = formData as any
}

// Handle form submission
const submitForm = () => {
  console.debug(`Form ${currentFormIndex.value} submitted.`)
  if (currentFormIndex.value < forms.value.length - 1) {
    currentFormIndex.value++
    // Reset scroll position for the next form
    y.value = 0
  } else {
    showSuccessMessage.value = true
    startCountdown()
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

const isSmallScreen = computed(() => window.innerWidth < 1200)
</script>

<template>
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
        <v-card v-else-if="showSuccessMessage">
          <h1 class="success-message">{{ t('flow.allFormsFilled') }}</h1>
          <v-progress-linear :model-value="countdownProgress" color="blue" :height="8"></v-progress-linear>
        </v-card>
        <v-card v-else v-scroll="onScroll" ref="formContainer">
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
