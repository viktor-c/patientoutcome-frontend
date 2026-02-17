<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ScoreScale from '@/components/ScoreScale.vue'
import { generateScaleInfo } from '@/utils/scaleInfo'

import type { ScoringData } from '@/types'

interface Props {
  scoring?: ScoringData
  title?: string
  showSubmitButton?: boolean
  formTemplateId?: string
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

  if (normalizedScore <= 25) return { level: 'mild', color: 'success', text: t('forms.subscales.interpretation.mild') }
  if (normalizedScore <= 50) return { level: 'moderate', color: 'warning', text: t('forms.subscales.interpretation.moderate') }
  if (normalizedScore <= 75) return { level: 'severe', color: 'error', text: t('forms.subscales.interpretation.severe') }
  return { level: 'verySevere', color: 'error', text: t('forms.subscales.interpretation.verySevere') }
}

const hasScoring = computed(() => {
  if (!props.scoring || !props.scoring.totalScore) return false
  return props.scoring && (props.scoring.totalScore?.answeredQuestions ?? 0) > 0
})

const isComplete = computed(() => {
  if (!props.scoring || !props.scoring.totalScore) return false
  return props.scoring?.totalScore.isComplete || false
})

const showIncomplete = ref(true)

const showScoring = computed(() => {
  if (!props.scoring || !props.scoring.totalScore) return false
  return hasScoring.value && (props.scoring!.totalScore.answeredQuestions ?? 0) > 0
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
          <span class="text-subtitle-1 font-weight-medium">{{ t('forms.subscales.overallProgress') }}</span>
          <v-chip
                  :color="isComplete ? 'success' : 'warning'"
                  size="small"
                  variant="flat">
            {{ scoring!.totalScore?.answeredQuestions }}/{{ scoring!.totalScore?.totalQuestions }}
            {{ t('forms.subscales.questions') }}
          </v-chip>
        </div>
        <v-progress-linear
                           :model-value="scoring!.totalScore?.completionPercentage"
                           :color="isComplete ? 'success' : 'primary'"
                           height="8"
                           rounded />
      </div>

      <!-- Subscale Scores (if available and complete) -->
      <div v-if="isComplete && scoring!.subscales">
        <h4 class="text-subtitle-1 mb-3">{{ t('forms.subscales.subscaleScores') }}</h4>

        <v-row>
          <v-col
                 v-for="(subscale, key) in scoring!.subscales"
                 :key="key"
                 cols="12"
                 :md="Object.keys(scoring!.subscales).length <= 3 ? 4 : 6">
            <v-card v-if="subscale" variant="outlined" class="h-100">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold mb-1">{{ t(`forms.subscales.subscales.${key}`) }}</div>
                <div class="text-h4 font-weight-bold mb-2"
                     :class="`text-${getScoreInterpretation(subscale.normalizedScore ?? null)?.color}`">
                  {{ subscale.normalizedScore }}
                </div>
                <v-chip
                        :color="getScoreInterpretation(subscale.normalizedScore ?? null)?.color"
                        size="small"
                        variant="flat">
                  {{ getScoreInterpretation(subscale.normalizedScore ?? null)?.text }}
                </v-chip>
                <div class="text-caption text-grey mt-2">
                  {{ t('forms.subscales.rawScore') }}: {{ subscale.rawScore }}/{{ subscale.maxScore }}
                </div>
                <!-- Visual scale for subscale -->
                <div v-if="formTemplateId" class="mt-3 px-2">
                  <ScoreScale :scale-info="generateScaleInfo(subscale, formTemplateId, String(key))" :height="6" />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Total Score -->
      <v-row v-if="isComplete && scoring!.totalScore" class="mt-4">
        <v-col cols="12">
          <v-card variant="outlined" color="primary">
            <v-card-text class="text-center">
              <div class="text-h6 font-weight-bold mb-2 text-white">{{ t('forms.subscales.totalScore') }}</div>
              <div class="text-h3 font-weight-bold mb-2 text-white">
                {{ scoring!.totalScore.normalizedScore }}
              </div>
              <v-chip
                      :color="getScoreInterpretation(scoring!.totalScore.normalizedScore ?? null)?.color"
                      size="small"
                      variant="outlined"
                      class="text-white border-white">
                {{ getScoreInterpretation(scoring!.totalScore.normalizedScore ?? null)?.text }}
              </v-chip>
              <!-- Visual scale for total score -->
              <div v-if="formTemplateId" class="mt-4 px-4">
                <ScoreScale :scale-info="generateScaleInfo(scoring!.totalScore, formTemplateId)" :height="8" />
              </div>
              <div class="text-caption text-blue-grey-100 mt-3">
                {{ t('forms.subscales.rawScore') }}: {{ scoring!.totalScore.rawScore }}/{{ scoring!.totalScore.maxScore }}
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
            <strong>{{ t('forms.subscales.completeAllQuestions') }}</strong><br>
            {{ scoring!.totalScore?.answeredQuestions }} {{ t('forms.subscales.of') }} {{ scoring!.totalScore?.totalQuestions }} {{
              t('forms.subscales.questionsAnswered') }}.
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
