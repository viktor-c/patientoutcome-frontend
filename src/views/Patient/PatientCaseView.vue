<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  type PatientCase,
  type Surgery,
  type Consultation,
  type Blueprint,
  ResponseError,
  type GetAllPatientCases200ResponseResponseObjectInner
} from '@/api'

import PatientCaseCreateEditForm from '@/components/forms/PatientCaseCreateEditForm.vue'
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'
import ConsultationBlueprintSelectionDialog from '@/components/dialogs/ConsultationBlueprintSelectionDialog.vue'
import CaseSeparatedView from '@/components/cases/CaseSeparatedView.vue'
import CaseChronologicalView from '@/components/cases/CaseChronologicalView.vue'

// Importing the notifier store for notifications
import { useNotifierStore } from '@/stores/'
const notifierStore = useNotifierStore()

// Extended type for UI purposes
interface ExtendedPatientCase extends GetAllPatientCases200ResponseResponseObjectInner {
  showConsultations?: boolean
  displayMode?: 'separated' | 'chronological'
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Accept patientId as an optional prop to avoid "extraneous non-props attributes" warnings
const props = defineProps<{
  patientId?: string | null
}>()

// Get the patient ID either from props (if parent passed it) or from the route params
const patientId = (props.patientId as string) || (route.params.patientId as string)
// Data for managing cases
const cases = ref<ExtendedPatientCase[]>([])
const selectedCase = ref<PatientCase | null>(null)
const createNewCase = ref(false)
// Controls visibility of the create/edit case dialog
const caseDialogVisible = ref(false)

// Blueprint creation flow state
const showCreateFlow = ref(false)
const currentFlowStep = ref(1) // 1: Case, 2: Surgery, 3: Consultation Selection, 4: Consultation Creation
const createdCase = ref<GetAllPatientCases200ResponseResponseObjectInner | null>(null)
const createdSurgery = ref<Surgery | null>(null)
const createdConsultations = ref<Consultation[]>([])

// Blueprint-related state
const selectedConsultationBlueprints = ref<Blueprint[]>([])
const surgeryBlueprintConsultations = ref<string[]>([])

// Use centralized API instances
import { patientCaseApi, consultationApi } from '@/api'

// Fetch all cases for the patient
const fetchCases = async () => {
  try {
    const response = await patientCaseApi.getAllPatientCases({ patientId })
    if (response.responseObject) {
      cases.value = response.responseObject.map((caseItem) => ({
        ...caseItem,
        showConsultations: false, // Track whether consultations are visible
        displayMode: 'separated' as const, // Default display mode
      }))
      console.log('Cases fetched successfully:', response.responseObject)
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching cases:', errorMessage)
    notifierStore.notify(t('alerts.fetchCasesFailed'), 'error')
  }
}

// Fetch consultations for a specific case
const fetchConsultations = async (caseItem: ExtendedPatientCase) => {
  try {
    if (!caseItem.id) return
    const response = await consultationApi.getAllConsultations({ caseId: caseItem.id })
    caseItem.consultations = response.responseObject || []
    console.debug('Consultations fetched successfully:', response.responseObject)
    console.log('Consultations fetched successfully for case:', caseItem.id)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching consultations:', errorMessage)
    notifierStore.notify(t('alerts.consultations.fetchFailed'), 'error')
  }
}

// Toggle consultations visibility for a case
const toggleConsultations = async (caseItem: ExtendedPatientCase) => {
  if (!caseItem.showConsultations) {
    if (!caseItem.consultations || caseItem.consultations.length === 0) {
      await fetchConsultations(caseItem)
    }
  }
  caseItem.showConsultations = !caseItem.showConsultations
}

// when clicking the pencil of a case, show the case to edit, or toggle the form if we already show it
const clickEditCase = (caseItem: ExtendedPatientCase) => {
  if (!caseItem) return
  // if we are already editing a case, toggle the edit mode
  if (selectedCase.value && selectedCase.value.id === caseItem.id) {
    createNewCase.value = false
    selectedCase.value = null
    return
  }
  // Convert extended case to PatientCase for editing
  const patientCase: PatientCase = {
    id: caseItem.id,
    externalId: caseItem.externalId,
    createdAt: caseItem.createdAt,
    updatedAt: caseItem.updatedAt,
    patient: typeof caseItem.patient === 'string' ? caseItem.patient : caseItem.patient?.id || null,
    mainDiagnosis: caseItem.mainDiagnosis,
    studyDiagnosis: caseItem.studyDiagnosis,
    mainDiagnosisICD10: caseItem.mainDiagnosisICD10,
    studyDiagnosisICD10: caseItem.studyDiagnosisICD10,
    otherDiagnosis: caseItem.otherDiagnosis,
    otherDiagnosisICD10: caseItem.otherDiagnosisICD10,
    surgeries: caseItem.surgeries || [],
    supervisors: caseItem.supervisors || [],
    notes: caseItem.notes || [],
    medicalHistory: caseItem.medicalHistory,
  }
  selectedCase.value = { ...patientCase }
  createNewCase.value = false
  // Open the dialog for editing
  caseDialogVisible.value = true
}

// Delete a case
const deleteCase = async (caseId: string) => {
  try {
    await patientCaseApi.deletePatientCaseById({ patientId, caseId })
    console.log('Case deleted successfully:', caseId)
    notifierStore.notify(t('alerts.case.deleted'), 'success')
    fetchCases() // Refresh the list
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error deleting case:', errorMessage)
    // Show an alert if the deletion fails
    notifierStore.notify(t('alerts.case.deletionFailed'), 'error')
  }
}

// Toggle display mode between separated and chronological
const toggleDisplayMode = (caseItem: ExtendedPatientCase) => {
  if (caseItem.displayMode === 'separated') {
    caseItem.displayMode = 'chronological'
  } else {
    caseItem.displayMode = 'separated'
  }
}

// Start blueprint creation flow
const startCreateFlow = () => {
  createNewCase.value = false
  selectedCase.value = null
  showCreateFlow.value = true
  currentFlowStep.value = 1
  // Reset flow state
  createdCase.value = null
  createdSurgery.value = null
  createdConsultations.value = []
  selectedConsultationBlueprints.value = []
}

// Handle case creation from blueprint flow
const handleCaseSubmit = (caseData: GetAllPatientCases200ResponseResponseObjectInner) => {
  createdCase.value = caseData
  currentFlowStep.value = 2
  notifierStore.notify(t('creationFlow.caseCreated'), 'success')
}

// Handle surgery creation from blueprint flow
const handleSurgerySubmit = async (surgery: Surgery) => {
  createdSurgery.value = surgery
  notifierStore.notify(t('creationFlow.surgeryCreated'), 'success')

  // Move to next step (consultation blueprint selection)
  currentFlowStep.value = 3
}

// Handle consultation blueprint selection cancel in flow
const handleConsultationBlueprintCancelInFlow = () => {
  // Move to completion step
  currentFlowStep.value = 4
}

// Handle consultations created in flow
const handleConsultationsCreatedInFlow = (consultations: Consultation[]) => {
  console.log('Consultations created in flow:', consultations)
  createdConsultations.value = consultations

  // Move to completion step
  currentFlowStep.value = 4

  notifierStore.notify(t('consultation.creationCompleteMessage', { count: consultations.length }), 'success')
}

// Handle surgery dialog cancel
const handleSurgeryCancel = () => {
  // Go back to previous step
  currentFlowStep.value = 2
}

// Handle consultation blueprint IDs from surgery blueprint
const handleConsultationBlueprints = (consultationBlueprintIds: string[]) => {
  console.log('Received consultation blueprint IDs from surgery:', consultationBlueprintIds)
  surgeryBlueprintConsultations.value = consultationBlueprintIds
}

// Handle case form cancel
const handleCaseCancel = () => {
  showCreateFlow.value = false
  currentFlowStep.value = 1
}

// Reference to the case form for external submission
const caseFormRef = ref<InstanceType<typeof PatientCaseCreateEditForm> | null>(null)

// Submit case form externally
const submitCaseForm = async () => {
  if (caseFormRef.value) {
    await caseFormRef.value.submit()
  }
}

// Open the creation flow for a new case (preselect patient)
const openCreateCase = () => {
  // Navigate to the centralized creation flow and pass patientId as query param
  router.push({ name: 'creation-flow', query: { patientId } })
}

// Handlers for dialog submit/cancel to close modal and reset state
const handleDialogSubmit = async () => {
  selectedCase.value = null
  createNewCase.value = false
  caseDialogVisible.value = false
  await fetchCases()
}

const handleDialogCancel = () => {
  selectedCase.value = null
  createNewCase.value = false
  caseDialogVisible.value = false
}

// Reference to the surgery form for external submission
const surgeryFormRef = ref<InstanceType<typeof CreateEditSurgeryDialog> | null>(null)
const consultationFormRef = ref<InstanceType<typeof ConsultationBlueprintSelectionDialog> | null>(null)

// Submit surgery form externally
const submitSurgeryForm = async () => {
  if (surgeryFormRef.value) {
    await surgeryFormRef.value.submit()
  }
}

// Submit consultation form externally
const submitConsultationForm = async () => {
  if (consultationFormRef.value) {
    await consultationFormRef.value.submit()
  }
}

// Watch currentFlowStep to reset form errors when navigating between steps
watch(currentFlowStep, (newStep, oldStep) => {
  if (newStep !== oldStep) {
    // Reset form state when moving to a different step
    if (caseFormRef.value?.resetFormState) {
      caseFormRef.value.resetFormState()
    }
    if (surgeryFormRef.value?.resetFormState) {
      surgeryFormRef.value.resetFormState()
    }
    if (consultationFormRef.value?.resetFormState) {
      consultationFormRef.value.resetFormState()
    }
  }
})

// Complete the creation flow and navigate to the newly created case
const completeCreateFlow = () => {
  showCreateFlow.value = false
  
  // Reset flow state
  const caseIdToNavigateTo = createdCase.value?.id
  currentFlowStep.value = 1
  createdCase.value = null
  createdSurgery.value = null
  createdConsultations.value = []
  selectedConsultationBlueprints.value = []
  
  notifierStore.notify(t('creationFlow.flowCompleted'), 'success')
  
  // Auto-redirect to the newly created case
  if (caseIdToNavigateTo) {
    setTimeout(() => {
      router.push({
        name: 'patientcaselanding',
        params: { caseId: caseIdToNavigateTo }
      })
    }, 500) // Small delay to show success message
  } else {
    fetchCases() // Refresh the cases list if navigation didn't happen
  }
}

// Fetch cases on component mount
onMounted(() => {
  if (!patientId) {
    console.error('No patient ID provided.')
    notifierStore.notify(t('alerts.patient.noPatientId'), 'error')
    return
  }
  // Fetch cases for the patient
  fetchCases()
})
</script>

<template>
  <v-table hover>
    <thead>
      <tr>
        <th class="text-left">{{ t('cases.table.mainDiagnosis') }}</th>
        <th class="text-left">{{ t('cases.table.id') }}</th>
        <th class="text-left">{{ t('cases.table.actions') }}</th>
      </tr>
    </thead>
    <tbody>
      <template v-for="caseItem in cases" :key="caseItem.id">
        <tr>
          <td @click="toggleConsultations(caseItem)">
            <v-icon :icon="caseItem.showConsultations ? 'mdi-chevron-down' : 'mdi-chevron-right'"></v-icon>
            {{ caseItem.mainDiagnosis }}
          </td>
          <td @click="toggleConsultations(caseItem)">{{ caseItem.id }}</td>

          <td>
            <v-btn size="small" variant="plain" color="primary" @click="clickEditCase(caseItem)"> <v-icon
                      icon="mdi-pencil"></v-icon>{{ t('buttons.case') }} </v-btn>
            <v-dialog max-width="500">
              <template v-slot:activator="{ props: activatorProps }">
                <v-btn class="text-right" v-bind="activatorProps" size="small" variant="plain" color="error"> <v-icon
                          icon="mdi-trash-can"></v-icon>{{ t('buttons.case') }} </v-btn>
              </template>

              <template v-slot:default="{ isActive }">
                <v-card title="Dialog">
                  <v-card-text>
                    {{ t('alerts.case.confirmDelete', { caseId: caseItem.id }) }}
                    <v-divider></v-divider>
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="error" :text="t('buttons.confirmDelete')"
                           @click="caseItem.id && (isActive.value = false, deleteCase(caseItem.id))"></v-btn>
                    <v-btn color="primary" :text="t('buttons.abortDeletion')" @click="isActive.value = false"></v-btn>
                  </v-card-actions>
                </v-card>
              </template>
            </v-dialog>
          </td>
        </tr>

        <!-- Render consultations and surgeries based on display mode -->
        <template v-if="caseItem.showConsultations">
          <!-- Display Mode Toggle -->
          <tr>
            <td colspan="3" class="pa-4">
              <div class="d-flex align-center">
                <span class="mr-4 font-weight-medium">{{ t('cases.displayMode') }}:</span>
                <v-btn-toggle
                              v-model="caseItem.displayMode"
                              color="primary"
                              size="small"
                              mandatory
                              @update:model-value="toggleDisplayMode(caseItem)">
                  <v-btn value="separated" size="small">
                    <v-icon icon="mdi-view-list"></v-icon>
                    {{ t('cases.separated') }}
                  </v-btn>
                  <v-btn value="chronological" size="small">
                    <v-icon icon="mdi-calendar-clock"></v-icon>
                    {{ t('cases.chronological') }}
                  </v-btn>
                </v-btn-toggle>
              </div>
            </td>
          </tr>

          <!-- Use component based on display mode -->
          <CaseSeparatedView
                             v-if="caseItem.displayMode === 'separated'"
                             :case-item="caseItem"
                             :patient-id="patientId"
                             @refresh-cases="fetchCases" />

          <CaseChronologicalView
                                 v-else-if="caseItem.displayMode === 'chronological'"
                                 :case-item="caseItem"
                                 :patient-id="patientId"
                                 @refresh-cases="fetchCases" />
        </template>
      </template>

      <tr class="text-center">
        <td colspan="3">
          <div class="d-flex justify-center gap-4 my-2">
            <v-btn
                   v-if="!createNewCase && !showCreateFlow"
                   prepend-icon="mdi-plus"
                   color="success"
                   @click="openCreateCase">
              {{ t('buttons.createNewCase') }}
            </v-btn>

            <v-btn
                   v-if="!createNewCase && !showCreateFlow"
                   prepend-icon="mdi-creation"
                   color="primary"
                   variant="outlined"
                   @click="startCreateFlow">
              {{ t('buttons.startCreationFlow') }}
            </v-btn>
          </div>
        </td>
      </tr>
    </tbody>
  </v-table>

  <!-- Create or Edit Case Form (modal) -->
  <v-dialog v-model="caseDialogVisible" max-width="900px">
    <v-card>
      <v-card-text>
        <PatientCaseCreateEditForm
                                   :selectedCase="selectedCase"
                                   :createNewCase="createNewCase"
                                   :patientId="patientId"
                                   :showButtons="true"
                                   @submit="handleDialogSubmit"
                                   @cancel="handleDialogCancel" />
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Blueprint Creation Flow -->
  <v-dialog v-model="showCreateFlow" max-width="1200px">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-creation</v-icon>
        {{ t('creationFlow.title') }}
      </v-card-title>

      <v-stepper v-model="currentFlowStep" hide-actions>
        <v-stepper-header>
          <v-stepper-item
                          :complete="currentFlowStep > 1"
                          :value="1"
                          :title="t('creationFlow.step2Title')"></v-stepper-item>

          <v-divider></v-divider>

          <v-stepper-item
                          :complete="currentFlowStep > 2"
                          :value="2"
                          :title="t('creationFlow.step3Title')"></v-stepper-item>

          <v-divider></v-divider>

          <v-stepper-item
                          :complete="currentFlowStep > 3"
                          :value="3"
                          :title="t('creationFlow.step4Title')"></v-stepper-item>

          <v-divider></v-divider>

          <v-stepper-item
                          :complete="currentFlowStep > 4"
                          :value="4"
                          :title="t('creationFlow.completedTitle')"></v-stepper-item>
        </v-stepper-header>

        <v-stepper-window v-model="currentFlowStep">
          <!-- Step 1: Create Case -->
          <v-stepper-window-item :value="1">
            <PatientCaseCreateEditForm
                                       ref="caseFormRef"
                                       :selectedCase="null"
                                       :createNewCase="true"
                                       :patientId="patientId"
                                       :showButtons="false"
                                       @submit="handleCaseSubmit"
                                       @cancel="handleCaseCancel" />
          </v-stepper-window-item>

          <!-- Step 2: Create Surgery -->
          <v-stepper-window-item :value="2">
            <v-alert v-if="createdCase" type="success" class="mb-4">
              {{ t('creationFlow.caseCreated') }} - ID: {{ createdCase.id }}
            </v-alert>

            <CreateEditSurgeryDialog
                                     ref="surgeryFormRef"
                                     v-if="createdCase && createdCase.id"
                                     :patientCaseId="createdCase.id"
                                     :patient-case-data="createdCase"
                                     :showButtons="false"
                                     @submit="handleSurgerySubmit"
                                     @cancel="handleSurgeryCancel"
                                     @consultation-blueprints="handleConsultationBlueprints" />
          </v-stepper-window-item>

          <!-- Step 3: Consultation Blueprint Selection -->
          <v-stepper-window-item :value="3">
            <v-alert v-if="createdSurgery" type="success" class="mb-4">
              {{ t('creationFlow.surgeryCreated') }} - ID: {{ createdSurgery.id }}
            </v-alert>

            <ConsultationBlueprintSelectionDialog
                                                  ref="consultationFormRef"
                                                  v-if="createdCase && createdCase.id"
                                                  v-model="selectedConsultationBlueprints"
                                                  :surgery-date="createdSurgery?.surgeryDate || undefined"
                                                  :patient-id="patientId"
                                                  :case-id="createdCase.id!"
                                                  :pre-selected-blueprint-ids="surgeryBlueprintConsultations"
                                                  :showButtons="false"
                                                  @consultations-created="handleConsultationsCreatedInFlow"
                                                  @cancel="handleConsultationBlueprintCancelInFlow" />
          </v-stepper-window-item>

          <!-- Step 4: Summary/Completion -->
          <v-stepper-window-item :value="4">
            <v-alert v-if="createdSurgery" type="success" class="mb-4">
              {{ t('creationFlow.surgeryCreated') }} - ID: {{ createdSurgery.id }}
            </v-alert>

            <v-card>
              <v-card-text>
                <h3>{{ t('creationFlow.flowCompleted') }}</h3>
                <p v-if="createdConsultations.length > 0">
                  {{ t('creationFlow.consultationsCreated', { count: createdConsultations.length }) }}
                </p>
                <p v-else>
                  {{ t('consultation.noConsultationsCreated') }}
                </p>
              </v-card-text>
            </v-card>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>

      <!-- Flow Action Buttons - Outside stepper but inside card -->
      <v-card-actions class="d-flex justify-space-between pa-4">
        <v-btn
               color="grey"
               variant="outlined"
               @click="handleCaseCancel">
          {{ t('buttons.cancel') }}
        </v-btn>

        <div class="d-flex gap-2">
          <v-btn
                 v-if="currentFlowStep === 1"
                 color="primary"
                 variant="elevated"
                 @click="submitCaseForm">
            {{ t('buttons.createAndNext') }}
          </v-btn>

          <v-btn
                 v-if="currentFlowStep === 2"
                 color="primary"
                 variant="elevated"
                 @click="submitSurgeryForm">
            {{ t('buttons.createAndNext') }}
          </v-btn>

          <v-btn
                 v-if="currentFlowStep === 3"
                 color="primary"
                 variant="elevated"
                 @click="submitConsultationForm">
            {{ t('buttons.finish') }}
          </v-btn>

          <v-btn
                 v-if="currentFlowStep === 4"
                 color="success"
                 variant="elevated"
                 @click="completeCreateFlow">
            {{ t('buttons.finish') }}
          </v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>


</template>

<style scoped>
.v-btn {
  text-transform: none !important;
}

.gap-4 {
  gap: 16px;
}

.gap-2 {
  gap: 8px;
}

/* Ensure dialog buttons are properly positioned */
.v-dialog .v-card .v-card-actions {
  position: sticky;
  bottom: 0;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  z-index: 1;
}

/* Ensure stepper content doesn't overflow */
.v-stepper-window {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
