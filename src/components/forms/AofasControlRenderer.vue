<script setup lang="ts">
/**
 * AOFAS Form Renderer - handles the entire AOFAS questionnaire
 * Similar to EFAS renderer but for AOFAS form structure
 */

import { type ControlElement } from '@jsonforms/core'
import {
  useJsonFormsControl,
  type RendererProps,
} from '@jsonforms/vue'
import { computed, ref } from 'vue'
import { useVuetifyControl } from '@jsonforms/vue-vuetify'
import type { ScoringData, SubscaleScore } from '@/types'

// TypeScript types for AOFAS data structure
interface AofasQuestionDataType {
  key: string
  fullPath: string
  title: string
  schema: {
    title: string
    description: string
    type: string
    i18n: string
    enum: number[]
    enumLabels: string[]
  }
  section: string
  options: Array<{ value: number; label: string }>
}

const props = defineProps<RendererProps<ControlElement>>()

const control = useVuetifyControl(useJsonFormsControl(props))

// Local state to store raw form data (question answers)
// This avoids inconsistency issues with control.control.value.data structure
const localRawData = ref<Record<string, Record<string, number | null>>>({})

// Initialize local raw data from control data on mount
const initializeLocalData = () => {
  const data = control.control.value.data
  console.debug('AOFAS: Initializing with data:', data)

  if (data && typeof data === 'object') {
    // Handle ScoringData structure (has rawData field)
    if ('rawData' in data) {
      localRawData.value = { ...(data.rawData as Record<string, Record<string, number | null>>) }
    }
    // Handle direct nested structure (like { vorfußfragebogen: { pain: 10, ... } })
    else if ('vorfußfragebogen' in data) {
      localRawData.value = { ...(data as Record<string, Record<string, number | null>>) }
    }
    // Initialize empty structure if no recognizable data
    else {
      localRawData.value = {}
    }
  } else {
    localRawData.value = {}
  }
  console.debug('AOFAS: Initialized local raw data:', localRawData.value)
}

// Initialize on component mount
initializeLocalData()

import { createTranslate } from './translate'
const translate = createTranslate()

console.debug('AofasControlRenderer JSONForms props:', {
  controlData: control.control.value.data,
  controlPath: control.control.value.path,
  controlSchema: control.control.value.schema,
  // jsonforms injected via createTranslate helper
})

// Log schema analysis for debugging
const logSchemaDebug = () => {
  const schema = control.control.value.schema
  const properties = schema?.properties || {}

  console.debug('AOFAS Debug - Schema properties:', properties)

  // Log each section
  Object.keys(properties).forEach(sectionKey => {
    const section = properties[sectionKey] as Record<string, unknown>
    console.debug(`AOFAS Debug - Section ${sectionKey}:`, section)

    if (section?.properties) {
      const sectionProperties = section.properties as Record<string, unknown>
      console.debug(`AOFAS Debug - ${sectionKey} questions:`, sectionProperties)

      Object.keys(sectionProperties).forEach(questionKey => {
        const prop = sectionProperties[questionKey] as Record<string, unknown>
        console.debug(`AOFAS Debug - Question ${questionKey}:`, {
          title: prop?.title,
          type: prop?.type,
          hasEnum: !!prop?.enum,
          hasEnumLabels: !!prop?.enumLabels
        })
      })
    }
  })
}

// Trigger debug logging
logSchemaDebug()

// Extract questions from schema properties (handling nested structure)
const questionsData = computed((): AofasQuestionDataType[] => {
  const schema = control.control.value.schema
  const properties = schema?.properties || {}

  const questions: AofasQuestionDataType[] = []

  // Traverse nested structure to find AOFAS questions
  Object.keys(properties).forEach(sectionKey => {
    const section = properties[sectionKey] as Record<string, unknown>
    if (section?.type === 'object' && section?.properties) {
      const sectionProperties = section.properties as Record<string, unknown>

      Object.keys(sectionProperties).forEach(questionKey => {
        const prop = sectionProperties[questionKey] as Record<string, unknown>
        // Since renderer catches AOFAS forms early, we can include all questions in the section
        if (prop?.type === 'number' && prop?.enum && prop?.enumLabels) {
          // Read options from schema enum and enumLabels
          const options = getOptionsFromSchema(prop)

          questions.push({
            key: questionKey,
            fullPath: `${sectionKey}.${questionKey}`,
            title: String(prop?.title) || questionKey,
            schema: {
              title: String(prop?.title) || '',
              description: String(prop?.description) || '',
              type: String(prop?.type) || '',
              i18n: String(prop?.i18n) || '',
              enum: (prop?.enum as number[]) || [],
              enumLabels: (prop?.enumLabels as string[]) || []
            },
            section: sectionKey,
            options
          })
        }
      })
    }
  })

  console.debug('AOFAS Debug - Found questions:', questions)

  return questions
})

// Reactive references for easier template usage
const hasQuestions = computed((): boolean => questionsData.value.length > 0)
const sectionKeys = computed((): string[] => [...new Set(questionsData.value.map((q: AofasQuestionDataType) => q.section))])

// Helper function to get questions for a specific section
const getQuestionsForSection = (sectionKey: string): AofasQuestionDataType[] => {
  return questionsData.value.filter((q: AofasQuestionDataType) => q.section === sectionKey)
}

// Read options from schema enum and enumLabels
const getOptionsFromSchema = (schema: Record<string, unknown>) => {
  const enumValues = schema.enum as number[] || []
  const enumLabels = schema.enumLabels as string[] || []

  const options: Array<{ value: number; label: string }> = []

  // Combine enum values with their labels
  enumValues.forEach((value, index) => {
    const labelKey = enumLabels[index] || `Option ${value}`
    const translatedLabel = translate(labelKey, labelKey)

    options.push({
      value,
      label: translatedLabel
    })
  })

  console.debug('AOFAS Debug - Options from schema:', { enumValues, enumLabels, options })

  return options
}

// Calculate AOFAS scoring from form data
const calculateAofasScore = (data: Record<string, unknown>): ScoringData => {
  const questions = questionsData.value

  const validAnswers = questions
    .map((q: AofasQuestionDataType) => {
      const [sectionKey, questionKey] = q.fullPath.split('.')
      const answer = (data[sectionKey] as Record<string, unknown>)?.[questionKey]
      return { question: q, value: answer }
    })
    .filter(item => item.value !== null && item.value !== undefined)

  const totalQuestions = questions.length
  const answeredQuestions = validAnswers.length
  const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0
  const isComplete = completionPercentage === 100

  // Calculate total score
  const rawScore = validAnswers.reduce((sum, item) => sum + (item.value as number), 0)

  // Calculate max possible score dynamically from schema
  const maxPossibleScore = 100; // AOFAS max score is fixed at 100

  // AOFAS uses a single total score (0-100)
  const normalizedScore = maxPossibleScore > 0 ? (rawScore / maxPossibleScore) * 100 : 0

  const totalScore: SubscaleScore = {
    name: 'Total',
    isComplete,
    completionPercentage: Math.round(completionPercentage),
    answeredQuestions,
    totalQuestions,
    rawScore,
    normalizedScore: Math.round(normalizedScore),
    maxPossibleScore
  }

  return {
    rawData: data as Record<string, Record<string, number>>,
    subscales: {}, // AOFAS has no subscales
    total: totalScore
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
  const scoringData = calculateAofasScore(localRawData.value)
  console.debug('AOFAS Scoring data to emit:', scoringData)

  // Emit change event using JSONForms method with ScoringData
  control.handleChange(control.control.value.path, scoringData)
}

// Get current value from local state
const getCurrentValue = (fullPath: string): number | null => {
  const [sectionKey, questionKey] = fullPath.split('.')
  return localRawData.value[sectionKey]?.[questionKey] ?? null
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

// Get filtered errors for a specific question
const getFilteredErrors = (fullPath: string) => {
  return touchedStates.value[fullPath] ? control.control.value.errors : ''
}
</script>

<template>
  <div class="aofas-form-container">
    <h3 class="mb-4">{{ translate('aofas.title', 'AOFAS Forefoot Score') }}</h3>

    <!-- Instructions -->
    <div class="mb-4 text-caption text-grey">
      <p><strong>{{ translate('aofas.instructions.title', 'Instructions:') }}</strong>
        {{ translate('aofas.instructions.description', 'Please select the most appropriate option for each question.')
        }}</p>
    </div>

    <!-- Questions organized by sections -->
    <div v-if="hasQuestions">
      <!-- Group questions by section -->
      <div v-for="sectionKey in sectionKeys" :key="String(sectionKey)"
           class="mb-8">
        <h4 class="mb-4 text-h5">
          {{ translate(`${String(sectionKey)}.title`, String(sectionKey) === 'vorfußfragebogen' ?
            'AOFAS Vorfuß Fragebogen' : String(sectionKey)) }}
        </h4>

        <div v-for="question in getQuestionsForSection(String(sectionKey))"
             :key="question.fullPath"
             class="mb-6">
          <v-card class="question-card" elevation="1">
            <v-card-title class="text-h6 pb-2">
              {{ translate(question.schema.i18n + '.label', question.title) }}
            </v-card-title>

            <v-card-text>
              <!-- Radio Group for AOFAS options -->
              <v-radio-group
                             :model-value="getCurrentValue(question.fullPath)"
                             @update:model-value="(value: number | null) => updateTouchedState(question.fullPath, value)"
                             :disabled="!control.control.value.enabled"
                             :error-messages="getFilteredErrors(question.fullPath)"
                             class="mt-2">
                <v-radio
                         v-for="option in question.options"
                         :key="option.value"
                         :label="`${option.label} (${option.value} Punkte)`"
                         :value="option.value"
                         class="mb-2" />
              </v-radio-group>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>

    <!-- No questions message -->
    <div v-if="!hasQuestions" class="text-center pa-4">
      <v-alert type="info">
        {{ translate('aofas.noQuestions', 'No AOFAS questions found in the schema.') }}
        <br>
        <small class="text-grey">
          Debug: Check console for schema structure details.
          <br>
          Looking for properties with type "number" and enum/enumLabels arrays.
        </small>
      </v-alert>
    </div>
  </div>
</template>

<style scoped>
.aofas-form-container {
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

/* Progress card styling */
.v-progress-linear {
  border-radius: 4px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .aofas-form-container {
    padding: 8px;
  }

  .question-card {
    margin-bottom: 16px;
  }
}

/* Error state styling */
.v-radio-group.v-input--error .v-radio {
  color: #f44336 !important;
}

/* Focus state */
.v-radio-group:focus-within {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
