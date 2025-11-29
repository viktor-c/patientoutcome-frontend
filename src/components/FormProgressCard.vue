<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ScoringData } from '@/types'

interface Props {
  scoring?: ScoringData
  title?: string
  showSubmitButton?: boolean
}

interface Emits {
  (e: 'submit'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Form Progress',
  showSubmitButton: false
})

const emit = defineEmits<Emits>()

const { t } = useI18n()

// Interpretation guidelines (based on clinical literature)
const getScoreInterpretation = (normalizedScore: number | null) => {
  if (normalizedScore === null) return null

  if (normalizedScore <= 25) return { level: 'mild', color: 'success', text: t('forms.scoring.interpretation.mild') }
  if (normalizedScore <= 50) return { level: 'moderate', color: 'warning', text: t('forms.scoring.interpretation.moderate') }
  if (normalizedScore <= 75) return { level: 'severe', color: 'error', text: t('forms.scoring.interpretation.severe') }
  return { level: 'verySevere', color: 'error', text: t('forms.scoring.interpretation.verySevere') }
}

const hasScoring = computed(() => {
  if (!props.scoring || !props.scoring.total) return false
  return props.scoring && props.scoring.total?.answeredQuestions > 0
})

const isComplete = computed(() => {
  if (!props.scoring || !props.scoring.total) return false
  return props.scoring?.total.isComplete || false
})

const showIncomplete = ref(true)

const showScoring = computed(() => {
  if (!props.scoring || !props.scoring.total) return false
  return hasScoring.value && props.scoring!.total.answeredQuestions > 0
})
</script>

<template>
  <v-card v-if="showScoring" class="mt-6" variant="outlined">
    <v-card-title class="text-h6 bg-blue-grey-50">
      <v-icon start color="primary">mdi-calculator</v-icon>
      {{ title }}
    </v-card-title>

    <v-card-text>
      <!-- Overall Progress -->
      <div class="mb-4">
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-subtitle-1 font-weight-medium">{{ t('forms.scoring.overallProgress') }}</span>
          <v-chip
                  :color="isComplete ? 'success' : 'warning'"
                  size="small"
                  variant="flat">
            {{ scoring!.total?.answeredQuestions }}/{{ scoring!.total?.totalQuestions }}
            {{ t('forms.scoring.questions') }}
          </v-chip>
        </div>
        <v-progress-linear
                           :model-value="scoring!.total?.completionPercentage"
                           :color="isComplete ? 'success' : 'primary'"
                           height="8"
                           rounded />
      </div>

      <!-- Subscale Scores (if available and complete) -->
      <div v-if="isComplete && scoring!.subscales">
        <h4 class="text-subtitle-1 mb-3">{{ t('forms.scoring.subscaleScores') }}</h4>

        <v-row>
          <v-col
                 v-for="(subscale, key) in scoring!.subscales"
                 :key="key"
                 cols="12"
                 :md="Object.keys(scoring!.subscales).length <= 3 ? 4 : 6">
            <v-card v-if="subscale" variant="outlined" class="h-100">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold mb-1">{{ t(`forms.scoring.subscales.${key}`) }}</div>
                <div class="text-h4 font-weight-bold mb-2"
                     :class="`text-${getScoreInterpretation(subscale.normalizedScore)?.color}`">
                  {{ subscale.normalizedScore }}
                </div>
                <v-chip
                        :color="getScoreInterpretation(subscale.normalizedScore)?.color"
                        size="small"
                        variant="flat">
                  {{ getScoreInterpretation(subscale.normalizedScore)?.text }}
                </v-chip>
                <div class="text-caption text-grey mt-2">
                  {{ t('forms.scoring.rawScore') }}: {{ subscale.rawScore }}/{{ subscale.maxPossibleScore }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Total Score -->
      <v-row v-if="isComplete && scoring!.total" class="mt-4">
        <v-col cols="12">
          <v-card variant="outlined" color="primary">
            <v-card-text class="text-center">
              <div class="text-h6 font-weight-bold mb-2 text-white">{{ t('forms.scoring.totalScore') }}</div>
              <div class="text-h3 font-weight-bold mb-2 text-white">
                {{ scoring!.total.normalizedScore }}
              </div>
              <v-chip
                      :color="getScoreInterpretation(scoring!.total.normalizedScore)?.color"
                      size="small"
                      variant="outlined"
                      class="text-white border-white">
                {{ getScoreInterpretation(scoring!.total.normalizedScore)?.text }}
              </v-chip>
              <div class="text-caption text-blue-grey-100 mt-3">
                {{ t('forms.scoring.rawScore') }}: {{ scoring!.total.rawScore }}/{{ scoring!.total.maxPossibleScore }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Submit Button -->
      <div v-if="isComplete && showSubmitButton" class="text-center mt-4">
        <v-btn
               color="success"
               size="large"
               variant="elevated"
               @click="emit('submit')">
          <v-icon start>mdi-check-circle</v-icon>
          {{ t('forms.submitCompletedForm') }}
        </v-btn>
      </div>

      <!-- Incomplete form message -->
      <v-alert v-if="!isComplete && showIncomplete"
               type="info"
               variant="tonal"
               class="mt-4">
        <div class="d-flex align-center justify-space-between" style="width:100%">
          <div>
            <strong>{{ t('forms.scoring.completeAllQuestions') }}</strong><br>
            {{ scoring!.total?.answeredQuestions }} {{ t('forms.scoring.of') }} {{ scoring!.total?.totalQuestions }} {{
              t('forms.scoring.questionsAnswered') }}.
          </div>
          <v-btn icon variant="text" aria-label="Close notification" @click="showIncomplete = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.score-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.score-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
