<script setup lang="ts">
import { computed, toRef, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormSubmissionData, FormCommentContext } from '../../types'
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

// Carousel state and logic
const currentQuestionIndex = ref(0)
const carouselModel = ref(0)

const currentQuestion = computed(() => questionsData.value[currentQuestionIndex.value])
const totalQuestions = computed(() => questionsData.value.length)
const isLastQuestion = computed(() => currentQuestionIndex.value === totalQuestions.value - 1)
const isFirstQuestion = computed(() => currentQuestionIndex.value === 0)
const isCurrentQuestionAnswered = computed(() => {
  const question = currentQuestion.value
  if (!question) return false
  return getCurrentValue(question.key) !== null
})

const answeredQuestions = computed(() => {
  return questionsData.value.filter(q => getCurrentValue(q.key) !== null).length
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
const formCommentContext = inject<FormCommentContext | null>('formCommentContext', null)
const showCommentDialog = ref(false)
const commentDraft = ref('')

const currentQuestionKey = computed(() => currentQuestion.value?.key ?? null)
const currentQuestionLabel = computed(() => currentQuestion.value?.title ?? null)

function openCommentDialog() {
  if (props.readonly || !formCommentContext) return
  commentDraft.value = ''
  showCommentDialog.value = true
}

function saveComment() {
  const content = commentDraft.value.trim()
  if (!content || !formCommentContext) return

  formCommentContext.addComment({
    questionKey: currentQuestionKey.value,
    questionLabel: currentQuestionLabel.value,
    content,
  })

  showCommentDialog.value = false
  commentDraft.value = ''
}
</script>

<template>
  <div class="moxfq-container">
    <!-- Carousel View -->
    <div v-if="isCarouselMode" class="moxfq-carousel">
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
                  v-for="(question, index) in questionsData"
                  :key="index"
                  :value="index"
                  size="x-small"
                  :color="index === currentQuestionIndex ? 'green' : (getCurrentValue(question.key) !== null ? 'success' : 'grey')"
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
                  {{ currentQuestion.title }}
                </div>
              </div>
            </v-card-title>

            <v-card-text class="pa-6">
              <v-radio-group
                             :model-value="getCurrentValue(currentQuestion.key)"
                             :readonly="readonly"
                             @update:model-value="(value) => handleUpdate(currentQuestion.key, value as number)"
                             class="carousel-radio-group">
                <v-radio
                         v-for="option in getQuestionOptions(currentQuestion.options)"
                         :key="option.value"
                         :value="option.value"
                         color="primary"
                         class="carousel-radio mb-3">
                  <template #label>
                    <div class="carousel-option-label">
                      <div class="text-body-1 font-weight-medium">
                        {{ option.label }}
                      </div>
                      <v-chip
                              size="x-small"
                              color="primary"
                              variant="tonal"
                              class="ml-2">
                        {{ option.value }}
                      </v-chip>
                    </div>
                  </template>
                </v-radio>
              </v-radio-group>
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
                     variant="tonal"
                     color="warning"
                     prepend-icon="mdi-comment-alert-outline"
                     :disabled="readonly"
                     @click="openCommentDialog">
                {{ tGlobal('forms.comments.add') }}
                <v-tooltip activator="parent" location="top">{{ tGlobal('forms.comments.hint') }}</v-tooltip>
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

      <v-dialog v-model="showCommentDialog" max-width="560">
        <v-card>
          <v-card-title>{{ tGlobal('forms.comments.dialogTitle') }}</v-card-title>
          <v-card-text>
            <p class="text-body-2 mb-3">
              <strong>{{ tGlobal('forms.comments.question') }}:</strong>
              {{ currentQuestionKey || tGlobal('forms.comments.formLevel') }}
            </p>
            <v-textarea
                        v-model="commentDraft"
                        :label="tGlobal('forms.comments.content')"
                        :hint="tGlobal('forms.comments.hint')"
                        persistent-hint
                        rows="4"
                        maxlength="1000"
                        counter
                        auto-grow />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showCommentDialog = false">{{ tGlobal('buttons.cancel') }}</v-btn>
            <v-btn color="primary" :disabled="commentDraft.trim().length === 0" @click="saveComment">
              {{ tGlobal('buttons.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Desktop Sidebar -->
      <v-card class="d-none d-md-block mt-4" elevation="1">
        <v-card-title class="text-subtitle-1 py-2 bg-grey-lighten-4">{{ tGlobal('forms.carousel.allQuestions')
          }}</v-card-title>
        <v-list density="compact">
          <v-list-item
                       v-for="(question, index) in questionsData"
                       :key="index"
                       :active="index === currentQuestionIndex"
                       @click="goToQuestion(index)"
                       class="cursor-pointer">
            <template #prepend>
              <v-avatar
                        size="24"
                        :color="index === currentQuestionIndex ? 'green' : (getCurrentValue(question.key) !== null ? 'success' : 'grey-lighten-2')">
                <v-icon v-if="getCurrentValue(question.key) !== null" size="16" color="white">
                  mdi-check
                </v-icon>
                <span v-else class="text-caption">{{ index + 1 }}</span>
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-2" style="white-space: normal; line-height: 1.3;">
              {{ question.title }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </div>

    <!-- Standard View -->
    <template v-else>
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
    </template>
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
  gap: 0px;
  /* reduce gap to fit more buttons */
}

.mobile-radio {
  padding: 0px 8px !important;
  /* force smaller padding on options */
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
  /* width: 80px; */
  min-width: 50px;
}

.answer-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0px 2px;
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
  border-bottom: 1px solid #696969;
  padding: 10px 0px;
}

.question-row:hover {
  background-color: #f5f5f5;
}

/* alternate row shading */
.question-row:nth-child(even) {
  background-color: #e7e7e7;
}

.number-cell {
  font-weight: 500;
  color: #666;
}

.question-cell {
  padding: 4px 4px;
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

/* Carousel styles */
.moxfq-carousel {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.question-carousel-card {
  border-radius: 12px;
  overflow: hidden;
}

.carousel-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.carousel-radio {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s ease;
  background-color: #fafafa;
}

.carousel-radio:hover {
  border-color: #1976d2;
  background-color: #f5f5f5;
}

.carousel-radio :deep(.v-selection-control__wrapper) {
  margin-right: 12px;
}

.carousel-option-label {
  display: flex;
  align-items: center;
  width: 100%;
}

.question-dots {
  max-width: 100%;
  overflow-x: auto;
}

.cursor-pointer {
  cursor: pointer;
}

/* Responsive breakpoint */
@media (max-width: 960px) {
  .mobile-layout {
    display: block;
  }

  .table-wrapper {
    display: none;
  }

  .moxfq-carousel {
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
</style>
