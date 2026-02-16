/**
 * Shared Form Composable
 * 
 * Provides common functionality for all form components:
 * - Data management with v-model
 * - Score calculation with debouncing
 * - Validation tracking
 * - Translation helper
 */

import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { FormData, FormSubmissionData } from '../types'
import type { ScoringData } from '@/types/backend/scoring'

export interface UseFormOptions {
  /**
   * Current form data (v-model)
   */
  modelValue: Ref<FormData>

  /**
   * Scoring calculation function
   */
  calculateScore: (data: FormData) => ScoringData

  /**
   * Optional validation function
   */
  validate?: (data: FormData) => boolean

  /**
   * Translations for the current form
   */
  translations: Record<string, Record<string, string>>

  /**
   * Current locale
   */
  locale: Ref<string>

  /**
   * Emit function from component
   */
  emit: (event: string, ...args: unknown[]) => void
}

export function useForm(options: UseFormOptions) {
  const {
    modelValue,
    calculateScore,
    validate,
    translations,
    locale,
    emit
  } = options

  // Local copy of form data for editing
  const localData = ref<FormData>({ ...modelValue.value })

  // Current scoring data
  const scoring = ref<ScoringData | null>(null)

  // Validation state
  const isValid = ref(true)

  // Track previous data to detect changes
  let previousDataString = JSON.stringify(localData.value)

  /**
   * Check if form is complete based on scoring data
   * Uses the scoring plugin's isComplete logic which handles conditional fields correctly
   */
  function isFormComplete(): boolean {
    // Use scoring data if available - it handles conditional fields correctly
    if (scoring.value?.totalScore?.isComplete !== undefined) {
      return scoring.value.totalScore.isComplete
    }
    
    // Fallback: check if all values are filled (works for simple forms without conditional fields)
    for (const section of Object.values(localData.value)) {
      if (typeof section === 'object' && section !== null) {
        for (const value of Object.values(section)) {
          if (value === null || value === '') {
            return false
          }
        }
      }
    }
    return true
  }

  /**
   * Create submission data combining raw data, scoring, and completion status
   * This structure is emitted to parent components and eventually sent to the backend
   * 
   * FormSubmissionData (PatientFormData) structure:
   * - rawFormData: The raw form answers (FormQuestions)
   * - subscales: Calculated subscale scores
   * - totalScore: Calculated total score
   * - fillStatus: "draft" | "incomplete" | "complete"
   * - completedAt: Timestamp when form was completed (if complete)
   * - beginFill: Will be set by PluginFormRenderer (not set here)
   */
  function createSubmissionData(): FormSubmissionData {
    const isComplete = isFormComplete()
    const currentScoring = scoring.value || { rawFormData: {}, totalScore: null, subscales: {} }
    
    return {
      rawFormData: localData.value,
      subscales: currentScoring.subscales,
      totalScore: currentScoring.totalScore,
      fillStatus: isComplete ? 'complete' : (Object.keys(localData.value).length > 0 ? 'incomplete' : 'draft'),
      completedAt: isComplete ? new Date() : null,
      beginFill: null // Will be set by PluginFormRenderer
    }
  }

  /**
   * Update a question value
   */
  function updateQuestion(section: string, question: string, value: number | string | null) {
    if (!localData.value[section]) {
      localData.value[section] = {}
    }
    localData.value[section][question] = value

    // Check if data actually changed
    const newDataString = JSON.stringify(localData.value)
    const dataChanged = newDataString !== previousDataString

    if (dataChanged) {
      previousDataString = newDataString

      // Recalculate scoring BEFORE emitting to ensure emission has fresh data
      recalculateScore()

      // Emit changes with fresh scoring data
      emit('update:modelValue', createSubmissionData())

      // Revalidate
      if (validate) {
        isValid.value = validate(localData.value)
        emit('validation-change', isValid.value)
      }
    }
  }

  /**
   * Get a question value
   */
  function getQuestion(section: string, question: string): number | string | null {
    return localData.value[section]?.[question] ?? null
  }

  /**
   * Recalculate scoring
   */
  function recalculateScore() {
    try {
      scoring.value = calculateScore(localData.value)
    } catch (error) {
      console.error('[useForm] Error calculating score:', error)
      scoring.value = null
    }
  }

  /**
   * Get translated text
   */
  function t(key: string, fallback?: string): string {
    const currentLocale = locale.value || 'en'
    const localeTranslations = translations[currentLocale] || translations['en'] || {}
    return localeTranslations[key] || fallback || key
  }

  /**
   * Reset form to initial state
   */
  function reset() {
    localData.value = { ...modelValue.value }
    previousDataString = JSON.stringify(localData.value)
    recalculateScore()
  }

  // Watch for external changes to modelValue
  watch(
    () => modelValue.value,
    (newValue) => {
      localData.value = { ...newValue }
      previousDataString = JSON.stringify(localData.value)
      recalculateScore()
    },
    { deep: true }
  )

  // Initial score calculation
  recalculateScore()
  if (validate) {
    isValid.value = validate(localData.value)
  }

  return {
    localData,
    scoring: computed(() => scoring.value),
    isValid: computed(() => isValid.value),
    updateQuestion,
    getQuestion,
    recalculateScore,
    t,
    reset
  }
}
