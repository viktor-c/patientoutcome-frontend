<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormSubmissionData } from '../../types'

const props = withDefaults(defineProps<FormComponentProps>(), {
  readonly: false,
  locale: 'en'
})

const emit = defineEmits<FormComponentEvents>()

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

const questionsData = computed(() => [
  {
    key: 'q1',
    title: t('aofas.lesserToes.questions.q1'),
    options: [
      { value: 40, label: t('aofas.lesserToes.q1.none') },
      { value: 30, label: t('aofas.lesserToes.q1.mild') },
      { value: 20, label: t('aofas.lesserToes.q1.moderate') },
      { value: 0, label: t('aofas.lesserToes.q1.severe') }
    ]
  },
  {
    key: 'q2',
    title: t('aofas.lesserToes.questions.q2'),
    options: [
      { value: 10, label: t('aofas.lesserToes.q2.noLimitation') },
      { value: 7, label: t('aofas.lesserToes.q2.noLimitationDaily') },
      { value: 4, label: t('aofas.lesserToes.q2.limitationDaily') },
      { value: 0, label: t('aofas.lesserToes.q2.severeLimitation') }
    ]
  },
  {
    key: 'q3',
    title: t('aofas.lesserToes.questions.q3'),
    options: [
      { value: 10, label: t('aofas.lesserToes.q3.fashionable') },
      { value: 5, label: t('aofas.lesserToes.q3.comfortable') },
      { value: 0, label: t('aofas.lesserToes.q3.modified') }
    ]
  },
  {
    key: 'q4',
    title: t('aofas.lesserToes.questions.q4'),
    options: [
      { value: 14, label: t('aofas.lesserToes.q4.noRestriction') },
      { value: 7, label: t('aofas.lesserToes.q4.moderate') },
      { value: 0, label: t('aofas.lesserToes.q4.severe') }
    ]
  },
  {
    key: 'q5',
    title: t('aofas.lesserToes.questions.q5'),
    options: [
      { value: 6, label: t('aofas.lesserToes.q5.noRestriction') },
      { value: 0, label: t('aofas.lesserToes.q5.restricted') }
    ]
  },
  {
    key: 'q6',
    title: t('aofas.lesserToes.questions.q6'),
    options: [
      { value: 5, label: t('aofas.lesserToes.q6.stable') },
      { value: 0, label: t('aofas.lesserToes.q6.unstable') }
    ]
  },
  {
    key: 'q7',
    title: t('aofas.lesserToes.questions.q7'),
    options: [
      { value: 5, label: t('aofas.lesserToes.q7.none') },
      { value: 0, label: t('aofas.lesserToes.q7.symptomatic') }
    ]
  },
  {
    key: 'q8',
    title: t('aofas.lesserToes.questions.q8'),
    options: [
      { value: 10, label: t('aofas.lesserToes.q8.good') },
      { value: 5, label: t('aofas.lesserToes.q8.fair') },
      { value: 0, label: t('aofas.lesserToes.q8.poor') }
    ]
  }
])

function handleUpdate(questionKey: string, value: number) {
  if (!props.readonly) {
    updateQuestion('lesserToes', questionKey, value)
  }
}

function getCurrentValue(questionKey: string): number | null {
  return getQuestion('lesserToes', questionKey) as number | null
}
</script>

<template>
  <div class="aofas-lesser-toes-container">
    <h3 class="mb-4">{{ t('aofas.lesserToes.title.description') }}</h3>

    <div class="mb-4 text-caption text-grey">
      <p>
        <strong>{{ t('aofas.lesserToes.instructions.title') }}:</strong>
        {{ t('aofas.lesserToes.instructions.description') }}
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
                     v-for="option in question.options"
                     :key="option.value"
                     :value="option.value"
                     :label="`${option.value} pts - ${option.label}`"
                     density="compact"
                     class="mobile-radio" />
          </v-radio-group>
        </v-card-text>
      </v-card>
    </div>

    <!-- Desktop table layout -->
    <div class="table-wrapper">
      <v-table class="aofas-lesser-toes-table" density="compact" fixed-header>
        <thead>
          <tr>
            <th class="number-column text-center">
              <strong>#</strong>
            </th>
            <th class="question-column text-left">
              <strong>Question</strong>
            </th>
            <th class="answers-column text-left">
              <strong>Answer Options</strong>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
              v-for="(question, questionIndex) in questionsData"
              :key="question.key"
              class="question-row">
            <td class="number-cell text-center">
              {{ questionIndex + 1 }}
            </td>
            <td class="question-cell">
              <div class="question-text">{{ question.title }}</div>
            </td>
            <td class="answer-cell">
              <v-radio-group
                             :model-value="getCurrentValue(question.key)"
                             :readonly="readonly"
                             @update:model-value="(value) => handleUpdate(question.key, value as number)"
                             hide-details
                             class="answer-radio-group">
                <v-radio
                         v-for="option in question.options"
                         :key="option.value"
                         :value="option.value"
                         :label="`(${option.value}) ${option.label}`"
                         color="primary"
                         density="compact"
                         class="mb-1" />
              </v-radio-group>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>

<style scoped>
.aofas-lesser-toes-container {
  width: 100%;
  padding: 16px;
}

.mobile-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

@media (min-width: 960px) {
  .mobile-layout {
    display: none;
  }
}

.question-card {
  background-color: #fafafa;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.card-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 4px 8px;
  background-color: #1976d2;
  color: white;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.card-title-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 500;
}

.card-options {
  padding: 12px 16px;
}

.mobile-radio-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-radio {
  margin-bottom: 4px;
}

.table-wrapper {
  display: none;
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: white;
}

@media (min-width: 960px) {
  .table-wrapper {
    display: block;
  }
}

.aofas-lesser-toes-table {
  width: 100%;
  border-collapse: collapse;
}

.aofas-lesser-toes-table thead tr {
  background-color: #f5f5f5;
  border-bottom: 2px solid #1976d2;
}

.aofas-lesser-toes-table th {
  padding: 12px 16px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}

.number-column {
  width: 60px;
}

.question-column {
  width: 35%;
  min-width: 300px;
}

.answers-column {
  width: auto;
}

.question-row {
  border-bottom: 1px solid #e0e0e0;
}

.question-row:hover {
  background-color: #fafafa;
}

.number-cell {
  padding: 12px;
  font-weight: 500;
  color: #1976d2;
}

.question-cell {
  padding: 12px 16px;
  vertical-align: top;
}

.question-text {
  font-weight: 500;
  line-height: 1.5;
  color: #212121;
}

.answer-cell {
  padding: 12px 16px;
  vertical-align: top;
}

.answer-radio-group :deep(.v-selection-control) {
  min-height: 32px;
}

.answer-radio-group :deep(.v-label) {
  opacity: 1;
  font-size: 14px;
}
</style>
