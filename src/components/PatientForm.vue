<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { JsonForms, type JsonFormsChangeEvent } from '@jsonforms/vue'
import { INIT, UPDATE_DATA, type JsonSchema, type UISchemaElement } from '@jsonforms/core'
import { extendedVuetifyRenderers } from '@jsonforms/vue-vuetify'
import { markRaw } from 'vue'
import markdownit from 'markdown-it'
import { type FormData } from '@/types'
import { useNotifierStore } from '@/stores/notifierStore'
import type { ErrorObject } from 'ajv'

import { useI18n } from 'vue-i18n'

import { entry as EfasQuestionSliderControlRenderer } from './forms/EfasQuestionSliderControlRenderer.entry'
import { entry as AofasControlRenderer } from './forms/AofasControlRenderer.entry'
import { entry as MoxfqTableRenderer } from './forms/MoxfqTableRenderer.entry'
import { entry as VASControlRenderer } from './forms/VASControlRenderer.entry'
import { entry as VisaaControlRenderer } from './forms/VisaaControlRenderer.entry'

import type { ScoringData } from '@/types'

// API client
import { ResponseError } from '@/api'
import { formApi } from "@/api.ts"
const componentName = 'PatientForm.vue'

const notifierStore = useNotifierStore()

const { t } = useI18n()

const renderers = markRaw([
  ...extendedVuetifyRenderers,
  // custom renderers
  EfasQuestionSliderControlRenderer,
  AofasControlRenderer,
  MoxfqTableRenderer,
  VASControlRenderer,
  VisaaControlRenderer,
  // additional custom renderers can be added here in form of plugins
  // which can then be dynamically imported based on form type
])

// console.debug('🟡 PatientForm: Renderers array created with:', renderers.length, 'renderers')
// console.debug('🟡 PatientForm: AOFAS renderer details:', AofasControlRenderer)

const md = markdownit({
  html: true,
  linkify: false,
  typographer: true,
  breaks: true,
})

const props = defineProps<{
  markdownHeader: string
  markdownFooter: string
  formSchema: JsonSchema
  formSchemaUI: UISchemaElement
  formData: FormData
  formId: string
  formArrayIdx: number
  translations?: Record<string, Record<string, unknown>>
  completionTimeSeconds?: number
  formStartTime?: string
}>()

const emit = defineEmits<{
  formDataChange: [formData: FormData]
  scoringDataChange: [scoring: ScoringData | null]
  formCompletionChange: [isComplete: boolean]
  submitForm: []
  gotoPreviousForm: []
  gotoNextForm: []
}>()

// NOTE: header/footer will be rendered from translations via the JSONForms translator
// (computed below after the translator is initialized)

const formData = ref<FormData>(props.formData ? props.formData : {})

// Form timing
const formStartTimeRef = ref<Date>()
const formEndTime = ref<Date>()
const completionTimeSeconds = ref<number | undefined>(props.completionTimeSeconds ?? undefined)
let sessionStartTime: Date | undefined = undefined

// Form scoring state
const formScoring = ref<ScoringData>({} as ScoringData)

// Computed property for form completion
const isFormComplete = computed(() => {
  // First check if scoring data has completion status
  if (formScoring.value?.total?.isComplete !== undefined) {
    return formScoring.value.total.isComplete
  }
  // Fallback to question stats - form is complete if no unanswered questions
  return questionStats.value.unanswered === 0 && questionStats.value.total > 0
})

// Count answered and unanswered questions
const questionStats = computed(() => {
  let answered = 0
  let unanswered = 0
  
  // Helper function to check if a value is considered "answered"
  const isAnswered = (answer: unknown): boolean => {
    // Explicitly handle 0 as a valid answer (important for scales that include 0)
    if (answer === 0) return true
    if (answer === null || answer === undefined) return false
    if (typeof answer === 'string' && answer === '') return false
    // For numbers, only reject NaN
    if (typeof answer === 'number' && isNaN(answer)) return false
    return true
  }
  
  // Helper to recursively count questions in nested structures
  const countInData = (data: Record<string, unknown>, prefix = ''): { answered: number; unanswered: number } => {
    let localAnswered = 0
    let localUnanswered = 0
    
    for (const [key, value] of Object.entries(data)) {
      // Skip metadata fields
      if (key === 'subscales' || key === 'total' || key === 'rawData') continue
      
      // Skip type indicators (like q8_type in VISA-A)
      if (key.endsWith('_type')) continue
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - recurse
        const nested = countInData(value as Record<string, unknown>, prefix + key + '.')
        localAnswered += nested.answered
        localUnanswered += nested.unanswered
      } else {
        // Leaf value - check if answered
        if (isAnswered(value)) {
          localAnswered++
        } else {
          localUnanswered++
        }
      }
    }
    
    return { answered: localAnswered, unanswered: localUnanswered }
  }
  
  // Get all question keys from the schema to know total count
  const allQuestionKeys: string[] = []
  
  if (props.formSchema?.properties) {
    const extractKeys = (properties: Record<string, unknown>, prefix = '') => {
      for (const [key, value] of Object.entries(properties)) {
        // Skip metadata fields
        if (key === 'subscales' || key === 'total' || key === 'rawData') continue
        
        const propValue = value as { properties?: Record<string, unknown>; type?: string }
        if (propValue.properties) {
          // Nested structure: recurse
          extractKeys(propValue.properties, prefix + key + '.')
        } else if (propValue.type === 'number' || propValue.type === 'integer' || propValue.type === 'string') {
          // Leaf property that's a question
          allQuestionKeys.push(prefix + key)
        }
      }
    }
    
    extractKeys(props.formSchema.properties)
  }
  
  // Count from actual data
  const counts = countInData(formData.value)
  answered = counts.answered
  unanswered = counts.unanswered
  
  // If we have a total from schema and it's larger, use that to ensure we show all questions
  const schemaTotal = allQuestionKeys.length
  if (schemaTotal > answered + unanswered) {
    unanswered = schemaTotal - answered
  }
  
  return { answered, unanswered, total: answered + unanswered }
})

// Initialize form start time and session start time
onMounted(() => {
  // If the form already has a completionTimeSeconds, we are in a new session (revisit)
  formStartTimeRef.value = props.formStartTime ? new Date(props.formStartTime) : undefined
  sessionStartTime = new Date()
})

// Calculate completion time for this session
const calculateSessionCompletionTime = () => {
  if (sessionStartTime && formEndTime.value) {
    const diffMs = formEndTime.value.getTime() - sessionStartTime.getTime()
    return Math.round(diffMs / 1000)
  }
  return 0
}

import Ajv from 'ajv'
const ajv = new Ajv({ allErrors: true, verbose: true, strict: false })

const onChange = (event: JsonFormsChangeEvent) => {
  console.debug(`${componentName}: Form data changed:`, event.data)

  if (event.data.rawData) {
    console.debug(`${componentName}: Received ScoringData from renderer:`, event.data)
    formScoring.value = event.data as ScoringData
    formData.value = formScoring.value.rawData as FormData
  }
  else {
    console.debug(`${componentName}: rawData NOT present in event.data, using event.data as formData`)
    formData.value = event.data as FormData
    // If no scoring data, clear it
    formScoring.value = {} as ScoringData
  }

  const validate = ajv.compile(props.formSchema)
  const isValid = validate(formData.value)
  if (!isValid) {
    console.error(`${componentName} Validation errors:`, validate.errors)
    event.errors = []
  } else {
    console.log('Form data is valid')
  }
  
  // Always emit the updated form data to the parent component
  emit('formDataChange', formData.value)
  emit('scoringDataChange', formScoring.value)
  emit('formCompletionChange', isFormComplete.value)

  // If form is complete for the first time, record end time
  if (isFormComplete.value && !formEndTime.value) {
    formEndTime.value = new Date()
  }
}

const errors = ref<Array<ErrorObject>>([])

const validateActivity = (data: FormData) => {
  const newErrors: ErrorObject[] = []
  //for each object in data, check all the properties. If the property is null, set an error
  for (const [questionnaireName, answerValues] of Object.entries(data)) {
    for (const [question, answer] of Object.entries(answerValues)) {
      if (answer === null || answer === undefined || (typeof answer === 'string' && answer === '')) {
        console.debug(`Validation error for ${questionnaireName}/${question}: Answer is null or empty`)
        newErrors.push({
          instancePath: `/${questionnaireName}/${question}`,
          message: `${question} muss geantwortet werden`,
          schemaPath: `#/properties/${questionnaireName}/properties/${question}/type`,
          keyword: 'required',
          params: {}
        })
      }
    }
  }
  console.debug(`${componentName}Middleware validateActivity: Validation errors found ${newErrors}`)
  return newErrors
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const customValidateMiddleware = (state: any, action: any, defaultReducer: any) => {
  const newState = defaultReducer(state, action)
  switch (action.type) {
    case INIT:
      return state
    case UPDATE_DATA: {
      console.debug(`${componentName} customValidateMiddleware: UPDATE_DATA action received`)
      formData.value = newState.data
      validateActivity(newState.data)
      return state
    }
    default:
      return newState
  }
}

// Save the form and emit an event after save (for navigation)
const handleSubmit = async (afterSave?: () => void) => {
  const incompleteFields = []
  for (const [, answerValues] of Object.entries(formData.value)) {
    for (const [question, answer] of Object.entries(answerValues)) {
      if (answer === null || answer === undefined || (typeof answer === 'string' && answer === '')) {
        incompleteFields.push(question)
      }
    }
  }
  if (incompleteFields.length > 0) {
    console.debug('Form is incomplete. Missing fields:', incompleteFields)
    notifierStore.notify('Das Formular ist unvollständig. Bitte füllen Sie alle erforderlichen Felder aus.', 'error')
    console.debug(`${componentName}: Form submitted, unfilled fields found:`, incompleteFields)
  } else {
    console.debug(`${componentName}: Form submitted successfully with data:`, formData.value)
    notifierStore.notify('Das Formular wurde erfolgreich ausgefüllt.', 'success')
  }
  try {
    // Always set end time to now for this session
    formEndTime.value = new Date()

    // Calculate session time
    const sessionSeconds = calculateSessionCompletionTime()

    // If no previous completionTimeSeconds, set it to this session's time
    // Otherwise, add this session's time to the previous value
    if (completionTimeSeconds.value == null || isNaN(completionTimeSeconds.value)) {
      completionTimeSeconds.value = sessionSeconds
    } else {
      completionTimeSeconds.value += sessionSeconds
    }

    // Debug: Log the data being sent
    const updatePayload = {
      formId: props.formId,
      updateFormRequest: {
        formData: formData.value,
        completionTimeSeconds: completionTimeSeconds.value,
        formStartTime: formStartTimeRef.value ? formStartTimeRef.value.toISOString() : undefined,
        formEndTime: formEndTime.value ? formEndTime.value.toISOString() : undefined,
        scoring: formScoring.value || undefined
      }
    }
    console.log('=== PatientForm FRONTEND: Data being sent to API ===')
    console.log('Full payload:', JSON.stringify(updatePayload, null, 2))
    console.log('formData.value:', JSON.stringify(formData.value, null, 2))
    console.log('formScoring.value:', JSON.stringify(formScoring.value, null, 2))
    console.log('====================================================')

    const response = await formApi.updateForm(updatePayload)
    console.debug(`${componentName} handleSubmit: Form updated successfully`, response.responseObject)

    if (completionTimeSeconds.value) {
      notifierStore.notify(t('forms.completionTime', { seconds: completionTimeSeconds.value }), 'info')
    }

    emit('submitForm')
    if (afterSave) afterSave()
    // Reset session start time for next navigation
    sessionStartTime = new Date()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error(`${componentName} handleSubmit: Backend error while updating form; ${errorMessage}`, error)
  }
}

const filteredErrors = computed(() => {
  return errors.value
})

// JsonForms i18n setup using backend translations
const { locale } = useI18n()

const translator = (key: string, defaultMessage?: string): string => {
  const logMessage = `JSONForms translator called with: ${key}, ${defaultMessage}; locale: ${locale.value};`
  // Try to get translation from backend translations first
  const backendTranslations = props.translations as Record<string, Record<string, unknown>> | undefined
  if (backendTranslations) {
    const currentLocale = locale.value
    const localeTranslations = backendTranslations[currentLocale] || backendTranslations['en'] || {}

    // Navigate through nested translation keys (e.g., "moxfq.questions.q1")
    let value: unknown = localeTranslations

    if (value && typeof value === 'object' && value !== null && key in value) {
      value = (value as Record<string, unknown>)[key]
    }

    if (typeof value === 'string') {
      console.debug(`${logMessage}\nUsing backend translation for ${key}: ${value}`)
      return value
    }
  }

  // Final fallback
  console.debug(`${logMessage}\nUsing fallback for ${key}: ${defaultMessage || key}`)
  return defaultMessage || key
}

const jsonFormsI18n = computed(() => ({
  locale: locale.value,
  translate: translator
}))

// Render header/footer from general translation keys so forms can use localized markdown content
// Use general keys `form.header` and `form.footer` so renderers can be reused across form types.
const renderedMarkdownHeader = computed(() => {
  const raw = translator('form.header', props.markdownHeader || '')
  return md.render(String(raw || '').replace(/\\n/g, '\n'))
})

const renderedMarkdownFooter = computed(() => {
  const raw = translator('form.footer', props.markdownFooter || '')
  return md.render(String(raw || '').replace(/\\n/g, '\n'))
})
</script>
<template>
  <v-container v-if="renderedMarkdownHeader">
    <p v-html="renderedMarkdownHeader"></p>
  </v-container>

  <json-forms
              :data="formData"
              :renderers="renderers"
              :schema="formSchema"
              :uischema="formSchemaUI"
              :i18n="jsonFormsI18n"
              @change="onChange"
              :ajv="ajv"
              :middleware="customValidateMiddleware"
              :additional-errors="filteredErrors" />
  <v-container v-if="renderedMarkdownFooter">
    <p v-html="renderedMarkdownFooter"></p>
  </v-container>

  <br />
  <!-- Form completion status message -->
  <v-container class="form-status-container">
    <v-alert
      v-if="isFormComplete"
      type="success"
      variant="tonal"
      class="mb-4">
      <div class="d-flex align-center">
        <v-icon class="me-2">mdi-check-circle</v-icon>
        <span>{{ t('forms.formComplete', { answered: questionStats.answered, total: questionStats.total }) }}</span>
      </div>
    </v-alert>
    <v-alert
      v-else
      type="info"
      variant="tonal"
      class="mb-4">
      <div class="d-flex flex-column">
        <div class="d-flex align-center mb-2">
          <v-icon class="me-2">mdi-information</v-icon>
          <span>{{ t('forms.formIncomplete', { answered: questionStats.answered, total: questionStats.total, unanswered: questionStats.unanswered }) }}</span>
        </div>
        <span class="text-body-2 text-medium-emphasis">{{ t('forms.canContinueIncomplete') }}</span>
      </div>
    </v-alert>
  </v-container>

  <!-- Navigation buttons - always visible -->
  <v-row class="mt-4">
    <v-col cols="12" sm="auto">
      <v-btn
             v-if="formArrayIdx > 0"
             @click="() => handleSubmit(() => emit('gotoPreviousForm'))"
             color="secondary"
             variant="outlined"
             prepend-icon="mdi-arrow-left">
        {{ t('forms.previousForm') }}
      </v-btn>
    </v-col>
    <v-col cols="12" sm="auto">
      <v-btn
             @click="() => handleSubmit(() => emit('submitForm'))"
             color="primary"
             variant="outlined"
             prepend-icon="mdi-content-save">
        {{ t('forms.submitAndGoBack') }}
      </v-btn>
    </v-col>
    <v-col cols="12" sm="auto">
      <v-btn
             v-if="typeof formArrayIdx === 'number'"
             @click="() => handleSubmit(() => emit('gotoNextForm'))"
             :color="isFormComplete ? 'primary' : 'warning'"
             prepend-icon="mdi-arrow-right">
        {{ isFormComplete ? t('forms.submitAndNextForm') : t('forms.continueWithIncomplete') }}
      </v-btn>
    </v-col>
  </v-row>
</template>
<style scoped>
@import '@jsonforms/vue-vuetify/lib/jsonforms-vue-vuetify.css';

/* Ensure any question-card's title can wrap across multiple lines for current and future renderers.
  Use :deep(...) so the rule applies through child component boundaries (scoped style).
*/
:deep(.question-card) .v-card-title,
:deep(.question-card) .v-card__title,
:deep(.question-card) .wrap-title {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  word-break: break-word !important;
}

@media (max-width: 600px) {

  :deep(.question-card) .v-card-title,
  :deep(.question-card) .v-card__title,
  :deep(.question-card) .wrap-title {
    font-size: 1rem;
    line-height: 1.2;
  }
}
</style>
