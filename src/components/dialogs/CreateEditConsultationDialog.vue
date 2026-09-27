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
import { consultationApi, userApi, codeApi } from '@/api'
import { getAccessLevelColor, getAccessLevelDescription } from '@/services/formVersionService'
import { logger } from '@/services/logger'
import { useUserStore } from '@/stores/userStore'
import NotesEditor from '@/components/forms/NotesEditor.vue'
import AccessCodeAssignment from '@/components/AccessCodeAssignment.vue'
import AssignedCodeDisplay from '@/components/AssignedCodeDisplay.vue'

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
const { errors, validateForm, clearAllErrors, clearFieldError, resetFormState } = useFormValidation()

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
  reasonForConsultation: ['followup'],
  notes: [],
  proms: [],
  images: [],
  visitedBy: [],
  formAccessCode: null,
})

const isEditingConsultationDateInput = ref(false)
const consultationDateInputDraft = ref('')

// Controls the popup menu that contains the date picker
const isDatePickerOpen = ref(false)
const consultationDateFieldRef = ref<HTMLElement>()
const consultationDateMenuWidth = ref<number>(360)

const formatConsultationDateForInput = (rawDate: string | Date | null | undefined): string => {
  if (!rawDate) return ''
  const parsed = getLocalizedDayjs(rawDate)
  if (!parsed.isValid()) return ''
  return parsed.format('DD.MM.YYYY HH:mm')
}

const parseConsultationDateInput = (inputValue: string): string | null | undefined => {
  const value = inputValue.trim()

  if (!value) return null

  // Accept DD.MM.YYYY HH:mm input.
  const localizedMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/)
  if (localizedMatch) {
    const [, day, month, year, hour, minute] = localizedMatch
    const dayNum = Number(day)
    const monthNum = Number(month)
    const yearNum = Number(year)
    const hourNum = Number(hour)
    const minuteNum = Number(minute)

    if (
      dayNum >= 1 && dayNum <= 31
      && monthNum >= 1 && monthNum <= 12
      && hourNum >= 0 && hourNum <= 23
      && minuteNum >= 0 && minuteNum <= 59
    ) {
      const isoLike = `${yearNum.toString().padStart(4, '0')}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}T${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}:00`
      const parsed = getLocalizedDayjs(isoLike)
      if (parsed.isValid()) {
        return parsed.toISOString()
      }
    }

    return undefined
  }

  // Accept YYYY-MM-DD HH:mm input.
  const isoDateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/)
  if (isoDateTimeMatch) {
    const [, year, month, day, hour, minute] = isoDateTimeMatch
    const parsed = getLocalizedDayjs(`${year}-${month}-${day}T${hour}:${minute}:00`)
    if (parsed.isValid()) {
      return parsed.toISOString()
    }
    return undefined
  }

  // Accept ISO datetime input.
  if (value.includes('T')) {
    const parsed = getLocalizedDayjs(value)
    if (parsed.isValid()) {
      return parsed.toISOString()
    }
  }

  return undefined
}

const commitConsultationDateInput = () => {
  const parsed = parseConsultationDateInput(consultationDateInputDraft.value)
  if (parsed === undefined) {
    return
  }
  form.value.dateAndTime = parsed
}

const handleConsultationDateInputFocus = () => {
  isEditingConsultationDateInput.value = true
}

const handleConsultationDateInputBlur = () => {
  commitConsultationDateInput()
  isEditingConsultationDateInput.value = false
  consultationDateInputDraft.value = formatConsultationDateForInput(form.value.dateAndTime)
}

watch(
  () => form.value.dateAndTime,
  (newDate) => {
    if (!isEditingConsultationDateInput.value) {
      consultationDateInputDraft.value = formatConsultationDateForInput(newDate)
    }
    clearFieldError('dateAndTime')
  },
  { immediate: true }
)

const onDatePickerSelect = () => {
  // VueDatePicker already updates `form.dateAndTime` via v-model.
  isDatePickerOpen.value = false
  isEditingConsultationDateInput.value = false
  consultationDateInputDraft.value = formatConsultationDateForInput(form.value.dateAndTime)
  clearFieldError('dateAndTime')
}

const openDatePicker = () => {
  const fieldWidth = consultationDateFieldRef.value?.offsetWidth
  if (typeof fieldWidth === 'number' && fieldWidth > 0) {
    consultationDateMenuWidth.value = fieldWidth
  }
  isDatePickerOpen.value = true
}

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

  // Keep reasonForConsultation as array (backend type). Default to 'followup'
  if (Array.isArray(cons.reasonForConsultation) && cons.reasonForConsultation.length > 0) {
    form.value.reasonForConsultation = cons.reasonForConsultation
  } else {
    form.value.reasonForConsultation = ['followup']
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
    selectedAccessCode.value = String(cons.formAccessCode)
    form.value.formAccessCode = String(cons.formAccessCode)
    // Check if the code has ignoreAccessWindow set
    const codeRecord = cons.formAccessCode as unknown as Record<string, unknown>
    if (typeof codeRecord === 'object' && (codeRecord as Record<string, unknown>).ignoreAccessWindow === true) {
      ignoreAccessWindow.value = true
    }
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
        reasonForConsultation: ['followup'],
        notes: [],
        proms: [],
        images: [],
        visitedBy: [],
        formAccessCode: null,
      }
      selectedFormTemplates.value = []
      selectedCode.value = null
      selectedAccessCode.value = null
      ignoreAccessWindow.value = false
    }
  }
)


const users = ref<UserNoPassword[]>([])
// When a departmentId is provided, we fetch the full form template list filtered by that
// department (which includes the accessLevel field). Otherwise we fall back to the store shortlist.
// Always prefer the store as the single source of truth for templates. When a
// departmentId is provided, request the department-scoped list from the store.
const formTemplates = computed<Array<FormTemplateShortList | FormTemplateFull>>(() => {
  const deptId = props.departmentId
  // `getTemplatesForDepartment` returns department-specific full templates
  // if available, otherwise falls back to the shortlist.
  return formTemplateStore.getTemplatesForDepartment(deptId) as Array<FormTemplateShortList | FormTemplateFull>
})
const selectedFormTemplates = ref<string[]>([])
const selectedAccessCode = ref<string | null>(null)
const ignoreAccessWindow = ref(false)
const formSubmitted = ref(false)
const codes = ref<Code[]>([])
const selectedCode = ref<Code | null>(null)

// Filter form templates for display in the consultation builder.
// Clinicians can assign both patient-facing and authenticated (clinician) forms to a consultation,
// so we show both. Only 'inactive' forms are hidden (unless the user is an admin).
const availableFormTemplates = computed(() => {
  console.debug(`All form templates: ${formTemplates.value}`)
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
    // If creating a new consultation (not edit mode) and visitedBy is empty,
    // pre-fill with the currently logged-in user when present in the users list.
    if (!isEditMode.value && (!form.value.visitedBy || (Array.isArray(form.value.visitedBy) && form.value.visitedBy.length === 0))) {
      try {
        const currentUsername = typeof userStore.username === 'string' ? userStore.username : ''
        const currentUser = users.value.find((user) => user.username === currentUsername)
        if (currentUser?.id) {
          form.value.visitedBy = [String(currentUser.id)]
        }
      } catch {
        // ignore any matching errors
      }
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('Error fetching users', { errorMessage })
  }
}

async function fetchCodes() {
  try {
    const response = await codeApi.getAllAvailableCodes()
    codes.value = response.responseObject || []
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      try {
        errorMessage = (await error.response.json()).message
      } catch {
        // ignore
      }
    }
    logger.error('Error fetching available codes', { errorMessage })
    codes.value = []
  }
}

async function fetchFormTemplates() {
  // Always ensure the shortlist is loaded first.
  await formTemplateStore.fetchIfNeeded()

  // If departmentId is provided, try to fetch department-scoped full templates
  // via the store. If the store's templates remain empty, force a refresh.
  if (props.departmentId) {
    const tmpTemplates = await formTemplateStore.fetchForDepartment(props.departmentId)
    console.debug(tmpTemplates)
  }

  if (formTemplateStore.templates.length === 0) {
    // Attempt a forced refresh to rule out caching issues.
    await formTemplateStore.refresh()
  }
  console.debug('templates in store', formTemplateStore.templates)
}

watch(
  () => props.departmentId,
  async () => {
    await fetchFormTemplates()
  },
)

onMounted(async () => {
  await fetchUsers()
  await fetchFormTemplates()
  await fetchCodes()

  if (isEditMode.value && props.consultation) {
    populateFormFromConsultation(props.consultation)
  }
})

const saveConsultation = async () => {
  try {
    // Commit any in-progress manual date input before validation/submission.
    commitConsultationDateInput()

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
      formAccessCode: selectedAccessCode.value || undefined,
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

function handleAccessCodeSelected(code: string, ignoreAccessWindowValue: boolean) {
  selectedAccessCode.value = code
  ignoreAccessWindow.value = ignoreAccessWindowValue
}

async function revokeCode() {
  if (!selectedAccessCode.value) return
  try {
    await codeApi.deactivateCode({ code: selectedAccessCode.value })
    selectedAccessCode.value = null
    ignoreAccessWindow.value = false
    form.value.formAccessCode = null
    await fetchCodes()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('Error revoking code', { errorMessage })
    notifierStore.notify(t('consultationOverview.codeRevokeError'), 'error')
  }
}

async function handleToggleAccessWindow(newValue: boolean) {
  if (!selectedAccessCode.value) return

  // If this is an edit of an existing consultation with an assigned code
  if (isEditMode.value && form.value.id) {
    try {
      // Deactivate and reactivate with new flag
      await codeApi.deactivateCode({ code: selectedAccessCode.value })
      await codeApi.activateCode({
        code: selectedAccessCode.value,
        consultationId: form.value.id,
        activateCodeRequest: {
          ignoreAccessWindow: newValue
        }
      })

      ignoreAccessWindow.value = newValue
      notifierStore.notify(
        newValue
          ? t('consultationOverview.accessWindowIgnored')
          : t('consultationOverview.accessWindowEnforced'),
        'success'
      )
    } catch (error: unknown) {
      let errorMessage = 'An unexpected error occurred'
      if (error instanceof ResponseError) {
        errorMessage = (await error.response.json()).message
      }
      logger.error('Error toggling access window', { errorMessage })
      notifierStore.notify(t('consultationOverview.codeUpdateError'), 'error')
    }
  } else {
    // For new consultations, just update the local state
    // The flag will be applied when the consultation is saved
    ignoreAccessWindow.value = newValue
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

        <v-row>
          <v-col cols="6">
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
          </v-col>
          <v-col cols="4">
            <div ref="consultationDateFieldRef">
              <v-text-field
                            v-model="consultationDateInputDraft"
                            :label="t('consultation.dateAndTime')"
                            :placeholder="t('forms.hints.dateFormat') + ' HH:mm'"
                            :hint="t('forms.hints.required')"
                            persistent-hint
                            @focus="handleConsultationDateInputFocus"
                            @blur="handleConsultationDateInputBlur"
                            class="mb-2"
                            :error="!!errors.dateAndTime"
                            :error-messages="errors.dateAndTime ? [errors.dateAndTime] : []">
                <template #append-inner>
                  <v-btn
                         icon
                         size="x-small"
                         variant="text"
                         density="comfortable"
                         @mousedown.prevent.stop
                         @click.stop="openDatePicker"
                         aria-label="Open date picker">
                    <v-icon size="16">mdi-calendar</v-icon>
                  </v-btn>
                </template>
              </v-text-field>
            </div>

            <v-menu
                    v-model="isDatePickerOpen"
                    :activator="consultationDateFieldRef"
                    :open-on-click="false"
                    :close-on-content-click="false"
                    :min-width="consultationDateMenuWidth"
                    :max-width="consultationDateMenuWidth"
                    location="bottom start"
                    offset-y>
              <div class="pa-2 consultation-date-picker-menu">
                <VueDatePicker
                               v-model="form.dateAndTime"
                               class="consultation-inline-picker"
                               :class="{ 'error-border': errors.dateAndTime }"
                               :locale="locale"
                               week-num-name="Wo"
                               format="dd.MM.yyyy HH:mm"
                               week-numbers="iso"
                               inline
                               :text-input="false"
                               :cancelText="t('buttons.cancelTimeDateText')"
                               :selectText="t('buttons.selectTimeDateText')"
                               @select="onDatePickerSelect"
                               @cancel="isDatePickerOpen = false"></VueDatePicker>
              </div>
            </v-menu>
            <v-text-field
                          v-if="errors.dateAndTime"
                          :error="true"
                          :error-messages="[errors.dateAndTime]"
                          hidden></v-text-field>
          </v-col>
          <v-col cols="1">
            <v-btn inline color="info" @click="form.dateAndTime = new Date().toISOString()">
              {{ t('buttons.timeAndDateNow') }}
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <!-- First column -->
          <v-col cols="4">
            <v-text-field
                          v-model.number="form.consultationAccessDaysBefore"
                          type="number"
                          :min="0"
                          :max="365"
                          :label="t('departmentCodeSettings.daysBeforeLabel')"
                          :hint="t('departmentCodeSettings.daysBeforeHint')"
                          outlined
                          dense></v-text-field>

          </v-col>
          <!-- Second column -->
          <v-col cols="4">
            <v-text-field
                          v-model.number="form.consultationAccessDaysAfter"
                          type="number"
                          :min="0"
                          :max="365"
                          :label="t('departmentCodeSettings.daysAfterLabel')"
                          :hint="t('departmentCodeSettings.daysAfterHint')"
                          outlined
                          dense></v-text-field>

          </v-col>
          <!-- 3rd Column -->
          <v-col cols="4">
            <!-- Form Visited By section -->
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

          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
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
          </v-col>
        </v-row>

        <!-- Notes Editor Component -->
        <NotesEditor
                     v-model:notes="form.notes"
                     title="consultation.notes"
                     add-button-text="consultation.addNote" />

        <!-- Form Access Code Section -->
        <v-row>
          <v-col cols="12">
            <h4 class="mb-3">{{ t('consultationOverview.codeAssignment') }}</h4>

            <!-- Show assigned code with revoke option -->
            <div v-if="selectedAccessCode" class="mb-4">
              <AssignedCodeDisplay
                                   :code="selectedAccessCode"
                                   v-model="ignoreAccessWindow"
                                   @revoke="revokeCode"
                                   @toggle-access-window="handleToggleAccessWindow" />
            </div>

            <!-- Show selector to add new code (only when no code assigned) -->
            <div v-if="!selectedAccessCode">
              <AccessCodeAssignment
                                    code-type="consultation"
                                    :consultation-date="form.dateAndTime || undefined"
                                    v-model="ignoreAccessWindow"
                                    @code-selected="handleAccessCodeSelected" />
            </div>
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
.consultation-date-picker-menu {
  width: 100%;
}

.consultation-date-picker-menu :deep(.consultation-inline-picker),
.consultation-date-picker-menu :deep(.dp__main),
.consultation-date-picker-menu :deep(.dp__menu) {
  width: 100%;
}

.error-border {
  border: 2px solid red !important;
  border-radius: 4px;
  padding: 4px;
}
</style>
