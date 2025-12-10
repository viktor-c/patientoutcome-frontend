<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormValidation } from '@/composables/useFormValidation'
import {
  type CreateCaseSchema,
  type PatientCase,
  type GetAllPatientCases200ResponseResponseObjectInner as PatientCaseWithDetails,
  type GetAllPatientCases200ResponseResponseObjectInnerSurgeriesInner as PatientCaseSurgery,
  type Note,
  type User,
  type Blueprint,
  ResponseError,
  SearchBlueprintsBlueprintForEnum,
} from '@/api/'

// Importing the notifier store for notifications
import { useNotifierStore } from '@/stores/notifierStore'

const notifierStore = useNotifierStore()

const { t } = useI18n()
const { errors, validateForm, clearAllErrors, touchField, isFieldTouched, resetFormState } = useFormValidation()

// Props
const props = defineProps<{
  // This is the selected case to edit, or null if we are creating a new case
  selectedCase?: PatientCase | null
  // This is a boolean to determine if we are creating a new case or editing an existing one
  createNewCase?: boolean
  patientId: string
  // Optional initial case data for embedding
  modelValue?: CreateCaseSchema
  // Whether to show the form's internal buttons (default: true)
  showButtons?: boolean
}>()

// Emits
const emit = defineEmits<{
  submit: [caseData: PatientCaseWithDetails]
  cancel: []
  'update:modelValue': [value: CreateCaseSchema]
  'next-step': [caseData: PatientCaseWithDetails]
  'blueprint-applied': [blueprint: Blueprint]
}>()

// Use centralized API instance
import { patientCaseApi, blueprintApi } from '@/api'

const newCase = {
  mainDiagnosis: [],
  studyDiagnosis: [],
  mainDiagnosisICD10: [],
  studyDiagnosisICD10: [],
  otherDiagnosis: [],
  otherDiagnosisICD10: [],
  surgeries: [] as PatientCaseSurgery[],
  supervisors: [] as User[],
  notes: [] as Note[],
  patient: props.patientId,
} as CreateCaseSchema

// Use modelValue if provided, otherwise fallback to selectedCase or newCase
const formCase = ref<PatientCase | CreateCaseSchema>(
  props.modelValue || (props.selectedCase ? { ...props.selectedCase } : newCase)
)

// Blueprint-related state
const blueprints = ref<Blueprint[]>([])
const selectedBlueprint = ref<Blueprint | null>(null)
const blueprintSearchQuery = ref('')
const loadingBlueprints = ref(false)
const formSubmitted = ref(false)

// Helper to determine if we should show error for a field
const shouldShowError = (fieldName: string): boolean => {
  return formSubmitted.value || isFieldTouched(fieldName)
}

// Helper to get error message (only if field should show error)
const getErrorIfNeeded = (fieldName: string): string => {
  return shouldShowError(fieldName) ? errors[fieldName] || '' : ''
}

// Helper to determine if field has error (only if field should show error)
const hasErrorIfNeeded = (fieldName: string): boolean => {
  return shouldShowError(fieldName) && !!errors[fieldName]
}

// Initialize form data on mount or when props change
watch(
  () => props.modelValue,
  (newModelValue) => {
    if (newModelValue) {
      formCase.value = { ...newModelValue }
    }
  },
  { immediate: true }
)

watch(
  () => props.selectedCase,
  (newSelectedCase) => {
    if (!props.modelValue && newSelectedCase) {
      formCase.value = { ...newSelectedCase }
    }
  },
  { immediate: true }
)

// Watch formCase changes and emit updates only when used standalone (not in flow)
watch(
  formCase,
  (newValue) => {
    // Only emit modelValue updates if modelValue prop is actually being used
    // and we're not being used within a parent that manages the state
    if (props.modelValue !== undefined && props.showButtons !== false) {
      emit('update:modelValue', newValue as CreateCaseSchema)
    }
  },
  { deep: true }
)

// Watch blueprint search query and fetch blueprints
watch(
  blueprintSearchQuery,
  async (newQuery) => {
    if (newQuery.length >= 2) {
      await searchBlueprints(newQuery)
    } else if (newQuery.length === 0) {
      await loadDefaultBlueprints()
    }
  }
)

// Computed to determine if we're creating or editing
const isCreating = computed(() => {
  return props.createNewCase !== false && !props.selectedCase
})

// Blueprint search functionality
const searchBlueprints = async (query: string) => {
  loadingBlueprints.value = true
  try {
    const response = await blueprintApi.searchBlueprints({
      q: query,
      blueprintFor: SearchBlueprintsBlueprintForEnum.Case,
      limit: '20'
    })
    blueprints.value = response.responseObject?.blueprints || []
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error searching blueprints:', errorMessage)
    notifierStore.notify(t('forms.blueprint.fetchError'), 'error')
  } finally {
    loadingBlueprints.value = false
  }
}

// Load default blueprints for cases
const loadDefaultBlueprints = async () => {
  loadingBlueprints.value = true
  try {
    const response = await blueprintApi.getBlueprints({
      blueprintFor: SearchBlueprintsBlueprintForEnum.Case,
      limit: '20'
    })
    blueprints.value = response.responseObject?.blueprints || []
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error loading blueprints:', errorMessage)
    notifierStore.notify(t('forms.blueprint.fetchError'), 'error')
  } finally {
    loadingBlueprints.value = false
  }
}

// Apply selected blueprint to form
const applyBlueprint = (blueprint: Blueprint) => {
  if (!blueprint.content) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = blueprint.content as any

  // Store the current externalPatientCaseId before applying the blueprint
  const currentExternalId = formCase.value.externalId

  // Apply the blueprint content to form fields
  if (content.mainDiagnosis) {
    formCase.value.mainDiagnosis = Array.isArray(content.mainDiagnosis)
      ? [...content.mainDiagnosis]
      : [content.mainDiagnosis]
  }

  if (content.studyDiagnosis) {
    formCase.value.studyDiagnosis = Array.isArray(content.studyDiagnosis)
      ? [...content.studyDiagnosis]
      : [content.studyDiagnosis]
  }

  if (content.mainDiagnosisICD10) {
    formCase.value.mainDiagnosisICD10 = Array.isArray(content.mainDiagnosisICD10)
      ? [...content.mainDiagnosisICD10]
      : [content.mainDiagnosisICD10]
  }

  if (content.studyDiagnosisICD10) {
    formCase.value.studyDiagnosisICD10 = Array.isArray(content.studyDiagnosisICD10)
      ? [...content.studyDiagnosisICD10]
      : [content.studyDiagnosisICD10]
  }

  if (content.otherDiagnosis) {
    formCase.value.otherDiagnosis = Array.isArray(content.otherDiagnosis)
      ? [...content.otherDiagnosis]
      : [content.otherDiagnosis]
  }

  if (content.otherDiagnosisICD10) {
    formCase.value.otherDiagnosisICD10 = Array.isArray(content.otherDiagnosisICD10)
      ? [...content.otherDiagnosisICD10]
      : [content.otherDiagnosisICD10]
  }

  if (content.notes) {
    formCase.value.notes = Array.isArray(content.notes) ? [...content.notes] : [content.notes]
  }

  if (content.medicalHistory) {
    formCase.value.medicalHistory = content.medicalHistory
  }

  // Set patient to current patient
  formCase.value.patient = props.patientId

  // Restore the externalId so it doesn't get overwritten by the blueprint
  formCase.value.externalId = currentExternalId

  selectedBlueprint.value = blueprint

  // Emit blueprint applied event so parent can extract surgery blueprint info
  emit('blueprint-applied', blueprint)

  notifierStore.notify(t('forms.blueprint.blueprintApplied'), 'success')
}

// Load blueprints on component mount
loadDefaultBlueprints()

// Create a new case
const submit = async () => {
  try {
    // Mark form as submitted so all fields show validation errors
    formSubmitted.value = true

    // Clear previous errors
    clearAllErrors()

    // Validate required fields
    const validationRules = {
      mainDiagnosis: [
        (v: unknown) => (Array.isArray(v) && v.length > 0 ? true : 'Main diagnosis is required'),
      ],
    }

    if (!validateForm(formCase.value, validationRules)) {
      notifierStore.notify(t('alerts.validation.failed'), 'error')
      return
    }

    if (isCreating.value) {
      const response = await patientCaseApi.createPatientCase({
        createCaseSchema: formCase.value as CreateCaseSchema,
        patientId: props.patientId
      })
      console.log('Case created successfully:', response)
      if (response.responseObject) {
        emit('submit', response.responseObject)
      }
      // show success message
      notifierStore.notify(t('alerts.case.created'), 'success')
    } else {
      if (!props.selectedCase || !props.selectedCase.id) return
      // Update the selected case with the new data
      const updateRequest = {
        ...formCase.value,
        notes: formCase.value.notes?.map(note => ({
          ...note,
          createdBy: note.createdBy || undefined
        })),
        surgeries: formCase.value.surgeries?.map(surgery => ({
          ...surgery,
          // additionalData handling removed as it doesn't exist on this type
        }))
      }
      const response = await patientCaseApi.updatePatientCaseById({
        updatePatientCaseByIdRequest: updateRequest,
        patientId: props.patientId,
        caseId: props.selectedCase.id
      })
      console.log('Case updated successfully:', response)
      notifierStore.notify(t('alerts.case.updated'), 'success')
      // Emit the updated case
      if (response.responseObject) {
        emit('submit', response.responseObject)
      }
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    // Show error message
    console.error('Error updating case:', errorMessage)
    notifierStore.notify(t('alerts.case.updateFailed'), 'error')
    emit('cancel')
  }
}

// Create a new case and move to next step
const submitAndNextStep = async () => {
  if (isCreating.value) {
    try {
      // Mark form as submitted so all fields show validation errors
      formSubmitted.value = true

      // Clear previous errors
      clearAllErrors()

      // Validate required fields
      const validationRules = {
        mainDiagnosis: [
          (v: unknown) => (Array.isArray(v) && v.length > 0 ? true : 'Main diagnosis is required'),
        ],
      }

      if (!validateForm(formCase.value, validationRules)) {
        notifierStore.notify(t('alerts.validation.failed'), 'error')
        return
      }

      const response = await patientCaseApi.createPatientCase({
        createCaseSchema: formCase.value as CreateCaseSchema,
        patientId: props.patientId
      })
      console.log('Case created successfully:', response)
      if (response.responseObject) {
        emit('next-step', response.responseObject)
      }
      // show success message
      notifierStore.notify(t('alerts.case.created'), 'success')
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred'
      if (error instanceof ResponseError) {
        errorMessage = (await error.response.json()).message
      }
      console.error('Error creating case', errorMessage)
      notifierStore.notify(t('alerts.case.creationFailed'), 'error')
    }
  }
}

// Expose the functions for external use
defineExpose({
  submit,
  submitAndNextStep,
  resetFormState: () => {
    clearAllErrors()
    resetFormState()
    formSubmitted.value = false
  }
})

// Load blueprints on component mount
loadDefaultBlueprints()
</script>

<template>
  <div>
    <p>
      {{ isCreating ? t('forms.patientCase.creatingNew') : t('forms.patientCase.editingExisting') }}
    </p>

    <!-- Blueprint Selection Section -->
    <v-card v-if="isCreating" class="mb-4">
      <v-card-title class="text-h6">{{ t('forms.blueprint.selectBlueprint') }}</v-card-title>
      <v-card-text>
        <v-autocomplete
                        v-model="selectedBlueprint"
                        v-model:search="blueprintSearchQuery"
                        :items="blueprints"
                        :loading="loadingBlueprints"
                        :label="t('forms.blueprint.selectBlueprint')"
                        :placeholder="t('forms.blueprint.searchBlueprintsPlaceholder')"
                        :no-data-text="t('forms.blueprint.noBlueprints')"
                        item-title="title"
                        item-value="id"
                        return-object
                        clearable
                        outlined
                        dense
                        @update:model-value="(blueprint) => blueprint && applyBlueprint(blueprint)">
          <template v-slot:item="{ props, item }">
            <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.description">
            </v-list-item>
          </template>
        </v-autocomplete>
      </v-card-text>
    </v-card>

    <v-form @submit.prevent="submit">
      <v-text-field
                    v-model="formCase.externalId"
                    :label="t('forms.externalPatientCaseId')"></v-text-field>

      <v-textarea
                  v-model="formCase.medicalHistory"
                  :label="t('forms.patientCase.caseDescription')"
                  rows="3"></v-textarea>

      <v-combobox
                  :label="t('forms.patientCase.mainDiagnosis')"
                  v-model="formCase.mainDiagnosis"
                  :items="formCase.mainDiagnosis"
                  multiple
                  outlined
                  dense
                  chips
                  clearable
                  closable-chips
                  :hint="t('forms.hints.required')"
                  persistent-hint
                  :error="hasErrorIfNeeded('mainDiagnosis')"
                  :error-messages="[getErrorIfNeeded('mainDiagnosis')]"
                  @blur="touchField('mainDiagnosis')"></v-combobox>

      <v-combobox
                  :label="t('forms.patientCase.mainDiagnosisICD10')"
                  v-model="formCase.mainDiagnosisICD10"
                  :items="formCase.mainDiagnosisICD10"
                  multiple
                  outlined
                  dense
                  chips
                  clearable
                  closable-chips></v-combobox>

      <v-combobox
                  :label="t('forms.patientCase.studyDiagnosis')"
                  v-model="formCase.studyDiagnosis"
                  :items="formCase.studyDiagnosis"
                  multiple
                  outlined
                  dense
                  chips
                  clearable
                  closable-chips></v-combobox>

      <v-combobox
                  :label="t('forms.patientCase.studyDiagnosisICD10')"
                  v-model="formCase.studyDiagnosisICD10"
                  :items="formCase.studyDiagnosisICD10"
                  multiple
                  outlined
                  dense
                  chips
                  clearable
                  closable-chips></v-combobox>

      <v-combobox
                  :label="t('forms.patientCase.otherDiagnosis')"
                  v-model="formCase.otherDiagnosis"
                  :items="formCase.otherDiagnosis"
                  multiple
                  outlined
                  dense
                  chips
                  clearable
                  closable-chips></v-combobox>

      <v-combobox
                  :label="t('forms.patientCase.otherDiagnosisICD10')"
                  v-model="formCase.otherDiagnosisICD10"
                  :items="formCase.otherDiagnosisICD10"
                  multiple
                  outlined
                  dense
                  chips
                  clearable
                  closable-chips></v-combobox>

      <div v-if="props.showButtons !== false" class="d-flex gap-2 mt-4">
        <v-btn color="primary" type="submit" variant="elevated">
          {{ isCreating ? t('buttons.create') : t('buttons.update') }}
        </v-btn>
        <v-btn
               v-if="isCreating"
               color="secondary"
               @click="submitAndNextStep"
               variant="elevated">
          {{ t('buttons.createAndNext') }}
        </v-btn>
        <v-btn color="grey" @click="$emit('cancel')" variant="outlined">
          {{ t('buttons.cancel') }}
        </v-btn>
      </div>
    </v-form>
  </div>
</template>
