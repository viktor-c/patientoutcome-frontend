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
import { computed, ref } from 'vue'
import { useVuetifyControl } from '@jsonforms/vue-vuetify'
import type { ScoringData, SubscaleScore } from '@/types'

const props = defineProps<RendererProps<ControlElement>>()

const control = useVuetifyControl(useJsonFormsControl(props))

// Local state to store raw form data (question answers)
const localRawData = ref<Record<string, number | null>>({})

// Initialize local raw data from control data on mount
const initializeLocalData = () => {
  const data = control.control.value.data
  console.debug('VISA-A: Initializing with data:', data)

  if (data && typeof data === 'object') {
    // Handle ScoringData structure (has rawData field)
    if ('rawData' in data && data.rawData && typeof data.rawData === 'object') {
      const rawData = data.rawData as Record<string, unknown>
      if ('visaa' in rawData && typeof rawData.visaa === 'object') {
        localRawData.value = { ...(rawData.visaa as Record<string, number | null>) }
      } else {
        localRawData.value = { ...(rawData as Record<string, number | null>) }
      }
    }
    // Handle direct nested structure ({ visaa: { q1: 2, q2: 3, ... } })
    else if ('visaa' in data) {
      localRawData.value = { ...(data.visaa as Record<string, number | null>) }
    }
    // Handle flat structure (direct question keys)
    else {
      localRawData.value = { ...(data as Record<string, number | null>) }
    }
  } else {
    localRawData.value = {}
  }
  console.debug('VISA-A: Initialized local raw data:', localRawData.value)
}

// Initialize on component mount
initializeLocalData()

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
    minimum: number
    maximum: number
    subscale?: string
  }> = []

  // Extract question properties from the schema
  Object.keys(properties).forEach((questionKey) => {
    const prop = properties[questionKey] as Record<string, unknown>
    
    questions.push({
      key: questionKey,
      fullPath: `visaa.${questionKey}`,
      title: translate(prop?.i18n as string || ''),
      minimum: (prop?.minimum as number) || 0,
      maximum: (prop?.maximum as number) || 10,
      subscale: prop?.subscale as string | undefined,
    })
  })

  return questions
})

// Handle value changes
const handleSliderChange = (questionKey: string, value: number | null) => {
  console.debug(`VISA-A: Slider changed for ${questionKey}:`, value)
  
  // Update local data
  localRawData.value[questionKey] = value

  // Build the complete nested data structure
  const updatedData = {
    visaa: { ...localRawData.value }
  }

  console.debug('VISA-A: Updating control with nested data:', updatedData)
  
  // Update the JsonForms control
  control.onChange(updatedData)
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
const getQuestionValue = (questionKey: string): number | null => {
  return localRawData.value[questionKey] ?? null
}

// Helper to generate tick labels for sliders
const getTickLabels = (min: number, max: number): Record<number, string> => {
  const labels: Record<number, string> = {}
  
  // For 0-10 scale, show all values
  if (max === 10) {
    for (let i = min; i <= max; i++) {
      labels[i] = i.toString()
    }
  }
  // For 0-30 scale, show every 5
  else if (max === 30) {
    for (let i = min; i <= max; i += 5) {
      labels[i] = i.toString()
    }
    if (!labels[max]) {
      labels[max] = max.toString()
    }
  }
  
  return labels
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
        <!-- Render each question as a slider -->
        <div 
          v-for="question in questionsData" 
          :key="question.key"
          class="question-item mb-8"
        >
          <div class="question-label mb-2">
            <strong>{{ question.title }}</strong>
          </div>

          <v-slider
            :model-value="getQuestionValue(question.key) ?? undefined"
            @update:model-value="(value) => handleSliderChange(question.key, value as number)"
            :min="question.minimum"
            :max="question.maximum"
            :step="1"
            :tick-labels="getTickLabels(question.minimum, question.maximum)"
            show-ticks="always"
            thumb-label="always"
            color="primary"
            track-color="grey-lighten-2"
            class="visaa-slider"
            :class="`visaa-slider-${question.maximum === 30 ? 'large' : 'normal'}`"
          >
            <template v-slot:prepend>
              <v-chip 
                size="small" 
                variant="outlined"
                class="mr-2"
              >
                {{ question.minimum }}
              </v-chip>
            </template>
            <template v-slot:append>
              <v-chip 
                size="small" 
                variant="outlined"
                class="ml-2"
              >
                {{ question.maximum }}
              </v-chip>
            </template>
          </v-slider>

          <v-divider class="mt-6" v-if="question.key !== 'q8'"></v-divider>
        </div>
      </v-card-text>
    </v-card>

    <!-- Scoring Summary (if available) -->
    <v-card 
      v-if="scoreData" 
      variant="outlined" 
      class="visaa-score-card mb-4"
    >
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
            md="6"
          >
            <v-card variant="tonal" class="pa-3">
              <div class="text-subtitle-2 mb-1">{{ subscaleScore?.name || subscaleKey }}</div>
              <div class="text-h6">{{ formatScore(subscaleScore) }}</div>
              <v-progress-linear
                :model-value="subscaleScore?.normalizedScore || 0"
                height="8"
                rounded
                color="primary"
                class="mt-2"
              ></v-progress-linear>
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
            class="mt-3"
          ></v-progress-linear>
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
