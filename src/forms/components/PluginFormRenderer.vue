/**
* Plugin Form Renderer
*
* Generic component that renders any form plugin.
* Loads the appropriate plugin based on templateId and renders it.
*
* DATA FLOW:
* 1. Receives modelValue as either FormSubmissionData or FormData (for backward compatibility)
* 2. Extracts rawData and passes it to the form component
* 3. Form component emits FormSubmissionData with structure:
* {
* rawData: FormData, // The actual form answers
* scoring: ScoringData, // Calculated scoring
* isComplete: boolean, // Whether all fields are filled
* completedAt?: Date // Timestamp when completed
* }
* 4. Emits this structure to parent components
* 5. Parent components send this to backend API which expects:
* - formData: the rawData (stored in DB as formData)
* - scoring: the scoring data (stored as scoring)
* - formFillStatus: mapped from isComplete (stored as formFillStatus)
* - completedAt: timestamp (stored as completedAt)
*/

<script setup lang="ts">
import { computed, onMounted, ref, markRaw } from 'vue'
import { getFormPlugin } from '../registry'
import type { FormData, FormSubmissionData, FormPlugin } from '../types'
import type { ScoringData } from '@/types/backend/scoring'

interface Props {
  /** Form template ID (matches plugin metadata.id) */
  templateId: string

  /** Current form data */
  modelValue: FormSubmissionData | FormData

  /** Whether the form is read-only */
  readonly?: boolean

  /** Current locale */
  locale?: string
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  locale: 'en'
})

interface Emits {
  (e: 'update:modelValue', value: FormSubmissionData): void
}

const emit = defineEmits<Emits>()

// Load the plugin without making it reactive (components shouldn't be reactive)
const pluginData = getFormPlugin(props.templateId)
const plugin = ref<FormPlugin | undefined>(pluginData ? markRaw(pluginData) : undefined)

// Check if plugin exists
const pluginExists = computed(() => plugin.value !== undefined)

// Get the component to render
const FormComponent = computed(() => plugin.value?.component)

// Extract raw form data from props (handle both old FormData and new FormSubmissionData formats)
const formDataToPass = computed(() => {
  if (!props.modelValue) return {}
  const isSubmissionData = 'rawData' in props.modelValue
  return isSubmissionData ? (props.modelValue as FormSubmissionData).rawData : (props.modelValue as FormData)
})

// Error message if plugin not found
const errorMessage = computed(() => {
  if (!pluginExists.value) {
    return `Form plugin not found for template ID: ${props.templateId}`
  }
  return null
})

// Handle model value updates from the form component
function handleModelUpdate(value: FormSubmissionData) {
  emit('update:modelValue', value)
}

// Log plugin load for debugging
onMounted(() => {
  if (pluginExists.value) {
    console.log(`[PluginFormRenderer] Loaded plugin: ${plugin.value?.metadata.name}`)
  } else {
    console.error(`[PluginFormRenderer] Plugin not found: ${props.templateId}`)
  }
})
</script>

<template>
  <div class="plugin-form-renderer">
    <!-- Error state: plugin not found -->
    <v-alert
             v-if="errorMessage"
             type="error"
             variant="tonal"
             class="mb-4">
      <div class="text-h6">Form Not Available</div>
      <div>{{ errorMessage }}</div>
      <div class="text-caption mt-2">
        Please contact support if this problem persists.
      </div>
    </v-alert>

    <!-- Render the form plugin component -->
    <component
               v-else-if="FormComponent"
               :is="FormComponent"
               :model-value="formDataToPass"
               :readonly="readonly"
               :locale="locale"
               @update:model-value="handleModelUpdate" />

    <!-- Fallback: loading state (shouldn't happen with eager loading) -->
    <div v-else class="text-center pa-4">
      <v-progress-circular indeterminate color="primary" />
      <div class="mt-2 text-caption">Loading form...</div>
    </div>
  </div>
</template>

<style scoped>
.plugin-form-renderer {
  width: 100%;
}
</style>
