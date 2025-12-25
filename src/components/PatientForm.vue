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
const isFormComplete = computed(() => formScoring.value?.total?.isComplete || false)

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
    console.debug(`${componentName}: Received ScoringData from renderer:`, formScoring.value)
    formScoring.value = event.data as ScoringData
    formData.value = formScoring.value.rawData as FormData
  }
  else {
    console.debug(`${componentName}: rawData NOT present in event.data, using event.data as formData`)
    // formData.value = event.data as FormData
    // formScoring.value.rawData = formData.value
    //formScoring.value = null
  }

  const validate = ajv.compile(props.formSchema)
  const isValid = validate(formData.value)
  if (!isValid) {
    console.error(`${componentName} Validation errors:`, validate.errors)
    event.errors = []
  } else {
    console.log('Form data is valid')
    // Emit the updated form data to the parent component
    emit('formDataChange', formData.value)
    emit('scoringDataChange', formScoring.value)
  }

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
  <!-- Navigation buttons -->
  <v-row v-if="isFormComplete" class="mt-4">
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
             color="primary"
             prepend-icon="mdi-arrow-right">
        {{ t('forms.submitAndNextForm') }}
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
