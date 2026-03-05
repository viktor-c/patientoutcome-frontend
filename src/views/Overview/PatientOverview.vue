<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import { useNotifierStore } from '@/stores/notifierStore'

import {
  ResponseError,
  type Patient,
  type Surgery,
  type GetAllPatientCases200ResponseResponseObjectInner as PatientCaseWithDetails,
} from '@/api'
import { patientApi, patientCaseApi, surgeryApi } from '@/api'

// Import components
import PatientCaseCard from '@/components/cards/PatientCaseCard.vue'
import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'

const componentName = 'PatientOverview.vue'
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notifierStore = useNotifierStore()
const { formatLocalizedCustomDate } = useDateFormat()

// Get patientId from route params
const patientId = route.params.patientId as string

// State
const patient = ref<Patient | null>(null)
const cases = ref<PatientCaseWithDetails[]>([])
const loading = ref(true)
const expandedCases = ref<string[]>([])
// Incremented after every refreshCases() so PatientCaseCard keys always change,
// forcing ConsultationCard to remount and refetch even if the case data itself
// doesn't include an updated consultations array.
const caseListVersion = ref(0)

// Dialog states
const showCreateConsultationDialog = ref(false)
const selectedCaseIdForConsultation = ref<string | null>(null)
const showCreateSurgeryDialog = ref(false)
const selectedCaseIdForSurgery = ref<string | null>(null)

// Delete surgery dialog state
const showDeleteSurgeryConfirmDialog = ref(false)
const selectedSurgeryForDelete = ref<string | null>(null)

// Delete patient dialog states
const showDeletePatientConfirmDialog = ref(false)
const deletePatientConfirmStep = ref(0) // 0 = first confirm, 1 = second confirm

// Delete case dialog states
const showDeleteCaseConfirmDialog = ref(false)
const deleteCaseConfirmStep = ref(0) // 0 = first confirm, 1 = second confirm
const selectedCaseForDelete = ref<string | null>(null)

// Helper function to safely format dates
const safeFormatDate = (date: unknown, format: string = 'DD.MM.YYYY HH:mm'): string => {
  if (!date || typeof date !== 'string') return t('common.notAvailable')
  return formatLocalizedCustomDate(date, format)
}

// Computed properties
// (removed unused hasMultipleCases)

// Auto-expand single case
const autoExpandSingleCase = () => {
  if (cases.value.length === 1 && cases.value[0].id) {
    expandedCases.value = [cases.value[0].id]
  }
}

// Load patient and cases data
onMounted(async () => {
  try {
    // Fetch patient details
    const patientResponse = await patientApi.getPatientById({ id: patientId })
    patient.value = patientResponse.responseObject || null

    // Fetch patient cases
    const casesResponse = await patientCaseApi.getAllPatientCases({ patientId })
    cases.value = casesResponse.responseObject || []

    // Auto-expand if only one case
    autoExpandSingleCase()

  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to load patient data:`, errorMessage)
    notifierStore.notify(t('patientOverview.loadError'), 'error')
  } finally {
    loading.value = false
  }
})

// Navigation helpers
const openCase = (caseId: string | null | undefined) => {
  if (caseId) {
    router.push({ name: 'patientcaselanding', params: { caseId } })
  }
}

const openConsultation = (consultationId: string | null | undefined) => {
  if (!consultationId) return
  const consultation = cases.value.flatMap(c => c.consultations || []).find(cons => cons.id === consultationId)
  if (consultation && consultation.patientCaseId) {
    router.push({
      name: 'PatientConsultation',
      params: {
        patientId,
        caseId: consultation.patientCaseId,
        consultationId
      }
    })
  }
}

const goBack = () => {
  router.back()
}

// Helper functions

// Handle create consultation - open dialog
const handleCreateConsultation = (caseId: string | null | undefined) => {
  if (caseId) {
    selectedCaseIdForConsultation.value = caseId
    showCreateConsultationDialog.value = true
  }
}

// Handle consultation created
const handleConsultationCreated = async () => {
  showCreateConsultationDialog.value = false
  selectedCaseIdForConsultation.value = null
  await refreshCases()
  notifierStore.notify(t('alerts.consultation.created'), 'success')
}

// Cancel consultation dialog
const cancelConsultationDialog = () => {
  showCreateConsultationDialog.value = false
  selectedCaseIdForConsultation.value = null
}

const handleCreateSurgery = (caseId: string | null | undefined) => {
  if (caseId) {
    selectedCaseIdForSurgery.value = caseId
    showCreateSurgeryDialog.value = true
  }
}

const handleSurgeryCreated = async (_surgery: Surgery) => {
  showCreateSurgeryDialog.value = false
  selectedCaseIdForSurgery.value = null
  await refreshCases()
  notifierStore.notify(t('alerts.surgery.created'), 'success')
}

const cancelSurgeryDialog = () => {
  showCreateSurgeryDialog.value = false
  selectedCaseIdForSurgery.value = null
}

const openDeleteSurgeryDialog = (surgeryId: string | null | undefined) => {
  if (!surgeryId) return
  selectedSurgeryForDelete.value = surgeryId
  showDeleteSurgeryConfirmDialog.value = true
}

const executeDeleteSurgery = async () => {
  if (!selectedSurgeryForDelete.value) return

  try {
    await surgeryApi.deleteSurgeryById({ surgeryId: selectedSurgeryForDelete.value })
    notifierStore.notify(t('alerts.surgery.deleted'), 'success')
    showDeleteSurgeryConfirmDialog.value = false
    selectedSurgeryForDelete.value = null
    await refreshCases()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to delete surgery:`, errorMessage)
    notifierStore.notify(t('alerts.surgery.deletionFailed'), 'error')
  }
}

const cancelDeleteSurgery = () => {
  showDeleteSurgeryConfirmDialog.value = false
  selectedSurgeryForDelete.value = null
}

// Case creation dialog functions
const openCreateCaseDialog = () => {
  // Navigate to creation flow with patientId
  router.push({
    name: 'creation-flow',
    query: { patientId }
  })
}

// Dialog handlers removed - we now navigate to creation flow instead

// Helper function to refresh cases data
const refreshCases = async () => {
  try {
    const casesResponse = await patientCaseApi.getAllPatientCases({ patientId })
    cases.value = casesResponse.responseObject || []
    autoExpandSingleCase()
    caseListVersion.value++
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to refresh cases:`, errorMessage)
  }
}

// Delete patient functions
const openDeletePatientDialog = () => {
  deletePatientConfirmStep.value = 0
  showDeletePatientConfirmDialog.value = true
}

const confirmDeletePatient = () => {
  if (deletePatientConfirmStep.value === 0) {
    deletePatientConfirmStep.value = 1
  }
}

const executeDeletePatient = async () => {
  try {
    await patientApi.softDeletePatient({ id: patientId })
    notifierStore.notify(t('alerts.patient.deleted'), 'success')
    showDeletePatientConfirmDialog.value = false
    deletePatientConfirmStep.value = 0
    goBack()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to delete patient:`, errorMessage)
    notifierStore.notify(t('alerts.patient.deleteFailed'), 'error')
  }
}

const cancelDeletePatient = () => {
  showDeletePatientConfirmDialog.value = false
  deletePatientConfirmStep.value = 0
}

// Delete case functions
const openDeleteCaseDialog = (caseId: string | null | undefined) => {
  if (!caseId) return
  selectedCaseForDelete.value = caseId
  deleteCaseConfirmStep.value = 0
  showDeleteCaseConfirmDialog.value = true
}

const confirmDeleteCase = () => {
  if (deleteCaseConfirmStep.value === 0) {
    deleteCaseConfirmStep.value = 1
  }
}

const executeDeleteCase = async () => {
  if (!selectedCaseForDelete.value) return
  
  try {
    await patientCaseApi.softDeletePatientCaseById({ 
      patientId, 
      caseId: selectedCaseForDelete.value 
    })
    notifierStore.notify(t('alerts.case.deleted'), 'success')
    showDeleteCaseConfirmDialog.value = false
    deleteCaseConfirmStep.value = 0
    selectedCaseForDelete.value = null
    await refreshCases()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to delete case:`, errorMessage)
    notifierStore.notify(t('alerts.case.deletionFailed'), 'error')
  }
}

const cancelDeleteCase = () => {
  showDeleteCaseConfirmDialog.value = false
  deleteCaseConfirmStep.value = 0
  selectedCaseForDelete.value = null
}
</script>

<template>
  <v-container>
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">{{ t('patientOverview.loading') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="!patient" class="text-center py-8">
      <v-icon color="error" size="64">mdi-alert-circle</v-icon>
      <h2 class="mt-4">{{ t('patientOverview.patientNotFound') }}</h2>
      <v-btn @click="goBack" class="mt-4">{{ t('common.goBack') }}</v-btn>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Header -->
      <v-card class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-btn
                   icon="mdi-arrow-left"
                   variant="text"
                   @click="goBack"
                   class="me-2"></v-btn>
            {{ t('patientOverview.title') }}
          </div>

          <!-- Delete patient button -->
          <v-btn
                 icon="mdi-trash-can-outline"
                 color="error"
                 variant="text"
                 @click="openDeletePatientDialog"
                 :title="t('buttons.deletePatient')"></v-btn>
        </v-card-title>

        <v-card-text>
          <!-- Patient Info -->
          <v-row>
            <v-col cols="12" md="4">
              <h3>{{ t('patientOverview.patientDetails') }}</h3>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-card-account-details</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientOverview.externalId') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patient.externalPatientId || t('common.notAvailable')
                    }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-human-male-female</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientOverview.sex') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patient.sex || t('common.notAvailable') }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="4">
              <h3>{{ t('patientOverview.overview') }}</h3>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-folder-multiple</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientOverview.totalCases') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ cases.length }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-clock</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientOverview.createdAt') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ safeFormatDate((patient as any)?.createdAt) }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-update</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientOverview.lastUpdated') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ safeFormatDate((patient as any)?.updatedAt) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="4" class="d-flex align-center justify-end">
              <div>
                <h3 class="mb-4">&nbsp;</h3>
                <v-btn
                       color="primary"
                       variant="elevated"
                       @click="openCreateCaseDialog">
                  <v-icon class="me-2">mdi-plus</v-icon>
                  {{ t('buttons.createNewCase') }}
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Cases -->
      <div v-if="cases.length === 0" class="text-center py-8">
        <v-icon color="grey" size="64">mdi-folder-open</v-icon>
        <h3 class="mt-4">{{ t('patientOverview.noCases') }}</h3>
        <p class="text-medium-emphasis">{{ t('patientOverview.noCasesDescription') }}</p>

        <!-- Move create button here so users can add a case directly from the empty state -->
        <v-btn
               color="primary"
               variant="elevated"
               @click="openCreateCaseDialog"
               class="mt-4">
          <v-icon class="me-2">mdi-plus</v-icon>
          {{ t('buttons.createNewCase') }}
        </v-btn>
      </div>

      <v-expansion-panels
                          v-else
                          v-model="expandedCases"
                          multiple
                          variant="accordion"
                          class="mb-6">
        <PatientCaseCard
                         v-for="(patientCase, index) in cases"
                         :key="`${patientCase.id || `case-${index}`}-v${caseListVersion}`"
                         :patient-case="patientCase"
                         :patient-id="patientId"
                         @open-case="openCase"
                         @open-consultation="openConsultation"
                         @update-consultations="refreshCases"
                         @create-consultation="handleCreateConsultation"
                         @create-surgery="handleCreateSurgery"
                         @delete-surgery="openDeleteSurgeryDialog"
                         @delete-case="openDeleteCaseDialog" />
      </v-expansion-panels>

      <div v-if="cases.length > 0" class="text-center mt-4">
        <v-btn
               color="primary"
               variant="elevated"
               @click="openCreateCaseDialog">
          <v-icon class="me-2">mdi-plus</v-icon>
          {{ t('buttons.createNewCase') }}
        </v-btn>
      </div>
    </div>

    <!-- Create Consultation Dialog -->
    <v-dialog
              v-model="showCreateConsultationDialog"
              max-width="800px">
      <CreateEditConsultationDialog
                                    v-if="selectedCaseIdForConsultation"
                                    :patient-id="patientId"
                                    :case-id="selectedCaseIdForConsultation"
                                    @submit="handleConsultationCreated"
                                    @cancel="cancelConsultationDialog" />
    </v-dialog>

        <!-- Create Surgery Dialog -->
        <v-dialog
            v-model="showCreateSurgeryDialog"
            max-width="1200px">
          <CreateEditSurgeryDialog
                 v-if="selectedCaseIdForSurgery"
                 :patient-case-id="selectedCaseIdForSurgery"
                 @submit="handleSurgeryCreated"
                 @cancel="cancelSurgeryDialog" />
        </v-dialog>

    <!-- Delete Patient Confirmation Dialog -->
    <v-dialog
              v-model="showDeletePatientConfirmDialog"
              max-width="400px">
      <v-card>
        <v-card-title v-if="deletePatientConfirmStep === 0" class="text-h5">
          {{ t('patientOverview.confirmDeletePatient') }}
        </v-card-title>
        <v-card-title v-else class="text-h5 text-error">
          {{ t('patientOverview.confirmDeletePatientFinal') }}
        </v-card-title>

        <v-card-text v-if="deletePatientConfirmStep === 0" class="py-4">
          <p>{{ t('patientOverview.deletePatientWarning') }}</p>
        </v-card-text>

        <v-card-text v-else class="py-4">
          <p class="text-error font-weight-bold">
            {{ t('patientOverview.deletePatientFinalWarning') }}
          </p>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn
                 color="default"
                 variant="text"
                 @click="cancelDeletePatient">
            {{ t('buttons.cancel') }}
          </v-btn>
          <v-btn
                 v-if="deletePatientConfirmStep === 0"
                 color="error"
                 variant="elevated"
                 @click="confirmDeletePatient">
            {{ t('buttons.delete') }}
          </v-btn>
          <v-btn
                 v-else
                 color="error"
                 variant="elevated"
                 @click="executeDeletePatient">
            {{ t('buttons.confirmDelete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Case Confirmation Dialog -->
    <v-dialog
              v-model="showDeleteCaseConfirmDialog"
              max-width="400px">
      <v-card>
        <v-card-title v-if="deleteCaseConfirmStep === 0" class="text-h5">
          {{ t('patientOverview.confirmDeleteCase') }}
        </v-card-title>
        <v-card-title v-else class="text-h5 text-error">
          {{ t('patientOverview.confirmDeleteCaseFinal') }}
        </v-card-title>

        <v-card-text v-if="deleteCaseConfirmStep === 0" class="py-4">
          <p>{{ t('patientOverview.deleteCaseWarning') }}</p>
        </v-card-text>

        <v-card-text v-else class="py-4">
          <p class="text-error font-weight-bold">
            {{ t('patientOverview.deleteCaseFinalWarning') }}
          </p>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn
                 color="default"
                 variant="text"
                 @click="cancelDeleteCase">
            {{ t('buttons.cancel') }}
          </v-btn>
          <v-btn
                 v-if="deleteCaseConfirmStep === 0"
                 color="error"
                 variant="elevated"
                 @click="confirmDeleteCase">
            {{ t('buttons.delete') }}
          </v-btn>
          <v-btn
                 v-else
                 color="error"
                 variant="elevated"
                 @click="executeDeleteCase">
            {{ t('buttons.confirmDelete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Surgery Confirmation Dialog -->
    <v-dialog
              v-model="showDeleteSurgeryConfirmDialog"
              max-width="400px">
      <v-card>
        <v-card-title class="text-h5 text-error">
          {{ t('alerts.general.confirmDeletion') }}
        </v-card-title>

        <v-card-text class="py-4">
          <p>{{ t('alerts.surgery.confirmDelete') }}</p>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn
                 color="default"
                 variant="text"
                 @click="cancelDeleteSurgery">
            {{ t('buttons.cancel') }}
          </v-btn>
          <v-btn
                 color="error"
                 variant="elevated"
                 @click="executeDeleteSurgery">
            {{ t('buttons.confirmDelete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.v-card {
  border-radius: 12px;
}

.v-card-title {
  font-weight: 600;
}

.v-list-item {
  padding-inline: 0;
}

.v-timeline {
  max-height: 600px;
  overflow-y: auto;
}

.v-chip {
  font-weight: 500;
}

.text-h6 {
  font-weight: 600;
}
</style>
