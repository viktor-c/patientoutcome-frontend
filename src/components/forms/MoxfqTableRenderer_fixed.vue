<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface MoxfqData {
  [key: string]: number | null
}

interface SubscaleScore {
  rawScore: number
  normalizedScore: number
  maxPossibleScore: number
  answeredQuestions: number
  totalQuestions: number
  completionRate: number
  isComplete: boolean
}

interface MoxfqScoring {
  subscales: {
    walkingStanding: SubscaleScore | null
    pain: SubscaleScore | null
    socialInteraction: SubscaleScore | null
  }
  total: SubscaleScore | null
  summary: {
    isComplete: boolean
    completionPercentage: number
    answeredQuestions: number
    totalQuestions: number
  }
}

// Props interface for JsonForms renderer
interface Props {
  data: {
    moxfq: MoxfqData
  }
  handleChange: (path: string, data: Record<string, unknown>) => void
  path: string
}

const props = defineProps<Props>()

const { t } = useI18n()

// Question data with titles and options
const questionsData = computed(() => [
  // Questions 1-14 - Standard Likert Scale
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
  // Question 15 - Pain severity
  { key: 'q15', title: t('moxfq.questions.q15'), options: 'painSeverity' as const },
  // Question 16 - Night pain
  { key: 'q16', title: t('moxfq.questions.q16'), options: 'nightPain' as const },
])

// Answer options for different scales
const answerOptions = {
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
  ],
}

// Get options for a question
const getQuestionOptions = (optionsType: keyof typeof answerOptions) => {
  return answerOptions[optionsType] || answerOptions.likert
}

// Helper function to update form data
const updateValue = (questionKey: string, value: number) => {
  console.log(`Updating ${questionKey} with value:`, value)
  console.log('Current data:', props.data)

  const newData = { ...props.data };
  if (!newData.moxfq) newData.moxfq = {};
  newData.moxfq = { ...newData.moxfq, [questionKey]: value };

  console.log('New data to emit:', newData)
  // Emit change event
  props.handleChange(props.path, newData);
}

// Get current value
const getCurrentValue = (questionKey: string): number | null => {
  return props.data.moxfq?.[questionKey] ?? null
}

// MOXFQ Scoring System
const moxfqScoring = computed((): MoxfqScoring => {
  const data = props.data.moxfq || {}

  // Define subscales according to MOXFQ standard
  const subscales = {
    walkingStanding: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'],
    pain: ['q9', 'q11', 'q12', 'q15'],
    socialInteraction: ['q10', 'q13', 'q14', 'q16']
  }

  // Calculate subscale scores
  const calculateSubscaleScore = (questionKeys: string[]) => {
    const validAnswers = questionKeys
      .map(key => data[key])
      .filter(value => value !== null && value !== undefined) as number[]

    if (validAnswers.length === 0) return null

    const rawScore = validAnswers.reduce((sum, value) => sum + value, 0)
    const maxPossibleScore = questionKeys.length * 4
    const completionRate = validAnswers.length / questionKeys.length

    // Convert to 0-100 scale: (rawScore / maxPossibleScore) * 100
    const normalizedScore = (rawScore / maxPossibleScore) * 100

    return {
      rawScore,
      normalizedScore: Math.round(normalizedScore * 10) / 10, // Round to 1 decimal
      maxPossibleScore,
      answeredQuestions: validAnswers.length,
      totalQuestions: questionKeys.length,
      completionRate: Math.round(completionRate * 100),
      isComplete: completionRate === 1
    }
  }

  // Calculate individual subscale scores
  const walkingStandingScore = calculateSubscaleScore(subscales.walkingStanding)
  const painScore = calculateSubscaleScore(subscales.pain)
  const socialInteractionScore = calculateSubscaleScore(subscales.socialInteraction)

  // Calculate total score
  const allQuestions = [...subscales.walkingStanding, ...subscales.pain, ...subscales.socialInteraction]
  const totalScore = calculateSubscaleScore(allQuestions)

  // Check if form is complete
  const isFormComplete = totalScore?.isComplete || false

  // Calculate overall completion percentage
  const overallCompletion = totalScore?.completionRate || 0

  return {
    subscales: {
      walkingStanding: walkingStandingScore,
      pain: painScore,
      socialInteraction: socialInteractionScore
    },
    total: totalScore,
    summary: {
      isComplete: isFormComplete,
      completionPercentage: overallCompletion,
      answeredQuestions: totalScore?.answeredQuestions || 0,
      totalQuestions: 16
    }
  }
})

const showIncomplete = ref(true)

// Interpretation guidelines (based on clinical literature)
const getScoreInterpretation = (normalizedScore: number | null) => {
  if (normalizedScore === null) return null

  if (normalizedScore <= 25) return { level: 'mild', color: 'success', text: t('moxfq.interpretation.mild') }
  if (normalizedScore <= 50) return { level: 'moderate', color: 'warning', text: t('moxfq.interpretation.moderate') }
  if (normalizedScore <= 75) return { level: 'severe', color: 'error', text: t('moxfq.interpretation.severe') }
  return { level: 'verySevere', color: 'error', text: t('moxfq.interpretation.verySevere') }
}

// Header options (use likert as default for header display)
const headerOptions = answerOptions.likert

// Scoring is automatically updated via computed property
</script>

<template>
  <div class="moxfq-table-container">
    <h3 class="mb-4">{{ t('moxfq.title') }}</h3>

    <!-- Scoring Section -->
    <v-card v-if="moxfqScoring.summary.answeredQuestions > 0" class="mt-6" variant="outlined">
      <v-card-title class="text-h6 bg-blue-grey-50">
        <v-icon start color="primary">mdi-calculator</v-icon>
        MOXFQ Score Analysis
      </v-card-title>

      <v-card-text>
        <!-- Overall Progress -->
        <div class="mb-4">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-subtitle-1 font-weight-medium">Overall Progress</span>
            <v-chip
                    :color="moxfqScoring.summary.isComplete ? 'success' : 'warning'"
                    size="small"
                    variant="flat">
              {{ moxfqScoring.summary.answeredQuestions }}/{{ moxfqScoring.summary.totalQuestions }} Questions
            </v-chip>
          </div>
          <v-progress-linear
                             :model-value="moxfqScoring.summary.completionPercentage"
                             :color="moxfqScoring.summary.isComplete ? 'success' : 'primary'"
                             height="8"
                             rounded />
        </div>

        <!-- Subscale Scores -->
        <v-row v-if="moxfqScoring.summary.isComplete">
          <v-col cols="12">
            <h4 class="text-subtitle-1 mb-3">Subscale Scores (0-100 scale)</h4>
          </v-col>

          <!-- Walking/Standing Score -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="h-100">
              <v-card-text class="text-center">
                <v-icon size="32" color="blue" class="mb-2">mdi-walk</v-icon>
                <div class="text-h6 font-weight-bold mb-1">Walking & Standing</div>
                <div v-if="moxfqScoring.subscales.walkingStanding" class="text-h4 font-weight-bold mb-2"
                     :class="getScoreInterpretation(moxfqScoring.subscales.walkingStanding.normalizedScore)?.color">
                  {{ moxfqScoring.subscales.walkingStanding.normalizedScore }}
                </div>
                <v-chip v-if="moxfqScoring.subscales.walkingStanding"
                        :color="getScoreInterpretation(moxfqScoring.subscales.walkingStanding.normalizedScore)?.color"
                        size="small"
                        variant="flat">
                  {{ getScoreInterpretation(moxfqScoring.subscales.walkingStanding.normalizedScore)?.text }}
                </v-chip>
                <div class="text-caption text-grey mt-2">
                  Raw Score: {{ moxfqScoring.subscales.walkingStanding?.rawScore }}/{{
                    moxfqScoring.subscales.walkingStanding?.maxPossibleScore }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Pain Score -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="h-100">
              <v-card-text class="text-center">
                <v-icon size="32" color="red" class="mb-2">mdi-emoticon-sad</v-icon>
                <div class="text-h6 font-weight-bold mb-1">Pain</div>
                <div v-if="moxfqScoring.subscales.pain" class="text-h4 font-weight-bold mb-2"
                     :class="getScoreInterpretation(moxfqScoring.subscales.pain.normalizedScore)?.color">
                  {{ moxfqScoring.subscales.pain.normalizedScore }}
                </div>
                <v-chip v-if="moxfqScoring.subscales.pain"
                        :color="getScoreInterpretation(moxfqScoring.subscales.pain.normalizedScore)?.color"
                        size="small"
                        variant="flat">
                  {{ getScoreInterpretation(moxfqScoring.subscales.pain.normalizedScore)?.text }}
                </v-chip>
                <div class="text-caption text-grey mt-2">
                  Raw Score: {{ moxfqScoring.subscales.pain?.rawScore }}/{{
                    moxfqScoring.subscales.pain?.maxPossibleScore }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Social Interaction Score -->
          <v-col cols="12" md="4">
            <v-card variant="outlined" class="h-100">
              <v-card-text class="text-center">
                <v-icon size="32" color="green" class="mb-2">mdi-account-group</v-icon>
                <div class="text-h6 font-weight-bold mb-1">Social Interaction</div>
                <div v-if="moxfqScoring.subscales.socialInteraction" class="text-h4 font-weight-bold mb-2"
                     :class="getScoreInterpretation(moxfqScoring.subscales.socialInteraction.normalizedScore)?.color">
                  {{ moxfqScoring.subscales.socialInteraction.normalizedScore }}
                </div>
                <v-chip v-if="moxfqScoring.subscales.socialInteraction"
                        :color="getScoreInterpretation(moxfqScoring.subscales.socialInteraction.normalizedScore)?.color"
                        size="small"
                        variant="flat">
                  {{ getScoreInterpretation(moxfqScoring.subscales.socialInteraction.normalizedScore)?.text }}
                </v-chip>
                <div class="text-caption text-grey mt-2">
                  Raw Score: {{ moxfqScoring.subscales.socialInteraction?.rawScore }}/{{
                    moxfqScoring.subscales.socialInteraction?.maxPossibleScore }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Total Score -->
        <v-row v-if="moxfqScoring.summary.isComplete" class="mt-4">
          <v-col cols="12">
            <v-card variant="outlined" color="primary">
              <v-card-text class="text-center">
                <div class="text-h6 font-weight-bold mb-2 text-white">Total MOXFQ Score</div>
                <div class="text-h3 font-weight-bold mb-2 text-white">
                  {{ moxfqScoring.total?.normalizedScore }}
                </div>
                <v-chip v-if="moxfqScoring.total"
                        :color="getScoreInterpretation(moxfqScoring.total.normalizedScore)?.color"
                        size="large"
                        variant="flat">
                  {{ getScoreInterpretation(moxfqScoring.total.normalizedScore)?.text }}
                </v-chip>
                <div class="text-caption text-blue-grey-100 mt-3">
                  Raw Total: {{ moxfqScoring.total?.rawScore }}/{{ moxfqScoring.total?.maxPossibleScore }} points
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Incomplete form message -->
        <v-alert v-if="!moxfqScoring.summary.isComplete && showIncomplete"
                 type="info"
                 variant="tonal"
                 class="mt-4">
          <div class="d-flex align-center justify-space-between" style="width:100%">
            <div>
              <strong>Complete all questions to see detailed scoring analysis.</strong><br>
              {{ moxfqScoring.summary.answeredQuestions }} of {{ moxfqScoring.summary.totalQuestions }} questions
              answered.
            </div>
            <v-btn icon variant="text" aria-label="Close notification" @click="showIncomplete = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-alert>
      </v-card-text>
    </v-card>
    <div class="mt-4 text-caption text-grey">
      <h2><strong>Instructions:</strong> Please select one answer for each question by clicking the appropriate radio
        button.</h2>
      <h3><strong>Note:</strong> Questions 15 and 16 have different answer scales as shown in their respective rows.
      </h3>
    </div>
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
              v-for="(option, index) in headerOptions"
              :key="index"
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
            <div class="question-text">
              {{ question.title }}
            </div>
          </td>
          <td
              v-for="(option, optionIndex) in getQuestionOptions(question.options)"
              :key="optionIndex"
              class="answer-cell text-center">
            <v-radio-group
                           :model-value="getCurrentValue(question.key)"
                           @update:model-value="(value: unknown) => updateValue(question.key, value as number)"
                           class="answer-radio-group"
                           hide-details>
              <v-radio
                       :value="option.value"
                       color="primary"
                       density="compact" />
            </v-radio-group>
          </td>
        </tr>

        <!-- Special questions 15-16 with individual cell answers -->
        <tr
            v-for="(question, questionIndex) in questionsData.slice(14)"
            :key="question.key"
            class="question-row special-question">
          <td class="number-cell text-center">
            {{ questionIndex + 15 }}
          </td>
          <td class="question-cell">
            <div class="question-text">
              {{ question.title }}
            </div>
          </td>
          <td
              v-for="(option, optionIndex) in getQuestionOptions(question.options)"
              :key="optionIndex"
              class="answer-cell-special text-center">
            <div class="special-answer-container">
              <v-radio-group
                             :model-value="getCurrentValue(question.key)"
                             @update:model-value="(value: unknown) => updateValue(question.key, value as number)"
                             class="answer-radio-group"
                             hide-details>
                <v-radio
                         :value="option.value"
                         color="primary"
                         density="compact" />
              </v-radio-group>
              <div class="answer-value-special">({{ option.value }})</div>
              <div class="answer-caption">{{ option.label }}</div>
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>


  </div>
</template>

<style scoped>
.moxfq-table-container {
  width: 100%;
  padding: 16px;
}

.moxfq-table {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  max-height: 80vh;
  overflow-y: auto;
  /* Ensure horizontal scrolling is smooth on touch devices */
  -webkit-overflow-scrolling: touch;
}

.number-column {
  width: 60px;
  min-width: 60px;
  padding: 12px 8px !important;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  position: sticky;
  left: 0;
  z-index: 1;
  font-weight: bold;
}

.question-column {
  width: 50%;
  min-width: 300px;
  padding: 12px 16px !important;
  background-color: #f5f5f5;
  border-right: 2px solid #ddd;
  position: sticky;
  left: 60px;
  z-index: 1;
}

.answer-column {
  width: 10%;
  min-width: 100px;
  padding: 8px 4px !important;
  background-color: #f9f9f9;
  border-right: 1px solid #eee;
}

.answer-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
}

.answer-value {
  font-weight: bold;
  font-size: 14px;
  color: #1976d2;
}

.answer-label {
  font-size: 11px;
  text-align: center;
  line-height: 1.2;
  word-wrap: break-word;
  max-width: 90px;
  hyphens: auto;
}

.question-row {
  border-bottom: 1px solid #eee;
}

.question-row:nth-child(even) {
  background-color: #fafafa;
}

.question-row:hover {
  background-color: #f0f8ff;
}

.question-row:nth-child(15),
.question-row:nth-child(16) {
  background-color: #fff3e0 !important;
}

.question-row:nth-child(15):hover,
.question-row:nth-child(16):hover {
  background-color: #ffe0b3 !important;
}

.number-cell {
  padding: 12px 8px !important;
  vertical-align: middle;
  border-right: 1px solid #ddd;
  position: sticky;
  left: 0;
  background-color: inherit;
  /* z-index: 2; */
  font-weight: bold;
  color: #1976d2;
}

.question-cell {
  padding: 12px 16px !important;
  vertical-align: middle;
  border-right: 2px solid #ddd;
  position: sticky;
  left: 60px;
  background-color: inherit;
  z-index: 1;
}

.question-text {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  font-weight: 500;
}

.answer-cell {
  padding: 8px 4px !important;
  vertical-align: middle;
  border-right: 1px solid #eee;
}

.answer-cell:last-child {
  border-right: none;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .number-column {
    width: 50px;
    min-width: 50px;
  }

  .question-column {
    min-width: 220px;
    left: 50px;
  }

  .question-cell {
    left: 50px;
  }

  .answer-column {
    min-width: 75px;
  }

  .answer-cell-special {
    min-width: 75px;
  }

  .answer-label {
    font-size: 10px;
    max-width: 70px;
  }

  .answer-caption {
    font-size: 11px;
    max-width: 70px;
  }
}

@media (max-width: 768px) {
  .moxfq-table-container {
    padding: 8px;
  }

  .moxfq-table {
    /* Ensure table can scroll horizontally if needed */
    overflow-x: auto;
    /* Set minimum width to ensure all 5 answer columns are always visible */
    min-width: 700px;
  }

  .number-column {
    width: 35px;
    min-width: 35px;
    padding: 6px 2px !important;
  }

  .number-cell {
    padding: 6px 2px !important;
  }

  .question-column {
    min-width: 180px;
    left: 35px;
    padding: 8px 12px !important;
  }

  .question-cell {
    left: 35px;
    padding: 8px 12px !important;
  }

  .answer-column {
    min-width: 58px;
    width: 58px;
  }

  .answer-cell {
    min-width: 58px;
    width: 58px;
  }

  .answer-cell-special {
    min-width: 58px;
    width: 58px;
  }

  .answer-label {
    font-size: 8px;
    max-width: 50px;
    line-height: 1.1;
  }

  .answer-caption {
    font-size: 9px;
    max-width: 50px;
    line-height: 1.1;
  }

  .special-answer-container {
    min-height: 55px;
    padding: 2px;
  }

  .answer-value {
    font-size: 12px;
  }

  .answer-value-special {
    font-size: 12px;
  }
}

/* Extra responsive handling for very narrow screens like phones in portrait */
@media (max-width: 480px) {
  .moxfq-table {
    /* Force minimum width to ensure all 5 columns are always visible */
    min-width: 650px;
  }

  .question-column {
    min-width: 160px;
  }

  .answer-column {
    min-width: 55px;
    width: 55px;
  }

  .answer-cell {
    min-width: 55px;
    width: 55px;
  }

  .answer-cell-special {
    min-width: 55px;
    width: 55px;
  }
}

/* Radio button styling */
.answer-radio-group {
  display: flex;
  justify-content: center;
  align-items: center;
}

.answer-radio-group :deep(.v-radio-group__input) {
  display: flex;
  justify-content: center;
}

.v-radio {
  justify-content: center;
}

:deep(.v-selection-control) {
  min-height: auto;
}

:deep(.v-selection-control__wrapper) {
  height: auto;
}

/* Special questions styling */
.special-question {
  background-color: #fff3e0 !important;
}

.special-question:hover {
  background-color: #ffe0b3 !important;
}

.answer-cell-special {
  padding: 8px 4px !important;
  vertical-align: middle;
  border-right: 1px solid #eee;
  width: 10%;
  min-width: 100px;
}

.answer-cell-special:last-child {
  border-right: none;
}

.special-answer-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
  min-height: 80px;
}

.answer-value-special {
  font-weight: bold;
  font-size: 14px;
  color: #1976d2;
  margin-top: 4px;
}

.answer-caption {
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
  word-wrap: break-word;
  max-width: 90px;
  hyphens: auto;
  color: #666;
  margin-top: 2px;
}

/* Highlight special questions */
.question-row:nth-child(15) .question-text::before,
.question-row:nth-child(16) .question-text::before {
  content: "⚠ ";
  color: #ff9800;
  font-weight: bold;
}

/* Scoring section styles */
.scoring-container {
  border-radius: 8px;
  background-color: #f8f9fa;
}

.score-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.score-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.text-success {
  color: #4caf50 !important;
}

.text-warning {
  color: #ff9800 !important;
}

.text-error {
  color: #f44336 !important;
}
</style>
