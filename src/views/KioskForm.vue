<script setup lang="ts">
import PatientForm from '@/components/PatientForm.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ResponseError } from '@/api'
import { formApi } from '@/api'
import { mapApiFormToForm } from '@/adapters/apiAdapters'
import type { Form, FormData } from '@/types/index'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Route parameters
const formId = route.params.formId as string

// State for the form (use internal Form adapter type)
const form = ref<Form | null>(null)
const loading = ref(true)
const error = ref(false)

// Computed to unwrap form value for template
const currentForm = computed(() => form.value)

// Fetch form data
onMounted(async () => {
  try {
    loading.value = true
    const response = await formApi.getFormById({ formId })
    form.value = response.responseObject ? mapApiFormToForm(response.responseObject) : null
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
                       :markdownHeader="currentForm?.markdownHeader || ''"
                       :markdownFooter="currentForm?.markdownFooter || ''"
                       :formSchema="currentForm?.formSchema || {}"
                       :formSchemaUI="currentForm?.formSchemaUI || { type: 'VerticalLayout', elements: [] } as any"
                       :formData="currentForm?.formData || {}"
                       :translations="currentForm?.translations"
                       :formId="formId"
                       :formArrayIdx="0"
                       @formDataChange="processFormData"
                       @submitForm="handleSubmitForm" />
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>
