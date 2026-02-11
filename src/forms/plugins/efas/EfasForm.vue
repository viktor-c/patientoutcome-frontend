<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormData as PluginFormData } from '../../types'
import type { ScoringData } from '@/types/backend/scoring'

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
      emit('update:modelValue', args[0] as PluginFormData)
    } else if (event === 'score-change') {
      emit('score-change', args[0] as ScoringData)
    } else if (event === 'validation-change') {
      emit('validation-change', args[0] as boolean)
    }
  }
})

// Standard questions (q1-q6) - Required
const standardQuestions = computed(() => [
  { key: 'q1', section: 'standardfragebogen' },
  { key: 'q2', section: 'standardfragebogen' },
  { key: 'q3', section: 'standardfragebogen' },
  { key: 'q4', section: 'standardfragebogen' },
  { key: 'q5', section: 'standardfragebogen' },
  { key: 'q6', section: 'standardfragebogen' },
])

// Sport questions (s1-s4) - Optional
const sportQuestions = computed(() => [
  { key: 's1', section: 'sportfragebogen' },
  { key: 's2', section: 'sportfragebogen' },
  { key: 's3', section: 'sportfragebogen' },
  { key: 's4', section: 'sportfragebogen' },
])

// Answer options (0-4 scale)
const answerOptions = computed(() => [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
])

// Handle value update
function handleUpdate(section: string, questionKey: string, value: number) {
  if (!props.readonly) {
    updateQuestion(section, questionKey, value)
  }
}

// Get current value for a question
function getCurrentValue(section: string, questionKey: string): number | null {
  return getQuestion(section, questionKey) as number | null
}

// Get question label
function getQuestionLabel(section: string, questionKey: string): string {
  return t(`${section}.${questionKey}.label`)
}

// Get question description
function getQuestionDescription(section: string, questionKey: string): string {
  return t(`${section}.${questionKey}.description`)
}

// Get tick labels
function getTickLabels(section: string, questionKey: string): { low: string; high: string } {
  return {
    low: t(`${section}.${questionKey}.tickLabelLow`),
    high: t(`${section}.${questionKey}.tickLabelHigh`)
  }
}
</script>

<template>
  <div class="efas-container">
    <h3 class="mb-4">{{ t('efas.title.description') }}</h3>

    <!-- Instructions -->
    <div class="mb-4 text-caption text-grey">
      <p>
        <strong>{{ t('efas.instructions.title') }}:</strong>
        {{ t('efas.instructions.description') }}
      </p>
    </div>

    <!-- Standard Questions Section (Required) -->
    <div class="section-container mb-6">
      <h4 class="section-title mb-4">{{ t('standardfragebogen.title') }}</h4>
      
      <!-- Mobile card-based layout -->
      <div class="mobile-layout">
        <v-card
          v-for="(question, questionIndex) in standardQuestions"
          :key="question.key"
          class="question-card"
          elevation="1"
        >
          <v-card-title class="card-header">
            <span class="card-number">{{ questionIndex + 1 }}</span>
            <div class="card-title-text">{{ getQuestionLabel(question.section, question.key) }}</div>
          </v-card-title>
          <v-card-subtitle class="px-4 pt-2 text-caption">
            {{ getQuestionDescription(question.section, question.key) }}
          </v-card-subtitle>
          <v-card-text class="card-options">
            <v-radio-group
              :model-value="getCurrentValue(question.section, question.key)"
              :readonly="readonly"
              @update:model-value="(value) => handleUpdate(question.section, question.key, value as number)"
              class="mobile-radio-group"
              inline
            >
              <v-radio
                v-for="option in answerOptions"
                :key="option.value"
                :value="option.value"
                :label="option.label"
                density="compact"
                class="mobile-radio"
              />
            </v-radio-group>
            <div class="tick-labels mt-2">
              <span class="tick-label-low">{{ getTickLabels(question.section, question.key).low }}</span>
              <span class="tick-label-high">{{ getTickLabels(question.section, question.key).high }}</span>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Desktop table layout -->
      <div class="table-wrapper">
        <v-table class="efas-table" density="compact" fixed-header>
          <thead>
            <tr>
              <th class="text-left">{{ t('standardfragebogen.title') }}</th>
              <th
                v-for="option in answerOptions"
                :key="option.value"
                class="text-center option-header"
              >
                {{ option.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(question, questionIndex) in standardQuestions"
              :key="question.key"
              :class="{ 'readonly-row': readonly }"
            >
              <td class="question-cell">
                <div class="question-number">{{ questionIndex + 1 }}.</div>
                <div class="question-text">
                  <div class="question-label">{{ getQuestionLabel(question.section, question.key) }}</div>
                  <div class="question-description text-caption text-grey">
                    {{ getQuestionDescription(question.section, question.key) }}
                  </div>
                  <div class="tick-labels-desktop">
                    <span class="tick-label-low">{{ getTickLabels(question.section, question.key).low }}</span>
                    <span class="tick-label-high">{{ getTickLabels(question.section, question.key).high }}</span>
                  </div>
                </div>
              </td>
              <td
                v-for="option in answerOptions"
                :key="option.value"
                class="text-center option-cell"
              >
                <v-radio
                  :model-value="getCurrentValue(question.section, question.key)"
                  :value="option.value"
                  :readonly="readonly"
                  @click="handleUpdate(question.section, question.key, option.value)"
                  density="compact"
                  hide-details
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </div>

    <!-- Sport Questions Section (Optional) -->
    <div class="section-container">
      <h4 class="section-title mb-2">{{ t('sportfragebogen.title') }}</h4>
      <v-alert type="info" variant="tonal" class="mb-4" density="compact">
        {{ t('efas.sportQuestions.info') }}
      </v-alert>
      
      <!-- Mobile card-based layout -->
      <div class="mobile-layout">
        <v-card
          v-for="(question, questionIndex) in sportQuestions"
          :key="question.key"
          class="question-card"
          elevation="1"
        >
          <v-card-title class="card-header">
            <span class="card-number">S{{ questionIndex + 1 }}</span>
            <div class="card-title-text">{{ getQuestionLabel(question.section, question.key) }}</div>
          </v-card-title>
          <v-card-subtitle class="px-4 pt-2 text-caption">
            {{ getQuestionDescription(question.section, question.key) }}
          </v-card-subtitle>
          <v-card-text class="card-options">
            <v-radio-group
              :model-value="getCurrentValue(question.section, question.key)"
              :readonly="readonly"
              @update:model-value="(value) => handleUpdate(question.section, question.key, value as number)"
              class="mobile-radio-group"
              inline
            >
              <v-radio
                v-for="option in answerOptions"
                :key="option.value"
                :value="option.value"
                :label="option.label"
                density="compact"
                class="mobile-radio"
              />
            </v-radio-group>
            <div class="tick-labels mt-2">
              <span class="tick-label-low">{{ getTickLabels(question.section, question.key).low }}</span>
              <span class="tick-label-high">{{ getTickLabels(question.section, question.key).high }}</span>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Desktop table layout -->
      <div class="table-wrapper">
        <v-table class="efas-table" density="compact" fixed-header>
          <thead>
            <tr>
              <th class="text-left">{{ t('sportfragebogen.title') }}</th>
              <th
                v-for="option in answerOptions"
                :key="option.value"
                class="text-center option-header"
              >
                {{ option.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(question, questionIndex) in sportQuestions"
              :key="question.key"
              :class="{ 'readonly-row': readonly }"
            >
              <td class="question-cell">
                <div class="question-number">S{{ questionIndex + 1 }}.</div>
                <div class="question-text">
                  <div class="question-label">{{ getQuestionLabel(question.section, question.key) }}</div>
                  <div class="question-description text-caption text-grey">
                    {{ getQuestionDescription(question.section, question.key) }}
                  </div>
                  <div class="tick-labels-desktop">
                    <span class="tick-label-low">{{ getTickLabels(question.section, question.key).low }}</span>
                    <span class="tick-label-high">{{ getTickLabels(question.section, question.key).high }}</span>
                  </div>
                </div>
              </td>
              <td
                v-for="option in answerOptions"
                :key="option.value"
                class="text-center option-cell"
              >
                <v-radio
                  :model-value="getCurrentValue(question.section, question.key)"
                  :value="option.value"
                  :readonly="readonly"
                  @click="handleUpdate(question.section, question.key, option.value)"
                  density="compact"
                  hide-details
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.efas-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.section-container {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

/* Mobile Layout (Cards) */
.mobile-layout {
  display: block;
}

.question-card {
  margin-bottom: 1rem;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.card-number {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
}

.card-title-text {
  flex: 1;
  font-size: 1rem;
  line-height: 1.4;
}

.card-options {
  padding: 1rem;
}

.mobile-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mobile-radio {
  margin-right: 0.5rem;
}

.tick-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 0.5rem;
}

.tick-label-low {
  font-style: italic;
}

.tick-label-high {
  font-style: italic;
}

/* Desktop Layout (Table) */
.table-wrapper {
  display: none;
  overflow-x: auto;
}

.efas-table {
  width: 100%;
  border-collapse: collapse;
}

.efas-table thead th {
  background-color: rgba(var(--v-theme-primary), 0.1);
  font-weight: 600;
  padding: 0.75rem;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.3);
}

.option-header {
  min-width: 60px;
}

.efas-table tbody tr {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.efas-table tbody tr:hover:not(.readonly-row) {
  background-color: rgba(var(--v-theme-primary), 0.02);
}

.question-cell {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  align-items: flex-start;
}

.question-number {
  flex-shrink: 0;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  min-width: 2rem;
}

.question-text {
  flex: 1;
}

.question-label {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.question-description {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.tick-labels-desktop {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 0.25rem;
  font-style: italic;
}

.option-cell {
  padding: 0.5rem;
  vertical-align: middle;
}

/* Responsive breakpoint */
@media (min-width: 768px) {
  .mobile-layout {
    display: none;
  }
  
  .table-wrapper {
    display: block;
  }
}

/* Print styles */
@media print {
  .mobile-layout {
    display: none;
  }
  
  .table-wrapper {
    display: block;
  }
  
  .efas-table {
    page-break-inside: avoid;
  }
}
</style>
