<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import { useNotifierStore } from '@/stores/notifierStore'

import {
  ResponseError,
  type Patient,
} from '@/api'
import type { ApiConsultation as Consultation, ApiPatientCaseWithDetails as PatientCaseWithDetails } from '@/types'
import { consultationApi, patientApi, patientCaseApi, surgeryApi } from '@/api'

// Import components
import PatientCaseCard from '@/components/cards/PatientCaseCard.vue'
import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'
import CascadeDeleteDialog from '@/components/dialogs/CascadeDeleteDialog.vue'

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

// Reusable cascade delete dialog state
const showCascadeDeleteDialog = ref(false)
const deleteDialogLoading = ref(false)
const deleteDialogConfig = ref<{
  title: string
  warningText: string
  finalWarningText: string
  options: Array<{ key: string; label: string; count: number; defaultChecked: boolean }>
} | null>(null)
const deleteContext = ref<'patient' | 'case' | null>(null)

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

const handleSurgeryCreated = async () => {
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

const getConsultationCountForCase = (patientCase: PatientCaseWithDetails | null | undefined): number => {
  return patientCase?.consultations?.length || 0
}

const getFormCountForCase = (patientCase: PatientCaseWithDetails | null | undefined): number => {
  if (!patientCase?.consultations?.length) return 0
  return patientCase.consultations.reduce((sum, consultation) => {
    return sum + (consultation.proms?.length || 0)
  }, 0)
}

const getPatientDeletionCounts = () => {
  const caseCount = cases.value.length
  const consultationCount = cases.value.reduce((sum, patientCase) => sum + getConsultationCountForCase(patientCase), 0)
  const formCount = cases.value.reduce((sum, patientCase) => sum + getFormCountForCase(patientCase), 0)

  return {
    caseCount,
    consultationCount,
    formCount,
  }
}

const getCaseDeletionCountsFromApi = async (caseId: string): Promise<{ consultationCount: number; formCount: number }> => {
  const response = await consultationApi.getAllConsultations({ caseId })
  const consultationList = (response.responseObject || []) as Consultation[]

  return {
    consultationCount: consultationList.length,
    formCount: consultationList.reduce((sum, consultation) => sum + (consultation.proms?.length || 0), 0),
  }
}

const getPatientDeletionCountsFromApi = async (): Promise<{ caseCount: number; consultationCount: number; formCount: number }> => {
  const caseIds = cases.value
    .map(patientCase => patientCase.id)
    .filter((id): id is string => Boolean(id))

  const caseCount = caseIds.length
  if (!caseIds.length) {
    return { caseCount: 0, consultationCount: 0, formCount: 0 }
  }

  const caseCounts = await Promise.all(caseIds.map(caseId => getCaseDeletionCountsFromApi(caseId)))
  const consultationCount = caseCounts.reduce((sum, item) => sum + item.consultationCount, 0)
  const formCount = caseCounts.reduce((sum, item) => sum + item.formCount, 0)

  return { caseCount, consultationCount, formCount }
}

const openDeletePatientDialog = async () => {
  let counts = getPatientDeletionCounts()

  try {
    deleteDialogLoading.value = true
    counts = await getPatientDeletionCountsFromApi()
  } catch (error) {
    console.error(`${componentName}: Failed to fetch accurate deletion counts for patient`, error)
  } finally {
    deleteDialogLoading.value = false
  }

  deleteContext.value = 'patient'
  deleteDialogConfig.value = {
    title: t('patientOverview.confirmDeletePatient'),
    warningText: t('patientOverview.deletePatientWarning'),
    finalWarningText: t('patientOverview.deletePatientFinalWarning'),
    options: [
      { key: 'deleteCases', label: t('cascadeDeleteDialog.casesLabel'), count: counts.caseCount, defaultChecked: true },
      { key: 'deleteConsultations', label: t('cascadeDeleteDialog.consultationsLabel'), count: counts.consultationCount, defaultChecked: true },
      { key: 'deleteForms', label: t('cascadeDeleteDialog.formsLabel'), count: counts.formCount, defaultChecked: true },
    ],
  }
  showCascadeDeleteDialog.value = true
}

const executeDeletePatient = async (selectedOptions: Record<string, boolean>) => {
  try {
    deleteDialogLoading.value = true
    await patientApi.softDeletePatient(
      { id: patientId },
      {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteCases: selectedOptions.deleteCases === true,
          deleteConsultations: selectedOptions.deleteConsultations === true,
          deleteForms: selectedOptions.deleteForms === true,
        }),
      },
    )
    notifierStore.notify(t('alerts.patient.deleted'), 'success')
    showCascadeDeleteDialog.value = false
    deleteContext.value = null
    deleteDialogConfig.value = null
    goBack()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to delete patient:`, errorMessage)
    notifierStore.notify(t('alerts.patient.deleteFailed'), 'error')
  } finally {
    deleteDialogLoading.value = false
  }
}

// Delete case functions
const openDeleteCaseDialog = async (caseId: string | null | undefined) => {
  if (!caseId) return

  const patientCase = cases.value.find(c => c.id === caseId)
  let consultationCount = getConsultationCountForCase(patientCase)
  let formCount = getFormCountForCase(patientCase)

  try {
    deleteDialogLoading.value = true
    const counts = await getCaseDeletionCountsFromApi(caseId)
    consultationCount = counts.consultationCount
    formCount = counts.formCount
  } catch (error) {
    console.error(`${componentName}: Failed to fetch accurate deletion counts for case ${caseId}`, error)
  } finally {
    deleteDialogLoading.value = false
  }

  deleteContext.value = 'case'
  selectedCaseForDelete.value = caseId
  deleteDialogConfig.value = {
    title: t('patientOverview.confirmDeleteCase'),
    warningText: t('patientOverview.deleteCaseWarning'),
    finalWarningText: t('patientOverview.deleteCaseFinalWarning'),
    options: [
      { key: 'deleteConsultations', label: t('cascadeDeleteDialog.consultationsLabel'), count: consultationCount, defaultChecked: true },
      { key: 'deleteForms', label: t('cascadeDeleteDialog.formsLabel'), count: formCount, defaultChecked: true },
    ],
  }
  showCascadeDeleteDialog.value = true
}

const executeDeleteCase = async (selectedOptions: Record<string, boolean>) => {
  if (!selectedCaseForDelete.value) return

  try {
    deleteDialogLoading.value = true
    await patientCaseApi.softDeletePatientCaseById(
      {
        patientId,
        caseId: selectedCaseForDelete.value,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deleteConsultations: selectedOptions.deleteConsultations === true,
          deleteForms: selectedOptions.deleteForms === true,
        }),
      },
    )
    notifierStore.notify(t('alerts.case.deleted'), 'success')
    showCascadeDeleteDialog.value = false
    deleteContext.value = null
    deleteDialogConfig.value = null
    selectedCaseForDelete.value = null
    await refreshCases()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to delete case:`, errorMessage)
    notifierStore.notify(t('alerts.case.deletionFailed'), 'error')
  } finally {
    deleteDialogLoading.value = false
  }
}

const cancelCascadeDelete = () => {
  showCascadeDeleteDialog.value = false
  deleteContext.value = null
  deleteDialogConfig.value = null
  selectedCaseForDelete.value = null
}

const confirmCascadeDelete = async (selectedOptions: Record<string, boolean>) => {
  if (deleteContext.value === 'patient') {
    await executeDeletePatient(selectedOptions)
    return
  }

  if (deleteContext.value === 'case') {
    await executeDeleteCase(selectedOptions)
  }
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

    <CascadeDeleteDialog
                         v-if="deleteDialogConfig"
                         v-model="showCascadeDeleteDialog"
                         :title="deleteDialogConfig.title"
                         :warning-text="deleteDialogConfig.warningText"
                         :final-warning-text="deleteDialogConfig.finalWarningText"
                         :options="deleteDialogConfig.options"
                         :loading="deleteDialogLoading"
                         @cancel="cancelCascadeDelete"
                         @confirm="confirmCascadeDelete" />

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
