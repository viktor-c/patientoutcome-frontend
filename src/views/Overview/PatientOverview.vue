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

// Import components
import PatientCaseCard from '@/components/cards/PatientCaseCard.vue'
import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'
import type { Consultation } from '@/api'

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

// Dialog states
const showCreateConsultationDialog = ref(false)
const selectedCaseIdForConsultation = ref<string | null>(null)

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
                         :key="patientCase.id || `case-${index}`"
                         :patient-case="patientCase"
                         :patient-id="patientId"
                         @open-case="openCase"
                         @open-consultation="openConsultation"
                         @update-consultations="refreshCases"
                         @create-consultation="handleCreateConsultation" />
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
