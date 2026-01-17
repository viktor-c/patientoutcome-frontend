<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import {
  type Blueprint,
  type Consultation,
  type CreateConsultation,
  CreateConsultationReasonForConsultationEnum,
  type UpdatePatientCaseByIdRequestNotesInner as ConsultationNote,
  SearchBlueprintsBlueprintForEnum,
  ResponseError
} from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { blueprintApi, consultationApi } from '@/api'
import dayjs from 'dayjs'
import CreateEditConsultationDialog from './CreateEditConsultationDialog.vue'

const props = defineProps<{
  modelValue: Blueprint[]
  surgeryDate?: string
  patientId: string
  caseId: string
  preSelectedBlueprintIds?: string[]
  // Whether to show the form's internal buttons (default: true)
  showButtons?: boolean
  // Current consultation flow substep (4a or 4b)
  consultationFlowStep?: '4a' | '4b'
}>()

const emit = defineEmits<{
  'update:modelValue': [blueprints: Blueprint[]]
  'confirm': [blueprints: Blueprint[]]
  'cancel': []
  'consultations-created': [consultations: Consultation[]]
  'consultation-flow-advance': ['4a' | '4b']
}>()

const { t } = useI18n()
const notifierStore = useNotifierStore()
const { formatLocalizedCustomDate, dateFormats } = useDateFormat()

// State management
const availableBlueprints = ref<Blueprint[]>([])
const selectedBlueprints = ref<Blueprint[]>([...props.modelValue])
const loadingBlueprints = ref(false)
const searchQuery = ref('')

// Track current substep - sync with parent via prop
const currentConsultationFlowStep = computed(() => props.consultationFlowStep || '4a')

// Check if we're in completion state (4b)
const creationComplete = computed(() => currentConsultationFlowStep.value === '4b')
const consultationsToCreate = ref<Array<CreateConsultation & {
  originalIndex: number
  calculatedDate: string
  timeDelta: string
  blueprintTitle: string
}>>([])
const createdConsultations = ref<(Consultation & { blueprintTitle?: string })[]>([])
const creating = ref(false)
const showManualConsultationDialog = ref(false)

// Computed properties
const filteredBlueprints = computed(() => {
  if (!searchQuery.value.trim()) {
    return availableBlueprints.value
  }
  const query = searchQuery.value.toLowerCase()
  return availableBlueprints.value.filter(blueprint =>
    blueprint.title.toLowerCase().includes(query) ||
    blueprint.description.toLowerCase().includes(query) ||
    (blueprint.tags && blueprint.tags.some(tag => tag.toLowerCase().includes(query)))
  )
})

const isSelected = (blueprint: Blueprint): boolean => {
  return selectedBlueprints.value.some(selected => selected.id === blueprint.id)
}

const calculateBlueprintDate = (timeDelta?: string): dayjs.Dayjs => {
  if (!props.surgeryDate || !timeDelta) {
    return dayjs()
  }

  const referenceDate = dayjs(props.surgeryDate)
  const match = timeDelta.toLowerCase().match(/^([+-]?\d+)([dwmy])$/)

  if (!match) {
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
      return referenceDate
  }
}

const sortedSelectedBlueprints = computed(() => {
  const sortedSelectedBlueprintsArray = [...selectedBlueprints.value].sort((a, b) => {
    const dateA = calculateBlueprintDate(a.timeDelta)
    const dateB = calculateBlueprintDate(b.timeDelta)
    return dateA.isBefore(dateB) ? -1 : dateA.isAfter(dateB) ? 1 : 0
  })
  return sortedSelectedBlueprintsArray
})

const canConfirm = computed(() => {
  return selectedBlueprints.value.length > 0 && !creating.value && currentConsultationFlowStep.value === '4a'
})

const sortedCreatedConsultations = computed(() => {
  return [...createdConsultations.value].sort((a, b) => {
    const dateA = new Date(a.dateAndTime || 0).getTime()
    const dateB = new Date(b.dateAndTime || 0).getTime()
    return dateA - dateB
  })
})

// Actions
const toggleBlueprint = (blueprint: Blueprint) => {
  const index = selectedBlueprints.value.findIndex(selected => selected.id === blueprint.id)
  if (index >= 0) {
    selectedBlueprints.value.splice(index, 1)
  } else {
    selectedBlueprints.value.push(blueprint)
  }
  emit('update:modelValue', selectedBlueprints.value)
}

const removeBlueprint = (blueprint: Blueprint) => {
  const index = selectedBlueprints.value.findIndex(selected => selected.id === blueprint.id)
  if (index >= 0) {
    selectedBlueprints.value.splice(index, 1)
    emit('update:modelValue', selectedBlueprints.value)
  }
}

// Actions for handling creation flow
const createMoreConsultations = () => {
  // Reset to selection state (4a)
  emit('consultation-flow-advance', '4a')
  selectedBlueprints.value = []
  searchQuery.value = ''
}

const handleManualConsultationCreated = (consultation: Consultation) => {
  // Add the manually created consultation to the list
  createdConsultations.value.push({ ...consultation, blueprintTitle: 'Manual' })
  showManualConsultationDialog.value = false
  notifierStore.notify(t('alerts.consultation.created'), 'success')
}

const finishCreation = () => {
  emit('consultations-created', createdConsultations.value)
}

const cancel = () => {
  emit('cancel')
}

const closeDialog = () => {
  // Moving from 4a to 4b (skip blueprints, go to manual creation state)
  emit('consultation-flow-advance', '4b')
}

// New consultation creation functions
const createConsultationsFromBlueprints = async () => {
  if (selectedBlueprints.value.length === 0) {
    // No blueprints selected - emit event to move to completion state (4b)
    notifierStore.notify(t('alerts.consultation.noConsultationsSelected'), 'info')
    emit('consultation-flow-advance', '4b')
    return
  }

  creating.value = true
  consultationsToCreate.value = []

  try {
    // Process each selected blueprint
    for (const blueprint of selectedBlueprints.value) {
      const consultations = await processBlueprint(blueprint)
      consultationsToCreate.value.push(...consultations)
    }

    // Sort consultations by dateAndTime in ascending order
    consultationsToCreate.value.sort((a, b) => {
      const dateA = new Date(a.dateAndTime || a.calculatedDate)
      const dateB = new Date(b.dateAndTime || b.calculatedDate)
      return dateA.getTime() - dateB.getTime()
    })

    // Create all consultations
    const newConsultations: (Consultation & { blueprintTitle?: string })[] = []
    for (const consultationData of consultationsToCreate.value) {
      // Remove extra properties that are not part of CreateConsultation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { originalIndex, calculatedDate, timeDelta, blueprintTitle, ...cleanConsultationData } = consultationData

      // Ensure the dateAndTime is set to the calculated date from timeDelta
      cleanConsultationData.dateAndTime = calculatedDate

      const response = await consultationApi.createConsultation({
        caseId: props.caseId,
        createConsultation: cleanConsultationData,
      })
      if (response.responseObject) {
        // Add the blueprint title to the created consultation for UI purposes
        const consultationWithTitle = { ...response.responseObject, blueprintTitle }
        newConsultations.push(consultationWithTitle)
        console.log('Consultation created successfully with calculated date:', response.responseObject)
      }
    }

    createdConsultations.value.push(...newConsultations)
    
    // Move to completion state (4b)
    emit('consultation-flow-advance', '4b')

    notifierStore.notify(t('alerts.consultation.batchCreated', { count: newConsultations.length }), 'success')

    // Clear selected blueprints for potential next round
    selectedBlueprints.value = []
    emit('update:modelValue', selectedBlueprints.value)

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

const processBlueprint = async (blueprint: Blueprint): Promise<Array<CreateConsultation & { originalIndex: number; calculatedDate: string; timeDelta: string; blueprintTitle: string }>> => {
  if (!blueprint.content) {
    console.warn('Blueprint has no content')
    return []
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
  const referenceDate = props.surgeryDate
    ? dayjs(props.surgeryDate).hour(10).minute(0).second(0).millisecond(0)
    : dayjs()
  const result: Array<CreateConsultation & { originalIndex: number; calculatedDate: string; timeDelta: string; blueprintTitle: string }> = []

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
      result.push({
        originalIndex: index,
        calculatedDate: calculatedDate.toISOString(),
        timeDelta: consultation.timeDelta || '0d',
        blueprintTitle: blueprint.title,
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
    result.push({
      originalIndex: 0,
      calculatedDate: calculatedDate.toISOString(),
      timeDelta: consultation.timeDelta || blueprint.timeDelta || '0d',
      blueprintTitle: blueprint.title,
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
    result.push({
      originalIndex: 0,
      calculatedDate: calculatedDate.toISOString(),
      timeDelta: blueprint.timeDelta || '0d',
      blueprintTitle: blueprint.title,
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

  return result
}

// Parse timeDelta and calculate actual date
const calculateConsultationDate = (timeDelta: string, referenceDate: dayjs.Dayjs): dayjs.Dayjs => {
  // Parse timeDelta format like "7d", "2w", "1m", "0d", etc. (case insensitive)
  const match = timeDelta.match(/^([+-]?\d+)([dwmy])$/i)
  if (!match) {
    console.warn('Invalid timeDelta format:', timeDelta, 'using 0 days')
    return referenceDate
  }

  const amount = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()

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

// API functions
const loadConsultationBlueprints = async () => {
  loadingBlueprints.value = true
  try {
    const response = await blueprintApi.getBlueprints({
      blueprintFor: SearchBlueprintsBlueprintForEnum.Consultation
    })
    if (response.responseObject?.blueprints) {
      availableBlueprints.value = response.responseObject.blueprints as Blueprint[]

      // After loading available blueprints, handle pre-selected ones
      await handlePreSelectedBlueprints()
    }
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

// Handle pre-selected blueprint IDs from surgery blueprint
const handlePreSelectedBlueprints = async () => {
  if (!props.preSelectedBlueprintIds || props.preSelectedBlueprintIds.length === 0) {
    return
  }

  console.log('Pre-selecting blueprint IDs:', props.preSelectedBlueprintIds)

  const preSelectedBlueprints: Blueprint[] = []

  for (const id of props.preSelectedBlueprintIds) {
    // First try to find in already loaded blueprints
    let blueprint = availableBlueprints.value.find(bp => bp.id === id)

    if (!blueprint) {
      // If not found in available blueprints, fetch it directly
      try {
        const response = await blueprintApi.getBlueprintById({ id })
        if (response.responseObject) {
          blueprint = response.responseObject as Blueprint
          // Add to available blueprints if it's not already there
          if (!availableBlueprints.value.find(bp => bp.id === id)) {
            availableBlueprints.value.push(blueprint)
          }
        }
      } catch (error) {
        console.warn('Failed to load pre-selected blueprint:', id, error)
        continue
      }
    }

    if (blueprint) {
      preSelectedBlueprints.push(blueprint)
    }
  }

  if (preSelectedBlueprints.length > 0) {
    selectedBlueprints.value = preSelectedBlueprints
    emit('update:modelValue', selectedBlueprints.value)
    console.log('Pre-selected', preSelectedBlueprints.length, 'blueprints from surgery')
  }
}

// Watch for changes to pre-selected blueprint IDs
watch(
  () => props.preSelectedBlueprintIds,
  async (newIds) => {
    if (newIds && newIds.length > 0 && availableBlueprints.value.length > 0) {
      await handlePreSelectedBlueprints()
    }
  },
  { immediate: false }
)

// Lifecycle
onMounted(() => {
  if (availableBlueprints.value.length === 0) {
    loadConsultationBlueprints()
  }
})

// Expose function for external access
defineExpose({
  submit: createConsultationsFromBlueprints,
  resetFormState: () => {
    selectedBlueprints.value = []
    searchQuery.value = ''
    createdConsultations.value = []
  }
})
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-calendar-multiple</v-icon>
        <span>{{ t('consultation.selectBlueprints') }}</span>
      </div>
      <v-chip
              size="small"
              :color="currentConsultationFlowStep === '4a' ? 'info' : 'success'"
              text-color="white">
        Step {{ currentConsultationFlowStep }}
      </v-chip>
    </v-card-title>

      <v-card-text>
        <!-- Creation Complete State -->
        <div v-if="creationComplete">
          <v-alert type="success" class="mb-4">
            <h4>{{ t('consultation.creationCompleteTitle') }}</h4>
            <p v-if="createdConsultations.length > 0">
              {{ t('consultation.creationCompleteMessage', { count: createdConsultations.length }) }}
            </p>
            <p v-else>
              {{ t('consultation.noConsultationsCreatedYet') }}
            </p>
          </v-alert>

          <!-- Summary of created consultations -->
          <v-card v-if="createdConsultations.length > 0" outlined class="mb-4">
            <v-card-title>{{ t('consultation.createdConsultations') }}</v-card-title>
            <v-card-text>
              <v-list dense>
                <v-list-item v-for="(consultation, index) in sortedCreatedConsultations"
                             :key="consultation.id || index">
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ consultation.blueprintTitle ? t('consultation.consultationBasedOn', {
                      title:
                        consultation.blueprintTitle
                    }) :
                      t('consultation.consultationTitle', { index: index + 1 }) }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ consultation.dateAndTime ? formatLocalizedCustomDate(consultation.dateAndTime,
                      dateFormats.longDate) : '' }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- Options for next steps -->
          <v-card outlined>
            <v-card-title>{{ t('consultation.nextSteps') }}</v-card-title>
            <v-card-text>
              <p>{{ t('consultation.nextStepsMessage') }}</p>
              
              <!-- Action buttons for next steps -->
              <div class="d-flex gap-2 mt-4">
                <v-btn
                       color="info"
                       @click="showManualConsultationDialog = true"
                       variant="outlined">
                  <v-icon left>mdi-pencil</v-icon>
                  {{ t('consultation.createManual') }}
                </v-btn>
                <v-btn
                       color="success"
                       @click="createMoreConsultations"
                       variant="outlined">
                  <v-icon left>mdi-plus</v-icon>
                  {{ t('consultation.createMore') }}
                </v-btn>
                <v-btn
                       color="primary"
                       @click="finishCreation"
                       variant="elevated">
                  <v-icon left>mdi-check</v-icon>
                  {{ t('consultation.finish') }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Blueprint Selection State -->
        <div v-else>
          <v-row>
            <!-- Left panel: Available blueprints -->
            <v-col cols="7">
              <h3>{{ t('consultation.availableBlueprints') }}</h3>

              <!-- Search -->
              <v-text-field
                            v-model="searchQuery"
                            :label="t('consultation.searchBlueprints')"
                            prepend-inner-icon="mdi-magnify"
                            clearable
                            outlined
                            dense
                            class="mb-4" />

              <!-- Loading state -->
              <v-progress-linear
                                 v-if="loadingBlueprints"
                                 indeterminate
                                 class="mb-4" />

              <!-- Blueprint list -->
              <v-list class="blueprint-list">
                <v-list-item
                             v-for="blueprint in filteredBlueprints"
                             :key="blueprint.id || blueprint.title"
                             @click="toggleBlueprint(blueprint)"
                             :class="{ 'selected': isSelected(blueprint) }"
                             class="blueprint-item">
                  <template v-slot:prepend>
                    <v-checkbox
                                :model-value="isSelected(blueprint)"
                                @click.stop="toggleBlueprint(blueprint)"
                                color="primary" />
                  </template>

                  <div>
                    <v-list-item-title class="font-weight-medium">
                      {{ blueprint.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-wrap">
                      {{ blueprint.description }}
                    </v-list-item-subtitle>
                    <div class="d-flex align-center mt-1">
                      <v-chip
                              size="small"
                              color="info"
                              variant="outlined"
                              class="mr-2">
                        {{ blueprint.timeDelta }}
                      </v-chip>
                      <div v-if="blueprint.tags && blueprint.tags.length > 0">
                        <v-chip
                                v-for="tag in blueprint.tags.slice(0, 2)"
                                :key="tag"
                                size="x-small"
                                color="grey"
                                variant="outlined"
                                class="mr-1">
                          {{ tag }}
                        </v-chip>
                      </div>
                    </div>
                  </div>
                </v-list-item>
              </v-list>

              <!-- Empty state -->
              <v-card v-if="filteredBlueprints.length === 0 && !loadingBlueprints" outlined class="text-center pa-4">
                <v-icon size="48" color="grey">mdi-calendar-search</v-icon>
                <h4 class="mt-2">{{ t('consultation.noBlueprintsFound') }}</h4>
                <p class="text-grey">{{ t('consultation.tryDifferentSearch') }}</p>
              </v-card>
            </v-col>

            <!-- Right panel: Selected blueprints -->
            <v-col cols="5">
              <h3>{{ t('consultation.selectedBlueprints') }}</h3>
              <v-chip class="mb-4" color="primary">
                {{ selectedBlueprints.length }} {{ t('consultation.selected') }}
              </v-chip>

              <v-list v-if="selectedBlueprints.length > 0" class="selected-list">
                <v-list-item
                             v-for="blueprint in sortedSelectedBlueprints"
                             :key="blueprint.id || blueprint.title"
                             class="selected-item">
                  <div>
                    <v-list-item-title class="font-weight-medium">
                      {{ blueprint.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ blueprint.timeDelta }}
                    </v-list-item-subtitle>
                  </div>

                  <template v-slot:append>
                    <v-btn
                           icon="mdi-close"
                           size="small"
                           variant="text"
                           color="error"
                           @click="removeBlueprint(blueprint)" />
                  </template>
                </v-list-item>
              </v-list>

              <!-- Empty selected state -->
              <v-card v-else outlined class="text-center pa-4">
                <v-icon size="48" color="grey">mdi-calendar-plus</v-icon>
                <h4 class="mt-2">{{ t('consultation.noSelectedBlueprints') }}</h4>
                <p class="text-grey">{{ t('consultation.selectFromLeft') }}</p>
              </v-card>

              <!-- Surgery date reference -->
              <v-card v-if="surgeryDate" outlined class="mt-4">
                <v-card-text>
                  <h4>{{ t('consultation.referenceDate') }}</h4>
                  <p class="text-body-2">{{ formatLocalizedCustomDate(surgeryDate, dateFormats.longDate) }}</p>
                  <p class="text-caption text-grey">
                    {{ t('consultation.consultationTimesCalculated') }}
                  </p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <!-- Action buttons -->
      <v-card-actions v-if="props.showButtons !== false" class="justify-space-between pa-4">
        <!-- Creation Complete State Actions -->
        <div v-if="creationComplete" class="w-100 d-flex justify-end gap-2">
          <v-btn
                 color="info"
                 @click="showManualConsultationDialog = true"
                 variant="outlined">
            <v-icon left>mdi-pencil</v-icon>
            {{ t('consultation.createManual') }}
          </v-btn>
          <v-btn
                 color="success"
                 @click="createMoreConsultations"
                 variant="outlined">
            <v-icon left>mdi-plus</v-icon>
            {{ t('consultation.createMore') }}
          </v-btn>
        </div>

        <!-- Blueprint Selection State Actions -->
        <div v-else class="w-100 d-flex justify-space-between">
          <v-btn
                 color="grey"
                 variant="outlined"
                 @click="cancel">
            {{ t('buttons.cancel') }}
          </v-btn>

          <div class="d-flex gap-2">
            <v-btn
                   color="primary"
                   variant="outlined"
                   @click="closeDialog">
              {{ t('buttons.skipConsultations') }}
            </v-btn>

            <v-btn
                   color="success"
                   variant="elevated"
                   :disabled="!canConfirm || creating"
                   :loading="creating"
                   @click="createConsultationsFromBlueprints">
              {{ t('consultation.createConsultations') }}
              <v-badge
                       v-if="selectedBlueprints.length > 0"
                       :content="selectedBlueprints.length"
                       color="white"
                       text-color="success"
                       class="ml-2" />
            </v-btn>
          </div>
        </div>
      </v-card-actions>
    </v-card>

    <!-- Manual Consultation Creation Dialog -->
      <v-card v-if="showManualConsultationDialog">
        <v-card-title>{{ t('consultation.createManual') }}</v-card-title>
        <v-card-text>
          <CreateEditConsultationDialog
                                        :patient-id="null"
                                        :case-id="props.caseId"
                                        @submit="handleManualConsultationCreated"
                                        @cancel="showManualConsultationDialog = false" />
        </v-card-text>
      </v-card>
</template>

<style scoped>
.blueprint-list {
  max-height: 400px;
  overflow-y: auto;
}

.selected-list {
  max-height: 300px;
  overflow-y: auto;
}

.blueprint-item {
  border: 1px solid transparent;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.blueprint-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.blueprint-item.selected {
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-color: rgb(var(--v-theme-primary));
}

.selected-item {
  border: 1px solid rgba(var(--v-theme-success), 0.3);
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: rgba(var(--v-theme-success), 0.04);
}

.gap-2 {
  gap: 8px;
}
</style>
