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
  type GetFormTemplates200ResponseResponseObjectInner as FormTemplateFull,
  ResponseError,
} from '@/api'
import type {
  ApiCode as Code,
  ApiConsultationFlexible,
  ApiConsultationProm,
} from '@/types'
import { useNotifierStore } from '@/stores/notifierStore'
import { useFormTemplateStore } from '@/stores'
import { consultationApi, userApi, codeApi, formtemplateApi } from '@/api'
import { getAccessLevelColor, getAccessLevelDescription } from '@/services/formVersionService'
import { logger } from '@/services/logger'
import { useUserStore } from '@/stores/userStore'
import NotesEditor from '@/components/forms/NotesEditor.vue'

const props = defineProps<{
  patientId: string | null | undefined
  caseId: string
  consultation?: ApiConsultationFlexible | null
  /** Department ID of the patient case – used to load only the relevant form templates */
  departmentId?: string
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

type ConsultationFormState = Consultation & {
  formTemplates?: string[]
  consultationAccessDaysBefore?: number
  consultationAccessDaysAfter?: number
}

type TemplateWithAccess = (FormTemplateShortList | FormTemplateFull) & { accessLevel?: string }

const extractId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) return value
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const directId = record.id
  if (typeof directId === 'string' && directId.length > 0) return directId

  const nestedId = record._id
  if (typeof nestedId === 'string' && nestedId.length > 0) return nestedId

  return null
}

const getPromTemplateId = (prom: ApiConsultationProm): string | null => {
  if (typeof prom === 'string') return prom
  if (!prom || typeof prom !== 'object') return null

  const templateId = extractId((prom as Record<string, unknown>).formTemplateId)
  if (templateId) return templateId

  return extractId((prom as Record<string, unknown>).id)
}

const getTemplateAccess = (template: unknown): string => {
  if (!template || typeof template !== 'object') return 'patient'
  const accessLevel = (template as { accessLevel?: unknown }).accessLevel
  return typeof accessLevel === 'string' && accessLevel.length > 0 ? accessLevel : 'patient'
}

const getTemplateTitle = (template: unknown): string => {
  if (!template || typeof template !== 'object') return ''
  const title = (template as { title?: unknown }).title
  return typeof title === 'string' ? title : ''
}

// Create form data with proper typing
const form = ref<ConsultationFormState>({
  patientCaseId: props.caseId,
  dateAndTime: new Date().toISOString(),
  consultationAccessDaysBefore: userStore.consultationAccessDaysBefore,
  consultationAccessDaysAfter: userStore.consultationAccessDaysAfter,
  reasonForConsultation: [],
  notes: [],
  proms: [],
  images: [],
  visitedBy: [],
  formAccessCode: null,
})

// helper used when a consultation object needs to be applied to form state
function populateFormFromConsultation(cons: ApiConsultationFlexible) {
  form.value = { ...cons }
  form.value.patientCaseId = props.caseId
  form.value.dateAndTime = getLocalizedDayjs(cons.dateAndTime || new Date()).toISOString()
  const consultationRecord = cons as unknown as Record<string, unknown>
  form.value.consultationAccessDaysBefore = Number(
    consultationRecord.consultationAccessDaysBefore ?? userStore.consultationAccessDaysBefore,
  ) as never
  form.value.consultationAccessDaysAfter = Number(
    consultationRecord.consultationAccessDaysAfter ?? userStore.consultationAccessDaysAfter,
  ) as never

  // Keep reasonForConsultation as array (backend type)
  if (Array.isArray(cons.reasonForConsultation)) {
    form.value.reasonForConsultation = cons.reasonForConsultation
  } else {
    form.value.reasonForConsultation = []
  }

  // fill titles using template cache
  if (cons.proms && Array.isArray(cons.proms)) {
    cons.proms.forEach((prom) => {
      if (!prom || typeof prom !== 'object') return

      const record = prom as Record<string, unknown>
      const title = record.title
      const templateId = getPromTemplateId(prom)

      if ((typeof title !== 'string' || title.length === 0) && templateId) {
        const template = formTemplates.value.find((currentTemplate) => currentTemplate.id === templateId)
        if (template) {
          record.title = template.title
        }
      }
    })
  }

  if (cons.proms?.length) {
    selectedFormTemplates.value = cons.proms
      .map((prom) => getPromTemplateId(prom))
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
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
        consultationAccessDaysBefore: userStore.consultationAccessDaysBefore,
        consultationAccessDaysAfter: userStore.consultationAccessDaysAfter,
        reasonForConsultation: [],
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
// When a departmentId is provided, we fetch the full form template list filtered by that
// department (which includes the accessLevel field). Otherwise we fall back to the store shortlist.
const localFormTemplates = ref<FormTemplateFull[]>([])
const formTemplates = computed<Array<FormTemplateShortList | FormTemplateFull>>(() =>
  localFormTemplates.value.length ? localFormTemplates.value : formTemplateStore.templates
)
const selectedFormTemplates = ref<string[]>([])
const codes = ref<Code[]>([])
const selectedCode = ref<Code | null>(null)
const generatingCode = ref(false)
const formSubmitted = ref(false)

// Filter form templates for display in the consultation builder.
// Clinicians can assign both patient-facing and authenticated (clinician) forms to a consultation,
// so we show both. Only 'inactive' forms are hidden (unless the user is an admin).
const availableFormTemplates = computed(() => {
  return formTemplates.value.filter((template: TemplateWithAccess) => {
    const accessLevel = template.accessLevel

    // Hide inactive forms unless the user is an admin
    if (accessLevel === 'inactive') return userStore.hasRole('admin')

    // Show all other forms (patient, authenticated, or no accessLevel set)
    return true
  })
})

async function fetchUsers() {
  try {
    const response = await userApi.getUsers()
    users.value = response.responseObject || []
    logger.info('Users fetched successfully', { count: users.value.length })
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('Error fetching users', { errorMessage })
  }
}

async function fetchFormTemplates() {
  if (props.departmentId) {
    try {
      const response = await formtemplateApi.getFormTemplates({ departmentId: props.departmentId })
      localFormTemplates.value = response.responseObject || []
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred'
      if (error instanceof ResponseError) {
        errorMessage = (await error.response.json()).message
      }
      logger.error('Error fetching form templates for department', {
        departmentId: props.departmentId,
        errorMessage,
      })
      // Fall back to the cached shortlist
      await formTemplateStore.fetchIfNeeded()
      if (formTemplateStore.templates.length === 0) {
        // Retry once in case an earlier session-scoped fetch cached an empty shortlist.
        await formTemplateStore.refresh()
      }
    }
  } else {
    // No department filter – use the cached shortlist
    await formTemplateStore.fetchIfNeeded()
    if (formTemplateStore.templates.length === 0) {
      // Retry once in case the shortlist was loaded while session/department context was not ready.
      await formTemplateStore.refresh()
    }
  }
}

watch(
  () => props.departmentId,
  async () => {
    await fetchFormTemplates()
  },
)

async function fetchAvailableCodes() {
  try {
    // For editing, we need all codes to potentially find the existing one
    // For creating, we can just use available codes
    const response = isEditMode.value
      ? await codeApi.findAllCodes()
      : await codeApi.getAllAvailableCodes()
    codes.value = response.responseObject || []
    logger.info('Codes fetched successfully', { count: codes.value.length, editMode: isEditMode.value })
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('Error fetching codes', { errorMessage })
  }
}

onMounted(async () => {
  await fetchUsers()
  await fetchFormTemplates()
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

      ; (consultationData as unknown as Record<string, unknown>).consultationAccessDaysBefore =
        Number((form.value as unknown as Record<string, unknown>).consultationAccessDaysBefore ?? userStore.consultationAccessDaysBefore)
      ; (consultationData as unknown as Record<string, unknown>).consultationAccessDaysAfter =
        Number((form.value as unknown as Record<string, unknown>).consultationAccessDaysAfter ?? userStore.consultationAccessDaysAfter)

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
      logger.info('Consultation updated successfully', {
        consultationId: form.value.id,
        caseId: props.caseId,
      })
      notifierStore.notify(t('alerts.consultation.updated'), 'success')
    } else {
      response = await consultationApi.createConsultation({
        caseId: props.caseId,
        createConsultation: consultationData,
      })
      logger.info('Consultation added successfully', {
        caseId: props.caseId,
        consultationId: response.responseObject?.id,
      })
      notifierStore.notify(t('alerts.consultation.created'), 'success')
    }

    // augment returned consultation object with titles for any forms we just
    // created so that parent components can render them immediately without
    // needing to refetch or look up template names
    if (response && response.responseObject && Array.isArray(response.responseObject.proms)) {
      response.responseObject.proms = response.responseObject.proms.map((prom) => {
        if (!prom || typeof prom !== 'object') return prom

        const promRecord = prom
        const title = promRecord.title
        const templateId = getPromTemplateId(prom as ApiConsultationProm)

        if ((typeof title !== 'string' || title.length === 0) && templateId) {
          const template = formTemplates.value.find((currentTemplate) => currentTemplate.id === templateId)
          if (template) {
            promRecord.title = template.title
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
    logger.error('Error saving consultation', { errorMessage, caseId: props.caseId })
    notifierStore.notify(t('alerts.consultation.saveFailed'), 'error')
  }
}

async function generateNewCode() {
  if (generatingCode.value) return

  try {
    generatingCode.value = true
    logger.info('Generating new code')

    // Generate a single new code
    const response = await codeApi.addCodes({ numberOfCodes: 1 })

    if (response.responseObject && response.responseObject.length > 0) {
      const newCode = response.responseObject[0]
      logger.info('New code generated successfully', { codeId: newCode.id, code: newCode.code })

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
    logger.error('Error generating new code', { errorMessage })
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
  <v-card style="max-height: 80vh; overflow-y: auto;">
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
                  dense
                  data-testid="consultation-reason"></v-select>
        <v-row class="my-2">
          <v-col cols="8">
            <VueDatePicker
                           v-model="form.dateAndTime"
                           :class="{ 'error-border': errors.dateAndTime }"
                           :locale="locale"
                           week-num-name="Wo"
                           format="dd.MM.yyyy HH:mm"
                           week-numbers="iso"
                           :text-input="true"
                           :teleport-center="true"
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

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
                          v-model.number="form.consultationAccessDaysBefore"
                          type="number"
                          :min="0"
                          :max="365"
                          :label="t('departmentCodeSettings.daysBeforeLabel')"
                          :hint="t('departmentCodeSettings.daysBeforeHint')"
                          persistent-hint
                          outlined
                          dense></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
                          v-model.number="form.consultationAccessDaysAfter"
                          type="number"
                          :min="0"
                          :max="365"
                          :label="t('departmentCodeSettings.daysAfterLabel')"
                          :hint="t('departmentCodeSettings.daysAfterHint')"
                          persistent-hint
                          outlined
                          dense></v-text-field>
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
                        dense
                        data-testid="consultation-form-templates">
          <!-- Custom chip display with access level -->
          <template #chip="{ item, props: chipProps }">
            <v-chip
                    v-bind="chipProps"
                    :color="getAccessLevelColor(getTemplateAccess(item.raw))"
                    closable>
              <span>{{ getTemplateTitle(item.raw) }}</span>
            </v-chip>
          </template>

          <!-- Custom item display with badge and inline chip; remove default title duplication -->
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <v-chip
                      size="x-small"
                      :color="getAccessLevelColor(getTemplateAccess(item.raw))"
                      class="ml-2">
                {{ getAccessLevelDescription(getTemplateAccess(item.raw)) }}
              </v-chip>

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
                        dense
                        data-testid="consultation-visited-by"></v-autocomplete>

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
                        dense
                        data-testid="consultation-access-code">
              <template #append-inner>
                <v-icon
                        :class="{ 'text-success': !generatingCode, 'text-disabled': generatingCode }"
                        :style="{ cursor: generatingCode ? 'not-allowed' : 'pointer' }"
                        @mousedown.stop.prevent
                        @click.stop.prevent="!generatingCode && generateNewCode()"
                        :disabled="generatingCode"
                        :title="t('consultation.generateCode')">
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
