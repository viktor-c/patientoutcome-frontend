<script setup lang="ts">
/**
 * VISA-A Form Renderer - handles the entire VISA-A questionnaire
 * Victorian Institute of Sports Assessment - Achilles
 */

import { type ControlElement } from '@jsonforms/core'
import {
  useJsonFormsControl,
  type RendererProps,
} from '@jsonforms/vue'
import { computed, ref, watch } from 'vue'
import { useVuetifyControl } from '@jsonforms/vue-vuetify'
import type { ScoringData, SubscaleScore } from '@/types'

const props = defineProps<RendererProps<ControlElement>>()

const control = useVuetifyControl(useJsonFormsControl(props))

// Local state to store raw form data (question answers)
const localRawData = ref<Record<string, number | string | null>>({})

/**
 * Map backend data to frontend display values
 * Q2, Q3, Q4, Q5: reversed scale (backend 0-10 -> frontend 10-0)
 */
const mapBackendToFrontend = (key: string, value: number | null): number | null => {
  if (value === null || value === undefined) return null

  // Reverse scales for Q2, Q3, Q4 (0-10 scale)
  if (key === 'q2' || key === 'q3' || key === 'q4' || key === 'q5') {
    return 10 - value
  }

  // All other questions: no transformation
  return value
}

/**
 * Map frontend display values back to backend values for saving
 * Q2, Q3, Q4, Q5: reversed scale (frontend 10-0 -> backend 0-10)
 */
const mapFrontendToBackend = (key: string, value: number | null): number | null => {
  if (value === null || value === undefined) return null

  // Reverse scales for Q2, Q3, Q4 (0-10 scale)
  if (key === 'q2' || key === 'q3' || key === 'q4' || key === 'q5') {
    return 10 - value
  }

  // All other questions: no transformation
  return value
}

// Initialize local raw data from control data on mount
const initializeLocalData = () => {
  const data = control.control.value.data
  console.debug('VISA-A: Initializing with data:', data)

  let backendData: Record<string, unknown> = {}

  if (data && typeof data === 'object') {
    // Handle ScoringData structure (has rawData field)
    if ('rawData' in data && data.rawData && typeof data.rawData === 'object') {
      const rawData = data.rawData as Record<string, unknown>
      if ('visaa' in rawData && typeof rawData.visaa === 'object') {
        backendData = rawData.visaa as Record<string, unknown>
      } else {
        backendData = rawData as Record<string, unknown>
      }
    }
    // Handle direct nested structure ({ visaa: { q1: 2, q2: 3, ... } })
    else if ('visaa' in data) {
      backendData = data.visaa as Record<string, unknown>
    }
    // Handle flat structure (direct question keys)
    else {
      backendData = data as Record<string, unknown>
    }
  }

  // Map backend values to frontend display values (applying scale reversals)
  const frontendData: Record<string, number | string | null> = {}
  for (const [key, value] of Object.entries(backendData)) {
    if (typeof value === 'number') {
      frontendData[key] = mapBackendToFrontend(key, value)
    } else {
      frontendData[key] = value as string | null
    }
  }

  localRawData.value = frontendData
  console.debug('VISA-A: Initialized local raw data (frontend values):', localRawData.value)
}

// Initialize on component mount
initializeLocalData()

// Watch for changes in q8_type to clear inappropriate q8 values
watch(() => localRawData.value.q8_type, (newType, oldType) => {
  if (newType !== oldType) {
    // Clear all q8 variants when type changes
    if (newType !== 'no_pain') localRawData.value.q8a = null
    if (newType !== 'pain_no_stop') localRawData.value.q8b = null
    if (newType !== 'pain_stop') localRawData.value.q8c = null

    // Update the control
    const updatedData = {
      visaa: { ...localRawData.value }
    }
    control.onChange(updatedData)
  }
})

import { createTranslate } from './translate'
const translate = createTranslate()

// Extract questions from schema properties
const questionsData = computed(() => {
  const schema = control.control.value.schema
  const properties = schema?.properties?.visaa?.properties || {}

  const questions: Array<{
    key: string
    fullPath: string
    title: string
    minimum?: number
    maximum?: number
    subscale?: string
    enum?: string[]
    isConditional?: boolean
    renderType?: 'slider' | 'radio'
  }> = []

  // Extract question properties from the schema
  Object.keys(properties).forEach((questionKey) => {
    const prop = properties[questionKey] as Record<string, unknown>

    // Skip q8a, q8b, q8c - they will be handled separately as conditional questions
    if (questionKey === 'q8a' || questionKey === 'q8b' || questionKey === 'q8c') {
      return
    }

    // q7 should be rendered as radio buttons
    const renderType = questionKey === 'q7' ? 'radio' : 'slider'

    questions.push({
      key: questionKey,
      fullPath: `visaa.${questionKey}`,
      title: translate(prop?.i18n as string || ''),
      minimum: (prop?.minimum as number) || 0,
      maximum: (prop?.maximum as number) || 10,
      subscale: prop?.subscale as string | undefined,
      enum: prop?.enum as string[] | undefined,
      renderType,
    })
  })

  return questions
})

// Get the conditional question based on q8_type
const conditionalQ8 = computed(() => {
  const q8Type = localRawData.value.q8_type as string | null

  if (q8Type === 'no_pain') {
    return {
      key: 'q8a',
      title: translate('visaa.q8a'),
      minimum: 0,
      maximum: 30,
      isTimeBasedQ8: true,
    }
  } else if (q8Type === 'pain_no_stop') {
    return {
      key: 'q8b',
      title: translate('visaa.q8b'),
      minimum: 0,
      maximum: 30,
      isTimeBasedQ8: true,
    }
  } else if (q8Type === 'pain_stop') {
    return {
      key: 'q8c',
      title: translate('visaa.q8c'),
      minimum: 0,
      maximum: 30,
      isTimeBasedQ8: true,
    }
  }

  return null
})

// Get the options for q8_type selection
const q8TypeOptions = computed(() => [
  { value: 'no_pain', title: translate('visaa.q8_type_no_pain') },
  { value: 'pain_no_stop', title: translate('visaa.q8_type_pain_no_stop') },
  { value: 'pain_stop', title: translate('visaa.q8_type_pain_stop') },
])

// Get the options for q7 selection
const q7Options = computed(() => [
  { value: 0, title: translate('visaa.q7_option_0') },
  { value: 4, title: translate('visaa.q7_option_4') },
  { value: 7, title: translate('visaa.q7_option_7') },
  { value: 10, title: translate('visaa.q7_option_10') },
])

// Calculate completion status for VISA-A
const calculateCompletion = (): { isComplete: boolean; answeredQuestions: number; totalQuestions: number } => {
  const requiredQuestions = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8_type']
  let answered = 0
  let total = requiredQuestions.length

  // Check all regular questions
  for (const key of requiredQuestions) {
    const value = localRawData.value[key]
    if (value !== null && value !== undefined && value !== '') {
      answered++
    }
  }

  // Special handling for Q8: if q8_type is answered, check the corresponding variant
  const q8Type = localRawData.value.q8_type
  if (q8Type) {
    // One of the q8 variants should be answered based on type
    let q8VariantAnswered = false
    if (q8Type === 'no_pain' && localRawData.value.q8a !== null && localRawData.value.q8a !== undefined) {
      q8VariantAnswered = true
    } else if (q8Type === 'pain_no_stop' && localRawData.value.q8b !== null && localRawData.value.q8b !== undefined) {
      q8VariantAnswered = true
    } else if (q8Type === 'pain_stop' && localRawData.value.q8c !== null && localRawData.value.q8c !== undefined) {
      q8VariantAnswered = true
    }

    if (q8VariantAnswered) {
      answered++
    }
    total++ // Add the q8 variant to total
  }

  const isComplete = answered === total
  console.debug('VISA-A: Completion calculation:', { answered, total, isComplete, localRawData: localRawData.value })

  return { isComplete, answeredQuestions: answered, totalQuestions: total }
}

// Calculate VISA-A score and build ScoringData
const calculateScore = (): ScoringData => {
  const completion = calculateCompletion()

  // Convert frontend values to backend for storage
  const backendData: Record<string, number | string | null> = {}
  for (const [key, val] of Object.entries(localRawData.value)) {
    if (typeof val === 'number') {
      backendData[key] = mapFrontendToBackend(key, val)
    } else {
      backendData[key] = val
    }
  }

  // Calculate raw score (sum of all numeric answered questions, using backend values)
  let rawScore = 0
  for (const [key, value] of Object.entries(backendData)) {
    if (typeof value === 'number' && !key.endsWith('_type')) {
      rawScore += value
    }
  }

  // VISA-A max score is 100
  const maxScore = 100
  const normalizedScore = maxScore > 0 ? (rawScore / maxScore) * 100 : 0

  return {
    rawData: { visaa: backendData },
    subscales: {},
    total: {
      name: 'VISA-A Score',
      isComplete: completion.isComplete,
      completionPercentage: completion.totalQuestions > 0 
        ? Math.round((completion.answeredQuestions / completion.totalQuestions) * 100) 
        : 0,
      answeredQuestions: completion.answeredQuestions,
      totalQuestions: completion.totalQuestions,
      rawScore,
      normalizedScore: Math.round(normalizedScore),
      maxPossibleScore: maxScore
    }
  }
}

// Handle value changes
const handleSliderChange = (questionKey: string, value: number | null) => {
  console.debug(`VISA-A: Slider changed for ${questionKey}:`, value, '(frontend value)')

  // Update local data with frontend value
  localRawData.value[questionKey] = value

  // Calculate scoring with completion status
  const scoringData = calculateScore()
  console.debug('VISA-A: Calculated scoring data:', scoringData)

  // Update the JsonForms control with ScoringData
  control.onChange(scoringData)
}

// Handle q8_type selection change
const handleQ8TypeChange = (value: string | null) => {
  console.debug('VISA-A: Q8 type changed to:', value)

  // Update local data
  localRawData.value.q8_type = value

  // Clear all q8 variant values
  localRawData.value.q8a = null
  localRawData.value.q8b = null
  localRawData.value.q8c = null

  // Calculate scoring with completion status
  const scoringData = calculateScore()
  console.debug('VISA-A: Calculated scoring data:', scoringData)

  // Update the JsonForms control with ScoringData
  control.onChange(scoringData)
}

// Computed scores (if available from control data)
const scoreData = computed<ScoringData | null>(() => {
  const data = control.control.value.data
  if (data && typeof data === 'object' && 'subscales' in data && 'total' in data) {
    return data as ScoringData
  }
  return null
})

// Helper to format subscale score display
const formatScore = (score: SubscaleScore | null | undefined): string => {
  if (!score) return 'N/A'
  const raw = score.rawScore?.toFixed(0) || '0'
  const max = score.maxPossibleScore || 0
  return `${raw} / ${max}`
}

// Helper to get question value
const getQuestionValue = (questionKey: string): number | string | null => {
  const value = localRawData.value[questionKey]
  return value !== undefined ? value : null
}

// Helper to generate tick labels for sliders
const getTickLabels = (questionKey: string, min: number, max: number, isTimeBasedQ8 = false): Record<number, string> => {
  const labels: Record<number, string> = {}

  // For time-based Q8 questions (0-40 minutes)
  if (isTimeBasedQ8 && max === 30) {
    labels[0] = '0'
    labels[10] = '10'
    labels[20] = '20'
    labels[30] = '30+'
    return labels
  }

  // Q1: Show time labels from 100+ minutes to 0 minutes
  if (questionKey === 'q1') {
    labels[0] = '100+'
    labels[2] = '80'
    labels[4] = '60'
    labels[6] = '40'
    labels[8] = '20'
    labels[10] = '0'
    return labels
  }

  // Q2, Q3, Q4: Only show labels at start and end (pain descriptions)
  if (questionKey === 'q2' || questionKey === 'q3' || questionKey === 'q4') {
    // Labels will be shown via prepend/append slots only
    return {}
  }

  // Q5: Show all values from 0 to 30 (every 5)
  if (questionKey === 'q5') {
    for (let i = min; i <= max; i += 5) {
      labels[i] = i.toString()
    }
    if (!labels[max]) {
      labels[max] = max.toString()
    }
    return labels
  }

  // Q6: Show all values from 0 to 10
  if (questionKey === 'q6') {
    for (let i = min; i <= max; i++) {
      labels[i] = i.toString()
    }
    return labels
  }

  // Default: show all values for 0-10 scale
  if (max === 10) {
    for (let i = min; i <= max; i++) {
      labels[i] = i.toString()
    }
  }

  return labels
}

// Helper to get custom prepend/append labels for specific questions
const getSliderLabel = (questionKey: string, position: 'prepend' | 'append'): string => {
  // Q2, Q3, Q4: Pain descriptions
  if (questionKey === 'q2' || questionKey === 'q3' || questionKey === 'q4') {
    if (position === 'prepend') {
      return translate('visaa.pain_none') || 'No pain'
    } else {
      return translate('visaa.pain_severe') || 'Severe pain'
    }
  }

  // Q5: Function descriptions
  if (questionKey === 'q5') {
    if (position === 'prepend') {
      return translate('visaa.no_pain') || 'No pain'
    } else {
      return translate('visaa.unable') || 'Sever pain / unable'
    }
  }

  // Default: show min/max values
  return ''
}
</script>

<template>
  <div class="visaa-control-renderer">
    <!-- Form Header -->
    <div class="visaa-header mb-6">
      <v-card variant="outlined" class="pa-4">
        <div class="markdown-content" v-html="translate('form.header')"></div>
      </v-card>
    </div>

    <!-- Main Form Section -->
    <v-card variant="outlined" class="visaa-form-card mb-4">
      <v-card-title class="text-h5 bg-primary pa-4">
        {{ translate('visaa.title') }}
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- Render each question as a slider or radio -->
        <div
             v-for="question in questionsData"
             :key="question.key"
             class="question-item mb-8">
          <div class="question-label mb-2">
            <strong>{{ question.title }}</strong>
          </div>

          <!-- Render dropdown for q8_type -->
          <template v-if="question.key === 'q8_type'">
            <v-select
                      :model-value="getQuestionValue(question.key) as string"
                      @update:model-value="(value) => handleQ8TypeChange(value as string)"
                      :items="q8TypeOptions"
                      item-title="title"
                      item-value="value"
                      variant="outlined"
                      color="primary"
                      class="mt-2"
                      clearable></v-select>
          </template>

          <!-- Render radio buttons for q7 -->
          <template v-else-if="question.renderType === 'radio'">
            <v-radio-group
                           :model-value="getQuestionValue(question.key) as number"
                           @update:model-value="(value) => handleSliderChange(question.key, value as number)"
                           class="mt-2">
              <v-radio
                       v-for="option in q7Options"
                       :key="option.value"
                       :label="option.title"
                       :value="option.value"
                       color="primary"></v-radio>
            </v-radio-group>
          </template>

          <!-- Render slider for numeric questions -->
          <template v-else-if="question.minimum !== undefined && question.maximum !== undefined">
            <v-slider
                      :model-value="getQuestionValue(question.key) as number ?? undefined"
                      @update:model-value="(value) => handleSliderChange(question.key, value as number)"
                      :min="question.minimum"
                      :max="question.maximum"
                      :step="(question.maximum - question.minimum) / 10"
                      :tick-labels="getTickLabels(question.key, question.minimum, question.maximum)"
                      :show-ticks="Object.keys(getTickLabels(question.key, question.minimum, question.maximum)).length > 0 ? 'always' : false"
                      thumb-label="always"
                      color="primary"
                      track-color="grey-lighten-2"
                      class="visaa-slider"
                      :class="`visaa-slider-${question.maximum >= 30 ? 'large' : 'normal'}`">
              <template v-slot:prepend>
                <v-chip
                        v-if="getSliderLabel(question.key, 'prepend')"
                        size="small"
                        variant="outlined"
                        class="mr-2">
                  {{ getSliderLabel(question.key, 'prepend') }}
                </v-chip>
                <v-chip
                        v-else
                        size="small"
                        variant="outlined"
                        class="mr-2">
                  {{ question.minimum }}
                </v-chip>
              </template>
              <template v-slot:append>
                <v-chip
                        v-if="getSliderLabel(question.key, 'append')"
                        size="small"
                        variant="outlined"
                        class="ml-2">
                  {{ getSliderLabel(question.key, 'append') }}
                </v-chip>
                <v-chip
                        v-else
                        size="small"
                        variant="outlined"
                        class="ml-2">
                  {{ question.maximum }}
                </v-chip>
              </template>
            </v-slider>
          </template>

          <v-divider class="mt-6" v-if="question.key !== 'q8_type'"></v-divider>
        </div>

        <!-- Conditional Question 8a/8b/8c based on q8_type -->
        <div v-if="conditionalQ8" class="question-item mb-8">
          <div class="question-label mb-2">
            <strong>{{ conditionalQ8.title }}</strong>
          </div>

          <v-slider
                    :model-value="getQuestionValue(conditionalQ8.key) as number ?? undefined"
                    @update:model-value="(value) => conditionalQ8 && handleSliderChange(conditionalQ8.key, value as number)"
                    :min="conditionalQ8.minimum"
                    :max="conditionalQ8.maximum"
                    :step="1"
                    :tick-labels="getTickLabels(conditionalQ8.key, conditionalQ8.minimum, conditionalQ8.maximum, conditionalQ8.isTimeBasedQ8)"
                    show-ticks="always"
                    thumb-label="always"
                    color="primary"
                    track-color="grey-lighten-2"
                    class="visaa-slider visaa-slider-large">
            <template v-slot:prepend>
              <v-chip
                      size="small"
                      variant="outlined"
                      class="mr-2">
                0 min
              </v-chip>
            </template>
            <template v-slot:append>
              <v-chip
                      size="small"
                      variant="outlined"
                      class="ml-2">
                30+ min
              </v-chip>
            </template>
          </v-slider>
        </div>
      </v-card-text>
    </v-card>

    <!-- Scoring Summary (if available) -->
    <v-card
            v-if="scoreData"
            variant="outlined"
            class="visaa-score-card mb-4">
      <v-card-title class="text-h5 bg-secondary pa-4">
        Scores
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- Subscales -->
        <v-row class="mb-4">
          <v-col
                 v-for="(subscaleScore, subscaleKey) in scoreData.subscales"
                 :key="subscaleKey"
                 cols="12"
                 md="6">
            <v-card variant="tonal" class="pa-3">
              <div class="text-subtitle-2 mb-1">{{ subscaleScore?.name || subscaleKey }}</div>
              <div class="text-h6">{{ formatScore(subscaleScore) }}</div>
              <v-progress-linear
                                 :model-value="subscaleScore?.normalizedScore || 0"
                                 height="8"
                                 rounded
                                 color="primary"
                                 class="mt-2"></v-progress-linear>
            </v-card>
          </v-col>
        </v-row>

        <!-- Total Score -->
        <v-divider class="my-4"></v-divider>
        <v-card variant="tonal" color="primary" class="pa-4">
          <div class="text-subtitle-1 mb-2">{{ scoreData.total?.name || 'Total Score' }}</div>
          <div class="text-h4 font-weight-bold">{{ formatScore(scoreData.total) }}</div>
          <div class="text-caption mt-2">{{ scoreData.total?.description }}</div>
          <v-progress-linear
                             :model-value="scoreData.total?.rawScore || 0"
                             :max="scoreData.total?.maxPossibleScore || 100"
                             height="12"
                             rounded
                             color="white"
                             class="mt-3"></v-progress-linear>
        </v-card>
      </v-card-text>
    </v-card>

    <!-- Form Footer -->
    <div class="visaa-footer">
      <v-card variant="outlined" class="pa-4">
        <div class="markdown-content" v-html="translate('form.footer')"></div>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
.visaa-control-renderer {
  max-width: 100%;
  margin: 0 auto;
}

.visaa-form-card {
  background-color: #fafafa;
}

.visaa-score-card {
  background-color: #f5f5f5;
}

.question-item {
  padding: 1rem 0;
}

.question-label {
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.87);
}

/* Slider styling */
.visaa-slider {
  margin-top: 2rem;
  margin-bottom: 1rem;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .visaa-slider {
    margin-top: 1.5rem;
  }

  .question-label {
    font-size: 0.95rem;
  }

  .visaa-form-card .v-card-title {
    font-size: 1.25rem !important;
  }
}

@media (max-width: 400px) {
  .question-label {
    font-size: 0.9rem;
  }

  .visaa-slider {
    margin-top: 1rem;
  }
}

/* Markdown content styling */
.markdown-content :deep(h2) {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.markdown-content :deep(p) {
  margin-bottom: 0.5rem;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}
</style>
