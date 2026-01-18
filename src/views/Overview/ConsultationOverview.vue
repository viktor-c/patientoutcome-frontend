<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import { useNotifierStore } from '@/stores/notifierStore'

import {
  ResponseError,
  type FindAllCodes200ResponseResponseObjectInnerConsultationId,
  type FindAllCodes200ResponseResponseObjectInnerConsultationIdPromsInner,
  type Note,
  type UserNoPassword
} from '@/api'
import { consultationApi, userApi, kioskApi, codeApi } from '@/api'
import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'

const componentName = 'ConsultationOverview.vue'
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const notifierStore = useNotifierStore()
const { formatLocalizedCustomDate } = useDateFormat()

// Get consultationId from route params
const consultationId = route.params.consultationId as string

// State
const consultation = ref<FindAllCodes200ResponseResponseObjectInnerConsultationId | null>(null)
const previousConsultations = ref<FindAllCodes200ResponseResponseObjectInnerConsultationId[]>([])
const loading = ref(true)
const deleteDialog = ref(false)
const confirmDeleteDialog = ref(false)
const showEditDialog = ref(false)
const editingNoteIndex = ref<number | null>(null)
const editedNote = ref<string>('')
const kioskUsers = ref<UserNoPassword[]>([])
const selectedKioskUser = ref<string | null>(null)
const assigningKiosk = ref(false)
type CodeItem = { _id?: string | null; id?: string | null; code: string; isCreateNew?: boolean }
const availableCodes = ref<CodeItem[]>([])
const selectedCode = ref<string | null>(null)
const assigningCode = ref(false)

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = 'DD.MM.YYYY HH:mm'): string => {
  if (!date) return t('common.notAvailable')
  return formatLocalizedCustomDate(date, format)
}

// Computed properties
// Note: Using type assertion for patientCaseId because API returns populated object despite type definition saying string
type PopulatedPatientCase = {
  patient?: { _id: string; externalPatientId?: string[] }
  _id: string
  externalId?: string | string[]
}

const patientId = computed(() => {
  const patientCaseId = consultation.value?.patientCaseId as unknown as PopulatedPatientCase
  const ids = patientCaseId?.patient?.externalPatientId
  if (ids && Array.isArray(ids)) {
    return ids.join(', ')
  }
  return t('common.notAvailable')
})
const caseId = computed(() => {
  const patientCaseId = consultation.value?.patientCaseId as unknown as PopulatedPatientCase
  const ids = patientCaseId?.externalId
  if (ids && Array.isArray(ids)) {
    return ids.join(', ')
  } else if (ids) {
    return ids
  }
  return t('common.notAvailable')
})

// Route IDs for linking (extract internal ids when needed for navigation)
const patientRouteId = computed(() => {
  const patientCaseId = consultation.value?.patientCaseId as unknown as PopulatedPatientCase
  return patientCaseId?.patient?._id
})

const caseRouteId = computed(() => {
  const patientCaseId = consultation.value?.patientCaseId as unknown as PopulatedPatientCase
  return patientCaseId?._id
})

// Load consultation data
onMounted(async () => {
  try {
    // Fetch consultation details
    const consultationResponse = await consultationApi.getConsultationById({ consultationId })
    consultation.value = consultationResponse.responseObject || null

    // Fetch kiosk users for assignment dropdown
    await fetchKioskUsers()

    // Fetch available codes for assignment
    await fetchAvailableCodes()

    // For now, we'll skip loading previous consultations since we'd need the patientId
    // This can be added later if needed
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to load consultation:`, errorMessage)
    notifierStore.notify(t('consultationOverview.loadError'), 'error')
  } finally {
    loading.value = false
  }
})

// Navigation functions
const openForm = (formId: string | null | undefined) => {
  if (formId) {
    router.push({ name: 'reviewform', params: { formId } })
  }
}

const openConsultation = (consultationId: string | null | undefined) => {
  if (consultationId) {
    router.push({ name: 'consultationoverview', params: { consultationId } })
  }
}

const goBack = () => {
  router.back()
}

// Edit consultation
const editConsultation = () => {
  // Open the edit dialog which reuses CreateEditConsultationDialog.vue
  if (!consultation.value) return
  showEditDialog.value = true
}

// Handler after dialog submit (refresh consultation)
const onEditSubmit = async () => {
  showEditDialog.value = false
  // refresh the consultation from API to get canonical state (forms, codes, etc.)
  try {
    loading.value = true
    const resp = await consultationApi.getConsultationById({ consultationId })
    consultation.value = resp.responseObject || null
    notifierStore.notify(t('alerts.consultation.updated'), 'success')
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to refresh consultation after edit:`, errorMessage)
    notifierStore.notify(t('consultationOverview.loadError'), 'error')
  } finally {
    loading.value = false
  }
}

// Delete consultation - first confirmation
const initiateDelete = () => {
  deleteDialog.value = true
}

// Delete consultation - second confirmation
const confirmDelete = () => {
  deleteDialog.value = false
  confirmDeleteDialog.value = true
}

// Actually delete the consultation
const deleteConsultation = async () => {
  try {
    await consultationApi.deleteConsultation({ consultationId })
    notifierStore.notify(t('consultationOverview.deleteSuccess'), 'success')
    confirmDeleteDialog.value = false
    // Navigate back to previous page or patient case
    router.back()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to delete consultation:`, errorMessage)
    notifierStore.notify(t('consultationOverview.deleteError'), 'error')
    confirmDeleteDialog.value = false
  }
}

// Cancel delete
const cancelDelete = () => {
  deleteDialog.value = false
  confirmDeleteDialog.value = false
}

// Notes management
const addNote = () => {
  if (!consultation.value) return
  consultation.value.notes = consultation.value.notes || []
  const newNote: Note = {
    dateCreated: null,
    createdBy: null,
    dateModified: null,
    note: '',
  }
  consultation.value.notes.push(newNote)
  editingNoteIndex.value = consultation.value.notes.length - 1
  editedNote.value = ''
}

const editNote = (index: number) => {
  if (!consultation.value?.notes) return
  editingNoteIndex.value = index
  editedNote.value = (consultation.value.notes[index] as Note).note || ''
}

const saveNote = async (index: number) => {
  if (!consultation.value?.notes || editingNoteIndex.value === null) return

  const note = consultation.value.notes[index] as Note
  if (note.dateCreated) {
    note.dateModified = new Date().toISOString()
  } else {
    note.dateCreated = new Date().toISOString()
  }
  note.note = editedNote.value

  // Save to backend
  try {
    // Map notes to match the API type (createdBy: string | undefined instead of string | null | undefined)
    const mappedNotes = consultation.value.notes.map(note => ({
      ...note,
      createdBy: note.createdBy ?? undefined
    }))

    await consultationApi.updateConsultation({
      patientId: patientRouteId.value as string,
      caseId: caseRouteId.value as string,
      consultationId,
      updateConsultation: { notes: mappedNotes }
    })
    notifierStore.notify(t('consultationOverview.noteUpdated'), 'success')
    editingNoteIndex.value = null
    editedNote.value = ''
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to save note:`, errorMessage)
    notifierStore.notify(t('consultationOverview.noteSaveError'), 'error')
  }
}

const cancelNoteEdit = () => {
  editingNoteIndex.value = null
  editedNote.value = ''
}

const deleteNote = async (index: number) => {
  if (!consultation.value?.notes) return

  consultation.value.notes.splice(index, 1)

  // Save to backend
  try {
    // Map notes to match the API type (createdBy: string | undefined instead of string | null | undefined)
    const mappedNotes = consultation.value.notes.map(note => ({
      ...note,
      createdBy: note.createdBy ?? undefined
    }))

    await consultationApi.updateConsultation({
      patientId: patientRouteId.value as string,
      caseId: caseRouteId.value as string,
      consultationId,
      updateConsultation: { notes: mappedNotes }
    })
    notifierStore.notify(t('consultationOverview.noteDeleted'), 'success')
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to delete note:`, errorMessage)
    notifierStore.notify(t('consultationOverview.noteDeleteError'), 'error')
  }
}

// Kiosk management
const fetchKioskUsers = async () => {
  try {
    // Fetch ALL kiosk users, we'll filter on frontend
    const response = await userApi.getAllKioskUsers()
    kioskUsers.value = response.responseObject || []
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      try {
        errorMessage = (await error.response.json()).message
      } catch {
        // ignore JSON parse error
      }
    }
    console.error('Failed to fetch kiosk users:', errorMessage)
    // Notify the user and clear kiosk-related state so UI doesn't show stale data
    kioskUsers.value = []
    selectedKioskUser.value = null
  }
}

// Get the currently assigned kiosk user (if any)
type PopulatedKiosk = { _id?: string; id?: string } | string
const assignedKiosks = computed(() => {
  if (!consultation.value?.kioskId) return []
  // Normalize kiosk id (API sometimes returns a string or populated object)
  const kid = consultation.value.kioskId as PopulatedKiosk
  const kioskIdStr = typeof kid === 'string' ? kid : (kid?._id ?? kid?.id ?? null)
  if (!kioskIdStr) return []
  return kioskUsers.value.filter(user => user.id === kioskIdStr)
})

// Get available (unassigned) kiosk users
const availableKiosks = computed(() => {
  if (!consultation.value?.kioskId) {
    // No kiosk assigned, all fetched kiosks are available
    return kioskUsers.value
  }
  const kid = consultation.value.kioskId as PopulatedKiosk
  const kioskIdStr = typeof kid === 'string' ? kid : (kid?._id ?? kid?.id ?? null)
  if (!kioskIdStr) return kioskUsers.value
  return kioskUsers.value.filter(user => user.id !== kioskIdStr)
})

const assignKiosk = async () => {
  if (!selectedKioskUser.value || !consultation.value?.id) return

  try {
    assigningKiosk.value = true
    await kioskApi.setConsultation({
      kioskUserId: selectedKioskUser.value,
      consultationId: consultation.value.id
    })
    notifierStore.notify(t('consultationOverview.kioskAssigned'), 'success')
    // Refresh consultation to get updated kiosk info
    const resp = await consultationApi.getConsultationById({ consultationId })
    consultation.value = resp.responseObject || null
    // Reset selected user and refresh available users
    selectedKioskUser.value = null
    await fetchKioskUsers()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to assign kiosk:`, errorMessage)
    notifierStore.notify(t('consultationOverview.kioskAssignError'), 'error')
  } finally {
    assigningKiosk.value = false
  }
}

// Automatically assign when a kiosk is selected from the dropdown
watch(selectedKioskUser, async (newVal) => {
  if (!newVal) return
  // assignKiosk will clear selectedKioskUser when done
  await assignKiosk()
})

const revokeKiosk = async () => {
  if (!consultation.value?.kioskId) return

  try {
    assigningKiosk.value = true
    // Normalize kiosk user id (could be string or populated object)
    const kid = consultation.value.kioskId as unknown
    const kioskUserId = typeof kid === 'string'
      ? kid
      : (kid && typeof kid === 'object')
        ? ((kid as Record<string, unknown>)['_id'] as string | undefined) ?? ((kid as Record<string, unknown>)['id'] as string | undefined) ?? null
        : null
    if (!kioskUserId) {
      throw new Error('No kiosk user id available to revoke')
    }
    await kioskApi.deleteConsultationFor({ kioskUserId: kioskUserId as string })
    notifierStore.notify(t('consultationOverview.kioskRevoked'), 'success')
    // Refresh consultation
    const resp = await consultationApi.getConsultationById({ consultationId })
    consultation.value = resp.responseObject || null
    selectedKioskUser.value = null
    // Refresh available users list
    await fetchKioskUsers()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to revoke kiosk:`, errorMessage)
    notifierStore.notify(t('consultationOverview.kioskRevokeError'), 'error')
  } finally {
    assigningKiosk.value = false
  }
}// Code management
const fetchAvailableCodes = async () => {
  try {
    const response = await codeApi.getAllAvailableCodes()
    availableCodes.value = response.responseObject || []
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      try {
        errorMessage = (await error.response.json()).message
      } catch {
        // ignore JSON parse error
      }
    }
    console.error('Failed to fetch available codes:', errorMessage)
    availableCodes.value = []
  }
}

// Get the currently assigned code (if any)
type PopulatedCode = { code?: string; _id?: string; id?: string } | string
const assignedCode = computed(() => {
  if (!consultation.value?.formAccessCode) return null

  // The formAccessCode field is now populated by the backend
  const code = consultation.value.formAccessCode as PopulatedCode

  // If it's a string (ObjectId not populated), return it as-is
  if (typeof code === 'string') {
    return code
  }

  // If it's a populated object, extract the 'code' field (the actual code string like "NNn44")
  return code?.code || null
})

// Get available (unassigned) codes
const availableCodesForSelection = computed(() => {
  // If there's an assigned code, filter it out from available codes
  const currentAssignedCode = assignedCode.value
  if (!currentAssignedCode) {
    // No code assigned, all fetched codes are available
    return availableCodes.value
  }
  // Filter out the currently assigned code
  return availableCodes.value.filter(code => {
    const codeStr = typeof code === 'string' ? code : code?.code || code?.id || code?._id
    return codeStr !== currentAssignedCode
  })
})

const assignCode = async () => {
  if (!selectedCode.value || !consultation.value?.id) return

  try {
    assigningCode.value = true
    await codeApi.activateCode({ code: selectedCode.value, consultationId: consultation.value.id })
    notifierStore.notify(t('consultationOverview.codeAssigned'), 'success')
    // Reset selected code first to prevent watch from re-triggering
    selectedCode.value = null
    // Refresh consultation to get updated code info
    const resp = await consultationApi.getConsultationById({ consultationId })
    consultation.value = resp.responseObject || null
    // Refresh available codes
    await fetchAvailableCodes()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      try {
        errorMessage = (await error.response.json()).message
      } catch {
        errorMessage = error.response.statusText || errorMessage
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`${componentName}: Failed to assign code:`, errorMessage)
    notifierStore.notify(t('consultationOverview.codeAssignError'), 'error')
  } finally {
    assigningCode.value = false
  }
}

// Special value for creating a new code
const CREATE_NEW_CODE = '__CREATE_NEW_CODE__'

// Create a new code and assign it to the consultation
const createAndAssignNewCode = async () => {
  if (!consultation.value?.id) return

  try {
    assigningCode.value = true
    // Create a new code
    const response = await codeApi.addCodes({ numberOfCodes: 1 })
    const newCodes = response.responseObject || []
    if (newCodes.length === 0) {
      throw new Error('Failed to create new code')
    }
    const newCode = newCodes[0].code
    
    await codeApi.activateCode({ code: newCode, consultationId: consultation.value.id })
    
    notifierStore.notify(t('consultationOverview.codeCreatedAndAssigned'), 'success')
    // Reset selected code first to prevent watch from re-triggering
    selectedCode.value = null
    // Refresh consultation to get updated code info
    const resp = await consultationApi.getConsultationById({ consultationId })
    consultation.value = resp.responseObject || null
    // Refresh available codes
    await fetchAvailableCodes()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error(`${componentName}: Failed to create and assign code:`, errorMessage)
    notifierStore.notify(t('consultationOverview.codeCreateError'), 'error')
  } finally {
    assigningCode.value = false
  }
}

// Automatically assign when a code is selected from the dropdown
watch(selectedCode, async (newVal) => {
  if (!newVal || assigningCode.value) return
  if (newVal === CREATE_NEW_CODE) {
    await createAndAssignNewCode()
  } else {
    // assignCode will clear selectedCode when done
    await assignCode()
  }
})

const revokeCode = async () => {
  if (!consultation.value?.formAccessCode) return

  try {
    assigningCode.value = true
    // Normalize code (could be string or populated object)
    const codeVal = consultation.value.formAccessCode as unknown
    const codeStr = typeof codeVal === 'string'
      ? codeVal
      : (codeVal && typeof codeVal === 'object')
        ? ((codeVal as Record<string, unknown>)['code'] as string | undefined) ?? ((codeVal as Record<string, unknown>)['_id'] as string | undefined) ?? null
        : null
    if (!codeStr) {
      throw new Error('No code available to revoke')
    }
    await codeApi.deactivateCode({ code: codeStr })
    notifierStore.notify(t('consultationOverview.codeRevoked'), 'success')
    // Refresh consultation
    const resp = await consultationApi.getConsultationById({ consultationId })
    consultation.value = resp.responseObject || null
    selectedCode.value = null
    // Refresh available codes list
    await fetchAvailableCodes()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName}: Failed to revoke code:`, errorMessage)
    notifierStore.notify(t('consultationOverview.codeRevokeError'), 'error')
  } finally {
    assigningCode.value = false
  }
}// Get form scores
const getFormScore = (form: FindAllCodes200ResponseResponseObjectInnerConsultationIdPromsInner): string => {
  if (form.scoring?.total?.rawScore !== undefined && form.scoring?.total?.rawScore !== null) {
    return form.scoring.total.rawScore.toString()
  }
  return t('common.notAvailable')
}

// Get form status color
const getFormStatusColor = (status: string | undefined): string => {
  if (!status) return 'grey'
  switch (status) {
    case 'completed': return 'success'
    case 'incomplete': return 'warning'
    case 'draft': return 'info'
    default: return 'grey'
  }
}
</script>

<template>
  <v-container>
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4">{{ t('consultationOverview.loading') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="!consultation" class="text-center py-8">
      <v-icon color="error" size="64">mdi-alert-circle</v-icon>
      <h2 class="mt-4">{{ t('consultationOverview.notFound') }}</h2>
      <v-btn @click="goBack" class="mt-4">{{ t('notFound.goBack') }}</v-btn>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Header -->
      <v-card class="mb-6">
        <v-card-title class="d-flex align-center">
          <v-btn
                 icon="mdi-arrow-left"
                 variant="text"
                 @click="goBack"
                 class="me-2"></v-btn>
          {{ t('consultationOverview.title') }}
        </v-card-title>

        <v-card-text>
          <!-- Consultation Info -->
          <v-row>
            <v-col cols="12" md="6">
              <h3>{{ t('consultationOverview.consultationDetails') }}</h3>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-identifier</v-icon>
                  </template>
                  <v-list-item-title>{{ t('consultationOverview.consultationId') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ consultation.id || t('common.notAvailable') }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-calendar</v-icon>
                  </template>
                  <v-list-item-title>{{ t('consultationOverview.consultationDate') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ safeFormatDate(consultation.dateAndTime) }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-clipboard-text</v-icon>
                  </template>
                  <v-list-item-title>{{ t('consultationOverview.reasonForConsultation') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                            v-for="reason in consultation.reasonForConsultation"
                            :key="reason"
                            size="small"
                            class="me-1">
                      {{ reason }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="4">
              <h3>{{ t('consultationOverview.patientCaseDetails') }}</h3>
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  <v-list-item-title>{{ t('consultationOverview.patientId') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <router-link :to="{ name: 'patientoverview', params: { patientId: patientRouteId as string } }">
                      {{ patientId }}
                    </router-link>
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-icon>mdi-folder</v-icon>
                  </template>
                  <v-list-item-title>{{ t('consultationOverview.caseId') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <router-link :to="{ name: 'patientcaselanding', params: { caseId: caseRouteId as string } }">
                      {{ caseId }}
                    </router-link>
                  </v-list-item-subtitle>
                </v-list-item>
                <router-link :to="{ name: 'formview', params: { consultationId: consultation.id } }">
                  <v-list-item>
                    <template #prepend>
                      <v-icon>mdi-eye</v-icon>
                    </template>
                    <v-list-item-title>{{ t('consultationOverview.viewInFormView') }}</v-list-item-title>
                  </v-list-item>
                </router-link>
              </v-list>
            </v-col>

            <v-col cols="12" md="2">
              <h3>{{ t('consultationOverview.actions') }}</h3>
              <div class="d-flex flex-column gap-2 mt-4">
                <v-btn
                       color="primary"
                       variant="tonal"
                       @click="editConsultation"
                       prepend-icon="mdi-pencil"
                       block>
                  {{ t('consultationOverview.edit') }}
                </v-btn>
                <v-btn
                       color="error"
                       variant="tonal"
                       @click="initiateDelete"
                       prepend-icon="mdi-delete"
                       block>
                  {{ t('consultationOverview.delete') }}
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Current Consultation Forms -->
      <v-card class="mb-6" v-if="consultation.proms?.length">
        <v-card-title>
          <v-icon class="me-2">mdi-form-select</v-icon>
          {{ t('consultationOverview.currentConsultationForms') }}
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col
                   v-for="(form, index) in consultation.proms"
                   :key="form.id || `form-${index}`"
                   cols="12"
                   md="6"
                   lg="4">
              <v-card variant="outlined" class="h-100">
                <v-card-title class="text-subtitle-1">
                  {{ form.title || t('forms.consultation.untitledForm') }}
                </v-card-title>
                <v-card-text>
                  <v-chip
                          :color="getFormStatusColor(form.formFillStatus)"
                          size="small"
                          class="mb-2">
                    {{ form.formFillStatus }}
                  </v-chip>
                  <p class="text-body-2 mb-2">
                    <strong>{{ t('consultationOverview.score') }}:</strong> {{ getFormScore(form) }}
                  </p>
                  <p class="text-body-2 mb-2" v-if="form.completedAt">
                    <strong>{{ t('consultationOverview.completedAt') }}:</strong>
                    {{ safeFormatDate(form.completedAt, 'DD.MM.YYYY HH:mm') }}
                  </p>
                  <p class="text-body-2 mb-2" v-if="form.updatedAt">
                    <strong>{{ t('consultationOverview.lastUpdated') }}:</strong>
                    {{ safeFormatDate(form.updatedAt, 'DD.MM.YYYY HH:mm') }}
                  </p>
                </v-card-text>
                <v-card-actions>
                  <v-btn
                         color="primary"
                         variant="text"
                         @click="openForm(form.id)"
                         :disabled="!form.id">
                    {{ t('consultationOverview.reviewForm') }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Notes -->
      <v-card class="mb-6">
        <v-card-title>
          <v-icon class="me-2">mdi-note-text</v-icon>
          {{ t('consultationOverview.notes') }}
        </v-card-title>
        <v-card-text>
          <v-list v-if="consultation.notes?.length">
            <div v-for="(note, index) in consultation.notes" :key="note.id || `note-${index}`" class="mb-3">
              <!-- Display mode -->
              <v-list-item v-if="editingNoteIndex !== index">
                <v-list-item-title>{{ note.note }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ safeFormatDate(note.dateCreated, 'DD.MM.YYYY HH:mm') }}
                  <span v-if="note.dateModified"> • {{ t('common.updated') }}: {{ safeFormatDate(note.dateModified,
                    'DD.MM.YYYY HH:mm') }}</span>
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                         icon="mdi-pencil"
                         variant="text"
                         size="small"
                         @click="editNote(index)"></v-btn>
                  <v-btn
                         icon="mdi-delete"
                         variant="text"
                         size="small"
                         color="error"
                         @click="deleteNote(index)"></v-btn>
                </template>
              </v-list-item>

              <!-- Edit mode -->
              <div v-else class="px-4">
                <v-textarea
                            v-model="editedNote"
                            :label="t('consultationOverview.editNote')"
                            rows="3"
                            variant="outlined"
                            density="compact"></v-textarea>
                <div class="d-flex gap-2 mt-2">
                  <v-btn
                         color="primary"
                         variant="tonal"
                         size="small"
                         @click="saveNote(index)">
                    {{ t('consultationOverview.saveNote') }}
                  </v-btn>
                  <v-btn
                         variant="text"
                         size="small"
                         @click="cancelNoteEdit">
                    {{ t('consultationOverview.cancelNote') }}
                  </v-btn>
                </div>
              </div>
            </div>
          </v-list>
          <p v-else class="text-body-2 text-medium-emphasis">{{ t('consultationOverview.noNotes') }}</p>

          <v-btn
                 color="primary"
                 variant="tonal"
                 prepend-icon="mdi-plus"
                 class="mt-4"
                 @click="addNote">
            {{ t('consultationOverview.addNote') }}
          </v-btn>
        </v-card-text>
      </v-card>

      <!-- Kiosk Assignment -->
      <v-card class="mb-6">
        <v-card-title>
          <v-icon class="me-2">mdi-monitor</v-icon>
          {{ t('consultationOverview.kioskAssignment') }}
        </v-card-title>
        <v-card-text>
          <!-- List of assigned kiosk users -->
          <div v-if="assignedKiosks.length > 0" class="mb-6">
            <h4 class="mb-3">{{ t('consultationOverview.assignedKiosks') }}</h4>
            <v-list>
              <v-list-item
                           v-for="kiosk in assignedKiosks"
                           :key="kiosk.id ?? 'assigned-kiosk'"
                           class="border rounded-lg mb-2">
                <template #prepend>
                  <v-icon class="me-2">mdi-monitor</v-icon>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ kiosk.name }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="text-caption">
                    {{ t('consultationOverview.username') }}: {{ kiosk.username }}
                  </div>
                  <div class="text-caption">
                    {{ t('consultationOverview.email') }}: {{ kiosk.email }}
                  </div>
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                         color="error"
                         variant="tonal"
                         icon="mdi-delete"
                         size="small"
                         @click="revokeKiosk"
                         :disabled="assigningKiosk"
                         :loading="assigningKiosk"></v-btn>
                </template>
              </v-list-item>
            </v-list>

            <!-- Add another kiosk option -->
            <div class="mt-4">
              <h4 class="mb-3">{{ t('consultationOverview.assignAdditionalKiosk') }}</h4>
              <p class="text-caption text-medium-emphasis mt-2">{{
                t('consultationOverview.selectionAssignsImmediately')
              }}</p>
              <v-row>
                <v-col cols="12" md="8">
                  <v-autocomplete
                                  v-model="selectedKioskUser"
                                  :items="availableKiosks"
                                  :label="t('consultationOverview.selectKiosk')"
                                  item-title="username"
                                  item-value="id"
                                  variant="outlined"
                                  density="compact"
                                  :disabled="assigningKiosk || availableKiosks.length === 0"
                                  clearable>
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props">
                        <v-list-item-title>{{ item.raw.username }}</v-list-item-title>
                        <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-autocomplete>

                </v-col>

                <v-col cols="12" md="4">
                </v-col>
              </v-row>
            </div>
          </div>

          <!-- Show dropdown to assign initial kiosk (no kiosks assigned yet) -->
          <div v-else>
            <!-- Show message when no kiosks are available -->
            <div v-if="kioskUsers.length === 0" class="text-center py-4">
              <p class="text-body-2 text-medium-emphasis">
                {{ t('consultationOverview.noKiosksAvailable') }}
              </p>
            </div>

            <!-- Show dropdown and assign button when kiosks are available -->
            <div v-else>
              <p class="text-body-2 text-medium-emphasis mb-4">
                {{ t('consultationOverview.noKiosksAssigned') }}
              </p>
              <v-row>
                <v-col cols="12" md="8">
                  <v-autocomplete
                                  v-model="selectedKioskUser"
                                  :items="availableKiosks"
                                  :label="t('consultationOverview.selectKiosk')"
                                  item-title="username"
                                  item-value="id"
                                  variant="outlined"
                                  density="compact"
                                  :disabled="assigningKiosk"
                                  clearable>
                    <template #item="{ props, item }">
                      <v-list-item v-bind="props">
                        <v-list-item-title>{{ item.raw.username }}</v-list-item-title>
                        <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                  <p class="text-caption text-medium-emphasis mt-2">{{
                    t('consultationOverview.selectionAssignsImmediately')
                  }}</p>
                </v-col>

                <v-col cols="12" md="4">
                </v-col>
              </v-row>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Code Assignment -->
      <v-card class="mb-6">
        <v-card-title>
          <v-icon class="me-2">mdi-barcode</v-icon>
          {{ t('consultationOverview.codeAssignment') }}
        </v-card-title>
        <v-card-text>
          <!-- List of assigned code -->
          <div v-if="assignedCode" class="mb-6">
            <h4 class="mb-3">{{ t('consultationOverview.assignedCode') }}</h4>
            <v-list>
              <v-list-item class="border rounded-lg mb-2">
                <template #prepend>
                  <v-icon class="me-2">mdi-barcode</v-icon>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ assignedCode }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="text-caption">
                    {{ t('consultationOverview.codeStatus') }}: {{ t('consultationOverview.active') }}
                  </div>
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                         color="error"
                         variant="tonal"
                         icon="mdi-delete"
                         size="small"
                         @click="revokeCode"
                         :disabled="assigningCode"
                         :loading="assigningCode"></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <!-- Show dropdown to assign initial code (no code assigned yet) -->
          <div v-else>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ t('consultationOverview.noCodesAssigned') }}
            </p>
            <v-row>
              <v-col cols="12" md="8">
                <v-autocomplete
                                v-model="selectedCode"
                                :items="[{ code: CREATE_NEW_CODE, isCreateNew: true }, ...availableCodesForSelection]"
                                :label="t('consultationOverview.selectCode')"
                                item-title="code"
                                item-value="code"
                                variant="outlined"
                                density="compact"
                                :disabled="assigningCode"
                                clearable>
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :title="undefined">
                      <template v-if="item.raw.isCreateNew">
                        <v-list-item-title class="text-primary font-weight-medium">
                          <v-icon class="me-2">mdi-plus</v-icon>
                          {{ t('consultationOverview.createNewCode') }}
                        </v-list-item-title>
                      </template>
                      <template v-else>
                        <v-list-item-title>{{ item.raw.code }}</v-list-item-title>
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <span v-if="item.raw.isCreateNew">{{ t('consultationOverview.createNewCode') }}</span>
                    <span v-else>{{ item.raw.code }}</span>
                  </template>
                </v-autocomplete>
                <p class="text-caption text-medium-emphasis mt-2">{{
                  t('consultationOverview.selectionAssignsImmediately')
                }}</p>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
      </v-card> <!-- Previous Consultations -->
      <v-card v-if="previousConsultations.length">
        <v-card-title>
          <v-icon class="me-2">mdi-history</v-icon>
          {{ t('consultationOverview.previousConsultations') }}
        </v-card-title>
        <v-card-text>
          <v-expansion-panels variant="accordion">
            <v-expansion-panel
                               v-for="(prevConsultation, index) in previousConsultations"
                               :key="prevConsultation.id || `consultation-${index}`">
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon class="me-2">mdi-calendar</v-icon>
                  {{ safeFormatDate(prevConsultation.dateAndTime) }}
                  <v-spacer></v-spacer>
                  <v-chip
                          v-if="prevConsultation.proms?.length"
                          size="small"
                          class="me-2">
                    {{ prevConsultation.proms.length }} {{ t('consultationOverview.forms') }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="mb-4">
                  <p><strong>{{ t('consultationOverview.consultationId') }}:</strong> {{ prevConsultation.id }}</p>
                  <p v-if="prevConsultation.reasonForConsultation?.length">
                    <strong>{{ t('consultationOverview.reasonForConsultation') }}:</strong>
                    <v-chip
                            v-for="reason in prevConsultation.reasonForConsultation"
                            :key="reason"
                            size="small"
                            class="me-1 ms-1">
                      {{ reason }}
                    </v-chip>
                  </p>
                </div>

                <!-- Previous Consultation Forms -->
                <div v-if="prevConsultation.proms?.length">
                  <h4 class="mb-3">{{ t('consultationOverview.forms') }}</h4>
                  <v-row>
                    <v-col
                           v-for="(form, formIndex) in prevConsultation.proms"
                           :key="form.id || `prev-form-${formIndex}`"
                           cols="12"
                           md="6">
                      <v-card variant="outlined" size="small">
                        <v-card-text class="py-2">
                          <div class="d-flex align-center justify-space-between">
                            <div>
                              <p class="text-body-2 font-weight-medium mb-1">
                                {{ form.title || t('forms.consultation.untitledForm') }}
                              </p>
                              <div class="d-flex align-center gap-2">
                                <v-chip
                                        :color="getFormStatusColor(form.formFillStatus)"
                                        size="x-small">
                                  {{ form.formFillStatus }}
                                </v-chip>
                                <span class="text-caption">
                                  {{ t('consultationOverview.score') }}: {{ getFormScore(form) }}
                                </span>
                              </div>
                            </div>
                            <v-btn
                                   color="primary"
                                   variant="text"
                                   size="small"
                                   @click="openForm(form.id)"
                                   :disabled="!form.id">
                              {{ t('consultationOverview.review') }}
                            </v-btn>
                          </div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                </div>

                <v-btn
                       class="mt-3"
                       color="primary"
                       variant="outlined"
                       @click="openConsultation(prevConsultation.id)">
                  {{ t('consultationOverview.viewFullConsultation') }}
                </v-btn>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>
    </div>

    <!-- Edit Consultation Modal Dialog -->
    <v-dialog v-model="showEditDialog" max-width="900">
      <CreateEditConsultationDialog
                                    :patientId="patientRouteId as string"
                                    :caseId="caseRouteId as string"
                                    :consultation="consultation"
                                    @submit="onEditSubmit"
                                    @cancel="showEditDialog = false" />
    </v-dialog>

    <!-- First Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="warning" class="me-2">mdi-alert</v-icon>
          {{ t('consultationOverview.confirmDelete') }}
        </v-card-title>
        <v-card-text>
          {{ t('consultationOverview.deleteWarning') }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelDelete">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="warning" variant="text" @click="confirmDelete">
            {{ t('common.continue') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Second Delete Confirmation Dialog -->
    <v-dialog v-model="confirmDeleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="error" class="me-2">mdi-alert-circle</v-icon>
          {{ t('consultationOverview.finalConfirmation') }}
        </v-card-title>
        <v-card-text>
          {{ t('consultationOverview.deleteFinalWarning') }}
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelDelete">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="error" variant="flat" @click="deleteConsultation">
            {{ t('consultationOverview.deleteConfirm') }}
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

.h-100 {
  height: 100%;
}
</style>
