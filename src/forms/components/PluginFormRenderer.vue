/**
* Plugin Form Renderer
*
* Generic component that renders any form plugin.
* Loads the appropriate plugin based on templateId and renders it.
*
* DATA FLOW:
* 1. Receives modelValue as PatientFormData (which may be null from backend)
* 2. If null, initializes empty PatientFormData using plugin's getInitialData()
* 3. Extracts rawFormData and passes it to the form component
* 4. Form component emits PatientFormData with structure:
* {
*   rawFormData: FormQuestions, // The actual form answers
*   subscales?: { [key: string]: SubscaleScore | null }, // Calculated scoring per subscale
*   totalScore?: SubscaleScore | null, // Total score
*   fillStatus: "draft" | "incomplete" | "complete", // Form completion status
*   completedAt: Date | null, // Timestamp when completed
*   beginFill: Date | null // Timestamp when form filling began
* }
* 5. Emits this structure to parent components
* 6. Parent components send this to backend API which stores it in patientFormData field
*/

<script setup lang="ts">
import { computed, onMounted, ref, markRaw } from 'vue'
import { getFormPlugin } from '../registry'
import type { FormSubmissionData, FormPlugin } from '../types'

interface Props {
  /** Form template ID (matches plugin metadata.id) */
  templateId: string

  /** Current form data - PatientFormData structure (may be null) */
  modelValue: FormSubmissionData | null

  /** Whether the form is read-only */
  readonly?: boolean

  /** Current locale */
  locale?: string
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  locale: 'en',
  modelValue: null
})

interface Emits {
  (e: 'update:modelValue', value: FormSubmissionData): void
}

const emit = defineEmits<Emits>()

// Store the initial beginFill timestamp when form is first loaded
const initialBeginFill = ref<Date | null>(null)

// Load the plugin without making it reactive (components shouldn't be reactive)
const pluginData = getFormPlugin(props.templateId)
const plugin = ref<FormPlugin | undefined>(pluginData ? markRaw(pluginData) : undefined)

// Check if plugin exists
const pluginExists = computed(() => plugin.value !== undefined)

// Get the component to render
const FormComponent = computed(() => plugin.value?.component)

// Extract or initialize form data
// If backend sends null, use plugin's getInitialData() to create empty structure
const formDataToPass = computed(() => {
  if (!plugin.value) return {}
  
  // If modelValue is null (new form), initialize with empty data
  if (!props.modelValue) {
    // Set beginFill on first load if not already set
    if (!initialBeginFill.value) {
      initialBeginFill.value = new Date()
    }
    return plugin.value.getInitialData()
  }
  
  // Preserve existing beginFill from loaded form data
  if (props.modelValue.beginFill && !initialBeginFill.value) {
    initialBeginFill.value = new Date(props.modelValue.beginFill)
  } else if (!initialBeginFill.value) {
    // If no beginFill exists yet, set it now (form was just opened)
    initialBeginFill.value = new Date()
  }
  
  // If modelValue exists, extract rawFormData
  return props.modelValue.rawFormData || plugin.value.getInitialData()
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
  // Preserve the initial beginFill timestamp
  emit('update:modelValue', {
    ...value,
    beginFill: initialBeginFill.value || value.beginFill || new Date()
  })
}

// Log plugin load for debugging
onMounted(() => {
  if (pluginExists.value) {
    console.log(`[PluginFormRenderer] Loaded plugin: ${plugin.value?.metadata.name}`)
  } else {
    console.error(`[PluginFormRenderer] Plugin not found: ${props.templateId}`)
  }
  
  // Initialize beginFill if this is a new form
  if (!props.modelValue?.beginFill && !initialBeginFill.value) {
    initialBeginFill.value = new Date()
    console.log(`[PluginFormRenderer] Form opened at: ${initialBeginFill.value.toISOString()}`)
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
