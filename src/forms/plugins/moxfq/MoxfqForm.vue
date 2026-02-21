<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormSubmissionData } from '../../types'

// Component props following the plugin interface
const props = withDefaults(defineProps<FormComponentProps>(), {
  readonly: false,
  locale: 'en'
})

// Component events
const emit = defineEmits<FormComponentEvents>()

// Use the shared form composable
const { updateQuestion, getQuestion, t } = useForm({
  modelValue: toRef(props, 'modelValue'),
  calculateScore,
  translations,
  locale: toRef(props, 'locale'),
  emit: (event: string, ...args: unknown[]) => {
    if (event === 'update:modelValue') {
      emit('update:modelValue', args[0] as FormSubmissionData)
    }
  }
})

// Question definitions with their answer scale types
const questionsData = computed(() => [
  // Questions 1-14 use standard Likert scale
  { key: 'q1', title: t('moxfq.questions.q1'), options: 'likert' as const },
  { key: 'q2', title: t('moxfq.questions.q2'), options: 'likert' as const },
  { key: 'q3', title: t('moxfq.questions.q3'), options: 'likert' as const },
  { key: 'q4', title: t('moxfq.questions.q4'), options: 'likert' as const },
  { key: 'q5', title: t('moxfq.questions.q5'), options: 'likert' as const },
  { key: 'q6', title: t('moxfq.questions.q6'), options: 'likert' as const },
  { key: 'q7', title: t('moxfq.questions.q7'), options: 'likert' as const },
  { key: 'q8', title: t('moxfq.questions.q8'), options: 'likert' as const },
  { key: 'q9', title: t('moxfq.questions.q9'), options: 'likert' as const },
  { key: 'q10', title: t('moxfq.questions.q10'), options: 'likert' as const },
  { key: 'q11', title: t('moxfq.questions.q11'), options: 'likert' as const },
  { key: 'q12', title: t('moxfq.questions.q12'), options: 'likert' as const },
  { key: 'q13', title: t('moxfq.questions.q13'), options: 'likert' as const },
  { key: 'q14', title: t('moxfq.questions.q14'), options: 'likert' as const },
  // Question 15 uses pain severity scale
  { key: 'q15', title: t('moxfq.questions.q15'), options: 'painSeverity' as const },
  // Question 16 uses night pain scale
  { key: 'q16', title: t('moxfq.questions.q16'), options: 'nightPain' as const },
])

// Answer options for different scales
const answerOptions = computed(() => ({
  likert: [
    { value: 0, label: t('moxfq.likertScale.noneOfTheTime') },
    { value: 1, label: t('moxfq.likertScale.rarely') },
    { value: 2, label: t('moxfq.likertScale.someOfTheTime') },
    { value: 3, label: t('moxfq.likertScale.mostOfTheTime') },
    { value: 4, label: t('moxfq.likertScale.allOfTheTime') },
  ],
  painSeverity: [
    { value: 0, label: t('moxfq.painSeverity.none') },
    { value: 1, label: t('moxfq.painSeverity.veryMild') },
    { value: 2, label: t('moxfq.painSeverity.mild') },
    { value: 3, label: t('moxfq.painSeverity.moderate') },
    { value: 4, label: t('moxfq.painSeverity.severe') },
  ],
  nightPain: [
    { value: 0, label: t('moxfq.nightPain.noNights') },
    { value: 1, label: t('moxfq.nightPain.only1or2Nights') },
    { value: 2, label: t('moxfq.nightPain.someNights') },
    { value: 3, label: t('moxfq.nightPain.mostNights') },
    { value: 4, label: t('moxfq.nightPain.everyNight') },
  ]
}))

// Header uses Likert scale labels (for questions 1-14)
const headerOptions = computed(() => answerOptions.value.likert)

// Get options for a specific question type
function getQuestionOptions(optionsType: 'likert' | 'painSeverity' | 'nightPain') {
  return answerOptions.value[optionsType] || answerOptions.value.likert
}

// Handle value update
function handleUpdate(questionKey: string, value: number) {
  if (!props.readonly) {
    updateQuestion('moxfq', questionKey, value)
  }
}

// Get current value for a question
function getCurrentValue(questionKey: string): number | null {
  return getQuestion('moxfq', questionKey) as number | null
}
</script>

<template>
  <div class="moxfq-container">
    <h3 class="mb-4">{{ t('moxfq.title.description') }}</h3>

    <!-- Instructions -->
    <div class="mb-4 text-caption text-grey">
      <p>
        <strong>{{ t('moxfq.instructions.title') }}:</strong>
        {{ t('moxfq.instructions.description') }}
      </p>
    </div>

    <!-- Mobile card-based layout -->
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
                         :readonly="readonly"
                         @update:model-value="(value) => handleUpdate(question.key, value as number)"
                         class="mobile-radio-group">
            <v-radio
                     v-for="option in getQuestionOptions(question.options)"
                     :key="option.value"
                     :value="option.value"
                     :label="`${option.value} - ${option.label}`"
                     density="compact"
                     class="mobile-radio" />
          </v-radio-group>
        </v-card-text>
      </v-card>
    </div>

    <!-- Desktop table layout -->
    <div class="table-wrapper">
      <v-table class="moxfq-table" density="compact" fixed-header>
        <thead>
          <tr>
            <th class="number-column text-center">
              <strong>#</strong>
            </th>
            <th class="question-column text-left">
              <strong>Question</strong>
            </th>
            <th
                v-for="option in headerOptions"
                :key="option.value"
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
              <div class="question-text">{{ question.title }}</div>
            </td>
            <td
                v-for="option in getQuestionOptions(question.options)"
                :key="option.value"
                class="answer-cell text-center">
              <v-radio-group
                             :model-value="getCurrentValue(question.key)"
                             :readonly="readonly"
                             @update:model-value="(value) => handleUpdate(question.key, value as number)"
                             class="answer-radio-group"
                             hide-details>
                <v-radio
                         :value="option.value"
                         color="primary"
                         density="compact" />
              </v-radio-group>
            </td>
          </tr>

          <!-- Special questions 15-16 with different answer scales -->
          <tr
              v-for="(question, questionIndex) in questionsData.slice(14)"
              :key="question.key"
              class="question-row special-question">
            <td class="number-cell text-center">
              {{ questionIndex + 15 }}
            </td>
            <td class="question-cell">
              <div class="question-text">{{ question.title }}</div>
            </td>
            <td
                v-for="option in getQuestionOptions(question.options)"
                :key="option.value"
                class="answer-cell-special text-center">
              <div class="special-answer-container">
                <v-radio-group
                               :model-value="getCurrentValue(question.key)"
                               :readonly="readonly"
                               @update:model-value="(value) => handleUpdate(question.key, value as number)"
                               class="answer-radio-group"
                               hide-details>
                  <v-radio
                           :value="option.value"
                           color="primary"
                           density="compact" />
                </v-radio-group>
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
.moxfq-container {
  width: 100%;
  padding: 16px;
}

.moxfq-table {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: visible;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  box-sizing: border-box;
  table-layout: auto;
}

.table-wrapper {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

/* Mobile layout */
.mobile-layout {
  display: none;
  width: 100%;
}

.question-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.card-number {
  font-weight: bold;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.card-title-text {
  flex: 1;
  font-size: 0.95rem;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.card-options {
  padding-top: 8px;
}

.mobile-radio-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Desktop table styling */
.number-column {
  width: 50px;
  min-width: 50px;
}

.question-column {
  min-width: 300px;
  max-width: 500px;
}

.answer-column {
  width: 120px;
  min-width: 100px;
}

.answer-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
}

.answer-value {
  font-weight: bold;
  font-size: 0.9rem;
}

.answer-label {
  font-size: 0.75rem;
  font-weight: normal;
  text-align: center;
  line-height: 1.2;
}

.question-row {
  border-bottom: 1px solid #e0e0e0;
}

.question-row:hover {
  background-color: #f5f5f5;
}

.number-cell {
  font-weight: 500;
  color: #666;
}

.question-cell {
  padding: 12px 16px;
}

.question-text {
  line-height: 1.4;
}

.answer-cell {
  padding: 4px;
}

.answer-radio-group {
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
}

.special-question {
  background-color: #fafafa;
}

.answer-cell-special {
  padding: 8px 4px;
  vertical-align: top;
}

.special-answer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.answer-caption {
  font-size: 0.7rem;
  text-align: center;
  line-height: 1.2;
  color: #666;
  max-width: 90px;
}

/* Responsive breakpoint */
@media (max-width: 960px) {
  .mobile-layout {
    display: block;
  }

  .table-wrapper {
    display: none;
  }
}
</style>
