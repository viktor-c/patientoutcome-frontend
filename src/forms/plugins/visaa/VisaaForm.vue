<script setup lang="ts">
/* eslint-disable vue/no-deprecated-filter */
import { computed, toRef, inject, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormSubmissionData, FormCommentContext } from '../../types'
import type { Ref } from 'vue'
import type { FormViewMode } from '../../composables/useFormViewMode'

type CarouselQuestion =
  | {
    key: string
    title: string
    type: 'slider'
    min: number
    max: number
    step: number
    ticks?: Record<number, string>
    labelMin: string
    labelMax: string
  }
  | {
    key: string
    title: string
    type: 'radio'
    options: Array<{ value: number | string; label: string }>
  }

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

const carouselQuestions = computed<CarouselQuestion[]>(() => {
  const questions: CarouselQuestion[] = [
    {
      key: 'q1',
      title: t('visaa.q1'),
      type: 'slider' as const,
      min: 0,
      max: 100,
      step: 1,
      ticks: { 0: '100+', 20: '80', 40: '60', 60: '40', 80: '20', 100: '0' },
      labelMin: t('visaa.q1_min'),
      labelMax: t('visaa.q1_max')
    },
    {
      key: 'q2',
      title: t('visaa.q2'),
      type: 'slider' as const,
      min: 0,
      max: 10,
      step: 1,
      labelMin: t('visaa.q2_min'),
      labelMax: t('visaa.q2_max')
    },
    {
      key: 'q3',
      title: t('visaa.q3'),
      type: 'slider' as const,
      min: 0,
      max: 10,
      step: 1,
      labelMin: t('visaa.q3_min'),
      labelMax: t('visaa.q3_max')
    },
    {
      key: 'q4',
      title: t('visaa.q4'),
      type: 'slider' as const,
      min: 0,
      max: 10,
      step: 1,
      labelMin: t('visaa.q4_min'),
      labelMax: t('visaa.q4_max')
    },
    {
      key: 'q5',
      title: t('visaa.q5'),
      type: 'slider' as const,
      min: 0,
      max: 10,
      step: 1,
      labelMin: t('visaa.q5_min'),
      labelMax: t('visaa.q5_max')
    },
    {
      key: 'q6',
      title: t('visaa.q6'),
      type: 'slider' as const,
      min: 0,
      max: 10,
      step: 1,
      labelMin: t('visaa.q6_min'),
      labelMax: t('visaa.q6_max')
    },
    {
      key: 'q7',
      title: t('visaa.q7'),
      type: 'radio' as const,
      options: q7Options.value
    },
    {
      key: 'q8_type',
      title: t('visaa.q8_type'),
      type: 'radio' as const,
      options: q8TypeOptions.value
    }
  ]

  if (conditionalQ8.value) {
    questions.push({
      key: conditionalQ8.value.key,
      title: conditionalQ8.value.label,
      type: 'slider' as const,
      min: 0,
      max: 30,
      step: 1,
      ticks: { 0: '0', 10: '10', 20: '20', 30: '30+' },
      labelMin: t('visaa.q8_min'),
      labelMax: t('visaa.q8_max')
    })
  }

  return questions
})

const currentQuestionIndex = ref(0)
const carouselModel = ref(0)

const currentQuestion = computed(() => carouselQuestions.value[currentQuestionIndex.value])
const totalQuestions = computed(() => carouselQuestions.value.length)
const isLastQuestion = computed(() => currentQuestionIndex.value === totalQuestions.value - 1)
const isFirstQuestion = computed(() => currentQuestionIndex.value === 0)
const isCurrentQuestionAnswered = computed(() => {
  const question = currentQuestion.value
  if (!question) return false
  return getCurrentValue(question.key) !== undefined
})

const answeredQuestions = computed(() => {
  return carouselQuestions.value.filter(q => getCurrentValue(q.key) !== undefined).length
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

watch(conditionalQ8, () => {
  if (currentQuestionIndex.value >= carouselQuestions.value.length) {
    currentQuestionIndex.value = Math.max(0, carouselQuestions.value.length - 1)
    carouselModel.value = currentQuestionIndex.value
  }
})

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
  <div class="visaa-container">
    <!-- Carousel View -->
    <div v-if="isCarouselMode" class="visaa-carousel">
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

      <div class="d-flex d-md-none justify-center mb-4">
        <v-chip-group v-model="carouselModel" mandatory class="question-dots">
          <v-chip
                  v-for="(question, index) in carouselQuestions"
                  :key="question.key"
                  :value="index"
                  size="x-small"
                  :color="index === currentQuestionIndex ? 'green' : (getCurrentValue(question.key) !== undefined ? 'success' : 'grey')"
                  @click="goToQuestion(index)">
            {{ index + 1 }}
          </v-chip>
        </v-chip-group>
      </div>

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
              <div v-if="currentQuestion.type === 'radio'" class="carousel-radio-group">
                <v-radio-group
                               :model-value="getCurrentValue(currentQuestion.key) as string | number | undefined"
                               :readonly="readonly"
                               @update:model-value="(value) => {
                                if (currentQuestion.key === 'q8_type') {
                                  handleQ8TypeChange(value as string | null)
                                } else {
                                  handleUpdate(currentQuestion.key, value as number)
                                }
                              }">
                  <v-radio
                           v-for="option in currentQuestion.options"
                           :key="String(option.value)"
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
              </div>

              <div v-else class="slider-container">
                <div class="slider-labels">
                  <span class="label-min">{{ currentQuestion.labelMin }}</span>
                  <span class="label-max">{{ currentQuestion.labelMax }}</span>
                </div>
                <v-slider
                          :model-value="getCurrentValue(currentQuestion.key) as number | undefined"
                          :readonly="readonly"
                          @update:model-value="(value) => handleUpdate(currentQuestion.key, value as number)"
                          :min="currentQuestion.min"
                          :max="currentQuestion.max"
                          :step="currentQuestion.step"
                          :show-ticks="currentQuestion.ticks ? 'always' : true"
                          :ticks="currentQuestion.ticks"
                          thumb-label="always"
                          color="primary"
                          track-color="grey-lighten-2"
                          class="slider-input">
                  <template v-if="currentQuestion.key === 'q1'" #thumb-label="{ modelValue }">
                    {{ 100 - (modelValue as number) }}
                  </template>
                </v-slider>
              </div>
            </v-card-text>

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

      <v-card class="d-none d-md-block mt-4" elevation="1">
        <v-card-title class="text-subtitle-1 py-2 bg-grey-lighten-4">{{ tGlobal('forms.carousel.allQuestions')
          }}</v-card-title>
        <v-list density="compact">
          <v-list-item
                       v-for="(question, index) in carouselQuestions"
                       :key="question.key"
                       :active="index === currentQuestionIndex"
                       @click="goToQuestion(index)"
                       class="cursor-pointer">
            <template #prepend>
              <v-avatar
                        size="24"
                        :color="index === currentQuestionIndex ? 'green' : (getCurrentValue(question.key) !== undefined ? 'success' : 'grey-lighten-2')">
                <v-icon v-if="getCurrentValue(question.key) !== undefined" size="16" color="white">
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
    </template>
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

/* Carousel styles */
.visaa-carousel {
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

  .visaa-carousel {
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
