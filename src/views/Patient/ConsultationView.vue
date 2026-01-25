<script setup lang="ts">
import { ref, onMounted, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useConsultationStore } from '@/stores/'
import { useDateFormat } from '@/composables/useDateFormat'
import {
  type Consultation,
  type UserNoPassword,
  type Note,
  type GetFormTemplatesShortlist200ResponseResponseObjectInner as FormTemplateShortList,
  ResponseError,
  type FindAllCodes200ResponseResponseObjectInner as Code,
} from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import CreateEditConsultationDialog from '@/components/dialogs/CreateEditConsultationDialog.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const notifierStore = useNotifierStore()
const consultationStore = useConsultationStore()
const { formatLocalizedCustomDate, getLocalizedDayjs, dateFormats } = useDateFormat()

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = dateFormats.isoDateTime): string => {
  if (!date) return 'N/A'
  return formatLocalizedCustomDate(date, format)
}

// Determine if this is an edit or add operation
const isEditMode = ref(!!route.params.consultationId && route.params.consultationId !== 'new')

// Get route parameters
const patientId = route.params.patientId as string
const caseId = route.params.caseId as string

// Use centralized API instances
import { consultationApi, userApi, formtemplateApi, codeApi } from '@/api'

// Consultation data
const consultation = ref(
  consultationStore.consultation || {
    id: '',
    dateAndTime: '',
    reasonForConsultation: [],
  },
)

// Form data
const form = ref<Consultation>({
  patientCaseId: '',
  dateAndTime: new Date().toISOString().slice(0, 10),
  reasonForConsultation: [],
  notes: [],
  proms: [],
  images: [],
  visitedBy: [],
})

// Users list for the dropdown
const users = ref<UserNoPassword[]>([])

// Form templates list for the autocomplete
const formTemplates = ref<FormTemplateShortList[]>([])
const selectedFormTemplates = ref<string[]>([])
// Note editing state
const editingNoteIndex = ref<number | null>(null)
const editedNote = ref<string>('')

// Fetch all users for the dropdown
async function fetchUsers() {
  try {
    const response = await userApi.getUsers()
    if (!response.responseObject || response.responseObject.length === 0) {
      console.debug('no users found')
      users.value = []
      return
    }
    users.value = response.responseObject
    console.log('Users fetched successfully:', users.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching users:', errorMessage)
  }
}

// Fetch all form templates for the autocomplete
async function fetchFormTemplates() {
  try {
    const response = await formtemplateApi.getFormTemplatesShortlist()
    if (!response.responseObject || response.responseObject.length === 0) {
      console.debug('no form templates found')
      formTemplates.value = []
      return
    }
    formTemplates.value = response.responseObject
    console.log('Form templates fetched successfully:', formTemplates.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching form templates:', errorMessage)
  }
}

// Save consultation (add or update)
const saveConsultation = async () => {
  try {
    // const array1 = selectedFormTemplates.value.map((formTemplate) => formTemplate.id);
    // form.value.proms = array1;
    //BUG form.value.proms should be an array of id's; Problem is that v-autocomplete returns an array of objects and not an array of id's.
    form.value.proms = JSON.parse(JSON.stringify(selectedFormTemplates.value))
    form.value.formAccessCode = selectedCode.value?.code || null
    const data = toRaw(form.value)
    consultationStore.setConsultation(form.value)
    if (isEditMode.value) {
      // Update consultation
      if (!consultation.value.id) {
        console.error('Cannot update consultation: ID is missing')
        notifierStore.notify(t('alerts.consultation.updateFailed'), 'error')
        return
      }
      // Transform the data to match API requirements with proper type coercion
      const updateData = JSON.parse(JSON.stringify(data)) // Deep clone to avoid reference issues
      await consultationApi.updateConsultation({
        patientId,
        caseId,
        consultationId: consultation.value.id,
        updateConsultation: updateData as Record<string, unknown>, // Type assertion for API compatibility
      })
      console.log('Consultation updated successfully:', consultation.value)
      notifierStore.notify(t('alerts.consultation.updated'), 'success')
    } else {
      // Create consultation - need to add formTemplates property
      const createData = {
        ...data,
        formTemplates: data.proms || [],
      }
      delete (createData as Record<string, unknown>).proms // Remove proms after copying to formTemplates
      createData.patientCaseId = caseId

      await consultationApi.createConsultation({
        caseId,
        createConsultation: createData as import('@/api').CreateConsultation, // Type assertion for API compatibility
      })
      console.log('Consultation added successfully:', consultation.value)
      notifierStore.notify(t('alerts.consultation.created'), 'success')
    }
    consultationStore.clearConsultation()
    router.push(`/cases/patient/${patientId}`)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error saving consultation:', errorMessage)
    notifierStore.notify(t('alerts.consultation.saveFailed'), 'error')
  }
}

// Add a new note
function addNote() {
  const newNote: Note = {
    dateCreated: null,
    createdBy: users.value[0].id ? users.value[0].id : null, // Assign the first user's ID
    dateModified: null,
    note: '', // Initialize with an empty note
  }

  form.value.notes.push(newNote)
  editingNoteIndex.value = form.value.notes.length - 1
  editedNote.value = ''
}

// Edit an existing note
function editNote(index: number) {
  editingNoteIndex.value = index
  editedNote.value = form.value.notes[index].note
}

// Save the edited note
function saveNote(index: number) {
  if (editingNoteIndex.value !== null) {
    if (form.value.notes[index].dateCreated) form.value.notes[index].dateModified = new Date().toISOString()
    else form.value.notes[index].dateCreated = form.value.notes[index].dateCreated || new Date().toISOString()

    form.value.notes[index].note = editedNote.value
    editingNoteIndex.value = null
    editedNote.value = ''
  }
}

// Cancel editing a note
function cancelEdit() {
  editingNoteIndex.value = null
  editedNote.value = ''
}

// Delete a note
function deleteNote(index: number) {
  form.value.notes.splice(index, 1)
}

// Fetch all available codes
const codes = ref<Code[]>([])
const selectedCode = ref<Code | null>(null)
const generatingCode = ref(false)

async function fetchAvailableCodes() {
  try {
    // For editing, we need all codes to potentially find the existing one
    // For creating, we can just use available codes
    const response = isEditMode.value
      ? await codeApi.findAllCodes()
      : await codeApi.getAllAvailableCodes()
    if (response.responseObject && response.responseObject.length > 0) {
      codes.value = response.responseObject
      console.log('Codes fetched successfully:', codes.value)
    } else {
      console.debug('No codes found')
      codes.value = []
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching codes:', errorMessage)
  }
}

// Fetch users, form templates, and codes on component mount
onMounted(async () => {
  await fetchUsers()
  await fetchFormTemplates()
  await fetchAvailableCodes()

  if (isEditMode.value) {
    form.value.patientCaseId = caseId
    form.value.id = route.params.consultationId as string
    form.value.visitedBy = consultationStore.consultation?.visitedBy || []
    form.value.reasonForConsultation = consultationStore.consultation?.reasonForConsultation || []
    form.value.notes = consultationStore.consultation?.notes || []
    form.value.dateAndTime = getLocalizedDayjs(consultationStore.consultation?.dateAndTime || new Date()).toISOString()
    if (consultationStore.consultation?.proms?.length) {
      // Map proms to corresponding objects from formTemplates; otherwise we cannot show the selected form templates
      selectedFormTemplates.value = consultationStore.consultation.proms.map((prom) => {
        const result = formTemplates.value.find((template) => template.id === (prom as Record<string, unknown>).formTemplateId) //|| prom
        return result?.id
      }).filter((id): id is string => Boolean(id)) // Filter out undefined values
    } else {
      form.value.proms = []
    }
    form.value.proms = selectedFormTemplates.value
    form.value.images = consultationStore.consultation?.images || []

    if (consultationStore.consultation?.formAccessCode) {
      //get code by id from formAccessCode using API
      const foundCode = codes.value.find((code) => code.code === consultationStore.consultation?.formAccessCode)
      selectedCode.value = foundCode || null
      form.value.formAccessCode = String(consultationStore.consultation.formAccessCode)
    }
  }
  if (!isEditMode.value) {
    consultationStore.clearConsultation()
  }
})

const showConsultationDialog = ref(false)
const dialogConsultation = ref<Consultation | null>(null)

function openConsultationDialog(consultation?: Consultation) {
  dialogConsultation.value = consultation || null
  showConsultationDialog.value = true
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleDialogSubmit(_responseObject: unknown) {
  // handle responseObject, e.g. reload list or redirect
  showConsultationDialog.value = false
}

function handleDialogCancel() {
  showConsultationDialog.value = false
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
</script>

<template>
  <v-container class="add-consultation-view">
    <v-card>
      <v-card-title>{{ isEditMode ? t('consultation.edit') : t('consultation.add') }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="saveConsultation">
          <!-- Reason for Consultation -->
          <v-select
                    v-model="form.reasonForConsultation"
                    :items="['planned', 'unplanned', 'emergency', 'pain', 'followup']"
                    :label="t('consultation.reasonForConsultation')"
                    multiple
                    outlined
                    dense></v-select>

          <!-- Date and Time -->
          <v-row class="my-2">
            <v-col cols="8">
              <VueDatePicker
                             v-model="form.dateAndTime"
                             multi-calendars
                             :locale="locale"
                             week-num-name="Wo"
                             format="dd.MM.yyyy HH:mm"
                             week-numbers="iso"
                             :cancelText="t('buttons.cancelTimeDateText')"
                             :selectText="t('buttons.selectTimeDateText')">
              </VueDatePicker>
            </v-col>
            <v-col cols="4">
              <v-btn inline color="info" @click="form.dateAndTime = new Date().toISOString()">
                {{ t('buttons.timeAndDateNow') }}
              </v-btn>
            </v-col>
          </v-row>

          <!-- Notes -->
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
                    <v-col class="py-0" cols="8"><v-btn inline color="success"
                             @click="saveNote(index)"><v-icon>mdi-check</v-icon></v-btn></v-col>
                    <v-col class="py-0" cols="4"><v-btn inline color="error"
                             @click="cancelEdit"><v-icon>mdi-close</v-icon></v-btn></v-col>
                  </v-row>
                </v-container>
                <v-container v-else>
                  <v-list-item-title>{{ note.note }}</v-list-item-title>
                  <p>Created on {{ safeFormatDate(note.dateCreated) }}</p>
                  <p v-if="note.dateModified">Modified on {{ safeFormatDate(note.dateModified) }}
                  </p>
                </v-container>
              </v-list-item>
            </v-list>
            <v-btn color="primary" @click="addNote">{{ t('consultation.addNote') }}</v-btn>
          </v-card>

          <!-- Form Templates -->
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

          <!-- Visited By -->
          <v-autocomplete v-model="form.visitedBy" :items="users" item-value="id" item-title="name"
                          :label="t('consultation.visitedBy')" multiple outlined dense></v-autocomplete>

          <!-- Code Selection -->
          <v-row>
            <v-col cols="8">
              <v-combobox v-model="selectedCode" :items="codes" item-value="id" item-title="code"
                          :label="t('consultation.form-access-code')" outlined dense></v-combobox>
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

          <v-btn color="primary" type="submit" class="mt-4">
            {{ isEditMode ? t('buttons.saveChanges') : t('buttons.consultation') }}
          </v-btn>
          <v-btn color="secondary" @click="router.push(`/cases/patient/${patientId}`)">
            {{ t('buttons.cancel') }}
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <CreateEditConsultationDialog
                                  :show="showConsultationDialog"
                                  :patientId="patientId"
                                  :caseId="caseId"
                                  :consultation="dialogConsultation"
                                  @submit="handleDialogSubmit"
                                  @cancel="handleDialogCancel" />
    <!-- Add a button to open dialog for demonstration -->
    <v-btn color="primary" @click="openConsultationDialog()">
      {{ t('buttons.consultation') }}
    </v-btn>
  </v-container>
</template>

<style scoped>
h1 {
  margin-bottom: 20px;
}

.add-consultation-view {
  max-width: 600px;
  margin: 0 auto;
}

.v-btn {
  width: 100%;
}
</style>
