<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import { useNotifierStore } from '@/stores/notifierStore'

import {
  ResponseError,
  type Patient,
  type GetAllPatientCases200ResponseResponseObjectInner as PatientCaseWithDetails,
} from '@/api'
import { patientApi, patientCaseApi } from '@/api'

// Import dialog components for case creation
import PatientCaseCreateEditForm from '@/components/forms/PatientCaseCreateEditForm.vue'
import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'
import PatientCaseCard from '@/components/cards/PatientCaseCard.vue'

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

// Dialog states for case creation flow
const showCreateCaseDialog = ref(false)
const showCreateConsultationDialog = ref(false)
const createdCaseId = ref<string | null>(null)

// Form refs for external submission
const caseFormRef = ref<InstanceType<typeof PatientCaseCreateEditForm> | null>(null)

// Loading states
const isLoading = ref(false)

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
    router.push({ name: 'PatientCase', params: { patientId, caseId } })
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


// Case creation dialog functions
const openCreateCaseDialog = () => {
  showCreateCaseDialog.value = true
}

const closeCreateCaseDialog = () => {
  showCreateCaseDialog.value = false
  resetDialogState()
}

// Handle case form submission from external buttons
const createCase = async () => {
  if (caseFormRef.value) {
    isLoading.value = true
    await caseFormRef.value.submit()
  }
}

const createCaseAndNext = async () => {
  if (caseFormRef.value) {
    isLoading.value = true
    await caseFormRef.value.submitAndNextStep()
  }
}

// Handle case creation success from embedded form
const handleCaseCreated = async (caseData: PatientCaseWithDetails) => {
  isLoading.value = false
  createdCaseId.value = caseData.id || null
  showCreateCaseDialog.value = false

  // Refresh the cases list to show the new case
  await refreshCases()

  // Show success message (already shown by the form component)
  notifierStore.notify(t('alerts.case.created'), 'success')
}

const handleCaseCreatedAndNext = async (caseData: PatientCaseWithDetails) => {
  isLoading.value = false
  createdCaseId.value = caseData.id || null
  showCreateCaseDialog.value = false

  // Refresh the cases list to show the new case
  await refreshCases()

  // Move directly to step 2: Create consultation for the new case
  if (createdCaseId.value) {
    showCreateConsultationDialog.value = true
  }
}

const handleCaseCreationCancelled = () => {
  isLoading.value = false
  closeCreateCaseDialog()
}

const handleConsultationCreated = async () => {
  showCreateConsultationDialog.value = false

  // Refresh the cases list to show the new consultation
  await refreshCases()

  resetDialogState()

  // Show success message
  notifierStore.notify(t('alerts.consultation.created'), 'success');

}

const handleConsultationCreationCancelled = () => {
  showCreateConsultationDialog.value = false
  resetDialogState()
}

const resetDialogState = () => {
  createdCaseId.value = null
}

// Helper function to refresh cases data
const refreshCases = async () => {
  try {
    const casesResponse = await patientCaseApi.getAllPatientCases({ patientId })
    cases.value = casesResponse.responseObject || []
    autoExpandSingleCase()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to refresh cases:`, errorMessage)
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

          <!-- create new case button moved into empty-state area when there are no cases -->
        </v-card-title>

        <v-card-text>
          <!-- Patient Info -->
          <v-row>
            <v-col cols="12" md="6">
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

            <v-col cols="12" md="6">
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
                         :key="patientCase.id || `case-${index}`"
                         :patient-case="patientCase"
                         :patient-id="patientId"
                         @open-case="openCase"
                         @open-consultation="openConsultation"
                         @update-consultations="refreshCases" />
      </v-expansion-panels>
    </div>

    <!-- Step 1: Create Case Dialog -->
    <v-dialog v-model="showCreateCaseDialog" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2">mdi-folder-plus</v-icon>
          {{ t('buttons.createNewCase') }}
        </v-card-title>

        <v-card-text>
          <PatientCaseCreateEditForm
                                     ref="caseFormRef"
                                     v-if="patient?.id"
                                     :createNewCase="true"
                                     :patientId="patient.id"
                                     :selectedCase="null"
                                     :showButtons="false"
                                     @submit="handleCaseCreated"
                                     @next-step="handleCaseCreatedAndNext"
                                     @cancel="handleCaseCreationCancelled" />
        </v-card-text>

        <v-card-actions>
          <v-btn
                 color="primary"
                 variant="elevated"
                 :loading="isLoading"
                 @click="createCase">
            {{ t('buttons.create') }}
          </v-btn>
          <v-btn
                 color="secondary"
                 variant="elevated"
                 :loading="isLoading"
                 @click="createCaseAndNext">
            {{ t('buttons.createAndNext') }}
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
                 color="grey"
                 variant="outlined"
                 @click="closeCreateCaseDialog">
            {{ t('buttons.cancel') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Step 2: Create Consultation Dialog -->
    <v-dialog v-model="showCreateConsultationDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2">mdi-calendar-plus</v-icon>
          {{ t('buttons.consultation') }}
        </v-card-title>

        <v-card-text>
          <CreateEditConsultationDialog
                                        v-if="patient?.id && createdCaseId"
                                        :patientId="patient.id"
                                        :caseId="createdCaseId"
                                        @submit="handleConsultationCreated"
                                        @cancel="handleConsultationCreationCancelled" />
        </v-card-text>
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
