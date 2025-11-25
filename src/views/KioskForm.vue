<script setup lang="ts">
import PatientForm from '@/components/PatientForm.vue'
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ResponseError } from '@/api'
import { formApi, kioskApi } from '@/api'
import { mapApiFormToForm } from '@/adapters/apiAdapters'
import type { Form, FormData } from '@/types/index'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// State for the form (use internal Form adapter type)
const form = ref<Form | null>(null)
const loading = ref(true)
const error = ref(false)

// State for navigation - list of all forms in the consultation
const allFormIds = ref<string[]>([])
const currentFormIndex = ref<number>(0)

// Computed to unwrap form value for template
const currentForm = computed(() => form.value)

// Computed formId from route params
const formId = computed(() => route.params.formId as string)

// Fetch consultation data to get the list of all forms
const fetchConsultationForms = async () => {
  try {
    const response = await kioskApi.getConsultation()
    const consultationData = response.responseObject as Record<string, unknown> | undefined

    if (consultationData && 'proms' in consultationData && Array.isArray(consultationData.proms)) {
      allFormIds.value = consultationData.proms
        .map((p) => {
          if (!p || typeof p !== 'object') return ''
          const r = p as Record<string, unknown>
          return ('id' in r && r['id']) ? String(r['id']) : ('_id' in r && r['_id']) ? String(r['_id']) : ''
        })
        .filter(id => id !== '')

      // Find current form index
      currentFormIndex.value = allFormIds.value.findIndex(id => id === formId.value)
      console.log('KioskForm: Found', allFormIds.value.length, 'forms, current index:', currentFormIndex.value)
    }
  } catch (err: unknown) {
    console.error('Failed to fetch consultation forms:', err)
  }
}

// Fetch form data
const fetchFormData = async () => {
  try {
    loading.value = true

    // Fetch both form data and consultation forms in parallel
    const [formResponse] = await Promise.all([
      formApi.getFormById({ formId: formId.value }),
      fetchConsultationForms()
    ])

    form.value = formResponse.responseObject ? mapApiFormToForm(formResponse.responseObject) : null
    console.log('Form data fetched successfully:', form.value)
  } catch (err: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (err instanceof ResponseError) {
      errorMessage = (await err.response.json()).message
    }
    console.error('Failed to fetch form data:', errorMessage)
    error.value = true
  } finally {
    loading.value = false
  }
}

// Watch for route parameter changes and refetch data
watch(() => route.params.formId, (newFormId, oldFormId) => {
  if (newFormId && newFormId !== oldFormId) {
    console.log('KioskForm: Route changed, refetching form data for:', newFormId)
    fetchFormData()
  }
})

// Initial fetch on mount
onMounted(() => {
  fetchFormData()
})

// Handle form data changes
const processFormData = (newFormData: FormData) => {
  console.debug('Form data changed:', newFormData)
  if (form.value) {
    form.value.formData = newFormData
  }
}

// Handle form submission
const handleSubmitForm = () => {
  console.log('Form submitted successfully')

  // Navigate back to kiosk view
  router.push({ name: 'kiosk' })
}

// Navigate to next form
const handleGotoNextForm = () => {
  console.log('KioskForm: Navigating to next form')
  if (currentFormIndex.value >= 0 && currentFormIndex.value < allFormIds.value.length - 1) {
    const nextFormId = allFormIds.value[currentFormIndex.value + 1]
    console.log('KioskForm: Next form ID:', nextFormId)
    router.push({ name: 'kioskform', params: { formId: nextFormId } })
  } else {
    // No more forms, go back to kiosk list
    console.log('KioskForm: No next form, returning to kiosk list')
    router.push({ name: 'kiosk' })
  }
}

// Navigate to previous form
const handleGotoPreviousForm = () => {
  console.log('KioskForm: Navigating to previous form')
  if (currentFormIndex.value > 0) {
    const prevFormId = allFormIds.value[currentFormIndex.value - 1]
    console.log('KioskForm: Previous form ID:', prevFormId)
    router.push({ name: 'kioskform', params: { formId: prevFormId } })
  } else {
    // Already at first form, go back to kiosk list
    console.log('KioskForm: At first form, returning to kiosk list')
    router.push({ name: 'kiosk' })
  }
}

// Navigate back to kiosk
const goBackToKiosk = () => {
  router.push({ name: 'kiosk' })
}
</script>

<template>
  <!-- full width on small screens, 75% on md and larger -->
  <v-container class="w-100 w-md-75">
    <!-- Header with back button -->
    <v-row class="mb-4">
      <v-col>
        <v-btn
               @click="goBackToKiosk"
               color="primary"
               prepend-icon="mdi-arrow-left"
               variant="outlined">
          {{ t('buttons.back') }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loading state -->
    <v-card v-if="loading" class="text-center pa-8" elevation="1">
      <v-progress-circular
                           indeterminate
                           color="primary"
                           size="64"
                           class="mb-4" />
      <div class="text-h6">{{ t('forms.loading') }}</div>
    </v-card>

    <!-- Error state -->
    <v-card v-else-if="error" class="text-center pa-8" elevation="1">
      <v-icon icon="mdi-alert-circle" size="64" color="error" class="mb-4" />
      <div class="text-h6 mb-4">{{ t('forms.error') }}</div>
      <v-btn @click="goBackToKiosk" color="primary">
        {{ t('buttons.back') }}
      </v-btn>
    </v-card>

    <!-- Form content -->
    <div v-else-if="form">
      <h1 class="mb-4">{{ t('forms.fillOutForm') }}</h1>

      <v-card>
        <v-card-text>
          <PatientForm
                       :key="formId"
                       :markdownHeader="currentForm?.markdownHeader || ''"
                       :markdownFooter="currentForm?.markdownFooter || ''"
                       :formSchema="currentForm?.formSchema || {}"
                       :formSchemaUI="currentForm?.formSchemaUI || { type: 'VerticalLayout', elements: [] } as any"
                       :formData="currentForm?.formData || {}"
                       :translations="currentForm?.translations"
                       :formId="formId"
                       :formArrayIdx="currentFormIndex"
                       @formDataChange="processFormData"
                       @submitForm="handleSubmitForm"
                       @gotoNextForm="handleGotoNextForm"
                       @gotoPreviousForm="handleGotoPreviousForm" />
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>
