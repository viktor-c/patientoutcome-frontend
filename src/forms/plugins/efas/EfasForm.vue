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
const { updateQuestion, t } = useForm({
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

// Check if a question is marked as N/A
function isNA(section: string, questionKey: string): boolean {
  const qData = props.modelValue[section]?.[questionKey]
  return qData === 'na'
}

// Toggle N/A status
function toggleNA(section: string, questionKey: string) {
  if (!props.readonly) {
    const qData = props.modelValue[section]?.[questionKey]
    const currentNA = qData === 'na'
    // Toggle between 'na' and null (unanswered)
    updateQuestion(section, questionKey, currentNA ? null : 'na')
  }
}

// Handle value update
function handleUpdate(section: string, questionKey: string, value: number) {
  if (!props.readonly) {
    // Set numeric value, clearing N/A status
    updateQuestion(section, questionKey, value)
  }
}

// Get current value for a question
function getCurrentValue(section: string, questionKey: string): number | null {
  const qData = props.modelValue[section]?.[questionKey]
  if (typeof qData === 'number') {
    return qData
  }
  // 'na' string or null returns null for slider display
  return null
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
    <h3 class="mb-4 title-text">{{ t('efas.title.description') }}</h3>

    <!-- Instructions -->
    <div class="mb-4 instructions-text text-grey">
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
                elevation="1">
          <v-card-title class="card-header">
            <span class="card-number">{{ questionIndex + 1 }}</span>
            <div class="card-title-text">{{ getQuestionLabel(question.section, question.key) }}</div>
          </v-card-title>

          <v-card-text class="card-options">
            <div class="slider-container">
              <div class="slider-header">
                <v-checkbox
                            :model-value="isNA(question.section, question.key)"
                            @update:model-value="toggleNA(question.section, question.key)"
                            :disabled="readonly"
                            label="N/A"
                            density="compact"
                            hide-details />
              </div>
              <v-slider
                        :model-value="getCurrentValue(question.section, question.key) ?? 0"
                        :min="0"
                        :max="4"
                        :step="1"
                        :disabled="isNA(question.section, question.key) || readonly"
                        :readonly="readonly"
                        @update:model-value="(value) => handleUpdate(question.section, question.key, value as number)"
                        class="mobile-slider"
                        hide-details
                        thumb-label="always" />
            </div>
            <div class="tick-labels mt-2">
              <span class="tick-label-low">0 - {{ getTickLabels(question.section, question.key).low }}</span>
              <span class="tick-label-high">4 - {{ getTickLabels(question.section, question.key).high }}</span>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Desktop table layout -->
      <div class="table-wrapper">
        <div class="desktop-layout">
          <div
               v-for="(question, questionIndex) in standardQuestions"
               :key="question.key"
               class="question-row">
            <div class="question-info">
              <div class="question-number">{{ questionIndex + 1 }}.</div>
              <div class="question-text">
                <div class="question-label">{{ getQuestionLabel(question.section, question.key) }}</div>
                <div class="question-description question-description-desktop text-grey">
                  {{ getQuestionDescription(question.section, question.key) }}
                </div>
              </div>
            </div>
            <div class="question-controls">
              <div class="slider-wrapper">
                <div class="slider-header-desktop">
                  <v-checkbox
                              :model-value="isNA(question.section, question.key)"
                              @update:model-value="toggleNA(question.section, question.key)"
                              :disabled="readonly"
                              :label="t('efas.notApplicable')"
                              density="compact"
                              hide-details
                              class="na-checkbox" />
                </div>
                <v-slider
                          :model-value="getCurrentValue(question.section, question.key) ?? 0"
                          :min="0"
                          :max="4"
                          :step="1"
                          :disabled="isNA(question.section, question.key) || readonly"
                          :readonly="readonly"
                          @update:model-value="(value) => handleUpdate(question.section, question.key, value as number)"
                          class="desktop-slider"
                          hide-details
                          thumb-label="always" />
                <div class="tick-labels-desktop">
                  <span class="tick-label-low">0 - {{ getTickLabels(question.section, question.key).low }}</span>
                  <span class="tick-label-high">4 - {{ getTickLabels(question.section, question.key).high }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                elevation="1">
          <v-card-title class="card-header">
            <span class="card-number">S{{ questionIndex + 1 }}</span>
            <div class="card-title-text">{{ getQuestionLabel(question.section, question.key) }}</div>
          </v-card-title>
          <v-card-subtitle class="px-4 pt-2 question-description-text">
            {{ getQuestionDescription(question.section, question.key) }}
          </v-card-subtitle>
          <v-card-text class="card-options">
            <div class="slider-container">
              <div class="slider-header">
                <v-checkbox
                            :model-value="isNA(question.section, question.key)"
                            @update:model-value="toggleNA(question.section, question.key)"
                            :disabled="readonly"
                            label="N/A"
                            density="compact"
                            hide-details />
              </div>
              <v-slider
                        :model-value="getCurrentValue(question.section, question.key) ?? 0"
                        :min="0"
                        :max="4"
                        :step="1"
                        :disabled="isNA(question.section, question.key) || readonly"
                        :readonly="readonly"
                        @update:model-value="(value) => handleUpdate(question.section, question.key, value as number)"
                        class="mobile-slider"
                        hide-details
                        thumb-label="always" />
            </div>
            <div class="tick-labels mt-2">
              <span class="tick-label-low">0 - {{ getTickLabels(question.section, question.key).low }}</span>
              <span class="tick-label-high">4 - {{ getTickLabels(question.section, question.key).high }}</span>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Desktop table layout -->
      <div class="table-wrapper">
        <div class="desktop-layout">
          <div
               v-for="(question, questionIndex) in sportQuestions"
               :key="question.key"
               class="question-row">
            <div class="question-info">
              <div class="question-number">S{{ questionIndex + 1 }}.</div>
              <div class="question-text">
                <div class="question-label">{{ getQuestionLabel(question.section, question.key) }}</div>
                <div class="question-description question-description-desktop text-grey">
                  {{ getQuestionDescription(question.section, question.key) }}
                </div>
              </div>
            </div>
            <div class="question-controls">
              <div class="slider-wrapper">
                <div class="slider-header-desktop">
                  <v-checkbox
                              :model-value="isNA(question.section, question.key)"
                              @update:model-value="toggleNA(question.section, question.key)"
                              :disabled="readonly"
                              :label="t('efas.notApplicable')"
                              density="compact"
                              hide-details
                              class="na-checkbox" />
                </div>
                <v-slider
                          :model-value="getCurrentValue(question.section, question.key) ?? 0"
                          :min="0"
                          :max="4"
                          :step="1"
                          :disabled="isNA(question.section, question.key) || readonly"
                          :readonly="readonly"
                          @update:model-value="(value) => handleUpdate(question.section, question.key, value as number)"
                          class="desktop-slider"
                          hide-details
                          thumb-label="always" />
                <div class="tick-labels-desktop">
                  <span class="tick-label-low">0 - {{ getTickLabels(question.section, question.key).low }}</span>
                  <span class="tick-label-high">4 - {{ getTickLabels(question.section, question.key).high }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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

.slider-container {
  margin-bottom: 1rem;
}

.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.slider-header-desktop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.slider-value-display {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 0.5rem;
}

.mobile-slider {
  margin-bottom: 0.5rem;
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

.title-text {
  font-size: 1.5rem;
  font-weight: 500;
}

.instructions-text {
  font-size: 1rem;
}

.question-description-text {
  font-size: 1.25rem;
  line-height: 1.5;
}

.question-description-desktop {
  font-size: 0.95rem;
  line-height: 1.4;
}

/* Desktop Layout */
.table-wrapper {
  display: none;
  overflow-x: auto;
}

.desktop-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  padding: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  background-color: rgba(var(--v-theme-primary), 0.02);
}

.question-info {
  display: flex;
  gap: 0.75rem;
}

.question-number {
  flex-shrink: 0;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  min-width: 2rem;
  line-height: 1.5;
}

.question-text {
  flex: 1;
}

.question-label {
  font-weight: 500;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.question-description {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.question-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: flex-start;
}

.slider-wrapper {
  flex: 1;
}

.slider-value-display {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 0.5rem;
}

.desktop-slider {
  margin-bottom: 0.5rem;
}

.tick-labels-desktop {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 0.25rem;
  font-style: italic;
}

.na-checkbox {
  align-self: flex-start;
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
}
</style>
