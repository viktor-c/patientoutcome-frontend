<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import type { Dayjs } from 'dayjs'
import {
  type Surgery,
  type CreateSurgerySchema,
  type GetUsers200ResponseResponseObjectInner as User,
  type FindAllCodes200ResponseResponseObjectInnerConsultationIdNotesInner as Note,
  type Blueprint,
  type AnaesthesiaType,
  ResponseError,
  SurgerySideEnum,
  SearchBlueprintsBlueprintForEnum,
} from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { surgeryApi, userApi, blueprintApi } from '@/api'
import { useUserStore } from '@/stores/userStore'
import { dayjs } from '@/utils/dayjs'

const props = defineProps<{
  patientCaseId: string
  surgery?: Surgery | null
  surgeryBlueprintIds?: string[]
  patientCaseData?: {
    mainDiagnosis?: string[]
    studyDiagnosis?: string[]
    mainDiagnosisICD10?: string[]
    studyDiagnosisICD10?: string[]
    otherDiagnosis?: string[]
    otherDiagnosisICD10?: string[]
  } | null
}>()

const emit = defineEmits(['submit', 'cancel', 'consultation-blueprints'])

const { t } = useI18n()
const notifierStore = useNotifierStore()
const { formatLocalizedCustomDate } = useDateFormat()

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = 'DD.MM.YYYY HH:mm'): string => {
  if (!date) return 'N/A'
  const tmpDate = formatLocalizedCustomDate(date, format)
  return tmpDate
}

const isEditMode = ref(!!(props.surgery && props.surgery.id))

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0]
}

// Helper function to get today's date at 10:00 UTC as ISO datetime
const getTodayAt10UTC = (): string => {
  const today = dayjs().utc().startOf('day').add(10, 'hours')
  return today.toISOString()
}

// Create form data with proper typing
const form = ref<Surgery & { formTemplates?: string[] }>({
  id: null,
  patientCase: props.patientCaseId,
  externalId: '',
  diagnosis: [],
  diagnosisICD10: [],
  therapy: '',
  oPSCodes: [],
  side: 'none' as SurgerySideEnum,
  surgeryDate: new Date().toISOString(), // Today's date in YYYY-MM-DD format
  surgeryTime: 0,
  tourniquet: 0,
  anaesthesiaType: undefined,
  roentgenDosis: 0,
  roentgenTime: '',
  additionalData: [],
  surgeons: [],
})

const users = ref<User[]>([])
const userStore = useUserStore()
const editingNoteIndex = ref<number | null>(null)
const editedNote = ref<string>('')

// Time of day for the surgery (HH:mm)
const timeOfDay = ref<string | null>(null)

// Date picker dialog state and temporary date/time used inside the picker
const dateDialog = ref(false)
const tempDate = ref<Dayjs | null>(null)
const tempTime = ref<string | null>(null)

// Responsive fullscreen for very small devices
const isFullscreen = ref(false)

onMounted(() => {
  const mq = window.matchMedia('(max-width:600px)')
  // Initialize
  isFullscreen.value = mq.matches
  const handler = (e: MediaQueryListEvent) => {
    isFullscreen.value = e.matches
  }
  // Add listener (supports modern browsers)
  if (mq.addEventListener) mq.addEventListener('change', handler)
  else mq.addListener(handler)

  onUnmounted(() => {
    if (mq.removeEventListener) mq.removeEventListener('change', handler)
    else mq.removeListener(handler)
  })
})

const displaySurgeryDate = computed<string>({
  get: () => {
    const raw = form.value.surgeryDate
    if (!raw) return ''
    return safeFormatDate(raw)

  },
  set: (val: string) => {
    // v-model on the field requires a setter. Normally this field is readonly
    // and only updated via the date/time dialog, but provide a safe setter
    // so programmatic updates (or future direct edits) work.
    if (!val) {
      form.value.surgeryDate = null
      timeOfDay.value = null
      return
    }

    // If the incoming value looks like an ISO datetime, split into date/time
    if (val.includes('T')) {
      const parts = val.split('T')
      form.value.surgeryDate = parts[0]
      const t = parts[1] || ''
      const timeParts = t.split(':')
      if (timeParts.length >= 2) {
        timeOfDay.value = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`
      } else {
        timeOfDay.value = null
      }
      return
    }

    // If the incoming value matches YYYY-MM-DD, set date only
    const isoDateMatch = val.match(/^(\d{4}-\d{2}-\d{2})$/)
    if (isoDateMatch) {
      form.value.surgeryDate = isoDateMatch[1]
      // keep existing timeOfDay
      return
    }

    // Otherwise, we can't reliably parse localized input -> leave unchanged
  }
})

function openDateDialog() {
  // Initialize tempDate and tempTime from the current surgeryDate
  const raw = form.value.surgeryDate
  if (raw) {
    // Parse as UTC
    const utcDate = dayjs.utc(raw)
    // Store as dayjs object - v-date-picker expects this format
    tempDate.value = utcDate
    tempTime.value = utcDate.format('HH:mm')
  } else {
    tempDate.value = dayjs.utc()
    tempTime.value = '10:00'
  }
  console.debug('Initialized tempDate:', tempDate.value?.format('YYYY-MM-DD'), 'tempTime:', tempTime.value)
  dateDialog.value = true
}

function cancelDateDialog() {
  dateDialog.value = false
}

function saveDateFromDialog() {
  console.debug('Saving date from dialog - raw types:', typeof tempDate.value, typeof tempTime.value)
  console.debug('Saving date from dialog - raw values:', tempDate.value, tempTime.value)

  if (!tempDate.value) {
    notifierStore.notify('Date is required', 'error')
    return
  }

  // tempDate is a dayjs object from v-date-picker, so format it explicitly
  const dateString = tempDate.value.format('YYYY-MM-DD')

  // Handle time - v-time-picker returns string in HH:mm format
  const timeString = (tempTime.value || '10:00').toString().trim()
  
  console.debug('Normalized components - Date:', dateString, 'Time:', timeString)
  
  // Ensure dateString is in YYYY-MM-DD format
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.error('Invalid date format:', dateString)
    notifierStore.notify('Invalid date format', 'error')
    return
  }
  
  // Construct UTC datetime - parse as UTC to avoid timezone issues
  const utcDateTime = dayjs.utc(`${dateString} ${timeString}`, 'YYYY-MM-DD HH:mm')
  
  if (!utcDateTime.isValid()) {
    console.error('Failed to parse date/time:', dateString, timeString)
    notifierStore.notify('Invalid date or time', 'error')
    return
  }
  
  console.debug('Final UTC datetime:', utcDateTime.format(), 'ISO:', utcDateTime.toISOString())

  form.value.surgeryDate = utcDateTime.toISOString()
  dateDialog.value = false
}

// Anaesthesia types management
const availableAnaesthesiaTypes = ref<AnaesthesiaType[]>([])
const selectedAnaesthesiaTypeIds = ref<number[]>([])

// Blueprint-related state
const blueprints = ref<Blueprint[]>([])
const selectedBlueprint = ref<Blueprint | null>(null)
const blueprintSearchQuery = ref('')
const loadingBlueprints = ref(false)

// Side options for dropdown
const sideOptions = [
  { value: 'none', title: t('surgery.side.none') },
  { value: 'left', title: t('surgery.side.left') },
  { value: 'right', title: t('surgery.side.right') },
]

// Load available anaesthesia types (this could come from an API in the future)
const loadAnaesthesiaTypes = () => {
  availableAnaesthesiaTypes.value = [
    { id: 1, type: t('surgery.anaesthesia.local') },
    { id: 2, type: t('surgery.anaesthesia.regional') },
    { id: 3, type: t('surgery.anaesthesia.general') },
    { id: 4, type: t('surgery.anaesthesia.sedation') },
  ]
}

async function fetchUsers() {
  try {
    // Only fetch users with role 'doctor'
    const response = await userApi.getUsers({ role: 'doctor' })
    users.value = response.responseObject || []
    // Logging in English as per instructions
    console.log('Users with role doctor fetched successfully:', users.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    let statusCode = 0

    if (error instanceof ResponseError) {
      statusCode = error.response.status
      try {
        const errorBody = await error.response.json()
        errorMessage = errorBody.message || errorMessage
      } catch {
        errorMessage = `HTTP ${statusCode}`
      }
    }

    // 403 = User lacks permission to fetch users list (non-critical)
    if (statusCode === 403) {
      console.warn('Permission denied for fetching users. Dialog will work without users list.')
    } else {
      console.error('Error fetching users:', errorMessage)
    }
    // Dialog can still function without the users list
  }
}

// Blueprint search functionality
const searchBlueprints = async (query: string) => {
  loadingBlueprints.value = true
  try {
    const response = await blueprintApi.searchBlueprints({
      q: query,
      blueprintFor: SearchBlueprintsBlueprintForEnum.Surgery,
      limit: '20'
    })
    blueprints.value = response.responseObject?.blueprints || []
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error searching blueprints:', errorMessage)
    notifierStore.notify(t('forms.blueprint.fetchError'), 'error')
  } finally {
    loadingBlueprints.value = false
  }
}

// Load default blueprints for surgeries
const loadDefaultBlueprints = async () => {
  loadingBlueprints.value = true
  try {
    const response = await blueprintApi.getBlueprints({
      blueprintFor: SearchBlueprintsBlueprintForEnum.Surgery,
      limit: '20'
    })
    blueprints.value = response.responseObject?.blueprints || []
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error loading blueprints:', errorMessage)
    notifierStore.notify(t('forms.blueprint.fetchError'), 'error')
  } finally {
    loadingBlueprints.value = false
  }
}

// Load specific blueprint by ID
const loadBlueprintById = async (blueprintId: string) => {
  try {
    const response = await blueprintApi.getBlueprintById({ id: blueprintId })
    if (response.responseObject) {
      return response.responseObject
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error loading blueprint by ID:', errorMessage)
    notifierStore.notify(t('forms.blueprint.fetchError'), 'error')
  }
  return null
}

// Apply selected blueprint to surgery form
const applyBlueprint = (blueprint: Blueprint) => {
  if (!blueprint.content) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = blueprint.content as any

  // Preserve the current surgery date and time before applying blueprint
  const currentSurgeryDate = form.value.surgeryDate
  const currentTimeOfDay = timeOfDay.value

  // Apply the blueprint content to surgery form fields
  if (content.diagnosis) {
    form.value.diagnosis = Array.isArray(content.diagnosis)
      ? [...content.diagnosis]
      : [content.diagnosis]
  }

  if (content.diagnosisICD10) {
    form.value.diagnosisICD10 = Array.isArray(content.diagnosisICD10)
      ? [...content.diagnosisICD10]
      : [content.diagnosisICD10]
  }

  if (content.therapy) {
    form.value.therapy = content.therapy
  }

  if (content.oPSCodes) {
    form.value.oPSCodes = Array.isArray(content.oPSCodes)
      ? [...content.oPSCodes]
      : [content.oPSCodes]
  }

  if (content.side) {
    form.value.side = content.side as SurgerySideEnum
  }

  if (content.surgeryTime) {
    form.value.surgeryTime = content.surgeryTime
  }

  if (content.tourniquet) {
    form.value.tourniquet = content.tourniquet
  }

  if (content.anaesthesiaType) {
    // Handle anaesthesia type as array of IDs or single ID
    if (Array.isArray(content.anaesthesiaType)) {
      selectedAnaesthesiaTypeIds.value = content.anaesthesiaType.map((type: AnaesthesiaType | number) =>
        typeof type === 'object' ? type.id || 0 : type
      ).filter(Boolean)
    } else if (typeof content.anaesthesiaType === 'object' && content.anaesthesiaType.id) {
      selectedAnaesthesiaTypeIds.value = [content.anaesthesiaType.id]
    } else {
      selectedAnaesthesiaTypeIds.value = [content.anaesthesiaType as number]
    }
  }

  if (content.roentgenDosis) {
    form.value.roentgenDosis = content.roentgenDosis
  }

  if (content.roentgenTime) {
    form.value.roentgenTime = content.roentgenTime
  }

  if (content.additionalData) {
    form.value.additionalData = Array.isArray(content.additionalData)
      ? [...content.additionalData]
      : [content.additionalData]
  }

  // Restore the surgery date and time - preserve user's choice when applying blueprint
  form.value.surgeryDate = currentSurgeryDate
  timeOfDay.value = currentTimeOfDay

  // Extract consultation blueprint IDs if present
  if (content.consultations && Array.isArray(content.consultations)) {
    console.log('Found consultation blueprint IDs in surgery blueprint:', content.consultations)
    emit('consultation-blueprints', content.consultations)
  }

  selectedBlueprint.value = blueprint
  notifierStore.notify(t('forms.blueprint.blueprintApplied'), 'success')
}

// Watch blueprint search query and fetch blueprints
watch(
  blueprintSearchQuery,
  async (newQuery) => {
    if (newQuery.length >= 2) {
      await searchBlueprints(newQuery)
    } else if (newQuery.length === 0) {
      await loadDefaultBlueprints()
    }
  }
)

onMounted(async () => {
  await fetchUsers()
  await loadDefaultBlueprints()
  loadAnaesthesiaTypes()

  if (isEditMode.value && props.surgery) {
    form.value = { ...props.surgery }
    form.value.patientCase = props.patientCaseId

    // Ensure surgeryDate is in YYYY-MM-DD format for HTML date input
    if (props.surgery.surgeryDate) {
      // Extract just the date part if it's an ISO datetime string
      form.value.surgeryDate = props.surgery.surgeryDate
    } else {
      form.value.surgeryDate = getTodayAt10UTC()
    }

    // Handle existing anaesthesia type data
    if (props.surgery.anaesthesiaType) {
      if (typeof props.surgery.anaesthesiaType === 'object' && props.surgery.anaesthesiaType.id) {
        selectedAnaesthesiaTypeIds.value = [props.surgery.anaesthesiaType.id]
      }
    }
  } else {
    // Ensure surgeryDate is properly set for new surgeries with 10:00 default time
    form.value.surgeryDate = getTodayAt10UTC()

    // Initialize diagnosis fields from case data when creating a new surgery
    if (props.patientCaseData) {
      if (props.patientCaseData.mainDiagnosis?.length) {
        form.value.diagnosis = [...props.patientCaseData.mainDiagnosis]
      }
      if (props.patientCaseData.mainDiagnosisICD10?.length) {
        form.value.diagnosisICD10 = [...props.patientCaseData.mainDiagnosisICD10]
      }
    }
    // Autoselect current user as surgeon if they are a doctor
    if (userStore.hasRole('doctor')) {
      // Find the user object in users list by username
      const currentUser = users.value.find(u => u.username === userStore.username)
      if (currentUser && currentUser.id) {
        form.value.surgeons = [currentUser.id]
      }
    }
  }

  // If surgery blueprint IDs are provided, load and apply the first one
  if (props.surgeryBlueprintIds && props.surgeryBlueprintIds.length > 0) {
    const firstBlueprintId = props.surgeryBlueprintIds[0]
    const blueprint = await loadBlueprintById(firstBlueprintId)
    if (blueprint) {
      selectedBlueprint.value = blueprint
      applyBlueprint(blueprint)
    }
  }
})

const saveSurgery = async () => {
  try {
    // Convert selected anaesthesia type IDs back to the proper format
    let anaesthesiaTypeForAPI = undefined
    if (selectedAnaesthesiaTypeIds.value.length > 0) {
      // For now, take the first selected type as the backend might expect a single value
      const selectedId = selectedAnaesthesiaTypeIds.value[0]
      const selectedType = availableAnaesthesiaTypes.value.find(type => type.id === selectedId)
      if (selectedType) {
        anaesthesiaTypeForAPI = selectedType
      }
    }

    // Ensure surgeryDate is in YYYY-MM-DD format (date part)
    // VueDatePicker might return a Date object or string
    // use dayjs for locale support and validate date
    let surgeryDateAndTimeString: string = ''
    if (form.value.surgeryDate) {
      const parsedDate = dayjs(form.value.surgeryDate)
      if (parsedDate.isValid()) {
        surgeryDateAndTimeString = parsedDate.toISOString()
      } else {
        throw new Error('Invalid surgery date format')
      }
    } else {
      throw new Error('Surgery date is required')
    }

    // Ensure surgeons is an array of IDs (not objects)
    const surgeonIds = form.value.surgeons?.map(surgeon => {
      // If surgeon is an object, extract the id; otherwise it's already an id string
      if (typeof surgeon === 'object' && surgeon !== null) {
        return (surgeon as unknown as User).id || ''
      }
      return surgeon as string
    }).filter(Boolean) || []

    // Prepare the data for API call
    const surgeryData: CreateSurgerySchema = {
      externalId: form.value.externalId,
      diagnosis: form.value.diagnosis,
      diagnosisICD10: form.value.diagnosisICD10,
      therapy: form.value.therapy,
      oPSCodes: form.value.oPSCodes,
      side: form.value.side,
      surgeryDate: surgeryDateAndTimeString,
      surgeryTime: form.value.surgeryTime,
      tourniquet: form.value.tourniquet,
      anaesthesiaType: anaesthesiaTypeForAPI,
      roentgenDosis: form.value.roentgenDosis,
      roentgenTime: form.value.roentgenTime,
      additionalData: form.value.additionalData?.map(note => ({
        ...note,
        createdBy: note.createdBy || undefined
      })) || [],
      surgeons: surgeonIds,
      patientCase: form.value.patientCase,
    }

    let response

    if (isEditMode.value && form.value.id) {
      response = await surgeryApi.updateSurgeryById({
        surgeryId: form.value.id,
        updateSurgeryByIdRequest: surgeryData,
      })
      console.log('Surgery updated successfully:', response)
      notifierStore.notify(t('alerts.surgery.updated'), 'success')
    } else {
      response = await surgeryApi.createSurgery({
        createSurgerySchema: surgeryData,
      })
      console.log('Surgery created successfully:', response)
      notifierStore.notify(t('alerts.surgery.created'), 'success')
    }

    emit('submit', response.responseObject)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error saving surgery:', errorMessage)
    notifierStore.notify(t('alerts.surgery.saveFailed'), 'error')
  }
}

// Save surgery and move to next step
const saveSurgeryAndNextStep = async () => {
  await saveSurgery()
  // The parent will handle moving to the next step
}

function addNote() {
  const newNote: Note = {
    dateCreated: null,
    //TODO createdBy should be set to the current user
    createdBy: "", // users.value[0]?.id || null, // Uncomment when user management is implemented
    dateModified: null,
    note: '',
  }
  if (!form.value.additionalData) {
    form.value.additionalData = []
  }
  form.value.additionalData.push(newNote as Note)
  editingNoteIndex.value = form.value.additionalData.length - 1
  editedNote.value = ''
}

function editNote(index: number) {
  editingNoteIndex.value = index
  editedNote.value = (form.value.additionalData?.[index] as Note)?.note || ''
}

function saveNote(index: number) {
  if (editingNoteIndex.value !== null && form.value.additionalData) {
    const note = form.value.additionalData[index] as Note
    if (note.dateCreated) {
      note.dateModified = new Date().toISOString()
    } else {
      note.dateCreated = new Date().toISOString()
    }
    note.note = editedNote.value
    editingNoteIndex.value = null
    editedNote.value = ''
  }
}

function cancelEdit() {
  editingNoteIndex.value = null
  editedNote.value = ''
}

function deleteNote(index: number) {
  if (form.value.additionalData) {
    form.value.additionalData.splice(index, 1)
  }
}



// Expose function for external access
defineExpose({
  submit: saveSurgery
})
</script>

<template>
  <v-card>
    <v-card-title>
      {{ isEditMode ? t('surgery.edit') : t('surgery.add') }}
    </v-card-title>
    <v-card-text>
      <!-- Blueprint Selection Section -->
      <v-card v-if="!isEditMode" class="mb-4">
        <v-card-title class="text-h6">{{ t('forms.blueprint.selectBlueprint') }}</v-card-title>
        <v-card-text>
          <v-autocomplete
                          v-model="selectedBlueprint"
                          v-model:search="blueprintSearchQuery"
                          :items="blueprints"
                          :loading="loadingBlueprints"
                          :label="t('forms.blueprint.selectBlueprint')"
                          :placeholder="t('forms.blueprint.searchBlueprintsPlaceholder')"
                          :no-data-text="t('forms.blueprint.noBlueprints')"
                          item-title="title"
                          item-value="id"
                          return-object
                          clearable
                          outlined
                          dense
                          @update:model-value="(blueprint) => blueprint && applyBlueprint(blueprint)">
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.description">
              </v-list-item>
            </template>
          </v-autocomplete>
        </v-card-text>
      </v-card>

      <v-form @submit.prevent="saveSurgery">
        <!-- Basic Information -->
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
                          v-model="form.externalId"
                          :label="t('surgery.externalId')"
                          outlined
                          dense></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
                          v-model="form.therapy"
                          :label="t('surgery.therapy')"
                          outlined
                          dense
                          required></v-text-field>
          </v-col>
        </v-row>

        <!-- Surgery Date and Side -->
        <v-row>
          <v-col cols="12" md="6">
            <!-- Readonly text field that opens a small dialog with a v-date-picker -->
            <v-text-field
                          v-model="displaySurgeryDate"
                          :label="t('surgery.surgeryDate')"
                          readonly
                          outlined
                          dense
                          prepend-icon="mdi-calendar"
                          @focus="openDateDialog"
                          @click="openDateDialog" />

            <!-- Small dialog containing the Vuetify date picker and a time picker -->
            <!-- width set larger for big screens; card has max-width to remain responsive on small screens -->
            <v-dialog v-model="dateDialog" width="900" :fullscreen="isFullscreen">
              <v-card class="pa-2" style="max-width:95vw;">
                <v-card-title>{{ t('surgery.surgeryDate') }}</v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="7">
                      <v-date-picker v-model="tempDate" :show-adjacent-months="true" />
                    </v-col>
                    <v-col cols="12" md="5" class="d-flex flex-column justify-center">
                      <v-time-picker v-model="tempTime" format="24hr" />
                    </v-col>
                  </v-row>
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn text @click="cancelDateDialog">{{ t('buttons.cancelTimeDateText') }}</v-btn>
                  <v-btn text color="primary" @click="saveDateFromDialog">
                    {{ t('buttons.selectTimeDateText') }}</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>

          </v-col>
          <v-col cols="12" md="6">
            <v-select
                      v-model="form.side"
                      :items="sideOptions"
                      item-value="value"
                      item-title="title"
                      :label="t('surgery.sideLabel')"
                      outlined
                      dense
                      required></v-select>
          </v-col>
        </v-row>

        <!-- Diagnosis -->
        <v-combobox
                    :label="t('surgery.diagnosis')"
                    v-model="form.diagnosis"
                    :items="form.diagnosis"
                    multiple
                    outlined
                    dense
                    chips
                    clearable
                    closable-chips></v-combobox>

        <!-- ICD10 Diagnosis -->
        <v-combobox
                    :label="t('surgery.diagnosisICD10')"
                    v-model="form.diagnosisICD10"
                    :items="form.diagnosisICD10"
                    multiple
                    outlined
                    dense
                    chips
                    clearable
                    closable-chips></v-combobox>

        <!-- OPS Codes -->
        <v-combobox
                    :label="t('surgery.oPSCodes')"
                    v-model="form.oPSCodes"
                    :items="form.oPSCodes"
                    multiple
                    outlined
                    dense
                    chips
                    clearable
                    closable-chips></v-combobox>

        <!-- Surgery Details -->
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field
                          v-model.number="form.surgeryTime"
                          :label="t('surgery.surgeryTime')"
                          type="number"
                          suffix="min"
                          outlined
                          dense></v-text-field>
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
                          v-model.number="form.tourniquet"
                          :label="t('surgery.tourniquet')"
                          type="number"
                          suffix="min"
                          outlined
                          dense></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-autocomplete
                            v-model="selectedAnaesthesiaTypeIds"
                            :items="availableAnaesthesiaTypes"
                            item-value="id"
                            item-title="type"
                            :label="t('surgery.anaesthesiaType')"
                            multiple
                            chips
                            closable-chips
                            outlined
                            dense
                            clearable>
              <template v-slot:selection="{ item }">
                <v-chip>{{ item.title }}</v-chip>
              </template>
            </v-autocomplete>
          </v-col>
        </v-row>

        <!-- Radiology Information -->
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
                          v-model.number="form.roentgenDosis"
                          :label="t('surgery.roentgenDosis')"
                          type="number"
                          suffix="mGy"
                          outlined
                          dense></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
                          v-model="form.roentgenTime"
                          :label="t('surgery.roentgenTime')"
                          outlined
                          dense></v-text-field>
          </v-col>
        </v-row>

        <!-- Surgeons -->
        <v-autocomplete
                        v-model="form.surgeons"
                        :items="users"
                        item-value="id"
                        item-title="name"
                        :label="t('surgery.surgeons')"
                        multiple
                        chips
                        closable-chips
                        outlined
                        dense></v-autocomplete>

        <!-- Additional Notes -->
        <v-card class="my-4">
          <v-card-title class="text-h6">{{ t('surgery.additionalNotes') }}</v-card-title>
          <v-card-text>
            <v-list v-if="form.additionalData && form.additionalData.length > 0">
              <v-list-item v-for="(note, index) in form.additionalData" :key="index">
                <template v-slot:prepend v-if="editingNoteIndex != index">
                  <v-chip color="blue"><v-icon @click="editNote(index)">mdi-pencil</v-icon></v-chip>
                  <v-chip color="red"><v-icon @click="deleteNote(index)">mdi-delete</v-icon></v-chip>
                </template>
                <v-container v-if="editingNoteIndex === index">
                  <v-row><v-textarea v-model="editedNote" rows="2" outlined dense></v-textarea></v-row>
                  <v-row>
                    <v-col class="py-0" cols="8">
                      <v-btn inline color="success" @click="saveNote(index)"><v-icon>mdi-check</v-icon></v-btn>
                    </v-col>
                    <v-col class="py-0" cols="4">
                      <v-btn inline color="error" @click="cancelEdit"><v-icon>mdi-close</v-icon></v-btn>
                    </v-col>
                  </v-row>
                </v-container>
                <v-container v-else>
                  <v-list-item-title>{{ (note as Note).note }}</v-list-item-title>
                  <p>{{ t('surgery.createdOn') }}
                    {{ safeFormatDate((note as Note).dateCreated) }}</p>
                  <p v-if="(note as Note).dateModified">
                    {{ t('surgery.modifiedOn') }}
                    {{ safeFormatDate((note as Note).dateModified) }}</p>
                </v-container>
              </v-list-item>
            </v-list>
            <v-btn color="primary" @click="addNote">{{ t('surgery.addNote') }}</v-btn>
          </v-card-text>
        </v-card>

        <v-btn
               v-if="isEditMode"
               color="primary"
               @click="saveSurgery">
          {{ t('buttons.saveChanges') }}
        </v-btn>
        <v-btn
               v-else
               color="primary"
               @click="saveSurgeryAndNextStep">
          {{ t('buttons.saveAndNextStep') }}
        </v-btn>
        <v-btn color="error" @click="emit('cancel')" class="ml-2">
          {{ t('buttons.cancel') }}
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Ensure VueDatePicker fits nicely with Vuetify styling */
:deep(.dp__input) {
  border: 1px solid rgba(0, 0, 0, 0.38);
  border-radius: 4px;
  padding: 12px 16px;
  font-size: 16px;
}

:deep(.dp__input:hover) {
  border-color: rgba(0, 0, 0, 0.87);
}

:deep(.dp__input:focus) {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
  outline: none;
}
</style>
