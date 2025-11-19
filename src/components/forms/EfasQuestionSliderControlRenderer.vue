<script setup lang="ts">
/**
* EFAS Form Renderer - handles the entire EFAS questionnaire
*/

import { type ControlElement } from '@jsonforms/core'
import {
  useJsonFormsControl,
  type RendererProps,
} from '@jsonforms/vue'
import { computed, ref } from 'vue'
import { useVuetifyControl } from '@jsonforms/vue-vuetify'
import type { ScoringData, SubscaleScore } from '@/types'

const props = defineProps<RendererProps<ControlElement>>()

const control = useVuetifyControl(useJsonFormsControl(props))

// Local state to store raw form data (question answers)
// This avoids inconsistency issues with control.control.value.data structure
const localRawData = ref<Record<string, Record<string, number | null>>>({})

// Initialize local raw data from control data on mount
const initializeLocalData = () => {
  const data = control.control.value.data
  console.debug('EFAS: Initializing with data:', data)

  if (data && typeof data === 'object') {
    // Handle ScoringData structure (has rawData field)
    if ('rawData' in data) {
      localRawData.value = { ...(data.rawData as Record<string, Record<string, number | null>>) }
    }
    // Handle direct nested structure (like { standardfragebogen: { q1: 2, q2: 3 }, sportfragebogen: { ... } })
    else if ('standardfragebogen' in data || 'sportfragebogen' in data) {
      localRawData.value = { ...(data as Record<string, Record<string, number | null>>) }
    }
    // Initialize empty structure if no recognizable data
    else {
      localRawData.value = {}
    }
  } else {
    localRawData.value = {}
  }
  console.debug('EFAS: Initialized local raw data:', localRawData.value)
}

// Initialize on component mount
initializeLocalData()

import { createTranslate } from './translate'
const translate = createTranslate()

console.debug('EfasQuestionSliderControlRenderer JSONForms props:', {
  controlData: control.control.value.data,
  controlPath: control.control.value.path,
  controlSchema: control.control.value.schema,
  // jsonforms injected via createTranslate helper
})

// Log schema analysis for debugging
const logSchemaDebug = () => {
  const schema = control.control.value.schema
  const properties = schema?.properties || {}

  console.debug('EFAS Debug - Schema properties:', properties)

  // Log each section
  Object.keys(properties).forEach(sectionKey => {
    const section = properties[sectionKey] as Record<string, unknown>
    console.debug(`EFAS Debug - Section ${sectionKey}:`, section)

    if (section?.properties) {
      const sectionProperties = section.properties as Record<string, unknown>
      console.debug(`EFAS Debug - ${sectionKey} questions:`, sectionProperties)

      Object.keys(sectionProperties).forEach(questionKey => {
        const prop = sectionProperties[questionKey] as Record<string, unknown>
        console.debug(`EFAS Debug - Question ${questionKey}:`, {
          type: prop?.type,
          tickLabelLow: prop?.tickLabelLow,
          tickLabelHigh: prop?.tickLabelHigh,
          title: prop?.title
        })
      })
    }
  })
}

// Trigger debug logging
logSchemaDebug()

// Extract questions from schema properties (handling nested structure)
const questionsData = computed(() => {
  const schema = control.control.value.schema
  const properties = schema?.properties || {}

  const questions: Array<{
    key: string
    fullPath: string
    title: string
    schema: Record<string, unknown>
    thumbSize: number
    sliderTickSize: number
    tickLabelLow: string
    tickLabelHigh: string
    section: string
  }> = []

  // Traverse nested structure to find EFAS questions
  Object.keys(properties).forEach(sectionKey => {
    const section = properties[sectionKey] as Record<string, unknown>
    if (section?.type === 'object' && section?.properties) {
      const sectionProperties = section.properties as Record<string, unknown>

      Object.keys(sectionProperties).forEach(questionKey => {
        const prop = sectionProperties[questionKey] as Record<string, unknown>
        if (prop?.type === 'number') {
          questions.push({
            key: questionKey,
            fullPath: `${sectionKey}.${questionKey}`,
            title: translate(`${sectionKey}.${questionKey}.label`, ''),
            schema: prop,
            thumbSize: Number(prop?.thumbSize) || 20,
            sliderTickSize: Number(prop?.sliderTickSize) || 6,
            tickLabelLow: translate(`${sectionKey}.${questionKey}.tickLabelLow`, ''),
            tickLabelHigh: translate(`${sectionKey}.${questionKey}.tickLabelHigh`, ''),
            section: sectionKey
          })
        }
      })
    }
  })

  console.debug('EFAS Debug - Found questions:', questions)

  return questions
})

// Calculate EFAS scoring from form data (with subscales)
const calculateEfasScore = (data: Record<string, unknown>): ScoringData => {
  const questions = questionsData.value

  // Split questions by section
  const standardQuestions = questions.filter(q => q.section === 'standardfragebogen')
  const sportQuestions = questions.filter(q => q.section === 'sportfragebogen')

  // Calculate standard subscale
  const standardAnswers = standardQuestions
    .map(q => {
      const [sectionKey, questionKey] = q.fullPath.split('.')
      return (data[sectionKey] as Record<string, unknown>)?.[questionKey] as number
    })
    .filter(v => v !== null && v !== undefined)

  const standardComplete = standardAnswers.length === standardQuestions.length
  const standardRawScore = standardAnswers.reduce((sum, v) => sum + v, 0)
  const standardMaxScore = standardQuestions.length * 5 // 0-5 scale
  const standardNormalized = standardMaxScore > 0 ? (standardRawScore / standardMaxScore) * 100 : 0

  // Calculate sport subscale
  const sportAnswers = sportQuestions
    .map(q => {
      const [sectionKey, questionKey] = q.fullPath.split('.')
      return (data[sectionKey] as Record<string, unknown>)?.[questionKey] as number
    })
    .filter(v => v !== null && v !== undefined)

  const sportComplete = sportAnswers.length === sportQuestions.length
  const sportRawScore = sportAnswers.reduce((sum, v) => sum + v, 0)
  const sportMaxScore = sportQuestions.length * 5 // 0-5 scale
  const sportNormalized = sportMaxScore > 0 ? (sportRawScore / sportMaxScore) * 100 : 0

  // Total metrics
  const totalAnswered = standardAnswers.length + sportAnswers.length
  const totalQuestions = questions.length
  const completionPercentage = totalQuestions > 0 ? (totalAnswered / totalQuestions) * 100 : 0
  const isComplete = completionPercentage === 100
  const totalRawScore = standardRawScore + sportRawScore
  const totalMaxScore = standardMaxScore + sportMaxScore
  const totalNormalized = totalMaxScore > 0 ? (totalRawScore / totalMaxScore) * 100 : 0

  const subscales: Record<string, SubscaleScore> = {
    standardfragebogen: {
      name: 'Standard',
      isComplete: standardComplete,
      completionPercentage: standardQuestions.length > 0 ? Math.round((standardAnswers.length / standardQuestions.length) * 100) : 0,
      answeredQuestions: standardAnswers.length,
      totalQuestions: standardQuestions.length,
      rawScore: standardRawScore,
      normalizedScore: Math.round(standardNormalized),
      maxPossibleScore: standardMaxScore
    },
    sportfragebogen: {
      name: 'Sport',
      isComplete: sportComplete,
      completionPercentage: sportQuestions.length > 0 ? Math.round((sportAnswers.length / sportQuestions.length) * 100) : 0,
      answeredQuestions: sportAnswers.length,
      totalQuestions: sportQuestions.length,
      rawScore: sportRawScore,
      normalizedScore: Math.round(sportNormalized),
      maxPossibleScore: sportMaxScore
    }
  }

  const total: SubscaleScore = {
    name: 'Total',
    isComplete,
    completionPercentage: Math.round(completionPercentage),
    answeredQuestions: totalAnswered,
    totalQuestions,
    rawScore: totalRawScore,
    normalizedScore: Math.round(totalNormalized),
    maxPossibleScore: totalMaxScore
  }

  return {
    rawData: data as Record<string, Record<string, number>>,
    subscales,
    total
  }
}

// Helper function to update form data (handles nested structure)
const updateValue = (fullPath: string, value: number | null) => {
  const [sectionKey, questionKey] = fullPath.split('.')
  console.debug(`Updating ${fullPath} with value:`, value)

  // Update local raw data state
  if (!localRawData.value[sectionKey]) {
    localRawData.value[sectionKey] = {}
  }
  localRawData.value[sectionKey] = { ...localRawData.value[sectionKey], [questionKey]: value }

  console.debug('Updated local raw data:', localRawData.value)

  // Calculate scoring and emit ScoringData
  const scoringData = calculateEfasScore(localRawData.value)
  console.debug('EFAS Scoring data to emit:', scoringData)

  // Emit change event using JSONForms method with ScoringData
  control.handleChange(control.control.value.path, scoringData)
}

// Get current value from local state
const getCurrentValue = (fullPath: string): number | undefined => {
  const [sectionKey, questionKey] = fullPath.split('.')
  const value = localRawData.value[sectionKey]?.[questionKey]
  return value === null || value === undefined ? undefined : value
}
// Track "nicht zutreffend" (not applicable) state for each question
const notApplicableStates = ref<Record<string, boolean>>({})

const updateNotApplicable = (fullPath: string, isNotApplicable: boolean | null) => {
  const notApplicable = isNotApplicable || false
  notApplicableStates.value[fullPath] = notApplicable
  if (notApplicable) {
    updateValue(fullPath, 0)
  } else {
    updateValue(fullPath, null)
  }
}

// Track touched state for each question
const touchedStates = ref<Record<string, boolean>>({})

const updateTouchedState = (fullPath: string, value: unknown) => {
  if (value === null || value === undefined) {
    touchedStates.value[fullPath] = false
  } else {
    touchedStates.value[fullPath] = true
  }
  updateValue(fullPath, value as number)
}

// Get thumb size for a specific question
const getThumbSize = (question: { fullPath: string; thumbSize: number }) => {
  return touchedStates.value[question.fullPath] ? question.thumbSize : 0
}

// Get slider labels for a specific question
const getSliderLabels = (question: { tickLabelLow: string; tickLabelHigh: string }) => {
  return {
    0: question.tickLabelLow,
    1: '',
    2: '',
    3: '',
    4: '',
    5: question.tickLabelHigh
  }
}

// Get filtered errors for a specific question
const getFilteredErrors = (fullPath: string) => {
  return touchedStates.value[fullPath] ? control.control.value.errors : ''
}

// Click handler to capture the initial click when the slider value is uninitialized
// solves the issue of 0 not being set on first click
const onSliderClick = (e: MouseEvent, fullPath: string) => {
  // If value already set, let normal update handler run
  if (getCurrentValue(fullPath) !== undefined) return

  // Determine slider element and bounding rect
  const el = (e.currentTarget as HTMLElement) || (e.target as HTMLElement)
  if (!el || !el.getBoundingClientRect) return
  const rect = el.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const ratio = rect.width > 0 ? Math.max(0, Math.min(1, clickX / rect.width)) : 0

  // Convert ratio to discrete 0-5 value and update
  const computedValue = Math.round(ratio * 5)
  updateTouchedState(fullPath, computedValue)
}

// Local control to allow dismissing the "no questions" alert
const showNoQuestions = ref(true)
</script>

<template>
  <div class="efas-form-container">
    <h2 class="mb-4">{{ translate('efas.title.description', 'EFAS Questionnaire') }}</h2>

    <!-- Instructions -->
    <div class="mb-4 text-caption text-grey">
      <p><strong>{{ translate('efas.instructions.title', 'Instructions:') }}</strong>
        {{ translate('efas.instructions.description', 'Please rate each question on a scale from 0 to 5.') }}</p>
    </div>

    <!-- Questions organized by sections -->
    <div v-if="questionsData.length > 0">
      <!-- Group questions by section -->
      <div v-for="sectionKey in [...new Set(questionsData.map(q => q.section))]" :key="sectionKey" class="mb-8">
        <h3 class="mb-4 text-h5">
          {{ translate(`${sectionKey}.title`, sectionKey === 'standardfragebogen' ? 'Standard Fragen' : 'Sport Fragen')
          }}
        </h3>

        <div v-for="question in questionsData.filter(q => q.section === sectionKey)" :key="question.fullPath"
             class="mb-6">
          <v-card class="question-card" elevation="1">
            <v-card-title class="text-h6 pb-2">
              {{ question.title }}
            </v-card-title>

            <v-card-text>
              <!-- "Nicht zutreffend" checkbox -->
              <div class="mb-4">
                <v-checkbox
                            :model-value="notApplicableStates[question.fullPath] || false"
                            @update:model-value="(value: boolean | null) => updateNotApplicable(question.fullPath, value)"
                            :label="translate('efas.notApplicable', 'nicht zutreffend')"
                            density="compact"
                            hide-details
                            class="" />
              </div>

              <!-- Slider -->
              <div v-if="!notApplicableStates[question.fullPath]">
                <v-slider
                          :model-value="getCurrentValue(question.fullPath)"
                          @update:model-value="(value: number) => updateTouchedState(question.fullPath, value)"
                          @click="onSliderClick($event, question.fullPath)"
                          min="0"
                          max="5"
                          :step="1"
                          show-ticks="always"
                          :tick-size="question.sliderTickSize"
                          :ticks="getSliderLabels(question)"
                          :thumb-label="true"
                          :thumb-size="getThumbSize(question)"
                          thumb-color="primary"
                          :disabled="!control.control.value.enabled"
                          :error-messages="getFilteredErrors(question.fullPath)"
                          class="px-4" />
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>

    <!-- No questions message -->
    <div v-if="questionsData.length === 0 && showNoQuestions" class="text-center pa-4">
      <v-alert type="info">
        <div class="d-flex align-center justify-space-between" style="width:100%">
          <div>
            {{ translate('efas.noQuestions', 'No EFAS questions found in the schema.') }}
            <br>
            <small class="text-grey">
              Debug: Check console for schema structure details.
              <br>
              Looking for number properties with tickLabelLow and tickLabelHigh in nested objects.
            </small>
          </div>
          <v-btn icon variant="text" aria-label="Close notification" @click="showNoQuestions = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </v-alert>
    </div>
  </div>
</template>

<style scoped>
.efas-form-container {
  width: 100%;
  padding: 16px;
}

.question-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border: 1px solid #e0e0e0;
}

.question-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Slider styling */
.v-slider-thumb__surface {
  background-color: #1976d2 !important;
}

.v-slider-thumb {
  color: #1976d2;
  background-color: #1976d2;
}

/* Progress card styling */
.v-progress-linear {
  border-radius: 4px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .efas-form-container {
    padding: 8px;
  }

  .question-card {
    margin-bottom: 16px;
  }
}

/* Error state styling */
.v-slider.v-input--error .v-slider-thumb {
  background-color: #f44336 !important;
  color: #f44336 !important;
}

/* Focus state */
.v-slider:focus-within {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
