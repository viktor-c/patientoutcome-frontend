/**
 * Plugin Form Renderer
 * 
 * Generic component that renders any form plugin.
 * Loads the appropriate plugin based on templateId and renders it.
 */

<script setup lang="ts">
import { computed, onMounted, ref, markRaw } from 'vue'
import { getFormPlugin } from '../registry'
import type { FormData } from '../types'
import type { ScoringData } from '@/types/backend/scoring'

interface Props {
  /** Form template ID (matches plugin metadata.id) */
  templateId: string
  
  /** Current form data */
  modelValue: FormData
  
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
  (e: 'update:modelValue', value: FormData): void
  (e: 'score-change', scoring: ScoringData): void
  (e: 'validation-change', isValid: boolean): void
}

const emit = defineEmits<Emits>()

// Load the plugin without making it reactive (components shouldn't be reactive)
const plugin = ref(markRaw(getFormPlugin(props.templateId)))

// Check if plugin exists
const pluginExists = computed(() => plugin.value !== undefined)

// Get the component to render
const FormComponent = computed(() => plugin.value?.component)

// Error message if plugin not found
const errorMessage = computed(() => {
  if (!pluginExists.value) {
    return `Form plugin not found for template ID: ${props.templateId}`
  }
  return null
})

// Handle model value updates from the form component
function handleModelUpdate(value: FormData) {
  emit('update:modelValue', value)
}

// Handle score changes from the form component
function handleScoreChange(scoring: ScoringData) {
  emit('score-change', scoring)
}

// Handle validation changes from the form component
function handleValidationChange(isValid: boolean) {
  emit('validation-change', isValid)
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
      class="mb-4"
    >
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
      :model-value="modelValue"
      :readonly="readonly"
      :locale="locale"
      @update:model-value="handleModelUpdate"
      @score-change="handleScoreChange"
      @validation-change="handleValidationChange"
    />

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
