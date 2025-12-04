<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConsultationStore } from '@/stores/'
import { useDateFormat } from '@/composables/useDateFormat'
import { useFormValidation } from '@/composables/useFormValidation'
import {
  type Consultation,
  type CreateConsultation,
  type User,
  type Note,
  type GetFormTemplatesShortlist200ResponseResponseObjectInner as FormTemplateShortList,
  ResponseError,
  type FindAllCodes200ResponseResponseObjectInner as Code,
} from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { consultationApi, userApi, formtemplateApi, codeApi } from '@/api'

const props = defineProps<{
  patientId: string | null | undefined
  caseId: string
  consultation?: Consultation | null
}>()

const emit = defineEmits(['submit', 'cancel'])

const { t, locale } = useI18n()
const notifierStore = useNotifierStore()
const consultationStore = useConsultationStore()
const { formatLocalizedCustomDate, getLocalizedDayjs, dateFormats } = useDateFormat()
const { errors, validateForm, clearAllErrors, hasError, getError, touchField, isFieldTouched, resetFormState } = useFormValidation()

// Helper to determine if we should show error for a field
const shouldShowError = (fieldName: string): boolean => {
  return formSubmitted.value || isFieldTouched(fieldName)
}

// Helper to get error message (only if field should show error)
const getErrorIfNeeded = (fieldName: string): string => {
  return shouldShowError(fieldName) ? errors[fieldName] || '' : ''
}

// Helper to determine if field has error (only if field should show error)
const hasErrorIfNeeded = (fieldName: string): boolean => {
  return shouldShowError(fieldName) && !!errors[fieldName]
}

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = dateFormats.isoDateTime): string => {
  if (!date) return 'N/A'
  return formatLocalizedCustomDate(date, format)
}

const isEditMode = ref(!!(props.consultation && props.consultation.id))

// Create form data with proper typing
const form = ref<Consultation & { formTemplates?: string[] }>({
  patientCaseId: props.caseId,
  dateAndTime: new Date().toISOString(),
  reasonForConsultation: [],
  notes: [],
  proms: [],
  images: [],
  visitedBy: [],
  formAccessCode: null,
})

const users = ref<User[]>([])
const formTemplates = ref<FormTemplateShortList[]>([])
const selectedFormTemplates = ref<string[]>([])
const editingNoteIndex = ref<number | null>(null)
const editedNote = ref<string>('')
const codes = ref<Code[]>([])
const selectedCode = ref<Code | null>(null)
const generatingCode = ref(false)
const formSubmitted = ref(false)

async function fetchUsers() {
  try {
    const response = await userApi.getUsers()
    users.value = response.responseObject || []
    console.log('Users fetched successfully:', users.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching users:', errorMessage)
  }
}

async function fetchFormTemplates() {
  try {
    const response = await formtemplateApi.getFormTemplatesShortlist()
    formTemplates.value = response.responseObject || []
    console.log('Form templates fetched successfully:', formTemplates.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching form templates:', errorMessage)
  }
}

async function fetchAvailableCodes() {
  try {
    // For editing, we need all codes to potentially find the existing one
    // For creating, we can just use available codes
    const response = isEditMode.value
      ? await codeApi.findAllCodes()
      : await codeApi.getAllAvailableCodes()
    codes.value = response.responseObject || []
    console.log('Codes fetched successfully:', codes.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching codes:', errorMessage)
  }
}

onMounted(async () => {
  await fetchUsers()
  await fetchFormTemplates()
  await fetchAvailableCodes()

  if (isEditMode.value && props.consultation) {
    form.value = { ...props.consultation }
    form.value.patientCaseId = props.caseId
    form.value.dateAndTime = getLocalizedDayjs(props.consultation.dateAndTime || new Date()).toISOString()

    // Handle form templates for proms
    if (props.consultation.proms?.length) {
      selectedFormTemplates.value = props.consultation.proms.map((prom: { id?: string; formTemplateId?: string }) => {
        // Handle both string IDs and objects with ID property
        return typeof prom === 'string' ? prom : prom.id || prom.formTemplateId
      }).filter(Boolean) as string[]
    }

    // Handle access code
    if (props.consultation.formAccessCode) {
      selectedCode.value = codes.value.find((code: Code) => code.code === props.consultation?.formAccessCode) || null
    }
  }
})

const saveConsultation = async () => {
  try {
    // Mark form as submitted so all fields show validation errors
    formSubmitted.value = true

    // Clear previous errors
    clearAllErrors()

    // Validate required fields
    const validationRules = {
      dateAndTime: [
        (v: unknown) => (v ? true : 'Date and time is required'),
      ],
      reasonForConsultation: [
        (v: unknown) => (Array.isArray(v) && v.length > 0 ? true : 'At least one reason is required'),
      ],
    }

    if (!validateForm(form.value, validationRules)) {
      notifierStore.notify(t('alerts.validation.failed'), 'error')
      return
    }

    // Prepare the data for API call
    const consultationData: CreateConsultation = {
      patientCaseId: form.value.patientCaseId,
      dateAndTime: form.value.dateAndTime,
      reasonForConsultation: form.value.reasonForConsultation,
      notes: form.value.notes.map(note => ({
        ...note,
        createdBy: note.createdBy || undefined
      })),
      images: form.value.images.map(image => ({
        ...image,
        dateAdded: image.dateAdded || null,
        addedBy: image.addedBy || null,
        notes: image.notes.map(note => ({
          ...note,
          createdBy: note.createdBy || undefined
        }))
      })),
      visitedBy: form.value.visitedBy,
      formAccessCode: selectedCode.value?.code || undefined,
      // Send an array of form template IDs (string[]), not array of objects
      formTemplates: selectedFormTemplates.value,
    }

    consultationStore.setConsultation(form.value)
    let response

    if (isEditMode.value && form.value.id) {
      // check if patientId is defined
      if (!props.patientId) {
        throw new Error('Patient ID is required for updating a consultation')
      }
      response = await consultationApi.updateConsultation({
        patientId: props.patientId,
        caseId: props.caseId,
        consultationId: form.value.id,
        updateConsultation: consultationData,
      })
      console.log('Consultation updated successfully:', response)
      notifierStore.notify(t('alerts.consultation.updated'), 'success')
    } else {
      response = await consultationApi.createConsultation({
        caseId: props.caseId,
        createConsultation: consultationData,
      })
      console.log('Consultation added successfully:', response)
      notifierStore.notify(t('alerts.consultation.created'), 'success')
    }

    consultationStore.clearConsultation()
    emit('submit', response.responseObject)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error saving consultation:', errorMessage)
    notifierStore.notify(t('alerts.consultation.saveFailed'), 'error')
  }
}

function addNote() {
  const newNote: Note = {
    dateCreated: null,
    //TODO createdBy should be set to the current user
    createdBy: "", // users.value[0]?.id || null, // Uncomment when user management is implemented
    // createdBy: users.value[0]?.id || null,
    dateModified: null,
    note: '',
  }
  form.value.notes.push(newNote as Note)
  editingNoteIndex.value = form.value.notes.length - 1
  editedNote.value = ''
}

function editNote(index: number) {
  editingNoteIndex.value = index
  editedNote.value = (form.value.notes[index] as Note).note
}

function saveNote(index: number) {
  if (editingNoteIndex.value !== null) {
    const note = form.value.notes[index] as Note
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

async function generateNewCode() {
  if (generatingCode.value) return

  try {
    generatingCode.value = true
    console.log('Generating new code...')

    // Generate a single new code
    const response = await codeApi.addCodes({ numberOfCodes: 1 })

    if (response.responseObject && response.responseObject.length > 0) {
      const newCode = response.responseObject[0]
      console.log('New code generated successfully:', newCode)

      // Add the new code to the codes list
      codes.value.unshift(newCode) // Add at the beginning for easy selection

      // Select the new code
      selectedCode.value = newCode

      notifierStore.notify(t('alerts.code.generated'), 'success')
    } else {
      throw new Error('No code returned from API')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error generating new code:', errorMessage)
    notifierStore.notify(t('alerts.code.generateFailed'), 'error')
  } finally {
    generatingCode.value = false
  }
}

function deleteNote(index: number) {
  form.value.notes.splice(index, 1)
}

// Expose function for external access
defineExpose({
  submit: saveConsultation,
  resetFormState: () => {
    clearAllErrors()
    resetFormState()
    formSubmitted.value = false
  }
})
</script>

<template>
  <v-card>
    <v-card-title>
      {{ isEditMode ? t('consultation.edit') : t('consultation.add') }}
    </v-card-title>
    <v-card-text>
      <v-form @submit.prevent="saveConsultation">
        <v-select
                  v-model="form.reasonForConsultation"
                  :items="['planned', 'unplanned', 'emergency', 'pain', 'followup']"
                  :label="t('consultation.reasonForConsultation')"
                  :hint="t('forms.hints.required')"
                  persistent-hint
                  :error="!!errors.reasonForConsultation"
                  :error-messages="errors.reasonForConsultation ? [errors.reasonForConsultation] : []"
                  multiple
                  outlined
                  dense></v-select>
        <v-row class="my-2">
          <v-col cols="8">
            <VueDatePicker
                           v-model="form.dateAndTime"
                           :class="{ 'error-border': errors.dateAndTime }"
                           multi-calendars
                           :locale="locale"
                           week-num-name="Wo"
                           format="dd.MM.yyyy HH:mm"
                           week-numbers="iso"
                           :cancelText="t('buttons.cancelTimeDateText')"
                           :selectText="t('buttons.selectTimeDateText')" />
            <v-text-field
                          v-if="errors.dateAndTime"
                          :error="true"
                          :error-messages="[errors.dateAndTime]"
                          hidden></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-btn inline color="info" @click="form.dateAndTime = new Date().toISOString()">
              {{ t('buttons.timeAndDateNow') }}
            </v-btn>
          </v-col>
        </v-row>
        <v-card class="my-2">
          <h4>{{ t('consultation.notes') }}</h4>
          <v-list>
            <v-list-item v-for="(note, index) in form.notes" :key="index">
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
                <p>{{ t('consultation.createdOn') }}
                  {{ safeFormatDate((note as Note).dateCreated) }}</p>
                <p v-if="(note as Note).dateModified">
                  {{ t('consultation.modifiedOn') }}
                  {{ safeFormatDate((note as Note).dateModified) }}</p>
              </v-container>
            </v-list-item>
          </v-list>
          <v-btn color="primary" @click="addNote">{{ t('consultation.addNote') }}</v-btn>
        </v-card>
        <v-autocomplete
                        multiple
                        chips
                        clearable
                        closable-chips
                        v-model="selectedFormTemplates"
                        :items="formTemplates"
                        item-value="id"
                        item-title="title"
                        :label="t('consultation.formTemplate')"
                        outlined
                        dense></v-autocomplete>
        <v-autocomplete
                        v-model="form.visitedBy"
                        :items="users"
                        item-value="id"
                        item-title="name"
                        :label="t('consultation.visitedBy')"
                        multiple
                        outlined
                        dense></v-autocomplete>

        <!-- Form Access Code Section -->
        <v-row>
          <v-col cols="8">
            <v-combobox
                        v-model="selectedCode"
                        :items="codes"
                        item-value="id"
                        item-title="code"
                        :label="t('consultation.form-access-code')"
                        outlined
                        dense></v-combobox>
          </v-col>
          <v-col cols="4" v-if="!isEditMode" class="d-flex align-center">
            <v-btn
                   color="secondary"
                   :loading="generatingCode"
                   :disabled="generatingCode"
                   @click="generateNewCode">
              <v-icon left>mdi-plus</v-icon>
              {{ t('buttons.generateNewCode') }}
            </v-btn>
          </v-col>
        </v-row>

        <v-btn color="primary" type="submit">
          {{ isEditMode ? t('buttons.saveChanges') : t('buttons.consultation') }}
        </v-btn>
        <v-btn color="error" @click="emit('cancel')" class="ml-2">
          {{ t('buttons.cancel') }}
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.error-border {
  border: 2px solid red !important;
  border-radius: 4px;
  padding: 4px;
}
</style>
