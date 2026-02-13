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

// Q7 options (enum values)
const q7Options = computed(() => [
  { value: 0, label: t('visaa.q7_option_0') },
  { value: 4, label: t('visaa.q7_option_4') },
  { value: 7, label: t('visaa.q7_option_7') },
  { value: 10, label: t('visaa.q7_option_10') }
])

// Q8 type options
const q8TypeOptions = computed(() => [
  { value: 'no_pain', label: t('visaa.q8_type_no_pain') },
  { value: 'pain_no_stop', label: t('visaa.q8_type_pain_no_stop') },
  { value: 'pain_stop', label: t('visaa.q8_type_pain_stop') }
])

// Handle value update
function handleUpdate(questionKey: string, value: number | string | null) {
  if (!props.readonly) {
    updateQuestion('visaa', questionKey, value)
  }
}

// Handle Q8 type change - clear all Q8 variants
function handleQ8TypeChange(value: string | null) {
  if (!props.readonly) {
    updateQuestion('visaa', 'q8_type', value)
    // Clear all Q8 variant values when type changes
    updateQuestion('visaa', 'q8a', null)
    updateQuestion('visaa', 'q8b', null)
    updateQuestion('visaa', 'q8c', null)
  }
}

// Get current value for a question
function getCurrentValue(questionKey: string): number | string | null | undefined {
  const value = getQuestion('visaa', questionKey) as number | string | null
  return value === null ? undefined : value
}

// Get conditional Q8 question based on selected type
const conditionalQ8 = computed(() => {
  const q8Type = getCurrentValue('q8_type') as string | null

  if (q8Type === 'no_pain') {
    return { key: 'q8a', label: t('visaa.q8a') }
  } else if (q8Type === 'pain_no_stop') {
    return { key: 'q8b', label: t('visaa.q8b') }
  } else if (q8Type === 'pain_stop') {
    return { key: 'q8c', label: t('visaa.q8c') }
  }

  return null
})
</script>

<template>
  <div class="visaa-container">
    <h3 class="mb-4">{{ t('visaa.title.description') }}</h3>

    <!-- Instructions -->
    <div class="mb-4 text-caption text-grey">
      <p>
        <strong>{{ t('visaa.instructions.title') }}:</strong>
        {{ t('visaa.instructions.description') }}
      </p>
    </div>

    <!-- Question cards -->
    <div class="questions-layout">
      <!-- Q1: Stiffness duration (0-100 minutes) -->
      <v-card class="question-card" elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">1</span>
          <div class="card-title-text">{{ t('visaa.q1') }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <div class="slider-container">
            <div class="slider-labels">
              <span class="label-min">{{ t('visaa.q1_min') }}</span>
              <span class="label-max">{{ t('visaa.q1_max') }}</span>
            </div>
            <v-slider
                      :model-value="getCurrentValue('q1') as number | undefined"
                      :readonly="readonly"
                      @update:model-value="(value) => handleUpdate('q1', value)"
                      :min="0"
                      :max="100"
                      :step="1"
                      show-ticks="always"
                      :ticks="{ 0: '100+', 20: '80', 40: '60', 60: '40', 80: '20', 100: '0' }"
                      thumb-label="always"
                      color="primary"
                      track-color="grey-lighten-2"
                      class="slider-input">
              <template #thumb-label="{ modelValue }">
                {{ 100 - (modelValue as number) }}
              </template>
            </v-slider>
          </div>
        </v-card-text>
      </v-card>

      <!-- Q2: Pain walking (0-10, reversed display) -->
      <v-card class="question-card" elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">2</span>
          <div class="card-title-text">{{ t('visaa.q2') }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <div class="slider-container">
            <div class="slider-labels">
              <span class="label-min">{{ t('visaa.q2_min') }}</span>
              <span class="label-max">{{ t('visaa.q2_max') }}</span>
            </div>
            <v-slider
                      :model-value="getCurrentValue('q2') as number | undefined"
                      :readonly="readonly"
                      @update:model-value="(value) => handleUpdate('q2', value)"
                      :min="0"
                      :max="10"
                      :step="1"
                      show-ticks
                      thumb-label="always"
                      color="primary"
                      track-color="grey-lighten-2"
                      class="slider-input" />
          </div>
        </v-card-text>
      </v-card>

      <!-- Q3: Pain after 30min walk (0-10, reversed display) -->
      <v-card class="question-card" elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">3</span>
          <div class="card-title-text">{{ t('visaa.q3') }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <div class="slider-container">
            <div class="slider-labels">
              <span class="label-min">{{ t('visaa.q3_min') }}</span>
              <span class="label-max">{{ t('visaa.q3_max') }}</span>
            </div>
            <v-slider
                      :model-value="getCurrentValue('q3') as number | undefined"
                      :readonly="readonly"
                      @update:model-value="(value) => handleUpdate('q3', value)"
                      :min="0"
                      :max="10"
                      :step="1"
                      show-ticks
                      thumb-label="always"
                      color="primary"
                      track-color="grey-lighten-2"
                      class="slider-input" />
          </div>
        </v-card-text>
      </v-card>

      <!-- Q4: Pain downstairs (0-10, reversed display) -->
      <v-card class="question-card" elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">4</span>
          <div class="card-title-text">{{ t('visaa.q4') }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <div class="slider-container">
            <div class="slider-labels">
              <span class="label-min">{{ t('visaa.q4_min') }}</span>
              <span class="label-max">{{ t('visaa.q4_max') }}</span>
            </div>
            <v-slider
                      :model-value="getCurrentValue('q4') as number | undefined"
                      :readonly="readonly"
                      @update:model-value="(value) => handleUpdate('q4', value)"
                      :min="0"
                      :max="10"
                      :step="1"
                      show-ticks
                      thumb-label="always"
                      color="primary"
                      track-color="grey-lighten-2"
                      class="slider-input" />
          </div>
        </v-card-text>
      </v-card>

      <!-- Q5: Pain heel raises (0-10, reversed display) -->
      <v-card class="question-card" elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">5</span>
          <div class="card-title-text">{{ t('visaa.q5') }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <div class="slider-container">
            <div class="slider-labels">
              <span class="label-min">{{ t('visaa.q5_min') }}</span>
              <span class="label-max">{{ t('visaa.q5_max') }}</span>
            </div>
            <v-slider
                      :model-value="getCurrentValue('q5') as number | undefined"
                      :readonly="readonly"
                      @update:model-value="(value) => handleUpdate('q5', value)"
                      :min="0"
                      :max="10"
                      :step="1"
                      show-ticks
                      thumb-label="always"
                      color="primary"
                      track-color="grey-lighten-2"
                      class="slider-input" />
          </div>
        </v-card-text>
      </v-card>

      <!-- Q6: Single leg hops (0-10) -->
      <v-card class="question-card" elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">6</span>
          <div class="card-title-text">{{ t('visaa.q6') }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <div class="slider-container">
            <div class="slider-labels">
              <span class="label-min">{{ t('visaa.q6_min') }}</span>
              <span class="label-max">{{ t('visaa.q6_max') }}</span>
            </div>
            <v-slider
                      :model-value="getCurrentValue('q6') as number | undefined"
                      :readonly="readonly"
                      @update:model-value="(value) => handleUpdate('q6', value)"
                      :min="0"
                      :max="10"
                      :step="1"
                      show-ticks
                      thumb-label="always"
                      color="primary"
                      track-color="grey-lighten-2"
                      class="slider-input" />
          </div>
        </v-card-text>
      </v-card>

      <!-- Q7: Sport participation (enum radio) -->
      <v-card class="question-card" elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">7</span>
          <div class="card-title-text">{{ t('visaa.q7') }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <v-radio-group
                         :model-value="getCurrentValue('q7') as number | undefined"
                         :readonly="readonly"
                         @update:model-value="(value) => handleUpdate('q7', value)"
                         class="radio-group">
            <v-radio
                     v-for="option in q7Options"
                     :key="option.value"
                     :value="option.value"
                     :label="`${option.value} - ${option.label}`"
                     density="compact"
                     color="primary" />
          </v-radio-group>
        </v-card-text>
      </v-card>

      <!-- Q8 Type selector -->
      <v-card class="question-card" elevation="1">
        <v-card-title class="card-header">
          <span class="card-number">8</span>
          <div class="card-title-text">{{ t('visaa.q8_type') }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <v-radio-group
                         :model-value="getCurrentValue('q8_type') as string | undefined"
                         :readonly="readonly"
                         @update:model-value="handleQ8TypeChange"
                         class="radio-group">
            <v-radio
                     v-for="option in q8TypeOptions"
                     :key="option.value"
                     :value="option.value"
                     :label="option.label"
                     density="compact"
                     color="primary" />
          </v-radio-group>
        </v-card-text>
      </v-card>

      <!-- Q8 Conditional (a/b/c based on type) -->
      <v-card v-if="conditionalQ8" class="question-card conditional-card" elevation="2">
        <v-card-title class="card-header">
          <span class="card-number">8{{ conditionalQ8?.key.slice(-1).toUpperCase() }}</span>
          <div class="card-title-text">{{ conditionalQ8?.label }}</div>
        </v-card-title>
        <v-card-text class="card-content">
          <div class="slider-container">
            <div class="slider-labels">
              <span class="label-min">{{ t('visaa.q8_min') }}</span>
              <span class="label-max">{{ t('visaa.q8_max') }}</span>
            </div>
            <v-slider
                      v-if="conditionalQ8"
                      :model-value="getCurrentValue(conditionalQ8.key) as number | undefined"
                      :readonly="readonly"
                      @update:model-value="(value) => conditionalQ8 && handleUpdate(conditionalQ8.key, value)"
                      :min="0"
                      :max="30"
                      :step="1"
                      show-ticks="always"
                      :ticks="{ 0: '0', 10: '10', 20: '20', 30: '30+' }"
                      thumb-label="always"
                      color="primary"
                      track-color="grey-lighten-2"
                      class="slider-input" />
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
.visaa-container {
  width: 100%;
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.questions-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-card {
  width: 100%;
}

.conditional-card {
  background-color: #f5f5f5;
  border: 2px solid #1976d2;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

.card-number {
  font-weight: bold;
  font-size: 1.2rem;
  flex-shrink: 0;
  color: #1976d2;
  min-width: 30px;
}

.card-title-text {
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.4;
}

.card-content {
  padding: 16px;
  padding-top: 8px;
}

.slider-container {
  width: 100%;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.label-min {
  text-align: left;
}

.label-max {
  text-align: right;
}

.slider-input {
  margin-top: 12px;
}

.radio-group {
  margin-top: 8px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .visaa-container {
    padding: 8px;
  }

  .card-header {
    padding: 12px;
  }

  .card-content {
    padding: 12px;
  }

  .card-number {
    font-size: 1rem;
  }

  .card-title-text {
    font-size: 0.9rem;
  }
}
</style>
