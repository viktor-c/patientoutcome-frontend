<script setup lang="ts">
import { computed, toRef, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormSubmissionData } from '../../types'
import type { Ref } from 'vue'
import type { FormViewMode } from '../../composables/useFormViewMode'

// Component props following the plugin interface
const props = withDefaults(defineProps<FormComponentProps>(), {
  readonly: false,
  locale: 'en'
})

// Component events
const emit = defineEmits<FormComponentEvents>()
const { t: tGlobal } = useI18n()

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

// Carousel state and logic
const allQuestions = computed(() => [...standardQuestions.value, ...sportQuestions.value])
const currentQuestionIndex = ref(0)
const carouselModel = ref(0)

const currentQuestion = computed(() => allQuestions.value[currentQuestionIndex.value])
const totalQuestions = computed(() => allQuestions.value.length)
const isLastQuestion = computed(() => currentQuestionIndex.value === totalQuestions.value - 1)
const isFirstQuestion = computed(() => currentQuestionIndex.value === 0)
const isCurrentQuestionAnswered = computed(() => {
  const question = currentQuestion.value
  if (!question) return false
  const value = getCurrentValue(question.section, question.key)
  return value !== null || isNA(question.section, question.key)
})

const answeredQuestions = computed(() => {
  return allQuestions.value.filter(q => {
    const value = getCurrentValue(q.section, q.key)
    const na = isNA(q.section, q.key)
    return value !== null || na
  }).length
})

const progress = computed(() => {
  if (totalQuestions.value === 0) return 0
  return Math.round(((currentQuestionIndex.value + 1) / totalQuestions.value) * 100)
})

function goToNext() {
  if (!isLastQuestion.value) {
    currentQuestionIndex.value++
    carouselModel.value = currentQuestionIndex.value
  }
}

function goToPrevious() {
  if (!isFirstQuestion.value) {
    currentQuestionIndex.value--
    carouselModel.value = currentQuestionIndex.value
  }
}

function goToQuestion(index: number) {
  if (index >= 0 && index < totalQuestions.value) {
    currentQuestionIndex.value = index
    carouselModel.value = index
  }
}

watch(carouselModel, (newValue) => {
  if (newValue !== currentQuestionIndex.value) {
    currentQuestionIndex.value = newValue
  }
})

// Inject view mode from PluginFormRenderer
const viewMode = inject<Ref<FormViewMode>>('formViewMode', ref('standard'))
const isCarouselMode = computed(() => viewMode.value === 'carousel')
</script>

<template>
  <div class="efas-container">
    <!-- Carousel View -->
    <div v-if="isCarouselMode" class="efas-carousel">
      <!-- Progress Header -->
      <v-card class="mb-4" elevation="2">
        <v-card-text class="pa-3">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2 font-weight-bold">
              {{ tGlobal('forms.carousel.questionProgress', {
                current: currentQuestionIndex + 1,
                total: totalQuestions,
              }) }}
            </span>
            <span class="text-caption text-medium-emphasis">
              {{ tGlobal('forms.carousel.answeredProgress', {
                answered: answeredQuestions,
                total: totalQuestions,
              }) }}
            </span>
          </div>
          <v-progress-linear
                             :model-value="progress"
                             color="primary"
                             height="8"
                             rounded />
        </v-card-text>
      </v-card>

      <!-- Question Navigation Dots (Mobile) -->
      <div class="d-flex d-md-none justify-center mb-4">
        <v-chip-group v-model="carouselModel" mandatory class="question-dots">
          <v-chip
                  v-for="(question, index) in allQuestions"
                  :key="index"
                  :value="index"
                  size="x-small"
                  :color="index === currentQuestionIndex ? 'green' : (getCurrentValue(question.section, question.key) !== null || isNA(question.section, question.key) ? 'success' : 'grey')"
                  @click="goToQuestion(index)">
            {{ index + 1 }}
          </v-chip>
        </v-chip-group>
      </div>

      <!-- Carousel -->
      <v-window v-model="carouselModel" class="form-carousel" touch v-if="currentQuestion">
        <v-window-item :value="currentQuestionIndex">
          <v-card class="question-carousel-card" elevation="3">
            <v-card-title class="text-h6 pa-4 bg-primary text-white">
              <div class="d-flex align-center">
                <v-avatar size="32" color="white" class="text-primary mr-3 flex-shrink-0">
                  <span class="font-weight-bold">{{ currentQuestionIndex + 1 }}</span>
                </v-avatar>
                <div class="flex-1" style="word-break: break-word; white-space: normal; line-height: 1.4;">
                  {{ getQuestionLabel(currentQuestion.section, currentQuestion.key) }}
                </div>
              </div>
            </v-card-title>

            <v-card-text class="pa-6">
              <div v-if="getQuestionDescription(currentQuestion.section, currentQuestion.key)"
                   class="text-body-2 text-medium-emphasis mb-4">
                {{ getQuestionDescription(currentQuestion.section, currentQuestion.key) }}
              </div>

              <!-- N/A Checkbox -->
              <div class="mb-4">
                <v-checkbox
                            :model-value="isNA(currentQuestion.section, currentQuestion.key)"
                            @update:model-value="toggleNA(currentQuestion.section, currentQuestion.key)"
                            :disabled="readonly"
                            :label="t('efas.notApplicable')"
                            density="comfortable"
                            color="primary"
                            hide-details />
              </div>

              <!-- Slider -->
              <v-slider
                        :model-value="getCurrentValue(currentQuestion.section, currentQuestion.key) ?? 0"
                        :readonly="readonly"
                        :disabled="isNA(currentQuestion.section, currentQuestion.key) || readonly"
                        :min="0"
                        :max="4"
                        :step="1"
                        :thumb-label="getCurrentValue(currentQuestion.section, currentQuestion.key) !== null ? 'always' : false"
                        :color="getCurrentValue(currentQuestion.section, currentQuestion.key) !== null ? 'primary' : 'grey-lighten-1'"
                        :track-color="getCurrentValue(currentQuestion.section, currentQuestion.key) !== null ? 'grey-lighten-2' : 'grey-lighten-3'"
                        @update:model-value="(value) => handleUpdate(currentQuestion.section, currentQuestion.key, value as number)"
                        class="mt-4 mb-6" />

              <div class="d-flex justify-space-between text-caption text-medium-emphasis">
                <span>0 - {{ getTickLabels(currentQuestion.section, currentQuestion.key).low }}</span>
                <span>4 - {{ getTickLabels(currentQuestion.section, currentQuestion.key).high }}</span>
              </div>
            </v-card-text>

            <!-- Navigation Footer -->
            <v-card-actions class="pa-4 justify-space-between">
              <v-btn
                     :disabled="isFirstQuestion"
                     variant="outlined"
                     color="primary"
                     prepend-icon="mdi-chevron-left"
                     @click="goToPrevious">
                {{ tGlobal('buttons.previous') }}
              </v-btn>

              <v-btn
                     v-if="!isLastQuestion"
                     variant="elevated"
                     color="primary"
                     append-icon="mdi-chevron-right"
                     @click="goToNext">
                {{ tGlobal(isCurrentQuestionAnswered ? 'buttons.next' : 'buttons.skip') }}
              </v-btn>

              <v-btn
                     v-else
                     variant="elevated"
                     color="success"
                     append-icon="mdi-check"
                     @click="emit('submit')">
                {{ tGlobal(isCurrentQuestionAnswered ? 'buttons.complete' : 'buttons.skipQuestionAndSubmitForm') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-window-item>
      </v-window>

      <!-- Desktop Sidebar -->
      <v-card class="d-none d-md-block mt-4" elevation="1">
        <v-card-title class="text-subtitle-1 py-2 bg-grey-lighten-4">{{ tGlobal('forms.carousel.allQuestions')
          }}</v-card-title>
        <v-list density="compact">
          <v-list-item
                       v-for="(question, index) in allQuestions"
                       :key="index"
                       :active="index === currentQuestionIndex"
                       @click="goToQuestion(index)"
                       class="cursor-pointer">
            <template #prepend>
              <v-avatar
                        size="24"
                        :color="index === currentQuestionIndex ? 'green' : (getCurrentValue(question.section, question.key) !== null || isNA(question.section, question.key) ? 'success' : 'grey-lighten-2')">
                <v-icon v-if="getCurrentValue(question.section, question.key) !== null || isNA(question.section, question.key)"
                        size="16" color="white">
                  mdi-check
                </v-icon>
                <span v-else class="text-caption">{{ index + 1 }}</span>
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-2" style="white-space: normal; line-height: 1.3;">
              {{ getQuestionLabel(question.section, question.key) }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </div>

    <!-- Standard View -->
    <template v-else>
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
                              :label="t('efas.notApplicable')"
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
                              :label="t('efas.notApplicable')"
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
    </template>
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

/* Carousel styles */
.efas-carousel {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.question-carousel-card {
  border-radius: 12px;
  overflow: hidden;
}

.question-dots {
  max-width: 100%;
  overflow-x: auto;
}

.cursor-pointer {
  cursor: pointer;
}

@media (max-width: 767px) {
  .efas-carousel {
    margin: 0;
    max-width: 100%;
  }

  .question-carousel-card {
    border-radius: 0;
  }

  .question-carousel-card :deep(.v-card-title),
  .question-carousel-card :deep(.v-card-text),
  .question-carousel-card :deep(.v-card-actions) {
    padding: 0;
  }
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
