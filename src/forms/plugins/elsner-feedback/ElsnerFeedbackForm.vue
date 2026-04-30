<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import ElsnerFeedbackChart from '@/components/forms/ElsnerFeedbackChart.vue'
import {
  calculatePostoperativeWeekFromSurgeryDate,
  calculateScore,
  getInitialData,
  getSection,
  normalizePoints,
  serializePoints,
  type ElsnerFeedbackPoint,
} from './scoring'
import { shouldShowElsnerTrendLine } from './utils'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormSubmissionData } from '../../types'

const props = withDefaults(defineProps<FormComponentProps>(), {
  readonly: false,
  locale: 'en',
})

const emit = defineEmits<FormComponentEvents>()
const userStore = useUserStore()

const localSection = ref(getSection(getInitialData()))
const localPoints = ref<ElsnerFeedbackPoint[]>([])

function t(key: string, fallback?: string): string {
  const locale = props.locale || 'en'
  return translations[locale]?.[key] || translations.en[key] || fallback || key
}

function syncFromModelValue() {
  const section = getSection(props.modelValue)
  localSection.value = section
  localPoints.value = normalizePoints(section.pointsJson)

  if (!localSection.value.surgeryDate && props.context?.surgeryDate) {
    localSection.value.surgeryDate = props.context.surgeryDate
  }

  if (section.currentWeek == null && typeof userStore.postopWeek === 'number') {
    localSection.value.currentWeek = userStore.postopWeek
  }

  if (localSection.value.currentWeek == null && localSection.value.surgeryDate) {
    localSection.value.currentWeek = calculatePostoperativeWeekFromSurgeryDate(localSection.value.surgeryDate)
  }

  // Fallback for patient-facing flows: if no postop week could be determined
  // from the session, default to week 1 so the patient sees a usable chart
  // instead of a warning. Clinician/staff users keep the explicit warning.
  if (localSection.value.currentWeek == null && !userStore.isAuthenticated()) {
    localSection.value.currentWeek = 1
  }

  if (localSection.value.selectedExpectation == null && localSection.value.currentWeek != null) {
    const existing = localPoints.value.find((point) => point.week === localSection.value.currentWeek)
    if (existing) {
      localSection.value.selectedExpectation = existing.expectation
    }
  }
}

function upsertPoint(points: ElsnerFeedbackPoint[], point: ElsnerFeedbackPoint): ElsnerFeedbackPoint[] {
  const withoutWeek = points.filter((entry) => entry.week !== point.week)
  return [...withoutWeek, point].sort((a, b) => a.week - b.week)
}

function emitSubmission() {
  const rawFormData = {
    elsnerFeedback: {
      currentWeek: localSection.value.currentWeek,
      selectedExpectation: localSection.value.selectedExpectation,
      pointsJson: serializePoints(localPoints.value),
    },
  }

  const scoring = calculateScore(rawFormData)
  const isComplete = localSection.value.currentWeek != null && localSection.value.selectedExpectation != null

  const payload: FormSubmissionData = {
    rawFormData,
    subscales: scoring.subscales,
    totalScore: null,
    fillStatus: isComplete ? 'complete' : 'incomplete',
    completedAt: isComplete ? new Date() : null,
    beginFill: null,
  }

  emit('update:modelValue', payload)
  emit('validation-change', true)
}

function setExpectation(expectation: number) {
  if (props.readonly || localSection.value.currentWeek == null) return

  const clamped = Math.max(0, Math.min(140, Math.round(expectation)))
  localSection.value.selectedExpectation = clamped
  localPoints.value = upsertPoint(localPoints.value, {
    week: localSection.value.currentWeek,
    expectation: clamped,
  })
  emitSubmission()
}

const currentWeek = computed(() => localSection.value.currentWeek)
const selectedExpectation = computed(() => localSection.value.selectedExpectation)
const showTrendLine = computed(() =>
  shouldShowElsnerTrendLine(userStore.isAuthenticated(), userStore.isKioskUser())
)

watch(
  () => props.modelValue,
  () => {
    syncFromModelValue()
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <div class="elsner-feedback-form">
    <h3 class="mb-3">{{ t('elsnerFeedback.title.description') }}</h3>
    <p class="hint mb-4">{{ t('elsnerFeedback.hint') }}</p>

    <v-alert
             v-if="currentWeek == null"
             type="warning"
             variant="tonal"
             class="mb-4">
      {{ t('elsnerFeedback.noWeek') }}
    </v-alert>

    <div class="meta mb-4">
      <strong>{{ t('elsnerFeedback.currentWeek') }}:</strong>
      <span>{{ currentWeek ?? '-' }}</span>
      <span class="mx-2">|</span>
      <strong>{{ t('elsnerFeedback.selectedExpectation') }}:</strong>
      <span>{{ selectedExpectation ?? '-' }}</span>
    </div>

    <ElsnerFeedbackChart
                         :points="localPoints"
                         :selected-week="currentWeek"
                         :selected-expectation="selectedExpectation"
                         :interactive="!readonly"
                         :show-trend-line="showTrendLine"
                         :x-axis-label="t('elsnerFeedback.xAxis')"
                         :y-axis-label="t('elsnerFeedback.yAxis')"
                         :better-area-label="t('elsnerFeedback.area.better')"
                         :worse-area-label="t('elsnerFeedback.area.worse')"
                         @select-expectation="setExpectation" />

    <v-slider
              v-if="!readonly"
              class="mt-4"
              :model-value="selectedExpectation ?? 0"
              :min="0"
              :max="140"
              :step="1"
              thumb-label="always"
              color="red"
              :disabled="currentWeek == null"
              @update:model-value="(value) => setExpectation(Number(value))" />
  </div>
</template>

<style scoped>
.elsner-feedback-form {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
}

.hint {
  color: #37474f;
  line-height: 1.4;
}

.meta {
  color: #263238;
}
</style>
