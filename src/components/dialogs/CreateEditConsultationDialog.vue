<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConsultationStore } from '@/stores/'
import { useDateFormat } from '@/composables/useDateFormat'
import { useFormValidation } from '@/composables/useFormValidation'
import {
  type Consultation,
  type CreateConsultation,
  type UserNoPassword,
  type GetFormTemplatesShortlist200ResponseResponseObjectInner as FormTemplateShortList,
  ResponseError,
  type FindAllCodes200ResponseResponseObjectInner as Code,
} from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { useFormTemplateStore } from '@/stores'
import { consultationApi, userApi, codeApi } from '@/api'
import { getAccessLevelColor, getAccessLevelDescription } from '@/services/formVersionService'
import { useUserStore } from '@/stores/userStore'
import NotesEditor from '@/components/forms/NotesEditor.vue'

const props = defineProps<{
  patientId: string | null | undefined
  caseId: string
  consultation?: Consultation | null
}>()

const emit = defineEmits(['submit', 'cancel'])

const { t, locale } = useI18n()
const notifierStore = useNotifierStore()
const userStore = useUserStore()
const consultationStore = useConsultationStore()
const formTemplateStore = useFormTemplateStore()
const { getLocalizedDayjs } = useDateFormat()
const { errors, validateForm, clearAllErrors, resetFormState } = useFormValidation()

const isEditMode = ref(!!(props.consultation && props.consultation.id))

// Create form data with proper typing
const form = ref<Consultation & { formTemplates?: string[] }>({
  patientCaseId: props.caseId,
  dateAndTime: new Date().toISOString(),
  reasonForConsultation: null as any,
  notes: [],
  proms: [],
  images: [],
  visitedBy: [],
  formAccessCode: null,
})

// helper used when a consultation object needs to be applied to form state
function populateFormFromConsultation(cons: Consultation) {
  form.value = { ...cons }
  form.value.patientCaseId = props.caseId
  form.value.dateAndTime = getLocalizedDayjs(cons.dateAndTime || new Date()).toISOString()

  // Handle reasonForConsultation (backend: array, frontend: single)
  if (Array.isArray(cons.reasonForConsultation)) {
    form.value.reasonForConsultation = cons.reasonForConsultation[0] || (null as any)
  }

  // fill titles using template cache
  if (cons.proms && Array.isArray(cons.proms)) {
    cons.proms.forEach((p: any) => {
      if (p && !p.title && p.formTemplateId) {
        const tpl = formTemplates.value.find(t => t.id === p.formTemplateId)
        if (tpl) p.title = tpl.title
      }
    })
  }

  if (cons.proms?.length) {
    selectedFormTemplates.value = cons.proms.map((prom: any) => {
      return typeof prom === 'string' ? prom : prom.id || prom.formTemplateId
    }).filter(Boolean) as string[]
  } else {
    form.value.proms = []
    selectedFormTemplates.value = []
  }

  form.value.visitedBy = cons.visitedBy || []
  form.value.notes = cons.notes || []

  if (cons.formAccessCode) {
    selectedCode.value = codes.value.find((code: Code) => code.code === cons.formAccessCode) || null
    form.value.formAccessCode = String(cons.formAccessCode)
  }
}

// watch prop changes so editing dialog updates when opened repeatedly
watch(
  () => props.consultation,
  (newCons) => {
    if (newCons && newCons.id) {
      populateFormFromConsultation(newCons)
      isEditMode.value = true
    } else {
      isEditMode.value = false
      // reset form
      form.value = {
        patientCaseId: props.caseId,
        dateAndTime: new Date().toISOString(),
        reasonForConsultation: null as any,
        notes: [],
        proms: [],
        images: [],
        visitedBy: [],
        formAccessCode: null,
      }
      selectedFormTemplates.value = []
      selectedCode.value = null
    }
  }
)


const users = ref<UserNoPassword[]>([])
const formTemplates = computed(() => formTemplateStore.templates)
const selectedFormTemplates = ref<string[]>([])
const codes = ref<Code[]>([])
const selectedCode = ref<Code | null>(null)
const generatingCode = ref(false)
const formSubmitted = ref(false)

// Filter form templates based on user role
const availableFormTemplates = computed(() => {
  const isAuthenticated = userStore.hasRole('admin') || userStore.hasRole('doctor') || userStore.hasRole('student')

  type TemplateWithAccess = FormTemplateShortList & { accessLevel?: string }

  return formTemplates.value.filter((template: TemplateWithAccess) => {
    const accessLevel = template.accessLevel || 'patient'

    // Everyone can see patient-accessible forms
    if (accessLevel === 'patient') return true

    // Authenticated users can see authenticated forms
    if (accessLevel === 'authenticated' && isAuthenticated) return true

    // Admins can see inactive forms
    if (accessLevel === 'inactive' && userStore.hasRole('admin')) return true

    return false
  })
})

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
  await formTemplateStore.fetchIfNeeded()
  await fetchAvailableCodes()

  if (isEditMode.value && props.consultation) {
    populateFormFromConsultation(props.consultation)
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
      reasonForConsultation: form.value.reasonForConsultation || [],
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

    // augment returned consultation object with titles for any forms we just
    // created so that parent components can render them immediately without
    // needing to refetch or look up template names
    if (response && response.responseObject && Array.isArray(response.responseObject.proms)) {
      response.responseObject.proms = (response.responseObject.proms as any[]).map(prom => {
        if (prom && typeof prom === 'object') {
          const rec = prom as Record<string, any>
          if ((!rec.title || rec.title === '') && rec.formTemplateId) {
            const tpl = formTemplates.value.find(t => t.id === rec.formTemplateId)
            if (tpl) {
              rec.title = tpl.title
            }
          }
        }
        return prom
      })
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
    <v-card-text style="max-height: 70vh; overflow-y: auto;">
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
                           :selectText="t('buttons.selectTimeDateText')"
                           teleport="body" />
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

        <!-- Notes Editor Component -->
        <NotesEditor
                     v-model:notes="form.notes"
                     title="consultation.notes"
                     add-button-text="consultation.addNote" />

        <!-- Form Templates Selection with Access Level -->

        <v-autocomplete
                        multiple
                        chips
                        clearable
                        closable-chips
                        v-model="selectedFormTemplates"
                        :items="availableFormTemplates"
                        item-value="id"
                        item-title="title"
                        :label="t('consultation.formTemplate')"
                        outlined
                        dense>
          <!-- Custom chip display with access level -->
          <template #chip="{ item, props: chipProps }">
            <v-chip
                    v-bind="chipProps"
                    :color="getAccessLevelColor((item.raw as any).accessLevel || 'patient')"
                    closable>
              <span>{{ (item.raw as any).title }}</span>
            </v-chip>
          </template>

          <!-- Custom item display with badge -->
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #prepend>
                <v-chip
                        size="x-small"
                        :color="getAccessLevelColor((item.raw as any).accessLevel || 'patient')"
                        class="mr-2">
                  {{ ((item.raw as any).accessLevel || 'patient').toUpperCase() }}
                </v-chip>
              </template>
              <v-list-item-title>{{ (item.raw as any).title }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ getAccessLevelDescription((item.raw as any).accessLevel || 'patient') }}
              </v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-autocomplete>


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
          <v-col cols="12">
            <v-combobox
                        v-model="selectedCode"
                        :items="codes"
                        item-value="id"
                        item-title="code"
                        :label="t('consultation.form-access-code')"
                        outlined
                        dense>
              <template #append-inner v-if="!isEditMode">
                <v-icon
                        :class="{ 'text-success': !generatingCode, 'text-disabled': generatingCode }"
                        :style="{ cursor: generatingCode ? 'not-allowed' : 'pointer' }"
                        @mousedown.stop.prevent
                        @click.stop.prevent="!generatingCode && generateNewCode()"
                        :disabled="generatingCode">
                  {{ generatingCode ? 'mdi-loading' : 'mdi-plus' }}
                </v-icon>
              </template>
            </v-combobox>
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
