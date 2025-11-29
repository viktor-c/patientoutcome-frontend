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
import CreateBatchConsultationsDialog from '@/components/dialogs/CreateBatchConsultationsDialog.vue'
import ConsultationBlueprintSelectionDialog from '@/components/dialogs/ConsultationBlueprintSelectionDialog.vue'
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'
import PatientCaseCreateEditForm from '@/components/forms/PatientCaseCreateEditForm.vue'

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

const caseData = ref<CreateCaseSchema>({
  patient: '',
  externalId: '',
  mainDiagnosis: [''],
  mainDiagnosisICD10: [''],
  otherDiagnosis: [''],
  otherDiagnosisICD10: [''],
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

// Consultation blueprint management
const selectedConsultationBlueprints = ref<Blueprint[]>([])
const showConsultationBlueprintSelection = ref(false)
const surgeryBlueprintConsultations = ref<string[]>([])

// Surgery blueprint management
const surgeryBlueprintId = ref<string | null>(null)

// Form refs for external submission
const caseFormRef = ref<InstanceType<typeof PatientCaseCreateEditForm> | null>(null)

// Loading states
const isLoading = ref(false)

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
  return patientData.value.externalPatientId[0].trim() !== ''
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
    currentStep.value--
  }
}

// API functions
const createPatient = async () => {
  if (!canProceedFromStep1.value) return

  isLoading.value = true
  try {
    const response = await patientApi.createPatient({
      createPatientRequest: patientData.value
    })

    if (response.responseObject) {
      createdPatient.value = response.responseObject
      caseData.value.patient = response.responseObject.id || null
      currentStep.value = 2
      notifierStore.notify(t('creationFlow.patientCreated'), 'success')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error creating patient:', errorMessage)
    notifierStore.notify(t('alerts.patient.creationFailed'), 'error')
  } finally {
    isLoading.value = false
  }
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

  // Navigate to the patient's cases view
  if (createdPatient.value) {
    setTimeout(() => {
      notifierStore.notify(t('creationFlow.navigatingToCases'), 'info')
    }, 1000)

    setTimeout(() => {
      router.push({
        name: 'cases',
        params: {
          patientId: createdPatient.value!.id
        }
      })
    }, 2000)
  }
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

// Add external ID to patient
const addExternalId = () => {
  patientData.value.externalPatientId.push('')
}

const removeExternalId = (index: number) => {
  if (patientData.value.externalPatientId.length > 1) {
    patientData.value.externalPatientId.splice(index, 1)
  }
}

// Initialize data from route query if available
onMounted(() => {
  const externalId = route.query.externalId as string
  if (externalId && externalId.trim() !== '') {
    patientData.value.externalPatientId[0] = externalId
  }
})
</script>

<template>
  <v-container class="w-100">
    <v-card>
      <v-card-title class="text-h4">{{ t('creationFlow.title') }}</v-card-title>

      <!-- Stepper -->
      <v-stepper
                 v-model="currentStep"
                 hide-actions
                 class="mb-4">

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
                <v-form>
                  <!-- External Patient IDs -->
                  <div v-for="(externalId, index) in patientData.externalPatientId" :key="index" class="mb-2">
                    <v-row align="center">
                      <v-col cols="10">
                        <v-text-field
                                      v-model="patientData.externalPatientId[index]"
                                      :label="t('forms.patient.externalId') + (index > 0 ? ' ' + (index + 1) : '')"
                                      :rules="index === 0 ? [v => !!v || t('forms.patient.externalIdRequired')] : []"
                                      required></v-text-field>
                      </v-col>
                      <v-col cols="2">
                        <v-btn
                               v-if="index === patientData.externalPatientId.length - 1"
                               @click="addExternalId"
                               icon="mdi-plus"
                               size="small"
                               color="primary"
                               variant="text"
                               :title="t('forms.patient.addExternalId')"></v-btn>
                        <v-btn
                               v-if="index > 0"
                               @click="removeExternalId(index)"
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
                            :label="t('forms.patient.sex')"
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

            <!-- Embedded Surgery Form -->
            <CreateEditSurgeryDialog
                                     v-if="createdCase && createdCase.id"
                                     :patientCaseId="createdCase.id"
                                     :patient-case-data="createdCase"
                                     :surgery-blueprint-ids="surgeryBlueprintId ? [surgeryBlueprintId] : undefined"
                                     @submit="handleSurgerySubmit"
                                     @cancel="handleSurgeryCancel"
                                     @consultation-blueprints="handleConsultationBlueprints" />
          </v-stepper-window-item>

          <!-- Step 4: Create Consultation -->
          <v-stepper-window-item :value="4">
            <v-alert v-if="createdSurgery" type="success" class="mb-4">
              {{ t('creationFlow.surgeryCreated') }} - ID: {{ createdSurgery.id }}
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
  </v-container>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>
