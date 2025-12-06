<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import { useNotifierStore } from '@/stores/notifierStore'

import {
  type GetPatientCaseById200Response,
  type Consultation,
  type Patient,
  type Surgery,
  ResponseError,
} from '@/api'
import { patientCaseApi, consultationApi, surgeryApi } from '@/api'

import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'
import CreateBatchConsultationsDialog from '@/components/dialogs/CreateBatchConsultationsDialog.vue'
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notifierStore = useNotifierStore()
const { formatLocalizedCustomDate, dateFormats } = useDateFormat()

// Get caseId from route params
const caseId = route.params.caseId as string

// State
const patientCase = ref<GetPatientCaseById200Response['responseObject'] | null>(null)
const patient = ref<Patient | null>(null)
const consultations = ref<Consultation[]>([])
const surgeries = ref<Surgery[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Dialog states
const showCreateConsultationDialog = ref(false)
const showBatchConsultationsDialog = ref(false)
const editingConsultation = ref<Consultation | null>(null)
const showCreateSurgeryDialog = ref(false)
const editingSurgery = ref<Surgery | null>(null)

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = dateFormats.isoDateTime): string => {
  if (!date) return t('common.notAvailable')
  return formatLocalizedCustomDate(date, format)
}

// Computed properties
const caseDisplayName = computed(() => {
  if (!patientCase.value) return t('common.loading')
  return patientCase.value.externalId || patientCase.value.id || t('common.unknown')
})

const patientDisplayName = computed(() => {
  if (!patient.value) return t('common.loading')
  // Patient has externalPatientId as an array
  const externalId = patient.value.externalPatientId?.[0]
  return externalId || patient.value.id || t('common.unknown')
})

const pastConsultations = computed(() => {
  const now = new Date()
  return consultations.value
    .filter(consultation => new Date(consultation.dateAndTime || '') < now)
    .sort((a, b) => new Date(b.dateAndTime || '').getTime() - new Date(a.dateAndTime || '').getTime())
})

const futureConsultations = computed(() => {
  const now = new Date()
  return consultations.value
    .filter(consultation => new Date(consultation.dateAndTime || '') >= now)
    .sort((a, b) => new Date(a.dateAndTime || '').getTime() - new Date(b.dateAndTime || '').getTime())
})

// Load case data
const loadCaseData = async () => {
  if (!caseId) {
    error.value = t('patientCaseLanding.invalidParams')
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    // Load case details using only caseId
    const caseResponse = await patientCaseApi.getPatientCaseById({ caseId })
    patientCase.value = caseResponse.responseObject || null

    // Extract patientId from case information
    if (patientCase.value?.patient) {
      patient.value = {
        id: patientCase.value.patient.id,
        externalPatientId: patientCase.value.patient.externalPatientId,
        sex: patientCase.value.patient.sex,
      } as Patient
    } else {
      patient.value = null
    }

    // Load consultations for this case
    const consultationsResponse = await consultationApi.getAllConsultations({ caseId })
    consultations.value = consultationsResponse.responseObject || []

    // Load surgeries for this case
    const surgeriesResponse = await surgeryApi.getSurgeriesByPatientCaseId({ patientCaseId: caseId })
    surgeries.value = surgeriesResponse.responseObject || []

    console.log('Case data loaded:', {
      case: patientCase.value,
      patient: patient.value,
      consultations: consultations.value,
      surgeries: surgeries.value
    })

  } catch (err: unknown) {
    // If it's an authentication error, the middleware will handle logout and redirect
    // Don't show error UI as the user is being logged out
    if (err instanceof ResponseError && err.response.status === 401) {
      console.log('Authentication error detected, middleware handling logout')
      return
    }

    if (err instanceof Error && err.message.includes('Unauthorized')) {
      console.log('Unauthorized error detected, middleware handling logout')
      return
    }

    // Handle other errors normally
    let errorMessage = 'An unexpected error occurred'
    if (err instanceof ResponseError) {
      try {
        const errorData = await err.response.clone().json()
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = `HTTP ${err.response.status}: ${err.response.statusText || 'Request failed'}`
      }
    } else if (err instanceof Error) {
      errorMessage = err.message
    }

    console.error('Error loading case data:', errorMessage)
    error.value = errorMessage
    notifierStore.notify(t('patientCaseLanding.loadError'), 'error')
  } finally {
    loading.value = false
  }
}

// Navigation functions
const openConsultationOverview = (consultation: Consultation) => {
  if (consultation.id) {
    router.push({
      name: 'consultationoverview',
      params: { consultationId: consultation.id }
    })
  }
}

const openPatientOverview = () => {
  if (patient.value?.id) {
    router.push({
      name: 'patientoverview',
      params: { patientId: patient.value.id }
    });
  }
}

const openStatistics = () => {
  if (caseId) {
    router.push({
      name: 'statistics',
      params: { caseId }
    })
  }
}

// Consultation management
const openCreateConsultationDialog = () => {
  editingConsultation.value = null
  showCreateConsultationDialog.value = true
}

const openEditConsultationDialog = (consultation: Consultation) => {
  editingConsultation.value = consultation
  showCreateConsultationDialog.value = true
}

const openBatchConsultationDialog = () => {
  showBatchConsultationsDialog.value = true
}

const handleConsultationCreated = async (consultation: Consultation) => {
  console.log('Consultation created/updated:', consultation)
  showCreateConsultationDialog.value = false
  editingConsultation.value = null
  await loadCaseData() // Reload consultations
  notifierStore.notify(
    editingConsultation.value ? t('alerts.consultation.updated') : t('alerts.consultation.created'),
    'success'
  )
}

const handleBatchConsultationsCreated = async (consultations: Consultation[]) => {
  console.log('Batch consultations created:', consultations)
  showBatchConsultationsDialog.value = false
  await loadCaseData() // Reload consultations
  notifierStore.notify(
    t('alerts.consultation.batchCreated', { count: consultations.length }),
    'success'
  )
}

const cancelDialog = () => {
  showCreateConsultationDialog.value = false
  showBatchConsultationsDialog.value = false
  editingConsultation.value = null
  showCreateSurgeryDialog.value = false
  editingSurgery.value = null
}

// Surgery management
const openCreateSurgeryDialog = () => {
  editingSurgery.value = null
  showCreateSurgeryDialog.value = true
}

const openEditSurgeryDialog = (surgery: Surgery) => {
  editingSurgery.value = surgery
  showCreateSurgeryDialog.value = true
}

const handleSurgeryCreated = async (surgery: Surgery) => {
  console.log('Surgery created/updated:', surgery)
  showCreateSurgeryDialog.value = false
  editingSurgery.value = null
  await loadCaseData() // Reload surgeries
  notifierStore.notify(
    editingSurgery.value ? t('alerts.surgery.updated') : t('alerts.surgery.created'),
    'success'
  )
}

// Get consultation status color
const getConsultationStatusColor = (consultation: Consultation): string => {
  const now = new Date()
  const consultationDate = new Date(consultation.dateAndTime || '')

  if (consultationDate > now) {
    return 'info' // Future consultation
  } else {
    return 'success' // Past consultation
  }
}

// Get consultation status text
const getConsultationStatusText = (consultation: Consultation): string => {
  const now = new Date()
  const consultationDate = new Date(consultation.dateAndTime || '')

  if (consultationDate > now) {
    return t('patientCaseLanding.scheduled')
  } else {
    return t('patientCaseLanding.completed')
  }
}

// Lifecycle
onMounted(() => {
  loadCaseData()
})
</script>

<template>
  <v-container>
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">{{ t('patientCaseLanding.loading') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-8">
      <v-icon color="error" size="64">mdi-alert-circle</v-icon>
      <h2 class="mt-4">{{ t('patientCaseLanding.errorTitle') }}</h2>
      <p class="text-grey">{{ error }}</p>
      <v-btn @click="loadCaseData" class="mt-4" color="primary">
        {{ t('buttons.retry') }}
      </v-btn>
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
                   @click="$router.back()"
                   class="me-2"></v-btn>
            {{ t('patientCaseLanding.title') }}
          </div>
          <v-btn
                 @click="openStatistics"
                 color="primary"
                 variant="tonal"
                 prepend-icon="mdi-chart-line">
            {{ t('patientCaseLanding.viewStatistics') }}
          </v-btn>
        </v-card-title>

        <!-- Case and Patient Details -->
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <h3>{{ t('patientCaseLanding.caseDetails') }}</h3>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-folder</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientCaseLanding.caseId') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ caseDisplayName }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="patientCase?.createdAt">
                  <template #prepend>
                    <v-icon>mdi-calendar-plus</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientCaseLanding.createdAt') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ safeFormatDate(patientCase.createdAt, dateFormats.isoDate)
                  }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="patientCase?.mainDiagnosis">
                  <template #prepend>
                    <v-icon>mdi-medical-bag</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientCaseLanding.mainDiagnosis') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patientCase.mainDiagnosis }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="6">
              <h3>{{ t('patientCaseLanding.patientDetails') }}</h3>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientCaseLanding.patientId') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patientDisplayName }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="patient?.sex">
                  <template #prepend>
                    <v-icon>mdi-human-male-female</v-icon>
                  </template>
                  <v-list-item-title>{{ t('patientCaseLanding.sex') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patient.sex }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <v-btn
                     @click="openPatientOverview"
                     color="primary"
                     variant="outlined"
                     class="mt-2">
                <v-icon class="me-2">mdi-eye</v-icon>
                {{ t('patientCaseLanding.viewPatientOverview') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Surgeries List -->
      <v-card class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="me-2">mdi-scalpel</v-icon>
            {{ t('patientCaseLanding.surgeries') }}
            <v-chip v-if="surgeries.length" class="ml-2" color="primary" size="small">
              {{ surgeries.length }}
            </v-chip>
          </div>
          <v-btn
                 color="primary"
                 variant="text"
                 size="small"
                 @click="openCreateSurgeryDialog"
                 prepend-icon="mdi-plus">
            {{ t('patientCaseLanding.addSurgeryButton') }}
          </v-btn>
        </v-card-title>
        <v-card-text v-if="surgeries.length">
          <v-list>
            <v-list-item
                         v-for="surgery in surgeries"
                         :key="surgery.id || 'surgery-' + Math.random()"
                         @click="openEditSurgeryDialog(surgery)"
                         class="consultation-item">
              <template #prepend>
                <v-icon color="primary">
                  mdi-medical-bag
                </v-icon>
              </template>

              <v-list-item-title>
                {{ safeFormatDate(surgery.surgeryDate, dateFormats.isoDate) }}
              </v-list-item-title>

              <v-list-item-subtitle>
                <div class="d-flex align-center gap-2 flex-wrap">
                  <span v-if="surgery.therapy">
                    {{ surgery.therapy }}
                  </span>
                  <span v-if="surgery.diagnosis?.length" class="text-grey">
                    {{ surgery.diagnosis.join(', ') }}
                  </span>
                  <v-chip v-if="surgery.side" size="small" color="info">
                    {{ surgery.side }}
                  </v-chip>
                </div>
              </v-list-item-subtitle>

              <template #append>
                <v-btn
                       icon="mdi-pencil"
                       variant="text"
                       size="small"
                       @click.stop="openEditSurgeryDialog(surgery)"
                       :title="t('patientCaseLanding.editSurgery')">
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-text v-else class="text-center py-8">
          <v-icon size="48" color="grey-lighten-1">mdi-scalpel-path</v-icon>
          <p class="text-grey mt-2">{{ t('patientCaseLanding.noSurgeriesHint') }}</p>
        </v-card-text>
      </v-card>

      <!-- Future Consultations -->
      <v-card v-if="futureConsultations.length" class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="me-2">mdi-calendar-arrow-right</v-icon>
            {{ t('patientCaseLanding.upcomingConsultations') }}
            <v-chip class="ml-2" color="info">{{ futureConsultations.length }}</v-chip>
          </div>
          <div class="d-flex gap-2">
            <v-btn
                   color="primary"
                   variant="text"
                   size="small"
                   @click="openCreateConsultationDialog"
                   prepend-icon="mdi-calendar-plus">
              {{ t('patientCaseLanding.addSingleConsultation') }}
            </v-btn>
            <v-btn
                   color="secondary"
                   variant="text"
                   size="small"
                   @click="openBatchConsultationDialog"
                   prepend-icon="mdi-calendar-multiple">
              {{ t('patientCaseLanding.addFromBlueprint') }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item
                         v-for="consultation in futureConsultations"
                         :key="consultation.id || 'future-' + Math.random()"
                         @click="openConsultationOverview(consultation)"
                         class="consultation-item">
              <template #prepend>
                <v-icon :color="getConsultationStatusColor(consultation)">
                  mdi-calendar-clock
                </v-icon>
              </template>

              <v-list-item-title>
                {{ safeFormatDate(consultation.dateAndTime, dateFormats.isoDateTime) }}
              </v-list-item-title>

              <v-list-item-subtitle>
                <div class="d-flex align-center gap-2 flex-wrap">
                  <v-chip
                          :color="getConsultationStatusColor(consultation)"
                          size="small">
                    {{ getConsultationStatusText(consultation) }}
                  </v-chip>
                  <span v-if="consultation.reasonForConsultation?.length">
                    {{ consultation.reasonForConsultation.join(', ') }}
                  </span>
                  <span v-if="consultation.proms?.length" class="text-info">
                    {{ consultation.proms.length }} {{ t('patientCaseLanding.forms') }}
                  </span>
                </div>
              </v-list-item-subtitle>

              <template #append>
                <v-btn
                       icon="mdi-pencil"
                       variant="text"
                       size="small"
                       @click.stop="openEditConsultationDialog(consultation)"
                       :title="t('patientCaseLanding.editConsultation')">
                </v-btn>
                <v-btn
                       icon="mdi-arrow-right"
                       variant="text"
                       size="small"
                       @click.stop="openConsultationOverview(consultation)"
                       :title="t('patientCaseLanding.viewConsultation')">
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Past Consultations -->
      <v-card v-if="pastConsultations.length" class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="me-2">mdi-history</v-icon>
            {{ t('patientCaseLanding.pastConsultations') }}
            <v-chip class="ml-2" color="success">{{ pastConsultations.length }}</v-chip>
          </div>
          <div class="d-flex gap-2">
            <v-btn
                   color="primary"
                   variant="text"
                   size="small"
                   @click="openCreateConsultationDialog"
                   prepend-icon="mdi-calendar-plus">
              {{ t('patientCaseLanding.addSingleConsultation') }}
            </v-btn>
            <v-btn
                   color="secondary"
                   variant="text"
                   size="small"
                   @click="openBatchConsultationDialog"
                   prepend-icon="mdi-calendar-multiple">
              {{ t('patientCaseLanding.addFromBlueprint') }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item
                         v-for="consultation in pastConsultations"
                         :key="consultation.id || 'past-' + Math.random()"
                         @click="openConsultationOverview(consultation)"
                         class="consultation-item">
              <template #prepend>
                <v-icon :color="getConsultationStatusColor(consultation)">
                  mdi-calendar-check
                </v-icon>
              </template>

              <v-list-item-title>
                {{ safeFormatDate(consultation.dateAndTime, dateFormats.isoDateTime) }}
              </v-list-item-title>

              <v-list-item-subtitle>
                <div class="d-flex align-center gap-2 flex-wrap">
                  <v-chip
                          :color="getConsultationStatusColor(consultation)"
                          size="small">
                    {{ getConsultationStatusText(consultation) }}
                  </v-chip>
                  <span v-if="consultation.reasonForConsultation?.length">
                    {{ consultation.reasonForConsultation.join(', ') }}
                  </span>
                  <span v-if="consultation.proms?.length" class="text-info">
                    {{ consultation.proms.length }} {{ t('patientCaseLanding.forms') }}
                  </span>
                </div>
              </v-list-item-subtitle>

              <template #append>
                <v-btn
                       icon="mdi-pencil"
                       variant="text"
                       size="small"
                       @click.stop="openEditConsultationDialog(consultation)"
                       :title="t('patientCaseLanding.editConsultation')">
                </v-btn>
                <v-btn
                       icon="mdi-arrow-right"
                       variant="text"
                       size="small"
                       @click.stop="openConsultationOverview(consultation)"
                       :title="t('patientCaseLanding.viewConsultation')">
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Empty state for no consultations -->
      <v-card v-if="!futureConsultations.length && !pastConsultations.length" class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="me-2">mdi-calendar-outline</v-icon>
            {{ t('patientCaseLanding.upcomingConsultations') }}
          </div>
          <div class="d-flex gap-2">
            <v-btn
                   color="primary"
                   variant="text"
                   size="small"
                   @click="openCreateConsultationDialog"
                   prepend-icon="mdi-calendar-plus">
              {{ t('patientCaseLanding.addSingleConsultation') }}
            </v-btn>
            <v-btn
                   color="secondary"
                   variant="text"
                   size="small"
                   @click="openBatchConsultationDialog"
                   prepend-icon="mdi-calendar-multiple">
              {{ t('patientCaseLanding.addFromBlueprint') }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-text class="text-center py-8">
          <v-icon size="64" color="grey">mdi-calendar-outline</v-icon>
          <h3 class="mt-4">{{ t('patientCaseLanding.noConsultations') }}</h3>
          <p class="text-grey">{{ t('patientCaseLanding.noConsultationsHint') }}</p>
        </v-card-text>
      </v-card>
    </div>

    <!-- Create/Edit Consultation Dialog -->
    <v-dialog
              v-model="showCreateConsultationDialog"
              max-width="800px">
      <CreateEditConsultationDialog
                                    :patient-id="patient?.id"
                                    :case-id="caseId"
                                    :consultation="editingConsultation"
                                    @submit="handleConsultationCreated"
                                    @cancel="cancelDialog" />
    </v-dialog>

    <!-- Batch Consultations Dialog -->
    <CreateBatchConsultationsDialog
                                    v-if="showBatchConsultationsDialog"
                                    v-model:show="showBatchConsultationsDialog"
                                    :patient-id="patient?.id"
                                    :case-id="caseId"
                                    :reference-date="patientCase?.createdAt || undefined"
                                    @submit="handleBatchConsultationsCreated"
                                    @cancel="cancelDialog" />

    <!-- Create/Edit Surgery Dialog -->
    <v-dialog
              v-model="showCreateSurgeryDialog"
              max-width="1200px">
      <CreateEditSurgeryDialog
                               :patient-case-id="caseId"
                               :surgery="editingSurgery"
                               @submit="handleSurgeryCreated"
                               @cancel="cancelDialog" />
    </v-dialog>
  </v-container>
</template>

<style scoped>
.consultation-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.consultation-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.v-card {
  border-radius: 12px;
}

.v-card-title {
  font-weight: 600;
}

.v-list-item {
  border-radius: 8px;
  margin-bottom: 4px;
}
</style>