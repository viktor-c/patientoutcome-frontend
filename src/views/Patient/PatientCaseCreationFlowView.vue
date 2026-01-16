<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useNotifierStore } from '@/stores/notifierStore'
import type {
  Patient,
  Consultation,
  Surgery,
  CreatePatientRequest,
  CreateCaseSchema,
  Blueprint,
  GetAllPatientCases200ResponseResponseObjectInner
} from '@/api'
import { ResponseError } from '@/api'
//step 1: create patient
//step 2: create case
import PatientCaseCreateEditForm from '@/components/forms/PatientCaseCreateEditForm.vue'
//step 3: create surgery
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'
//step 4: create consultations (from surgery blueprint or manual selection)
import ConsultationBlueprintSelectionDialog from '@/components/dialogs/ConsultationBlueprintSelectionDialog.vue'
import CreateBatchConsultationsDialog from '@/components/dialogs/CreateBatchConsultationsDialog.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const notifierStore = useNotifierStore()

// Current step in the flow (1: Patient, 2: Case, 3: Surgery, 4: Consultation)
const currentStep = ref(1)

// Data for each step
const patientData = ref<CreatePatientRequest>({
  externalPatientId: [''],
  sex: ''
})

const showExternalIdWarning = ref(false)

const caseData = ref<CreateCaseSchema>({
  patient: '',
  externalId: '', // This is the externalPatientCaseId - unique identifier for the patient case
  mainDiagnosis: [],
  mainDiagnosisICD10: [],
  otherDiagnosis: [],
  otherDiagnosisICD10: [],
  surgeries: [],
  supervisors: [],
  notes: [],
  medicalHistory: ''
})

// Created objects
const createdPatient = ref<Patient | null>(null)
const createdCase = ref<GetAllPatientCases200ResponseResponseObjectInner | null>(null)
const createdSurgery = ref<Surgery | null>(null)
const createdConsultations = ref<Consultation[]>([])

// Track whether surgery is being skipped
const skipSurgery = ref(false)

// Consultation blueprint management
const selectedConsultationBlueprints = ref<Blueprint[]>([])
const showConsultationBlueprintSelection = ref(false)
const surgeryBlueprintConsultations = ref<string[]>([])

// Surgery blueprint management
const surgeryBlueprintId = ref<string | null>(null)

// Form refs for external submission
const caseFormRef = ref<InstanceType<typeof PatientCaseCreateEditForm> | null>(null)
const surgeryFormRef = ref<InstanceType<typeof CreateEditSurgeryDialog> | null>(null)

// Duplicate patient handling
const showDuplicatePatientDialog = ref(false)
const duplicateExternalId = ref<string>('')

// Loading states
const isLoading = ref(false)

// Watch currentStep to reset form errors when navigating between steps
watch(currentStep, (newStep, oldStep) => {
  if (newStep !== oldStep) {
    // Reset form state when moving to a different step
    if (caseFormRef.value?.resetFormState) {
      caseFormRef.value.resetFormState()
    }
    if (surgeryFormRef.value?.resetFormState) {
      surgeryFormRef.value.resetFormState()
    }
  }
})

// Use centralized API instance
import { patientApi } from '@/api'

// Sex options for patient
const sexOptions = [
  { value: 'male', label: t('forms.patientCase.sexOptions.male') },
  { value: 'female', label: t('forms.patientCase.sexOptions.female') },
  { value: 'diverse', label: t('forms.patientCase.sexOptions.diverse') },
  { value: 'not_disclosed', label: t('forms.patientCase.sexOptions.notDisclosed') },
]

// Computed properties
const canProceedFromStep1 = computed(() => {
  // All fields are optional for GDPR compliance
  return true
})

const canProceedFromStep2 = computed(() => {
  // Since we're not using v-model anymore, we'll validate this inside the form component
  // For now, always allow proceeding - the form will handle validation
  return true
})

// API functions
const nextStep = async () => {
  if (currentStep.value === 1) {
    await createPatient()
  } else if (currentStep.value === 2) {
    // Submit the case form externally
    if (caseFormRef.value) {
      await caseFormRef.value.submit()
    }
  }
  // Step 3 is handled directly by the embedded consultation component
}

const previousStep = () => {
  if (currentStep.value > 1) {
    // If we skipped surgery and are on step 4, go back to step 3 (surgery step)
    if (skipSurgery.value && currentStep.value === 4) {
      skipSurgery.value = false
      currentStep.value = 3
    } else {
      currentStep.value--
    }
  }
}

// API functions
const createPatient = async () => {
  if (!canProceedFromStep1.value) return

  // Show warning if external ID is missing
  if (!patientData.value.externalPatientId?.[0] || !patientData.value.externalPatientId[0]?.trim()) {
    showExternalIdWarning.value = true
  }

  isLoading.value = true
  try {
    // Filter out empty external IDs
    const filteredExternalIds = (patientData.value.externalPatientId || [])
      .map(id => (id || '').trim())
      .filter(id => id !== '')
    
    const patientDataToSend = {
      ...patientData.value,
      externalPatientId: filteredExternalIds.length > 0 ? filteredExternalIds : undefined
    }

    const response = await patientApi.createPatient({
      createPatientRequest: patientDataToSend
    })

    if (response.responseObject) {
      createdPatient.value = response.responseObject
      caseData.value.patient = response.responseObject.id || null
      currentStep.value = 2
      showExternalIdWarning.value = false
      notifierStore.notify(t('creationFlow.patientCreated'), 'success')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    let errorCode = ''

    if (error instanceof ResponseError) {
      const errorBody = await error.response.json()
      errorMessage = errorBody.message
      errorCode = errorBody.code
    }
    console.error('Error creating patient:', errorMessage)

    // Check if it's a duplicate external ID error
    if (errorCode === 'DUPLICATE_EXTERNAL_ID' || errorMessage.toLowerCase().includes('external')) {
      // Extract external ID from the first field
      duplicateExternalId.value = patientData.value.externalPatientId?.[0] || ''
      showDuplicatePatientDialog.value = true
      notifierStore.notify(t('alerts.patient.duplicateExternalId'), 'info')
    } else {
      notifierStore.notify(t('alerts.patient.creationFailed'), 'error')
    }
  } finally {
    isLoading.value = false
  }
}

// Search for patient by external ID and load it
const loadPatientByExternalId = async (externalId: string) => {
  isLoading.value = true
  try {
    // Get patient by external ID
    const response = await patientApi.getPatientByExternalId({ id: externalId })

    if (response.responseObject) {
      createdPatient.value = response.responseObject
      caseData.value.patient = response.responseObject.id || null
      currentStep.value = 2
      showDuplicatePatientDialog.value = false
      notifierStore.notify(t('creationFlow.patientLoaded'), 'success')
      return
    }

    notifierStore.notify(t('alerts.patient.notFound'), 'error')
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error searching for patient:', errorMessage)
    notifierStore.notify(t('alerts.patient.searchFailed'), 'error')
  } finally {
    isLoading.value = false
  }
}

// Handle user choice to continue with existing patient
const handleContinueWithExistingPatient = async () => {
  await loadPatientByExternalId(duplicateExternalId.value)
}

// Handle user choice to cancel and try again
const handleCancelDuplicateDialog = () => {
  showDuplicatePatientDialog.value = false
  // Keep user on step 1 to try again
}

// Handle case creation from embedded form
const handleCaseSubmit = (caseData: GetAllPatientCases200ResponseResponseObjectInner) => {
  createdCase.value = caseData
  currentStep.value = 3
  notifierStore.notify(t('creationFlow.caseCreated'), 'success')
}

// Handle case blueprint application - extract surgery blueprint ID if present
const handleCaseBlueprintApplied = (blueprint: Blueprint) => {
  console.log('Case blueprint applied:', blueprint.title, blueprint.content)

  if (blueprint.content) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = blueprint.content as any

    // Surgery blueprint ID is stored in content.surgeries
    let surgeryId = null

    if (content.surgeries) {
      if (Array.isArray(content.surgeries) && content.surgeries.length > 0) {
        // If surgeries is an array, take the first surgery blueprint ID
        surgeryId = content.surgeries[0]
      } else if (typeof content.surgeries === 'string') {
        // If surgeries is a string, use it directly
        surgeryId = content.surgeries
      }
    }

    if (surgeryId) {
      console.log('✅ Surgery blueprint ID found in case blueprint surgeries:', surgeryId)
      surgeryBlueprintId.value = surgeryId
    } else {
      console.log('❌ No surgery blueprint ID found in case blueprint content.surgeries:', content.surgeries)
      surgeryBlueprintId.value = null
    }
  } else {
    console.log('❌ Case blueprint has no content')
    surgeryBlueprintId.value = null
  }
}

const handleCaseCancel = () => {
  // Go back to step 1 or cancel the entire flow
  router.back()
}

// Handle surgery dialog events
const handleSurgerySubmit = async (surgery: Surgery) => {
  createdSurgery.value = surgery
  notifierStore.notify(t('creationFlow.surgeryCreated'), 'success')

  // Advance to step 4 immediately after surgery creation
  currentStep.value = 4

  // Show consultation blueprint selection dialog as part of step 4
  // This will pre-select blueprints from surgery (if any) and let user modify selection
  showConsultationBlueprintSelection.value = true
}

const handleSurgeryCancel = () => {
  // Go back to step 2 or cancel the entire flow
  router.back()
}



// Handle consultation blueprint IDs from surgery blueprint
const handleConsultationBlueprints = (consultationBlueprintIds: string[]) => {
  console.log('Received consultation blueprint IDs from surgery:', consultationBlueprintIds)
  surgeryBlueprintConsultations.value = consultationBlueprintIds
}

// Helper function to complete the flow
const completeCreationFlow = () => {
  // We're already on step 4, just mark as completed and navigate
  notifierStore.notify(t('creationFlow.flowCompleted'), 'success')

  // Navigate to the patient case landing view
  if (createdCase.value) {
    setTimeout(() => {
      notifierStore.notify(t('creationFlow.navigatingToCases'), 'info')
    }, 1000)

    setTimeout(() => {
      router.push({
        name: 'patientcaselanding',
        params: {
          caseId: createdCase.value!.id
        }
      })
    }, 2000)
  }
}

// Skip surgery and proceed directly to consultations
const handleSkipSurgery = () => {
  skipSurgery.value = true
  currentStep.value = 4
  notifierStore.notify(t('creationFlow.surgerySkipped'), 'info')
}

// Handle consultation blueprint selection
const handleConsultationBlueprintCancel = () => {
  showConsultationBlueprintSelection.value = false
  // Do not complete flow here - this is just for cancel button
}

// Watch for dialog close and complete flow if needed
watch(showConsultationBlueprintSelection, (newVal, oldVal) => {
  // If dialog was open and is now closed, and we're on step 4, complete the flow
  if (oldVal && !newVal && currentStep.value === 4) {
    completeCreationFlow()
  }
})

// Handle consultation dialog events  
const handleConsultationsSubmit = (consultations: Consultation[]) => {
  createdConsultations.value = consultations
  showConsultationBlueprintSelection.value = false

  notifierStore.notify(t('creationFlow.consultationsCreated', { count: consultations.length }), 'success')

  // Complete the flow with consultations created
  completeCreationFlow()
}



const cancel = () => {
  router.back()
}

// Generate direct access URLs
const getPatientUrl = () => {
  if (!createdPatient.value?.id) return ''
  const baseUrl = window.location.origin
  return `${baseUrl}/patient/${createdPatient.value.id}`
}

const getCaseUrl = () => {
  if (!createdCase.value?.id) return ''
  const baseUrl = window.location.origin
  return `${baseUrl}/case/${createdCase.value.id}`
}

// Open URLs in new tab
const openPatientUrl = () => {
  const url = getPatientUrl()
  if (url) {
    window.open(url, '_blank')
  }
}

const openCaseUrl = () => {
  const url = getCaseUrl()
  if (url) {
    window.open(url, '_blank')
  }
}

// Copy URLs to clipboard
const copyPatientUrl = () => {
  const url = getPatientUrl()
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      notifierStore.notify(t('creationFlow.urlCopied'), 'success')
    }).catch(() => {
      notifierStore.notify(t('creationFlow.urlCopyFailed'), 'error')
    })
  }
}

const copyCaseUrl = () => {
  const url = getCaseUrl()
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      notifierStore.notify(t('creationFlow.urlCopied'), 'success')
    }).catch(() => {
      notifierStore.notify(t('creationFlow.urlCopyFailed'), 'error')
    })
  }
}

// Add external ID to patient
const addExternalIdField = () => {
  if (!patientData.value.externalPatientId) {
    patientData.value.externalPatientId = []
  }
  patientData.value.externalPatientId.push('')
}

const removeExternalIdField = (index: number) => {
  if (patientData.value.externalPatientId && patientData.value.externalPatientId.length > 1) {
    patientData.value.externalPatientId.splice(index, 1)
  }
}

// Initialize data from route query if available
onMounted(async () => {
  const externalId = route.query.externalId as string
  if (externalId && externalId.trim() !== '') {
    if (!patientData.value.externalPatientId) {
      patientData.value.externalPatientId = []
    }
    patientData.value.externalPatientId[0] = externalId
  }

  // Check if patientId is provided in route query - skip to step 2
  const patientIdFromRoute = route.query.patientId as string
  if (patientIdFromRoute && patientIdFromRoute.trim() !== '') {
    try {
      // Fetch patient data
      const response = await patientApi.getPatientById({ id: patientIdFromRoute })
      if (response.responseObject) {
        createdPatient.value = response.responseObject
        caseData.value.patient = response.responseObject.id || null
        currentStep.value = 2
        notifierStore.notify(t('creationFlow.patientLoaded'), 'info')
      }
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred'
      if (error instanceof ResponseError) {
        errorMessage = (await error.response.json()).message
      }
      console.error('Error loading patient:', errorMessage)
      notifierStore.notify(t('alerts.patient.loadFailed'), 'error')
    }
  }
})
</script>

<template>
  <v-container class="w-100">
    <v-row justify="center">
      <v-col cols="12" sm="12" md="12" lg="6" xl="6">
        <v-card>
          <v-card-title class="text-h4">{{ t('creationFlow.title') }}</v-card-title>

          <!-- Stepper -->
          <v-stepper
                     v-model="currentStep"
                     hide-actions
                     class="mb-4"
                     vertical>

            <v-stepper-header>
              <v-stepper-item
                              :complete="currentStep > 1"
                              :value="1"
                              :title="t('creationFlow.step1Title')"></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
                              :complete="currentStep > 2"
                              :value="2"
                              :title="t('creationFlow.step2Title')"></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
                              :complete="currentStep > 3"
                              :value="3"
                              :title="t('creationFlow.step3Title')"></v-stepper-item>
              <v-divider></v-divider>
              <v-stepper-item
                              :complete="currentStep > 4"
                              :value="4"
                              :title="t('creationFlow.step4Title')"></v-stepper-item>
            </v-stepper-header>

            <v-stepper-window v-model="currentStep">
              <!-- Step 1: Create Patient -->
              <v-stepper-window-item :value="1">
                <v-card>
                  <v-card-title>{{ t('creationFlow.step1Title') }}</v-card-title>
                  <v-card-text>
                    <v-alert
                      type="info"
                      variant="tonal"
                      class="mb-4"
                      density="compact"
                    >
                      {{ t('alerts.patient.optionalFieldsInfo') }}
                    </v-alert>
                    
                    <v-alert
                      v-if="showExternalIdWarning"
                      type="warning"
                      variant="tonal"
                      class="mb-4"
                      closable
                      @click:close="showExternalIdWarning = false"
                    >
                      {{ t('alerts.patient.noExternalIdWarning') }}
                    </v-alert>
                    
                    <v-form>
                      <!-- External Patient IDs -->
                      <div v-for="(externalId, index) in patientData.externalPatientId || []" :key="index" class="mb-2">
                        <v-row align="center">
                          <v-col cols="10">
                            <v-text-field
                                          v-model="patientData.externalPatientId![index]"
                                          :label="t('forms.patient.externalId') + (index > 0 ? ' ' + (index + 1) : '')"
                                          :hint="index === 0 ? t('forms.externalIdHint') : ''"
                                          :persistent-hint="index === 0"></v-text-field>
                          </v-col>
                          <v-col cols="2">
                            <v-btn
                                   v-if="index === (patientData.externalPatientId?.length ?? 0) - 1"
                                   @click="addExternalIdField"
                                   icon="mdi-plus"
                                   size="small"
                                   color="primary"
                                   variant="text"
                                   :title="t('forms.patient.addExternalId')"></v-btn>
                            <v-btn
                                   v-if="index > 0"
                                   @click="removeExternalIdField(index)"
                                   icon="mdi-minus"
                                   size="small"
                                   color="error"
                                   variant="text"
                                   :title="t('forms.patient.removeExternalId')"></v-btn>
                          </v-col>
                        </v-row>
                      </div>

                      <v-select
                                v-model="patientData.sex"
                                :label="t('forms.sex')"
                                :items="sexOptions"
                                item-value="value"
                                item-title="label"
                                clearable></v-select>
                    </v-form>
                  </v-card-text>
                </v-card>
              </v-stepper-window-item>

              <!-- Step 2: Create Case -->
              <v-stepper-window-item :value="2">
                <v-alert v-if="createdPatient" type="success" class="mb-4">
                  {{ t('creationFlow.patientCreated') }} - ID: {{ createdPatient.id }}
                </v-alert>

                <!-- Embedded Case Form -->
                <PatientCaseCreateEditForm
                                           ref="caseFormRef"
                                           v-if="createdPatient"
                                           :patientId="createdPatient.id!"
                                           :createNewCase="true"
                                           :modelValue="caseData"
                                           :showButtons="false"
                                           @submit="handleCaseSubmit"
                                           @cancel="handleCaseCancel"
                                           @blueprint-applied="handleCaseBlueprintApplied" />
              </v-stepper-window-item>

              <!-- Step 3: Create Surgery -->
              <v-stepper-window-item :value="3">
                <v-alert v-if="createdCase" type="success" class="mb-4">
                  {{ t('creationFlow.caseCreated') }} - ID: {{ createdCase.id }}
                </v-alert>

                <v-alert v-if="surgeryBlueprintId" type="info" class="mb-4">
                  {{ t('creationFlow.surgeryBlueprintPrefilled') }}
                </v-alert>

                <v-alert type="info" variant="tonal" class="mb-4" density="compact">
                  {{ t('creationFlow.surgeryOptionalInfo') }}
                </v-alert>

                <!-- Embedded Surgery Form -->
                <CreateEditSurgeryDialog
                                         v-if="createdCase && createdCase.id"
                                         :patientCaseId="createdCase.id"
                                         :patient-case-data="createdCase"
                                         :surgery-blueprint-ids="surgeryBlueprintId ? [surgeryBlueprintId] : undefined"
                                         @submit="handleSurgerySubmit"
                                         @cancel="handleSurgeryCancel"
                                         @consultation-blueprints="handleConsultationBlueprints" />

                <!-- Skip Surgery Action -->
                <v-card-actions class="justify-center pa-4 mt-4">
                  <v-btn
                         @click="handleSkipSurgery"
                         color="warning"
                         variant="outlined">
                    {{ t('creationFlow.skipSurgery') }}
                  </v-btn>
                </v-card-actions>
              </v-stepper-window-item>

              <!-- Step 4: Create Consultation -->
              <v-stepper-window-item :value="4">
                <v-alert v-if="createdSurgery" type="success" class="mb-4">
                  {{ t('creationFlow.surgeryCreated') }} - ID: {{ createdSurgery.id }}
                </v-alert>

                <v-alert v-if="skipSurgery" type="info" class="mb-4">
                  {{ t('creationFlow.surgerySkippedInfo') }}
                </v-alert>

                <!-- Consultation Creation Status -->
                <v-card>
                  <v-card-title>{{ t('creationFlow.step4Title') }}</v-card-title>
                  <v-card-text>
                    <div v-if="showConsultationBlueprintSelection">
                      <p class="mb-4">{{ t('creationFlow.consultationBlueprintSelectionActive') }}</p>
                      <v-alert type="info" class="mb-4">
                        {{ t('creationFlow.consultationBlueprintSelectionHint') }}
                      </v-alert>
                    </div>

                    <div v-else-if="createdConsultations.length > 0">
                      <v-alert type="success" class="mb-4">
                        {{ t('creationFlow.consultationsCreated', { count: createdConsultations.length }) }}
                      </v-alert>
                      <p>{{ t('creationFlow.consultationsCreatedMessage') }}</p>
                    </div>

                    <div v-else>
                      <v-alert type="info" class="mb-4">
                        {{ t('creationFlow.noConsultationsCreated') }}
                      </v-alert>
                      <p>{{ t('creationFlow.noConsultationsCreatedMessage') }}</p>
                    </div>
                  </v-card-text>
                </v-card>

                <!-- Direct Access URLs -->
                <v-card class="mt-4">
                  <v-card-title>{{ t('creationFlow.directAccessUrls') }}</v-card-title>
                  <v-card-text>
                    <div v-if="createdPatient" class="mb-4">
                      <p class="mb-2 font-weight-bold">{{ t('creationFlow.patientUrl') }}</p>
                      <v-text-field
                        :value="getPatientUrl()"
                        readonly
                        variant="outlined"
                        density="compact"
                        @click="copyPatientUrl"
                        class="cursor-pointer"
                      >
                        <template #append-inner>
                          <v-btn
                            icon="mdi-content-copy"
                            size="x-small"
                            variant="text"
                            @click.stop="copyPatientUrl"
                            :title="t('buttons.copy')"
                            class="mr-2"
                          ></v-btn>
                          <v-btn
                            icon="mdi-open-in-new"
                            size="x-small"
                            variant="text"
                            @click.stop="openPatientUrl"
                            :title="t('buttons.open')"
                          ></v-btn>
                        </template>
                      </v-text-field>
                    </div>

                    <div v-if="createdCase">
                      <p class="mb-2 font-weight-bold">{{ t('creationFlow.caseUrl') }}</p>
                      <v-text-field
                        :value="getCaseUrl()"
                        readonly
                        variant="outlined"
                        density="compact"
                        @click="copyCaseUrl"
                        class="cursor-pointer"
                      >
                        <template #append-inner>
                          <v-btn
                            icon="mdi-content-copy"
                            size="x-small"
                            variant="text"
                            @click.stop="copyCaseUrl"
                            :title="t('buttons.copy')"
                            class="mr-2"
                          ></v-btn>
                          <v-btn
                            icon="mdi-open-in-new"
                            size="x-small"
                            variant="text"
                            @click.stop="openCaseUrl"
                            :title="t('buttons.open')"
                          ></v-btn>
                        </template>
                      </v-text-field>
                    </div>
                  </v-card-text>
                </v-card>
              </v-stepper-window-item>
            </v-stepper-window>
          </v-stepper>

          <!-- Consultation Blueprint Selection Dialog -->
          <ConsultationBlueprintSelectionDialog
                                                v-if="createdCase && createdCase.patient && createdCase.id"
                                                v-model="selectedConsultationBlueprints"
                                                v-model:show="showConsultationBlueprintSelection"
                                                :surgery-date="createdSurgery?.surgeryDate || undefined"
                                                :patient-id="createdCase.patient.id || ''"
                                                :case-id="createdCase.id"
                                                :pre-selected-blueprint-ids="surgeryBlueprintConsultations"
                                                @consultations-created="handleConsultationsSubmit"
                                                @cancel="handleConsultationBlueprintCancel" />

          <!-- Batch Consultation Creation Dialog -->
          <CreateBatchConsultationsDialog
                                          v-if="createdCase && createdCase.patient && createdCase.id"
                                          :show="false"
                                          :consultation-blueprint-ids="selectedConsultationBlueprints.map(b => b.id!)"
                                          :patient-id="createdCase.patient.id || ''"
                                          :case-id="createdCase.id"
                                          :reference-date="createdSurgery?.surgeryDate || undefined"
                                          @submit="handleConsultationsSubmit"
                                          @cancel="() => { }" />

          <!-- Duplicate Patient Dialog -->
          <v-dialog v-model="showDuplicatePatientDialog" max-width="400">
            <v-card>
              <v-card-title>{{ t('creationFlow.duplicatePatientTitle') }}</v-card-title>
              <v-card-text>
                <p class="mb-4">
                  {{ t('creationFlow.duplicatePatientMessage', { externalId: duplicateExternalId }) }}
                </p>
                <v-alert type="info">
                  {{ t('creationFlow.duplicatePatientQuestion') }}
                </v-alert>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                       @click="handleCancelDuplicateDialog"
                       color="grey"
                       variant="outlined">
                  {{ t('buttons.no') }}
                </v-btn>
                <v-btn
                       @click="handleContinueWithExistingPatient"
                       color="primary"
                       variant="elevated"
                       :loading="isLoading">
                  {{ t('buttons.yes') }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <!-- Action buttons -->
          <v-card-actions class="justify-space-between pa-4">
            <v-btn
                   @click="cancel"
                   color="grey"
                   variant="outlined">
              {{ t('buttons.cancel') }}
            </v-btn>

            <div class="d-flex gap-2">
              <v-btn
                     v-if="currentStep >= 2 && currentStep <= 4"
                     @click="previousStep"
                     color="primary"
                     variant="outlined">
                {{ t('buttons.previous') }}
              </v-btn>

              <v-btn
                     v-if="currentStep <= 2"
                     @click="nextStep"
                     color="primary"
                     variant="elevated"
                     :loading="isLoading"
                     :disabled="(currentStep === 1 && !canProceedFromStep1) ||
                      (currentStep === 2 && !canProceedFromStep2)">
                {{ t('buttons.next') }}
              </v-btn>
            </div>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
