<script setup lang="ts">
import PatientForm from '@/components/PatientForm.vue'
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ResponseError } from '@/api' // Import the API client
import type { UISchemaElement } from '@jsonforms/core'

import { type FormData, type Form } from '@/types/index'
import { mapApiFormToForm } from '@/adapters/apiAdapters'

const { t } = useI18n()

// Route parameters
const route = useRoute()
const consultationId = route.params.consultationId as string

// State for forms
const forms = ref<Form[]>([])
const tab = ref('0') // Tab index for navigation

// Use centralized API instance
import { consultationApi } from '@/api'

// Fetch consultation data and populate forms
onMounted(async () => {
  try {
    const response = await consultationApi.getConsultationById({ consultationId })
    const consultationData = response.responseObject
    if (!consultationData) {
      console.error('No consultation data found')
      return
    }
    // Assuming consultationData contains an array of forms
    forms.value = (consultationData.proms || []).map(mapApiFormToForm)
    console.log('FormView: Consultation data fetched successfully:', consultationData)
    console.log('FormView: Mapped forms with formData:', forms.value.map(f => ({ id: f._id, formData: f.formData })))
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Failed to fetch consultation data:', errorMessage)
  }
})

// Handle form data changes
const processFormData = (formData: FormData, formIndex: number) => {
  console.debug(`Form data changed for form ${formIndex}:`, formData);
  // Update the form data in the forms array
  (forms.value[formIndex] as Record<string, unknown>).data = formData;
}

// Navigation handlers for PatientForm
const handleGotoPreviousForm = (formIndex: number) => {
  if (formIndex > 0) {
    tab.value = String(formIndex - 1)
  }
}

const handleGotoNextForm = (formIndex: number) => {
  if (formIndex < forms.value.length - 1) {
    tab.value = String(formIndex + 1)
  } else {
    // Optionally, go to the finish tab
    tab.value = String(forms.value.length)
  }
}
</script>

<template>
  <v-container class="w-75">
    <v-card>
      <v-tabs v-model="tab" bg-color="primary">
        <v-tab v-for="(form, index) in forms" :key="index" :value="String(index)">
          {{ (form as Form).title || t('forms.consultation.untitledForm') }}
        </v-tab>
        <v-tab :value="String(forms.length)">{{ t('forms.consultation.finish') }}</v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="tab">
          <v-tabs-window-item v-for="(form, index) in forms" :key="index" :value="String(index)">
            <PatientForm
                         :markdown-header="(form as Form).markdownHeader || ''"
                         :markdown-footer="(form as Form).markdownFooter || ''"
                         :form-schema="(form as Form).formSchema || {}"
                         :form-schema-u-i="((form as Form).formSchemaUI as unknown as UISchemaElement) || {}"
                         :form-data="(form as Form).formData || {}"
                         :translations="(form as Form).translations"
                         :form-id="(form as Form)._id || ''"
                         :form-array-idx="Number(index)"
                         @formDataChange="(data) => processFormData(data, Number(index))"
                         @gotoPreviousForm="() => handleGotoPreviousForm(Number(index))"
                         @gotoNextForm="() => handleGotoNextForm(Number(index))" />
            <!-- <v-btn color="success" @click="tab = String(Number(index) + 1)">
              {{ t('buttons.next') }}
            </v-btn> -->
          </v-tabs-window-item>

          <v-tabs-window-item :value="String(forms.length)">
            <h2>{{ t('forms.consultation.completed') }}</h2>
            <v-btn color="primary" @click="console.log('Submit all forms:', forms)">
              {{ t('buttons.submit') }}
            </v-btn>
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