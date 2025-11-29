<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ResponseError, type GetAllPatientCases200ResponseResponseObjectInner as PatientCaseFromApi } from '@/api'
import PatientCaseCreateEditForm from '@/components/forms/PatientCaseCreateEditForm.vue'
import { useNotifierStore } from '@/stores/notifierStore'
import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'

const { t } = useI18n()
const notifierStore = useNotifierStore()

// Use centralized API instance
import { patientApi } from '@/api'

const dialog = ref(false)
const step = ref(1)
const loading = ref(false)
const error = ref('')
const createdPatientId = ref<string | null>(null)
const showConsultationDialog = ref(false)
const createdCaseId = ref<string | null>(null)

// Patient form fields
const externalId = ref<string[]>([""])
const sex = ref<'male' | 'female' | 'other' | "">("")

// Sex dropdown options
const sexOptions = [
  { value: "", title: t('forms.patient.sex.null') },
  { value: 'male', title: t('forms.patient.sex.male') },
  { value: 'female', title: t('forms.patient.sex.female') },
  { value: 'other', title: t('forms.patient.sex.other') },
]

// Submit patient form
const submitPatientForm = async () => {
  error.value = ''
  if (!externalId.value[0]) {
    error.value = t('forms.patient.externalIdRequired')
    return
  }
  loading.value = true
  try {
    const response = await patientApi.createPatient({
      createPatientRequest: {
        externalPatientId: externalId.value,
        sex: sex.value,
      },
    })
    if (response.responseObject && response.responseObject.id) {
      createdPatientId.value = response.responseObject.id
      notifierStore.success(t('alerts.patient.created'))
      step.value = 2
    } else {
      error.value = t('alerts.patient.createFailed')
    }
  } catch (err: unknown) {
    let errorMessage = t('alerts.patient.createFailed')
    if (err instanceof ResponseError) {
      errorMessage = (await err.response.json()).message
    }
    error.value = errorMessage
    console.error('Error creating patient:', errorMessage)
  } finally {
    loading.value = false
  }
}

// Handle case form submit
const handleCaseSubmit = (caseData: PatientCaseFromApi) => {
  console.log('Case created successfully:', caseData)
  createdCaseId.value = caseData.id || null
  step.value = 3
  showConsultationDialog.value = true
}

// Handle consultation form submit
const handleConsultationSubmit = () => {
  showConsultationDialog.value = false
  dialog.value = false
  // Reset form
  resetForm()
}

// Handle consultation form cancel
const handleConsultationCancel = () => {
  showConsultationDialog.value = false
  dialog.value = false
  // Reset form
  resetForm()
}

// Handle case form cancel
const handleCaseCancel = () => {
  dialog.value = false
  resetForm()
}

// Reset form to initial state
const resetForm = () => {
  step.value = 1
  externalId.value = [""]
  sex.value = ""
  createdPatientId.value = null
  createdCaseId.value = null
  error.value = ''
  loading.value = false
}

const addExternalId = () => {
  externalId.value.push('')
}

const removeExternalId = (idx: number) => {
  externalId.value.splice(idx, 1)
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="500">
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn v-bind="activatorProps" color="primary" variant="plain">
        <v-icon icon="mdi-account-plus"></v-icon></v-btn>
    </template>
    <v-card>
      <v-card-title>
        {{ step === 1 ? t('forms.patient.addNewPatient') : t('forms.patientCase.createNewCase') }}
      </v-card-title>
      <v-card-text>
        <div v-if="step === 1">
          <v-form @submit.prevent="submitPatientForm">
            <div v-for="(id, idx) in externalId" :key="idx" class="d-flex align-center">
              <v-text-field
                            v-model="externalId[idx]"
                            :label="t('forms.patient.externalId')"
                            required
                            outlined
                            dense
                            class="flex-grow-1"></v-text-field>
              <v-btn
                     variant="text"
                     color="error"
                     @click="removeExternalId(idx)"
                     :aria-label="t('forms.patient.removeExternalId')"
                     class="mb-2"
                     v-if="externalId.length > 1">
                <v-icon icon="mdi-trash-can"></v-icon>
              </v-btn>
            </div>
            <v-btn
                   color="primary"
                   variant="text"
                   @click="addExternalId"
                   :aria-label="t('forms.patient.addExternalId')"
                   class="mb-4"
                   :disabled="externalId[externalId.length - 1] === ''">
              <v-icon icon="mdi-plus"></v-icon>
              {{ t('forms.patient.addExternalId') }}
            </v-btn>
            <v-select
                      v-model="sex"
                      :items="sexOptions"
                      item-value="value"
                      item-title="title"
                      :label="t('forms.patient.sex')"
                      outlined
                      dense
                      clearable></v-select>
            <v-alert v-if="error" type="error" dense>{{ error }}</v-alert>
            <v-btn color="primary" type="submit" :loading="loading" class="mt-4">
              {{ t('buttons.nextStep') }}
            </v-btn>
          </v-form>
        </div>
        <div v-else-if="step === 2">
          <PatientCaseCreateEditForm
                                     :showButtons="true"
                                     :createNewCase="true"
                                     :patientId="createdPatientId!"
                                     :selectedCase="null"
                                     @submit="handleCaseSubmit"
                                     @cancel="handleCaseCancel" />
        </div>
      </v-card-text>

    </v-card>

    <!-- Consultation Dialog - separate from main dialog -->
    <CreateEditConsultationDialog
                                  v-if="createdPatientId && createdCaseId"
                                  v-model:show="showConsultationDialog"
                                  :patientId="createdPatientId"
                                  :caseId="createdCaseId"
                                  @submit="handleConsultationSubmit"
                                  @cancel="handleConsultationCancel" />
  </v-dialog>
</template>
