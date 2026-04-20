<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormValidation } from '@/composables/useFormValidation'
import IcdOpsSearchField from '@/components/icdops/IcdOpsSearchField.vue'
import type { IcdOpsEntry } from '@/services/icdopsService'
import {
  type CreateCaseSchema,
  type PatientCase,
  type Note,
  type User,
  type Blueprint,
  ResponseError,
  SearchBlueprintsBlueprintForEnum,
} from '@/api/'
import type { ApiPatientCaseWithDetails as PatientCaseWithDetails, ApiPatientCaseSurgery as PatientCaseSurgery } from '@/types'

// Importing the notifier store for notifications
import { useNotifierStore } from '@/stores/notifierStore'

const notifierStore = useNotifierStore()

const { t } = useI18n()
const { validateForm, clearAllErrors, resetFormState } = useFormValidation()

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
  mainDiagnosisICD10: [],
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

// ICD-10 entries with full data (for auto-fill feature)
// We use returnObject on IcdOpsSearchField to get both code and label
const mainDiagnosisICD10Entries = ref<(IcdOpsEntry | string)[]>(
  formCase.value.mainDiagnosisICD10?.map(code => (typeof code === 'string' ? code : code)) || []
)
const otherDiagnosisICD10Entries = ref<(IcdOpsEntry | string)[]>(
  formCase.value.otherDiagnosisICD10?.map(code => (typeof code === 'string' ? code : code)) || []
)

// Helper to extract codes from entries (handles both strings and IcdOpsEntry objects)
const extractCodes = (entries: (IcdOpsEntry | string)[]): string[] => {
  return entries.map(entry => typeof entry === 'string' ? entry : entry.code)
}

// Helper to extract labels from ICD10 entries for auto-fill
const extractLabels = (entries: (IcdOpsEntry | string)[]): string[] => {
  return entries
    .filter((entry): entry is IcdOpsEntry => typeof entry === 'object' && 'label' in entry)
    .map(entry => entry.label)
}

// Watch ICD10 entries and sync codes to formCase
watch(mainDiagnosisICD10Entries, (entries) => {
  formCase.value.mainDiagnosisICD10 = extractCodes(entries)
}, { deep: true })

watch(otherDiagnosisICD10Entries, (entries) => {
  formCase.value.otherDiagnosisICD10 = extractCodes(entries)
}, { deep: true })


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

  if (content.mainDiagnosisICD10) {
    formCase.value.mainDiagnosisICD10 = Array.isArray(content.mainDiagnosisICD10)
      ? [...content.mainDiagnosisICD10]
      : [content.mainDiagnosisICD10]
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

  if (props.showButtons !== false) {
    notifierStore.notify(t('forms.blueprint.blueprintApplied'), 'success')
  }
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

    // Auto-fill mainDiagnosis from ICD10 labels if mainDiagnosis is empty but ICD10 codes exist
    if (
      (!formCase.value.mainDiagnosis || formCase.value.mainDiagnosis.length === 0) &&
      mainDiagnosisICD10Entries.value.length > 0
    ) {
      const labelsFromIcd10 = extractLabels(mainDiagnosisICD10Entries.value)
      if (labelsFromIcd10.length > 0) {
        formCase.value.mainDiagnosis = labelsFromIcd10
      }
    }

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
      if (props.showButtons !== false) {
        notifierStore.notify(t('alerts.case.created'), 'success')
      }
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
      if (props.showButtons !== false) {
        notifierStore.notify(t('alerts.case.updated'), 'success')
      }
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

      // Auto-fill mainDiagnosis from ICD10 labels if mainDiagnosis is empty but ICD10 codes exist
      if (
        (!formCase.value.mainDiagnosis || formCase.value.mainDiagnosis.length === 0) &&
        mainDiagnosisICD10Entries.value.length > 0
      ) {
        const labelsFromIcd10 = extractLabels(mainDiagnosisICD10Entries.value)
        if (labelsFromIcd10.length > 0) {
          formCase.value.mainDiagnosis = labelsFromIcd10
        }
      }

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
      if (props.showButtons !== false) {
        notifierStore.notify(t('alerts.case.created'), 'success')
      }
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

    <v-autocomplete v-if="isCreating" class="mb-4"
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
                    variant="underlined"
                    @update:model-value="(blueprint) => blueprint && applyBlueprint(blueprint)">
      <template v-slot:item="{ props, item }">
        <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.description">
        </v-list-item>
      </template>
    </v-autocomplete>

    <v-form @submit.prevent="submit">
      <!-- Full width fields -->
      <v-text-field
                    v-model="formCase.externalId"
                    :label="t('forms.externalPatientCaseId')"></v-text-field>

      <v-textarea
                  v-model="formCase.medicalHistory"
                  :label="t('forms.patientCase.caseDescription')"
                  rows="3"></v-textarea>

      <!-- Diagnosis fields -->
      <v-row>
        <v-col cols="12">
          <IcdOpsSearchField
                             type="icd"
                             :label="t('forms.patientCase.mainDiagnosis')"
                             v-model="mainDiagnosisICD10Entries"
                             return-object
                             multiple
                             chips
                             clearable
                             closable-chips />
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12">
          <IcdOpsSearchField
                             type="icd"
                             :label="t('forms.patientCase.otherDiagnosis')"
                             v-model="otherDiagnosisICD10Entries"
                             return-object
                             multiple
                             chips
                             clearable
                             closable-chips />
        </v-col>
      </v-row>

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
