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

// Question definitions with their specific answer options
const questionsData = computed(() => [
  {
    key: 'q1',
    title: t('aofas.questions.q1'),
    options: [
      { value: 40, label: t('aofas.q1.none') },
      { value: 30, label: t('aofas.q1.mild') },
      { value: 20, label: t('aofas.q1.moderate') },
      { value: 0, label: t('aofas.q1.severe') }
    ]
  },
  {
    key: 'q2',
    title: t('aofas.questions.q2'),
    options: [
      { value: 10, label: t('aofas.q2.noLimitation') },
      { value: 7, label: t('aofas.q2.noLimitationDaily') },
      { value: 4, label: t('aofas.q2.limitationDaily') },
      { value: 0, label: t('aofas.q2.severeLimitation') }
    ]
  },
  {
    key: 'q3',
    title: t('aofas.questions.q3'),
    options: [
      { value: 10, label: t('aofas.q3.fashionable') },
      { value: 5, label: t('aofas.q3.comfortable') },
      { value: 0, label: t('aofas.q3.modified') }
    ]
  },
  {
    key: 'q4',
    title: t('aofas.questions.q4'),
    options: [
      { value: 10, label: t('aofas.q4.normal') },
      { value: 5, label: t('aofas.q4.moderate') },
      { value: 0, label: t('aofas.q4.severe') }
    ]
  },
  {
    key: 'q5',
    title: t('aofas.questions.q5'),
    options: [
      { value: 5, label: t('aofas.q5.noRestriction') },
      { value: 0, label: t('aofas.q5.restriction') }
    ]
  },
  {
    key: 'q6',
    title: t('aofas.questions.q6'),
    options: [
      { value: 5, label: t('aofas.q6.stable') },
      { value: 0, label: t('aofas.q6.unstable') }
    ]
  },
  {
    key: 'q7',
    title: t('aofas.questions.q7'),
    options: [
      { value: 5, label: t('aofas.q7.none') },
      { value: 0, label: t('aofas.q7.symptomatic') }
    ]
  },
  {
    key: 'q8',
    title: t('aofas.questions.q8'),
    options: [
      { value: 15, label: t('aofas.q8.good') },
      { value: 8, label: t('aofas.q8.moderate') },
      { value: 0, label: t('aofas.q8.severe') }
    ]
  }
])

// Handle value update
function handleUpdate(questionKey: string, value: number) {
  if (!props.readonly) {
    updateQuestion('forefoot', questionKey, value)
  }
}

// Get current value for a question
function getCurrentValue(questionKey: string): number | null {
  return getQuestion('forefoot', questionKey) as number | null
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
  <div class="aofas-container">
    <!-- Carousel View -->
    <div v-if="isCarouselMode" class="aofas-carousel">
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
              <!-- Radio Options -->
              <v-radio-group
                             :model-value="getCurrentValue(currentQuestion.key)"
                             :readonly="readonly"
                             @update:model-value="(value) => handleUpdate(currentQuestion.key, value as number)"
                             class="carousel-radio-group">
                <v-radio
                         v-for="option in currentQuestion.options"
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
                        {{ option.value }} pts
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
      <h3 class="mb-4">{{ t('aofas.title.description') }}</h3>

      <!-- Instructions -->
      <div class="mb-4 text-caption text-grey">
        <p>
          <strong>{{ t('aofas.instructions.title') }}:</strong>
          {{ t('aofas.instructions.description') }}
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
        <v-table class="aofas-table" density="compact" fixed-header>
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
    </template>
  </div>
</template>

<style scoped>
.aofas-container {
  width: 100%;
  padding: 16px;
}

/* Mobile card-based layout - visible on small screens */
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

/* Desktop table layout - hidden on small screens */
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

.aofas-table {
  width: 100%;
  border-collapse: collapse;
}

.aofas-table thead tr {
  background-color: #f5f5f5;
  border-bottom: 2px solid #1976d2;
}

.aofas-table th {
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

/* Carousel styles */
.aofas-carousel {
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

@media (max-width: 959px) {
  .aofas-carousel {
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
