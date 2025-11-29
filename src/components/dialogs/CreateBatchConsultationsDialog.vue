<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import {
  type Blueprint,
  type Consultation,
  type CreateConsultation,
  CreateConsultationReasonForConsultationEnum,
  type UpdatePatientCaseByIdRequestNotesInner as ConsultationNote,
  type User,
  type GetFormTemplatesShortlist200ResponseResponseObjectInner as FormTemplateShortList,
  ResponseError,
  type FindAllCodes200ResponseResponseObjectInner as Code,
  SearchBlueprintsBlueprintForEnum,
} from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { consultationApi, userApi, formtemplateApi, codeApi, blueprintApi } from '@/api'
import dayjs from 'dayjs'

const props = defineProps<{
  patientId: string | null | undefined
  caseId: string
  consultationBlueprintIds?: string[]
  referenceDate?: string // Surgery date or case creation date for time calculations
  show: boolean
}>()

const emit = defineEmits<{
  'submit': [consultations: Consultation[]]
  'cancel': []
  'update:show': [value: boolean]
}>()

const { t } = useI18n()
const notifierStore = useNotifierStore()
const { formatLocalizedCustomDate, dateFormats } = useDateFormat()

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = dateFormats.isoDateTime): string => {
  if (!date) return 'N/A'
  return formatLocalizedCustomDate(date, format)
}

// State management
const blueprints = ref<Blueprint[]>([])
const selectedBlueprint = ref<Blueprint | null>(null)
const blueprintSearchQuery = ref('')
const loadingBlueprints = ref(false)
const consultationsToCreate = ref<Array<CreateConsultation & {
  originalIndex: number
  calculatedDate: string
  timeDelta: string
}>>([])

// Supporting data
const users = ref<User[]>([])
const formTemplates = ref<FormTemplateShortList[]>([])
const codes = ref<Code[]>([])

// UI state
const creating = ref(false)

// Blueprint functions
const searchBlueprints = async (query?: string) => {
  if (loadingBlueprints.value) return

  loadingBlueprints.value = true
  try {
    const response = await blueprintApi.searchBlueprints({
      q: query || blueprintSearchQuery.value || '',
      blueprintFor: SearchBlueprintsBlueprintForEnum.Consultation
    })
    blueprints.value = (response.responseObject?.blueprints || []) as Blueprint[]
    console.log('Consultation blueprints found:', blueprints.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error searching consultation blueprints:', errorMessage)
    notifierStore.notify(t('alerts.blueprint.searchFailed'), 'error')
  } finally {
    loadingBlueprints.value = false
  }
}

const loadDefaultBlueprints = async () => {
  if (loadingBlueprints.value) return

  loadingBlueprints.value = true
  try {
    const response = await blueprintApi.getBlueprints({
      blueprintFor: SearchBlueprintsBlueprintForEnum.Consultation
    })
    blueprints.value = (response.responseObject?.blueprints || []) as Blueprint[]
    console.log('All consultation blueprints loaded:', blueprints.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error loading consultation blueprints:', errorMessage)
    notifierStore.notify(t('alerts.blueprint.loadFailed'), 'error')
  } finally {
    loadingBlueprints.value = false
  }
}

const loadBlueprintById = async (id: string): Promise<Blueprint | null> => {
  try {
    const response = await blueprintApi.getBlueprintById({ id })
    console.log('Blueprint loaded by ID:', response.responseObject)
    return (response.responseObject as Blueprint) || null
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error loading blueprint by ID:', errorMessage)
    notifierStore.notify(t('alerts.blueprint.loadFailed'), 'error')
    return null
  }
}

// Parse blueprint content and calculate consultation dates
const applyBlueprint = (blueprint: Blueprint) => {
  if (!blueprint.content) {
    console.warn('Blueprint has no content')
    return
  }

  interface ConsultationTemplate {
    timeDelta?: string
    reasonForConsultation?: string[]
    notes?: string[]
    visitedBy?: string[]
    formTemplates?: string[]
  }

  interface BlueprintContent {
    consultations?: ConsultationTemplate[]
    consultation?: ConsultationTemplate
    formTemplates?: string[]
  }

  const content = blueprint.content as BlueprintContent
  const referenceDate = props.referenceDate ? dayjs(props.referenceDate) : dayjs()

  // Reset consultations array
  consultationsToCreate.value = []

  // Helper function to convert string notes to proper note objects
  const convertNotes = (notes: string[] = []): ConsultationNote[] => {
    return notes.map(noteText => ({
      note: noteText,
      dateCreated: new Date().toISOString(),
      createdBy: undefined
    }))
  }

  // Helper function to convert string reasons to enum values
  const convertReasons = (reasons: string[] = []): CreateConsultationReasonForConsultationEnum[] => {
    return reasons.filter(reason =>
      Object.values(CreateConsultationReasonForConsultationEnum).includes(reason as CreateConsultationReasonForConsultationEnum)
    ) as CreateConsultationReasonForConsultationEnum[]
  }

  // Helper function to convert form template IDs for formTemplates (backend expects array of strings)
  const convertFormTemplateIds = (formTemplateIds: string[] = []): string[] => {
    console.log('Converting form template IDs for formTemplates:', formTemplateIds)
    return formTemplateIds
  }

  // Handle different blueprint content structures
  if (Array.isArray(content.consultations)) {
    // Multiple consultations in array
    content.consultations.forEach((consultation: ConsultationTemplate, index: number) => {
      const calculatedDate = calculateConsultationDate(consultation.timeDelta || '0d', referenceDate)
      consultationsToCreate.value.push({
        originalIndex: index,
        calculatedDate: calculatedDate.toISOString(),
        timeDelta: consultation.timeDelta || '0d',
        patientCaseId: props.caseId,
        dateAndTime: calculatedDate.toISOString(),
        reasonForConsultation: convertReasons(consultation.reasonForConsultation),
        notes: convertNotes(consultation.notes),
        images: [],
        visitedBy: [],
        formAccessCode: undefined,
        formTemplates: convertFormTemplateIds(consultation.formTemplates),
      })
    })
  } else if (content.consultation) {
    // Single consultation object
    const consultation = content.consultation
    const calculatedDate = calculateConsultationDate(consultation.timeDelta || blueprint.timeDelta || '0d', referenceDate)
    consultationsToCreate.value.push({
      originalIndex: 0,
      calculatedDate: calculatedDate.toISOString(),
      timeDelta: consultation.timeDelta || blueprint.timeDelta || '0d',
      patientCaseId: props.caseId,
      dateAndTime: calculatedDate.toISOString(),
      reasonForConsultation: convertReasons(consultation.reasonForConsultation),
      notes: convertNotes(consultation.notes),
      images: [],
      visitedBy: [],
      formAccessCode: undefined,
      formTemplates: convertFormTemplateIds(consultation.formTemplates),
    })
  } else {
    // Legacy: use blueprint timeDelta for single consultation
    const calculatedDate = calculateConsultationDate(blueprint.timeDelta || '0d', referenceDate)
    consultationsToCreate.value.push({
      originalIndex: 0,
      calculatedDate: calculatedDate.toISOString(),
      timeDelta: blueprint.timeDelta || '0d',
      patientCaseId: props.caseId,
      dateAndTime: calculatedDate.toISOString(),
      reasonForConsultation: [],
      notes: [],
      images: [],
      visitedBy: [],
      formAccessCode: undefined,
      formTemplates: convertFormTemplateIds(content.formTemplates || []),
    })
  }

  console.log('Consultations to create:', consultationsToCreate.value)
}

// Parse timeDelta and calculate actual date
const calculateConsultationDate = (timeDelta: string, referenceDate: dayjs.Dayjs): dayjs.Dayjs => {
  // Parse timeDelta format like "7d", "2w", "1m", "0d", etc.
  const match = timeDelta.match(/^([+-]?\d+)([dwmy])$/)
  if (!match) {
    console.warn('Invalid timeDelta format:', timeDelta, 'using 0 days')
    return referenceDate
  }

  const amount = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 'd':
      return referenceDate.add(amount, 'day')
    case 'w':
      return referenceDate.add(amount, 'week')
    case 'm':
      return referenceDate.add(amount, 'month')
    case 'y':
      return referenceDate.add(amount, 'year')
    default:
      console.warn('Unknown time unit:', unit, 'using 0 days')
      return referenceDate
  }
}

// Supporting data fetchers
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
    const response = await codeApi.getAllAvailableCodes()
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

// Create all consultations
const createConsultations = async () => {
  if (consultationsToCreate.value.length === 0) {
    notifierStore.notify(t('alerts.consultation.noConsultationsToCreate'), 'info')
    return
  }

  creating.value = true
  const createdConsultations: Consultation[] = []

  try {
    // Create consultations sequentially to avoid rate limiting
    for (const consultationData of consultationsToCreate.value) {
      // Remove extra properties that are not part of CreateConsultation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { originalIndex, calculatedDate, timeDelta, ...cleanConsultationData } = consultationData

      const response = await consultationApi.createConsultation({
        caseId: props.caseId,
        createConsultation: cleanConsultationData,
      })
      if (response.responseObject) {
        createdConsultations.push(response.responseObject)
        console.log('Consultation created successfully:', response.responseObject)
      }
    }

    notifierStore.notify(t('alerts.consultation.batchCreated', { count: createdConsultations.length }), 'success')
    emit('submit', createdConsultations)
    closeDialog()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error creating consultations:', errorMessage)
    notifierStore.notify(t('alerts.consultation.batchCreateFailed'), 'error')
  } finally {
    creating.value = false
  }
}

// Dialog management
const closeDialog = () => {
  emit('update:show', false)
  emit('cancel')
}

// Computed properties
const dialogTitle = computed(() => {
  if (consultationsToCreate.value.length > 1) {
    return t('consultation.createBatch', { count: consultationsToCreate.value.length })
  }
  return t('consultation.createFromBlueprint')
})

const canCreate = computed(() => {
  return consultationsToCreate.value.length > 0 && !creating.value
})

// Lifecycle
onMounted(async () => {
  // Fetch supporting data
  await Promise.all([
    fetchUsers(),
    fetchFormTemplates(),
    fetchAvailableCodes()
  ])

  // Load initial blueprints
  await loadDefaultBlueprints()

  // If blueprint IDs are provided, load and apply the first one
  if (props.consultationBlueprintIds && props.consultationBlueprintIds.length > 0) {
    const firstBlueprintId = props.consultationBlueprintIds[0]
    const blueprint = await loadBlueprintById(firstBlueprintId)
    if (blueprint) {
      selectedBlueprint.value = blueprint
      applyBlueprint(blueprint)
    }
  }
})
</script>

<template>
  <v-dialog
            :model-value="show"
            @update:model-value="emit('update:show', $event)"
            max-width="800px">
    <v-card>
      <v-card-title>
        {{ dialogTitle }}
      </v-card-title>

      <v-card-text>
        <!-- Blueprint Selection -->
        <v-autocomplete
                        v-model="selectedBlueprint"
                        :items="blueprints"
                        :loading="loadingBlueprints"
                        :search="blueprintSearchQuery"
                        @update:search="searchBlueprints"
                        @update:model-value="selectedBlueprint && applyBlueprint(selectedBlueprint)"
                        item-title="title"
                        item-value="id"
                        :label="t('blueprint.selectConsultationBlueprint')"
                        :hint="t('blueprint.searchHint')"
                        persistent-hint
                        clearable
                        outlined
                        return-object>
          <template v-slot:item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps">
              <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ item.raw.description }}
                <span v-if="item.raw.timeDelta" class="ml-2 text-info">
                  ({{ item.raw.timeDelta }})
                </span>
              </v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-autocomplete>

        <!-- Reference Date Display -->
        <v-card v-if="referenceDate" class="my-4" outlined>
          <v-card-text>
            <h4>{{ t('consultation.referenceDate') }}</h4>
            <p>{{ safeFormatDate(referenceDate, dateFormats.isoDate) }}</p>
          </v-card-text>
        </v-card>

        <!-- Consultations Preview -->
        <v-card v-if="consultationsToCreate.length > 0" class="my-4" outlined>
          <v-card-title>
            {{ t('consultation.consultationsToCreate') }}
            <v-chip class="ml-2" color="primary">{{ consultationsToCreate.length }}</v-chip>
          </v-card-title>

          <v-card-text>
            <v-list>
              <v-list-item
                           v-for="(consultation, index) in consultationsToCreate"
                           :key="index">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-calendar-clock</v-icon>
                </template>

                <v-list-item-title>
                  {{ t('consultation.consultationTitle', { index: index + 1 }) }}
                </v-list-item-title>

                <v-list-item-subtitle>
                  <div>
                    <strong>{{ t('consultation.scheduledDate') }}:</strong>
                    {{ safeFormatDate(consultation.calculatedDate, dateFormats.isoDateTime) }}
                  </div>
                  <div>
                    <strong>{{ t('consultation.timeDelta') }}:</strong>
                    {{ consultation.timeDelta }}
                  </div>
                  <div v-if="consultation.reasonForConsultation.length > 0">
                    <strong>{{ t('consultation.reasonForConsultation') }}:</strong>
                    {{ consultation.reasonForConsultation.join(', ') }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Empty State -->
        <v-card v-else class="my-4" outlined>
          <v-card-text class="text-center">
            <v-icon size="64" color="grey">mdi-calendar-plus</v-icon>
            <h3 class="mt-2">{{ t('consultation.selectBlueprintToStart') }}</h3>
            <p class="text-grey">{{ t('consultation.selectBlueprintHint') }}</p>
          </v-card-text>
        </v-card>
      </v-card-text>

      <!-- Action buttons -->
      <v-card-actions>
        <v-spacer />
        <v-btn color="warning" @click="closeDialog">
          {{ t('buttons.cancel') }}
        </v-btn>
        <v-btn
               color="success"
               :disabled="!canCreate"
               :loading="creating"
               @click="createConsultations">
          {{ t('buttons.createConsultations', { count: consultationsToCreate.length }) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
