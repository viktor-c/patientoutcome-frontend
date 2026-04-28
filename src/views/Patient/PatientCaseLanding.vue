<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import { useNotifierStore } from '@/stores/notifierStore'
import { logger } from '@/services/logger'

import {
  type GetPatientCaseById200Response,
  type Consultation,
  type Patient,
  type Surgery,
  type Note,
  ResponseError,
} from '@/api'
import { patientCaseApi, consultationApi, surgeryApi } from '@/api'

import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'
import CreateBatchConsultationsDialog from '@/components/dialogs/CreateBatchConsultationsDialog.vue'
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'
import CascadeDeleteDialog from '@/components/dialogs/CascadeDeleteDialog.vue'
import NotesEditor from '@/components/forms/NotesEditor.vue'
import QRCodeDisplay from '@/components/QRCodeDisplay.vue'
import { getConsultationAccessWindowFromConsultation } from '@/utils/consultationAccessWindow'
import { getAccessInfo } from '@/utils/dashboardUtils'
import { useUserStore } from '@/stores/userStore'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notifierStore = useNotifierStore()
const userStore = useUserStore()
const { formatLocalizedCustomDate, dateFormats } = useDateFormat()

// Build the public patient flow URL for a consultation given its access code
const buildConsultationFlowUrl = (consultation: Consultation): string | null => {
  const access = getAccessInfo(consultation)
  const code = access.code
  if (!code) return null
  const baseUrl = window.location.origin
  return `${baseUrl}/flow/${code}`
}

const consultationAccessWindow = (consultation: Consultation) => {
  return getConsultationAccessWindowFromConsultation(consultation, {
    consultationAccessDaysBefore: userStore.consultationAccessDaysBefore,
    consultationAccessDaysAfter: userStore.consultationAccessDaysAfter,
  })
}

const consultationCodeLabel = (consultation: Consultation): string | null => {
  const access = getAccessInfo(consultation)
  return access.code || null
}

const consultationCodeCreatedAt = (consultation: Consultation): string | null => {
  const accessCode = consultation.formAccessCode as unknown
  if (!accessCode || typeof accessCode !== 'object') return null
  const activatedOn = (accessCode as Record<string, unknown>).activatedOn
  return typeof activatedOn === 'string' ? activatedOn : null
}

// Get caseId from route params
const caseId = route.params.caseId as string

// State
const patientCase = ref<GetPatientCaseById200Response['responseObject'] | null>(null)
const patient = ref<Patient | null>(null)
const consultations = ref<Consultation[]>([])
const surgeries = ref<Surgery[]>([])
const caseNotes = ref<Note[]>([])
const savingCaseNotes = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)
const caseNotesEditorRef = ref<{ addNote: () => void } | null>(null)

// Dialog states
const showCreateConsultationDialog = ref(false)
const showBatchConsultationsDialog = ref(false)
const editingConsultation = ref<Consultation | null>(null)
const showCreateSurgeryDialog = ref(false)
const editingSurgery = ref<Surgery | null>(null)

// Delete confirmation dialog states
const showDeleteConfirmDialog = ref(false)
const showCascadeDeleteDialog = ref(false)
const cascadeDeleteConfig = ref<{
  title: string
  warningText: string
  finalWarningText: string
  options: Array<{ key: string; label: string; count: number; defaultChecked: boolean }>
} | null>(null)
const deleteConfirmData = ref<{
  type: 'case' | 'consultation' | 'surgery'
  id: string
  title: string
} | null>(null)
const isDeleting = ref(false)
const movingConsultationId = ref<string | null>(null)
const showMoveConsultationConfirmDialog = ref(false)
const consultationToMove = ref<Consultation | null>(null)

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

// Extract the first department ID from the patient case so that form-template selection
// in CreateEditConsultationDialog is scoped to that department.
const caseDepartmentId = computed<string | undefined>(() => {
  const depts = patientCase.value?.patient?.departments
  if (!depts || !depts.length) return undefined
  const first = depts[0]
  if (typeof first === 'string') return first
  if (first && typeof first === 'object') {
    const departmentRecord = first as Record<string, unknown>
    if (typeof departmentRecord.id === 'string' && departmentRecord.id.length > 0) {
      return departmentRecord.id
    }
    if (typeof departmentRecord._id === 'string' && departmentRecord._id.length > 0) {
      return departmentRecord._id
    }
  }
  return undefined
})

const pastConsultations = computed(() => {
  // Get start of today (midnight) - consultations from today should NOT be considered past
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return consultations.value
    .filter(consultation => new Date(consultation.dateAndTime || '') < startOfToday)
    .sort((a, b) => new Date(b.dateAndTime || '').getTime() - new Date(a.dateAndTime || '').getTime())
})

const futureConsultations = computed(() => {
  // Get start of today (midnight) - consultations from today onwards are considered future/current
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return consultations.value
    .filter(consultation => new Date(consultation.dateAndTime || '') >= startOfToday)
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

    // Load case notes
    if (patientCase.value?.notes) {
      caseNotes.value = Array.isArray(patientCase.value.notes) ? patientCase.value.notes : []
    } else {
      caseNotes.value = []
    }

    console.log('Case data loaded:', {
      case: patientCase.value,
      patient: patient.value,
      consultations: consultations.value,
      surgeries: surgeries.value,
      notes: caseNotes.value
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

// Case notes management
const saveCaseNotes = async (updatedNotes: Note[]) => {
  if (!patientCase.value?.id || !patient.value?.id) {
    return
  }

  savingCaseNotes.value = true
  try {
    // Update the case with new notes
    const response = await patientCaseApi.updatePatientCaseById(
      {
        patientId: patient.value.id,
        caseId: patientCase.value.id,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updatedNotes }),
      }
    )

    if (response.success) {
      caseNotes.value = updatedNotes
      notifierStore.notify(t('patientCaseLanding.notesSaved'), 'success')
      logger.info('Case notes saved successfully', { caseId: patientCase.value.id })
    }
  } catch (err: unknown) {
    logger.error('Failed to save case notes', err)
    notifierStore.notify(t('patientCaseLanding.notesSaveFailed'), 'error')
  } finally {
    savingCaseNotes.value = false
  }
}

const handleCaseNotesUpdated = async (updatedNotes: Note[]) => {
  caseNotes.value = updatedNotes
  await saveCaseNotes(updatedNotes)
}

const addCaseNote = () => {
  caseNotesEditorRef.value?.addNote()
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

const goBack = () => {
  if (patient.value?.id) {
    router.push({
      name: 'patientoverview',
      params: { patientId: patient.value.id }
    })
    return
  }

  router.back()
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

const getConsultationFormFillStatus = (form: Consultation['proms'][number]): string | null => {
  const formRecord = form as Record<string, unknown>
  const patientFormData = formRecord.patientFormData
  if (!patientFormData || typeof patientFormData !== 'object') {
    return null
  }

  const fillStatus = (patientFormData as Record<string, unknown>).fillStatus
  return typeof fillStatus === 'string' ? fillStatus : null
}

const isConsultationCompleted = (consultation: Consultation): boolean => {
  const forms = consultation.proms || []
  if (!forms.length) {
    return false
  }

  return forms.every((form) => {
    const fillStatus = getConsultationFormFillStatus(form)
    return fillStatus === 'complete' || fillStatus === 'completed'
  })
}

const canMoveConsultationToNow = (consultation: Consultation): boolean => {
  const consultationDate = new Date(consultation.dateAndTime || '')
  const now = new Date()

  if (consultationDate > now) {
    return true
  }

  return !isConsultationCompleted(consultation)
}

const initiateMoveConsultationToNow = (consultation: Consultation) => {
  consultationToMove.value = consultation
  showMoveConsultationConfirmDialog.value = true
}

const confirmMoveConsultationToNow = async () => {
  if (!consultationToMove.value) {
    return
  }

  await moveConsultationToNow(consultationToMove.value)
  showMoveConsultationConfirmDialog.value = false
  consultationToMove.value = null
}

const cancelMoveConsultationToNow = () => {
  showMoveConsultationConfirmDialog.value = false
  consultationToMove.value = null
}

const moveConsultationToNow = async (consultation: Consultation) => {
  if (!consultation.id || !patient.value?.id || !canMoveConsultationToNow(consultation)) {
    return
  }

  movingConsultationId.value = consultation.id

  try {
    await consultationApi.updateConsultation({
      patientId: patient.value.id,
      caseId,
      consultationId: consultation.id,
      updateConsultation: {
        dateAndTime: new Date().toISOString(),
      },
    })

    notifierStore.notify(t('patientCaseLanding.consultationMovedToNow'), 'success')
    await loadCaseData()
  } catch (err: unknown) {
    logger.error('Failed to move consultation to now', err)
    notifierStore.notify(t('patientCaseLanding.consultationMoveFailed'), 'error')
  } finally {
    movingConsultationId.value = null
  }
}

// Get consultation status color
const getConsultationStatusColor = (consultation: Consultation): string => {
  const now = new Date()
  const consultationDate = new Date(consultation.dateAndTime || '')

  if (consultationDate > now) {
    return 'info' // Future consultation
  }

  return isConsultationCompleted(consultation) ? 'success' : 'warning'
}

// Get consultation status text
const getConsultationStatusText = (consultation: Consultation): string => {
  const now = new Date()
  const consultationDate = new Date(consultation.dateAndTime || '')

  if (consultationDate > now) {
    return t('patientCaseLanding.scheduled')
  }

  return isConsultationCompleted(consultation)
    ? t('patientCaseLanding.completed')
    : t('patientCaseLanding.scheduled')
}

// Delete handlers
const initiateDelete = (type: 'case' | 'consultation' | 'surgery', id: string, title: string) => {
  deleteConfirmData.value = { type, id, title }

  if (type === 'surgery') {
    showDeleteConfirmDialog.value = true
    return
  }

  if (type === 'consultation') {
    const targetConsultation = consultations.value.find(c => c.id === id)
    cascadeDeleteConfig.value = {
      title: t('consultationOverview.confirmDelete'),
      warningText: t('consultationOverview.deleteWarning'),
      finalWarningText: t('consultationOverview.deleteFinalWarning'),
      options: [
        {
          key: 'deleteForms',
          label: t('cascadeDeleteDialog.formsLabel'),
          count: targetConsultation?.proms?.length || 0,
          defaultChecked: true,
        },
      ],
    }
    showCascadeDeleteDialog.value = true
    return
  }

  const consultationCount = consultations.value.length
  const formCount = consultations.value.reduce((sum, consultation) => sum + (consultation.proms?.length || 0), 0)
  cascadeDeleteConfig.value = {
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

const confirmDelete = async () => {
  if (!deleteConfirmData.value) return

  isDeleting.value = true
  try {
    const { type, id } = deleteConfirmData.value

    if (type === 'surgery') {
      await surgeryApi.deleteSurgeryById({ surgeryId: id })
      notifierStore.notify(t('alerts.surgery.deleted'), 'success')
    }

    // Reload data after deletion
    await loadCaseData()
  } catch (err: unknown) {
    let errorMessage = 'An error occurred'
    if (err instanceof ResponseError) {
      try {
        const errorData = await err.response.clone().json()
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = `HTTP ${err.response.status}`
      }
    } else if (err instanceof Error) {
      errorMessage = err.message
    }

    console.error('Error deleting item:', errorMessage)
    notifierStore.notify(t('alerts.general.deleteFailed'), 'error')
  } finally {
    isDeleting.value = false
    showDeleteConfirmDialog.value = false
    deleteConfirmData.value = null
  }
}

const confirmCascadeDelete = async (selectedOptions: Record<string, boolean>) => {
  if (!deleteConfirmData.value) return

  isDeleting.value = true
  try {
    const { type, id } = deleteConfirmData.value

    if (type === 'consultation') {
      await consultationApi.deleteConsultation(
        { consultationId: id },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deleteForms: selectedOptions.deleteForms === true,
          }),
        },
      )
      notifierStore.notify(t('alerts.consultation.deleted'), 'success')
      await loadCaseData()
    } else if (type === 'case') {
      await patientCaseApi.softDeletePatientCaseById(
        { patientId: patient.value?.id || '', caseId: id },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deleteConsultations: selectedOptions.deleteConsultations === true,
            deleteForms: selectedOptions.deleteForms === true,
          }),
        },
      )
      notifierStore.notify(t('alerts.case.deleted'), 'success')
      router.push({ name: 'patientoverview', params: { patientId: patient.value?.id } })
      return
    }
  } catch (err: unknown) {
    let errorMessage = 'An error occurred'
    if (err instanceof ResponseError) {
      try {
        const errorData = await err.response.clone().json()
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = `HTTP ${err.response.status}`
      }
    } else if (err instanceof Error) {
      errorMessage = err.message
    }

    console.error('Error deleting item:', errorMessage)
    notifierStore.notify(t('alerts.general.deleteFailed'), 'error')
  } finally {
    isDeleting.value = false
    showCascadeDeleteDialog.value = false
    cascadeDeleteConfig.value = null
    deleteConfirmData.value = null
  }
}

const cancelCascadeDelete = () => {
  showCascadeDeleteDialog.value = false
  cascadeDeleteConfig.value = null
  deleteConfirmData.value = null
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
                   @click="goBack"
                   class="me-2"></v-btn>
            {{ t('patientCaseLanding.title') }}
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn
                   @click="openStatistics"
                   color="primary"
                   variant="tonal"
                   prepend-icon="mdi-chart-line">
              {{ t('patientCaseLanding.viewStatistics') }}
            </v-btn>
            <v-btn
                   icon="mdi-trash-can"
                   variant="text"
                   color="error"
                   @click="initiateDelete('case', caseId, caseDisplayName)"
                   :title="t('buttons.delete')">
            </v-btn>
          </div>
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

      <!-- Case Notes -->
      <v-card class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-2">
            <v-icon>mdi-note-multiple</v-icon>
            {{ t('patientCaseLanding.caseNotes') }}
          </div>
          <v-btn
                 color="primary"
                 variant="text"
                 size="small"
                 icon="mdi-plus"
                 @click="addCaseNote"
                 :title="t('patientCaseLanding.addCaseNote')">
          </v-btn>
        </v-card-title>
        <v-card-text>
          <NotesEditor
                      ref="caseNotesEditorRef"
                      :notes="caseNotes"
                      @update:notes="handleCaseNotesUpdated"
                      :title="'patientCaseLanding.caseNotes'"
                      :add-button-text="'patientCaseLanding.addCaseNote'"
                      :hide-add-button="true" />
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
                <v-btn
                       icon="mdi-trash-can"
                       variant="text"
                       size="small"
                       color="error"
                       @click.stop="initiateDelete('surgery', surgery.id || '', safeFormatDate(surgery.surgeryDate, dateFormats.isoDate))"
                       :title="t('buttons.delete')">
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
                <template v-if="buildConsultationFlowUrl(consultation) && consultationCodeLabel(consultation)">
                  <QRCodeDisplay
                    :url="buildConsultationFlowUrl(consultation) || ''"
                    :access-window="consultationAccessWindow(consultation)"
                    :case-id="caseId"
                    :code-created-at="consultationCodeCreatedAt(consultation) || undefined"
                  >
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" size="small" @click.stop :title="t('qrCode.showQRCode')" class="code-label-btn">
                        <v-icon start>mdi-qrcode</v-icon>
                        {{ consultationCodeLabel(consultation) }}
                      </v-btn>
                    </template>
                  </QRCodeDisplay>
                </template>

                <v-btn
                       v-if="canMoveConsultationToNow(consultation)"
                       icon="mdi-clock-edit-outline"
                       variant="text"
                       size="small"
                       color="warning"
                       :loading="movingConsultationId === consultation.id"
                       @click.stop="initiateMoveConsultationToNow(consultation)"
                       :title="t('patientCaseLanding.moveConsultationToNow')">
                </v-btn>
                <v-btn
                       icon="mdi-pencil"
                       variant="text"
                       size="small"
                       @click.stop="openEditConsultationDialog(consultation)"
                       :title="t('patientCaseLanding.editConsultation')">
                </v-btn>
                <v-btn
                       icon="mdi-eye"
                       variant="text"
                       size="small"
                       @click.stop="openConsultationOverview(consultation)"
                       :title="t('patientCaseLanding.viewConsultation')">
                </v-btn>
                <v-btn
                       icon="mdi-trash-can"
                       variant="text"
                       size="small"
                       color="error"
                       @click.stop="initiateDelete('consultation', consultation.id || '', safeFormatDate(consultation.dateAndTime, dateFormats.isoDateTime))"
                       :title="t('buttons.delete')">
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
          <div v-if="!futureConsultations.length" class="d-flex gap-2">
            <v-btn
                   color="primary"
                   variant="text"
                   size="small"
                   @click="openCreateConsultationDialog"
                   prepend-icon="mdi-plus">
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
                <template v-if="buildConsultationFlowUrl(consultation) && consultationCodeLabel(consultation)">
                  <QRCodeDisplay
                    :url="buildConsultationFlowUrl(consultation) || ''"
                    :access-window="consultationAccessWindow(consultation)"
                    :case-id="caseId"
                    :code-created-at="consultationCodeCreatedAt(consultation) || undefined"
                  >
                    <template #activator="{ props }">
                      <v-btn v-bind="props" variant="text" size="small" @click.stop :title="t('qrCode.showQRCode')" class="code-label-btn">
                        <v-icon start>mdi-qrcode</v-icon>
                        {{ consultationCodeLabel(consultation) }}
                      </v-btn>
                    </template>
                  </QRCodeDisplay>
                </template>

                <v-btn
                       v-if="canMoveConsultationToNow(consultation)"
                       icon="mdi-clock-edit-outline"
                       variant="text"
                       size="small"
                       color="warning"
                       :loading="movingConsultationId === consultation.id"
                       @click.stop="initiateMoveConsultationToNow(consultation)"
                       :title="t('patientCaseLanding.moveConsultationToNow')">
                </v-btn>
                <v-btn
                       icon="mdi-pencil"
                       variant="text"
                       size="small"
                       @click.stop="openEditConsultationDialog(consultation)"
                       :title="t('patientCaseLanding.editConsultation')">
                </v-btn>
                <v-btn
                       icon="mdi-eye"
                       variant="text"
                       size="small"
                       @click.stop="openConsultationOverview(consultation)"
                       :title="t('patientCaseLanding.viewConsultation')">
                </v-btn>
                <v-btn
                       icon="mdi-trash-can"
                       variant="text"
                       size="small"
                       color="error"
                       @click.stop="initiateDelete('consultation', consultation.id || '', safeFormatDate(consultation.dateAndTime, dateFormats.isoDateTime))"
                       :title="t('buttons.delete')">
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
                                    :department-id="caseDepartmentId"
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

    <!-- Delete Confirmation Dialog -->
    <v-dialog
              v-model="showDeleteConfirmDialog"
              max-width="500px">
      <v-card v-if="deleteConfirmData">
        <v-card-title class="d-flex align-center gap-2">
          <v-icon color="error">mdi-alert</v-icon>
          {{ t('alerts.general.confirmDeletion') }}
        </v-card-title>

        <v-card-text class="py-6">
          <p v-if="deleteConfirmData.type === 'consultation'" class="mb-2">
            {{ t('alerts.consultation.confirmDelete') }}
          </p>
          <p v-else-if="deleteConfirmData.type === 'surgery'" class="mb-2">
            {{ t('alerts.surgery.confirmDelete') }}
          </p>
          <p class="text-grey text-sm font-weight-bold mt-4">
            {{ deleteConfirmData.title }}
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
                 variant="text"
                 @click="showDeleteConfirmDialog = false"
                 :disabled="isDeleting">
            {{ t('buttons.cancel') }}
          </v-btn>
          <v-btn
                 color="error"
                 variant="tonal"
                 @click="confirmDelete"
                 :loading="isDeleting">
            {{ t('buttons.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CascadeDeleteDialog
                         v-if="cascadeDeleteConfig"
                         v-model="showCascadeDeleteDialog"
                         :title="cascadeDeleteConfig.title"
                         :warning-text="cascadeDeleteConfig.warningText"
                         :final-warning-text="cascadeDeleteConfig.finalWarningText"
                         :options="cascadeDeleteConfig.options"
                         :loading="isDeleting"
                         @cancel="cancelCascadeDelete"
                         @confirm="confirmCascadeDelete" />

    <v-dialog
              v-model="showMoveConsultationConfirmDialog"
              max-width="500px">
      <v-card v-if="consultationToMove">
        <v-card-title class="d-flex align-center gap-2">
          <v-icon color="warning">mdi-clock-edit-outline</v-icon>
          {{ t('patientCaseLanding.confirmMoveConsultationTitle') }}
        </v-card-title>

        <v-card-text class="py-6">
          <p class="mb-2">
            {{ t('patientCaseLanding.confirmMoveConsultationMessage') }}
          </p>
          <p class="text-grey text-sm font-weight-bold mt-4">
            {{ safeFormatDate(consultationToMove.dateAndTime, dateFormats.isoDateTime) }}
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
                 variant="text"
                 @click="cancelMoveConsultationToNow"
                 :disabled="movingConsultationId === consultationToMove.id">
            {{ t('buttons.cancel') }}
          </v-btn>
          <v-btn
                 color="warning"
                 variant="tonal"
                 @click="confirmMoveConsultationToNow"
                 :loading="movingConsultationId === consultationToMove.id">
            {{ t('patientCaseLanding.moveConsultationToNow') }}
          </v-btn>
        </v-card-actions>
      </v-card>
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

.code-label-btn :deep(.v-btn__content) {
  text-transform: none;
}
</style>