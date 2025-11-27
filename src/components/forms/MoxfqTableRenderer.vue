<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { type ControlElement } from '@jsonforms/core'
import {
  useJsonFormsControl,
  type RendererProps,
} from '@jsonforms/vue'
import { useVuetifyControl } from '@jsonforms/vue-vuetify'

import type { ScoringData, SubscaleScore } from '@/types'

// Type alias for MOXFQ question data (compatible with backend QuestionAnswer)
type questions = Record<string, number | null>


// Props for JSONForms renderer
interface Props {
  data?: unknown
  handleChange?: (path: string, value: unknown) => void
  path?: string
  enabled?: boolean
  schema?: unknown
  uischema?: unknown
  rootSchema?: unknown
  config?: unknown
  id?: string
}

const props = defineProps<Props>()

// JSONForms control setup
const control = useVuetifyControl(useJsonFormsControl(props as RendererProps<ControlElement>))

// Local state to store raw form data (question answers)
// This avoids inconsistency issues with control.control.value.data structure
const localRawData = ref<questions>({})

// Initialize local raw data from control data on mount
const initializeLocalData = () => {
  const data = control.control.value.data
  console.debug('MOXFQ: Initializing with data:', data)

  if (data && typeof data === 'object') {
    // Handle ScoringData structure (has rawData field)
    if ('rawData' in data) {
      localRawData.value = { ...(data.rawData as questions) }
    }
    // Handle direct question data (flat structure like { q1: 0, q2: 1, ... })
    else if (Object.keys(data).some(key => key.startsWith('q'))) {
      localRawData.value = { ...(data as questions) }
    }
    // Initialize empty structure if no recognizable data
    else {
      localRawData.value = {}
    }
  } else {
    localRawData.value = {}
  }
  console.debug('MOXFQ: Initialized local raw data:', localRawData.value)
}

// Initialize on component mount
initializeLocalData()

import { createTranslate } from './translate'
const translate = createTranslate()

// i18n locale — used to trigger recomputation when locale changes
const { locale } = useI18n()

console.debug('MoxfqTableRenderer JSONForms props:', {
  controlData: control.control.value.data,
  controlPath: control.control.value.path,
  controlSchema: control.control.value.schema,
  // jsonforms injected via createTranslate helper
})

// Question data with titles and options
const questionsData = computed(() => [
  // Questions 1-14 - Standard Likert Scale
  { key: 'q1', title: translate('moxfq.questions.q1'), options: 'likert' as const },
  { key: 'q2', title: translate('moxfq.questions.q2'), options: 'likert' as const },
  { key: 'q3', title: translate('moxfq.questions.q3'), options: 'likert' as const },
  { key: 'q4', title: translate('moxfq.questions.q4'), options: 'likert' as const },
  { key: 'q5', title: translate('moxfq.questions.q5'), options: 'likert' as const },
  { key: 'q6', title: translate('moxfq.questions.q6'), options: 'likert' as const },
  { key: 'q7', title: translate('moxfq.questions.q7'), options: 'likert' as const },
  { key: 'q8', title: translate('moxfq.questions.q8'), options: 'likert' as const },
  { key: 'q9', title: translate('moxfq.questions.q9'), options: 'likert' as const },
  { key: 'q10', title: translate('moxfq.questions.q10'), options: 'likert' as const },
  { key: 'q11', title: translate('moxfq.questions.q11'), options: 'likert' as const },
  { key: 'q12', title: translate('moxfq.questions.q12'), options: 'likert' as const },
  { key: 'q13', title: translate('moxfq.questions.q13'), options: 'likert' as const },
  { key: 'q14', title: translate('moxfq.questions.q14'), options: 'likert' as const },
  // Question 15 - Pain severity
  { key: 'q15', title: translate('moxfq.questions.q15'), options: 'painSeverity' as const },
  // Question 16 - Night pain
  { key: 'q16', title: translate('moxfq.questions.q16'), options: 'nightPain' as const },
])

console.debug("MoxfqTableRenderer questionsData: ", questionsData)

// Answer options for different scales
const answerOptions = computed(() => {
  // touch locale to create a reactive dependency so labels update on locale change
  void locale.value
  return {
    likert: [
      { value: 0, label: translate('moxfq.likertScale.noneOfTheTime') },
      { value: 1, label: translate('moxfq.likertScale.rarely') },
      { value: 2, label: translate('moxfq.likertScale.someOfTheTime') },
      { value: 3, label: translate('moxfq.likertScale.mostOfTheTime') },
      { value: 4, label: translate('moxfq.likertScale.allOfTheTime') },
    ],
    painSeverity: [
      { value: 0, label: translate('moxfq.painSeverity.none') },
      { value: 1, label: translate('moxfq.painSeverity.veryMild') },
      { value: 2, label: translate('moxfq.painSeverity.mild') },
      { value: 3, label: translate('moxfq.painSeverity.moderate') },
      { value: 4, label: translate('moxfq.painSeverity.severe') },
    ],
    nightPain: [
      { value: 0, label: translate('moxfq.nightPain.noNights') },
      { value: 1, label: translate('moxfq.nightPain.only1or2Nights') },
      { value: 2, label: translate('moxfq.nightPain.someNights') },
      { value: 3, label: translate('moxfq.nightPain.mostNights') },
      { value: 4, label: translate('moxfq.nightPain.everyNight') },
    ]
  }
})

// Header options (use likert as default for header display)
const headerOptions = computed(() => answerOptions.value.likert)

// Get options for a question
const getQuestionOptions = (optionsType: string) => {
  // use .value since answerOptions is computed
  const opts = (answerOptions.value as Record<string, Array<{ value: number; label: string }>>)[optionsType]
  return opts || answerOptions.value.likert
}

// Helper function to update form data
const updateValue = async (questionKey: string, value: number) => {
  console.log(`Updating ${questionKey} with value:`, value)

  // Update local raw data state
  localRawData.value = { ...localRawData.value, [questionKey]: value }

  console.log('Updated local raw data:', localRawData.value)
  const newestScore = calculateMoxfqScore(localRawData.value)
  // Log the computed score for debugging
  console.debug("Moxfq scoring was computed as: ", newestScore)

  // Emit the entire ScoringData structure (consistent with AOFAS/EFAS)
  control.handleChange(control.control.value.path, newestScore)
}

// Get current value from local state
const getCurrentValue = (questionKey: string): number | null => {
  return localRawData.value[questionKey] ?? null
}
const calculateMoxfqScore = (data: questions): ScoringData => {
  // Define subscales according to MOXFQ standard
  const subscales = {
    walkingStanding: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
    pain: ['q9', 'q11', 'q12', 'q15'],
    socialInteraction: ['q10', 'q13', 'q14', 'q16']
  }

  // Calculate subscale scores
  const calculateSubscaleScore = (questionKeys: string[], subscaleName: string, subscaleDescription: string): SubscaleScore | null => {
    const validAnswers = questionKeys
      .map(key => data[key])
      .filter(value => value !== null && value !== undefined) as number[]

    if (validAnswers.length === 0) return null

    const rawScore = validAnswers.reduce((sum, value) => sum + value, 0)
    const maxPossibleScore = questionKeys.length * 4
    const completionRate = validAnswers.length / questionKeys.length

    // Convert to 0-100 scale: (rawScore / maxPossibleScore) * 100
    const normalizedScore = (rawScore / maxPossibleScore) * 100

    return {
      name: subscaleName,
      description: subscaleDescription,
      rawScore,
      normalizedScore: Math.round(normalizedScore * 10) / 10, // Round to 1 decimal
      maxPossibleScore,
      answeredQuestions: validAnswers.length,
      totalQuestions: questionKeys.length,
      completionPercentage: Math.round(completionRate * 100),
      isComplete: completionRate === 1
    }
  }

  // Calculate individual subscale scores
  const walkingStandingScore = calculateSubscaleScore(subscales.walkingStanding, "Walking & Standing", "Assesses difficulties in walking and standing.")
  const painScore = calculateSubscaleScore(subscales.pain, "Pain", "Evaluates pain levels and impact.")
  const socialInteractionScore = calculateSubscaleScore(subscales.socialInteraction, "Social Interaction", "Measures social engagement and interaction.")

  // Calculate total score
  const allQuestions = [...subscales.walkingStanding, ...subscales.pain, ...subscales.socialInteraction]
  const totalScore = calculateSubscaleScore(allQuestions, "Total", "Measures overall health status.")

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawData: data as any, // Type cast needed for compatibility with FormQuestions
    subscales: {
      "walkingStanding": walkingStandingScore,
      "pain": painScore,
      "socialInteraction": socialInteractionScore,
    },
    total: totalScore
  }
}
</script>

<template>
  <div class="moxfq-table-container">
    <h3 class="mb-4">{{ translate('moxfq.title.description') }}</h3>

    <!-- Instructions -->
    <div class="mb-4 text-caption text-grey">
      <p><strong>{{ translate('moxfq.instructions.title', 'Instructions:') }}</strong>
        {{ translate('moxfq.instructions.description', 'Please rate each question on a scale from 0 to 5.') }}</p>
    </div>

    <!-- Mobile card-based layout for small screens (Vuetify cards) -->
    <div class="mobile-layout">
      <v-card
              v-for="(question, questionIndex) in questionsData"
              :key="question.key"
              class="question-card"
              elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">{{ questionIndex + 1 }}</span>
          <div class="card-title-text">{{ question.title }}</div>
        </v-card-title>
        <v-card-text class="card-options">
          <v-radio-group
                         :model-value="getCurrentValue(question.key)"
                         @update:model-value="(value: unknown) => updateValue(question.key, value as number)"
                         class="mobile-radio-group"
                         aria-label="MOXFQ options">
            <v-radio
                     v-for="(option, optionIndex) in getQuestionOptions(question.options)"
                     :key="optionIndex"
                     :value="option.value"
                     :label="`${option.value} - ${option.label}`"
                     class="mobile-radio" />
          </v-radio-group>
        </v-card-text>
      </v-card>
    </div>

    <!-- Desktop table layout -->
    <div class="table-wrapper">
      <v-table class="moxfq-table" density="compact" fixed-header height="100%">
        <thead>
          <tr>
            <th class="number-column text-center">
              <strong>#</strong>
            </th>
            <th class="question-column text-left">
              <strong>Question</strong>
            </th>
            <th
                v-for="(option, index) in headerOptions"
                :key="index"
                class="answer-column text-center">
              <div class="answer-header">
                <div class="answer-value">({{ option.value }})</div>
                <div class="answer-label">{{ option.label }}</div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Standard questions 1-14 -->
          <tr
              v-for="(question, questionIndex) in questionsData.slice(0, 14)"
              :key="question.key"
              class="question-row">
            <td class="number-cell text-center">
              {{ questionIndex + 1 }}
            </td>
            <td class="question-cell">
              <div class="question-text">
                {{ question.title }}
              </div>
            </td>
            <td
                v-for="(option, optionIndex) in getQuestionOptions(question.options)"
                :key="optionIndex"
                class="answer-cell text-center">
              <v-radio-group
                             :model-value="getCurrentValue(question.key)"
                             @update:model-value="(value: unknown) => updateValue(question.key, value as number)"
                             class="answer-radio-group"
                             hide-details>
                <v-radio
                         :value="option.value"
                         color="primary"
                         density="compact" />
              </v-radio-group>
            </td>
          </tr>

          <!-- Special questions 15-16 with individual cell answers -->
          <tr
              v-for="(question, questionIndex) in questionsData.slice(14)"
              :key="question.key"
              class="question-row special-question">
            <td class="number-cell text-center">
              {{ questionIndex + 15 }}
            </td>
            <td class="question-cell">
              <div class="question-text">
                {{ question.title }}
              </div>
            </td>
            <td
                v-for="(option, optionIndex) in getQuestionOptions(question.options)"
                :key="optionIndex"
                class="answer-cell-special text-center">
              <div class="special-answer-container">
                <v-radio-group
                               :model-value="getCurrentValue(question.key)"
                               @update:model-value="(value: unknown) => updateValue(question.key, value as number)"
                               class="answer-radio-group"
                               hide-details>
                  <v-radio
                           :value="option.value"
                           color="primary"
                           density="compact" />
                </v-radio-group>
                <!-- <div class="answer-value-special">({{ option.value }})</div> -->
                <div class="answer-caption">{{ option.label }}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>


  </div>
</template>

<style scoped>
.moxfq-table-container {
  width: 100%;
  padding: 16px;
}

.moxfq-table {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  /* allow the table to grow with the page instead of scrolling internally */
  /* max-height: none; */
  overflow: visible;
  /* Ensure horizontal scrolling is smooth on touch devices when the page scrolls */
  -webkit-overflow-scrolling: touch;
  /* Layout tweaks to avoid unexpected clipping */
  width: 100%;
  box-sizing: border-box;
  table-layout: auto;
}

.table-wrapper {
  width: 100%;
  max-width: 100%;
  /* allow the page to handle scrolling rather than the table wrapper */
  overflow-x: visible;
}

/* Mobile layout: cards for small screens */
.mobile-layout {
  display: none;
  width: 100%;
  padding: 0;
  /* Ensure content is not clipped */
  overflow: visible;
}

.question-card {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  /* Ensure card expands to fit all radio options */
  overflow: visible;
}

.question-card:nth-child(15),
.question-card:nth-child(16) {
  background-color: #fff3e0;
  border-color: #ffe0b3;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  background-color: #f5f5f5;
  border-radius: 50%;
  font-weight: bold;
  color: #1976d2;
  flex-shrink: 0;
}

.card-title-text {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  line-height: 1.25;
}

.card-options {
  display: block;
  padding: 8px 0;
  /* Ensure all options are visible - no overflow clipping */
  overflow: visible;
}

.mobile-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  /* Ensure the radio group doesn't clip content */
  overflow: visible;
}

/* Override Vuetify's default radio group input container */
.mobile-radio-group :deep(.v-selection-control-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-radio {
  /* make sure radio uses the label prop and sits left with a small gap */
  margin: 0;
  min-height: 32px;
}

/* Tweak Vuetify internal radio layout inside cards for left alignment */
.question-card :deep(.v-radio) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.question-card :deep(.v-radio__label) {
  margin-left: 8px;
  /* Ensure long labels wrap properly */
  white-space: normal;
  word-wrap: break-word;
}

/* Ensure v-card-text doesn't clip the radio options */
.question-card :deep(.v-card-text) {
  overflow: visible;
  padding-bottom: 12px;
}

.option-label {
  display: none;
  /* no longer needed when using v-radio label prop */
}

.number-column {
  width: 60px;
  min-width: 60px;
  padding: 12px 8px !important;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  position: sticky;
  left: 0;
  z-index: 1;
  font-weight: bold;
}

.question-column {
  width: 50%;
  min-width: 300px;
  padding: 12px 16px !important;
  background-color: #f5f5f5;
  border-right: 2px solid #ddd;
  position: sticky;
  left: 60px;
  z-index: 1;
}

.answer-column {
  width: 10%;
  min-width: 100px;
  padding: 8px 4px !important;
  background-color: #f9f9f9;
  border-right: 1px solid #eee;
}

.answer-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
}

.answer-value {
  font-weight: bold;
  font-size: 14px;
  color: #1976d2;
}

.answer-label {
  font-size: 11px;
  text-align: center;
  line-height: 1.2;
  word-wrap: break-word;
  max-width: 90px;
  hyphens: auto;
}

.question-row {
  border-bottom: 1px solid #eee;
}

.question-row:nth-child(even) {
  background-color: #fafafa;
}

.question-row:hover {
  background-color: #f0f8ff;
}

.question-row:nth-child(15),
.question-row:nth-child(16) {
  background-color: #fff3e0 !important;
}

.question-row:nth-child(15):hover,
.question-row:nth-child(16):hover {
  background-color: #ffe0b3 !important;
}

.number-cell {
  padding: 12px 8px !important;
  vertical-align: middle;
  border-right: 1px solid #ddd;
  position: sticky;
  left: 0;
  background-color: inherit;
  /* z-index: 2; */
  font-weight: bold;
  color: #1976d2;
}

.question-cell {
  padding: 12px 16px !important;
  vertical-align: middle;
  border-right: 2px solid #ddd;
  position: sticky;
  left: 60px;
  background-color: inherit;
  z-index: 1;
}

.question-text {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  font-weight: 500;
}

.answer-cell {
  padding: 8px 4px !important;
  vertical-align: middle;
  border-right: 1px solid #eee;
}

.answer-cell:last-child {
  border-right: none;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .number-column {
    width: 50px;
    min-width: 50px;
  }

  .question-column {
    min-width: 250px;
    left: 50px;
  }

  .question-cell {
    left: 50px;
  }

  .answer-column {
    min-width: 80px;
  }

  .answer-cell-special {
    min-width: 80px;
  }

  .answer-label {
    font-size: 10px;
    max-width: 70px;
  }

  .answer-caption {
    font-size: 11px;
    max-width: 70px;
  }
}

@media (max-width: 768px) {
  .moxfq-table-container {
    padding: 8px;
  }

  .moxfq-table {
    /* Ensure table can scroll horizontally if needed */
    overflow-x: auto;
    /* Set minimum width to ensure all 5 answer columns are always visible */
    min-width: 700px;
  }

  .number-column {
    width: 35px;
    min-width: 35px;
    padding: 6px 2px !important;
  }

  .number-cell {
    padding: 6px 2px !important;
  }

  .question-column {
    min-width: 180px;
    left: 35px;
    padding: 8px 12px !important;
  }

  .question-cell {
    left: 35px;
    padding: 8px 12px !important;
  }

  .answer-column {
    min-width: 58px;
    width: 58px;
  }

  .answer-cell {
    min-width: 58px;
    width: 58px;
  }

  .answer-cell-special {
    min-width: 58px;
    width: 58px;
  }

  .answer-label {
    font-size: 8px;
    max-width: 50px;
    line-height: 1.1;
  }

  .answer-caption {
    font-size: 9px;
    max-width: 50px;
    line-height: 1.1;
  }

  .special-answer-container {
    min-height: 55px;
    padding: 2px;
  }

  .answer-value {
    font-size: 12px;
  }

  .answer-value-special {
    font-size: 12px;
  }
}

/* Extra responsive handling for very narrow screens like phones in portrait */
@media (max-width: 480px) {

  /* Show mobile card layout on small screens */
  .mobile-layout {
    display: block;
  }

  /* Hide table layout on small screens */
  .table-wrapper {
    display: none;
  }

  .moxfq-table {
    /* Force minimum width to ensure all 5 columns are always visible */
    min-width: 650px;
  }

  .question-column {
    min-width: 160px;
  }

  .answer-column {
    min-width: 55px;
    width: 55px;
  }

  .answer-cell {
    min-width: 55px;
    width: 55px;
  }

  .answer-cell-special {
    min-width: 55px;
    width: 55px;
  }
}

/* Radio button styling */
.answer-radio-group {
  display: flex;
  justify-content: center;
  align-items: center;
}

.answer-radio-group :deep(.v-radio-group__input) {
  display: flex;
  justify-content: center;
}

.v-radio {
  justify-content: center;
}

:deep(.v-selection-control) {
  min-height: auto;
}

:deep(.v-selection-control__wrapper) {
  height: auto;
}

/* Special questions styling */
.special-question {
  background-color: #fff3e0 !important;
}

.special-question:hover {
  background-color: #ffe0b3 !important;
}

.answer-cell-special {
  padding: 8px 4px !important;
  vertical-align: middle;
  border-right: 1px solid #eee;
  width: 10%;
  min-width: 100px;
}

.answer-cell-special:last-child {
  border-right: none;
}

.special-answer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
  min-height: 80px;
}

.answer-value-special {
  font-weight: bold;
  font-size: 14px;
  color: #1976d2;
  margin-top: 4px;
}

.answer-caption {
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
  word-wrap: break-word;
  max-width: 90px;
  hyphens: auto;
  color: #666;
  margin-top: 2px;
}

/* Highlight special questions */
.question-row:nth-child(15) .question-text::before,
.question-row:nth-child(16) .question-text::before {
  content: "⚠ ";
  color: #ff9800;
  font-weight: bold;
}

/* Scoring section styles */
.scoring-container {
  border-radius: 8px;
  background-color: #f8f9fa;
}

.score-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.score-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.text-success {
  color: #4caf50 !important;
}

.text-warning {
  color: #ff9800 !important;
}

.text-error {
  color: #f44336 !important;
}
</style>
