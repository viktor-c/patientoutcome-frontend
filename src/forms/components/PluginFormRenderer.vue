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
* rawFormData: FormQuestions, // The actual form answers
* subscales?: { [key: string]: SubscaleScore | null }, // Calculated scoring per subscale
* totalScore?: SubscaleScore | null, // Total score
* fillStatus: "draft" | "incomplete" | "complete", // Form completion status
* completedAt: Date | null, // Timestamp when completed
* beginFill: Date | null // Timestamp when form filling began
* }
* 5. Emits this structure to parent components
* 6. Parent components send this to backend API which stores it in patientFormData field
*/

<script setup lang="ts">
import { computed, onMounted, ref, markRaw, watch, provide } from 'vue'
import { getFormPlugin } from '../registry'
import type { FormSubmissionData, FormPlugin } from '../types'
import { useFormViewMode } from '../composables/useFormViewMode'
import FormVersionHistory from '@/components/forms/FormVersionHistory.vue'
import FormVersionDiff from '@/components/forms/FormVersionDiff.vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/userStore'
import { formVersionService } from '@/services/formVersionService'

interface Props {
  /** Form template ID (matches plugin metadata.id) */
  templateId: string

  /** Current form data - PatientFormData structure (may be null) */
  modelValue: FormSubmissionData | null

  /** Whether the form is read-only */
  readonly?: boolean

  /** Current locale */
  locale?: string

  /** Form ID for version controls (required for version controls) */
  formId?: string

  /** Whether to show version controls */
  showVersionControls?: boolean

  /** Current form version number */
  currentVersion?: number

  /** Viewing a specific historical version */
  viewingVersion?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  locale: 'en',
  modelValue: null,
  showVersionControls: false,
  currentVersion: 1,
  viewingVersion: null
})

interface Emits {
  (e: 'update:modelValue', value: FormSubmissionData): void
  (e: 'viewVersion', version: number): void
  (e: 'compareVersions', v1: number, v2: number): void
  (e: 'versionRestored'): void
}

const emit = defineEmits<Emits>()

// View mode management
const { viewMode, toggleViewMode, isCarouselMode } = useFormViewMode()
const { t } = useI18n()

// Provide view mode to form components so they can render carousel internally
provide('formViewMode', viewMode)

// Get user store for permission checks
const userStore = useUserStore()
const hasSetInitialViewMode = ref(false)
const isPatientView = computed(() => !userStore.isAuthenticated() || userStore.isKioskUser())

watch(isPatientView, (patientView) => {
  if (hasSetInitialViewMode.value) return
  viewMode.value = patientView ? 'carousel' : 'standard'
  hasSetInitialViewMode.value = true
}, { immediate: true })

// Store the initial beginFill timestamp when form is first loaded
const initialBeginFill = ref<Date | null>(null)

// Version controls state
const showDiffDialog = ref(false)
const diffVersion1 = ref(0)
const diffVersion2 = ref(0)
const versionLoading = ref(false)
const activeViewingVersion = ref<number | null>(props.viewingVersion)
const historicalSubmissionData = ref<FormSubmissionData | null>(null)

// Computed flags
const canViewVersions = computed(() =>
  userStore.hasRole('admin') || userStore.hasRole('doctor')
)

const isViewingOldVersion = computed(() =>
  activeViewingVersion.value !== null && activeViewingVersion.value < props.currentVersion
)

const effectiveModelValue = computed(() => {
  return historicalSubmissionData.value || props.modelValue
})

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
  if (!effectiveModelValue.value) {
    return plugin.value.getInitialData()
  }

  // If modelValue exists, extract rawFormData
  return effectiveModelValue.value.rawFormData || plugin.value.getInitialData()
})

watch(effectiveModelValue, (newValue) => {
  if (initialBeginFill.value) return

  if (newValue?.beginFill) {
    initialBeginFill.value = new Date(newValue.beginFill)
    return
  }

  initialBeginFill.value = new Date()
}, { immediate: true })

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

// Handle version control events
async function handleViewVersion(version: number) {
  emit('viewVersion', version)

  if (!props.formId) return

  if (version === props.currentVersion) {
    activeViewingVersion.value = null
    historicalSubmissionData.value = null
    return
  }

  try {
    versionLoading.value = true
    const response = await formVersionService.getVersion(props.formId, version)
    if (response.success && response.responseObject) {
      const historicalData = response.responseObject.rawData as FormSubmissionData
      historicalSubmissionData.value = historicalData
      activeViewingVersion.value = version
    }
  } catch (error) {
    console.error('[PluginFormRenderer] Failed to load historical version:', error)
  } finally {
    versionLoading.value = false
  }
}

function handleCompareVersions(v1: number, v2: number) {
  diffVersion1.value = v1
  diffVersion2.value = v2
  showDiffDialog.value = true
  emit('compareVersions', v1, v2)
}

function handleVersionRestored() {
  activeViewingVersion.value = null
  historicalSubmissionData.value = null
  emit('versionRestored')
}

watch(() => props.viewingVersion, (newValue) => {
  activeViewingVersion.value = newValue
  if (newValue === null || newValue === props.currentVersion) {
    historicalSubmissionData.value = null
  }
})

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
    <!-- View Mode Toggle (only for non-readonly, current version) -->
    <v-card
            v-if="!readonly && !isViewingOldVersion && pluginExists"
            class="mb-4"
            elevation="1">
      <v-card-text class="pa-3 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2" size="small">mdi-view-dashboard</v-icon>
          <span class="text-subtitle-2">{{ t('forms.viewMode.label') }}</span>
        </div>
        <v-btn-toggle
                      v-model="viewMode"
                      mandatory
                      density="compact"
                      variant="outlined"
                      divided>
          <v-btn value="standard" size="small">
            <v-icon class="mr-1" size="18">mdi-view-list</v-icon>
            <span class="view-mode-label">{{ t('forms.viewMode.standard') }}</span>
          </v-btn>
          <v-btn value="carousel" size="small">
            <v-icon class="mr-1" size="18">mdi-view-carousel</v-icon>
            <span class="view-mode-label">{{ t('forms.viewMode.carousel') }}</span>
          </v-btn>
        </v-btn-toggle>
      </v-card-text>
    </v-card>

    <!-- Version Controls Header -->
    <v-card
            v-if="showVersionControls && canViewVersions && formId"
            class="mb-4"
            elevation="2">
      <v-card-title class="d-flex align-center py-2 bg-grey-lighten-5">
        <v-icon class="mr-2" size="small">mdi-file-document-multiple</v-icon>
        <span class="text-subtitle-1">Form Version</span>
        <v-spacer />
        <v-chip
                size="small"
                :color="isViewingOldVersion ? 'warning' : 'success'"
                class="mr-2">
          v{{ activeViewingVersion ?? currentVersion }}
        </v-chip>
        <FormVersionHistory
                            v-if="formId"
                            :form-id="formId"
                            :current-version="currentVersion"
                            @view-version="handleViewVersion"
                            @compare-versions="handleCompareVersions"
                            @version-restored="handleVersionRestored" />
      </v-card-title>

      <!-- Old Version Banner -->
      <v-alert
               v-if="isViewingOldVersion"
               type="warning"
               variant="tonal"
               class="ma-0 rounded-0"
               density="compact">
        <div class="d-flex align-center">
          <v-icon class="mr-2" size="small">mdi-history</v-icon>
          <span class="text-body-2">
            Viewing version {{ activeViewingVersion }} (current is {{ currentVersion }})
          </span>
          <v-spacer />
          <v-btn
                 size="small"
                 variant="text"
                 @click="handleViewVersion(currentVersion)">
            Return to Current
          </v-btn>
        </div>
      </v-alert>
    </v-card>

    <v-alert v-if="versionLoading" type="info" variant="tonal" class="mb-4">
      <v-progress-circular indeterminate size="18" class="mr-2" />
      Loading selected form version...
    </v-alert>

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
               :readonly="readonly || isViewingOldVersion"
               :locale="locale"
               @update:model-value="handleModelUpdate" />

    <!-- Fallback: loading state (shouldn't happen with eager loading) -->
    <div v-else class="text-center pa-4">
      <v-progress-circular indeterminate color="primary" />
      <div class="mt-2 text-caption">Loading form...</div>
    </div>

    <!-- Version Diff Dialog -->
    <FormVersionDiff
                     v-if="formId"
                     v-model="showDiffDialog"
                     :form-id="formId"
                     :version1="diffVersion1"
                     :version2="diffVersion2" />
  </div>
</template>

<style scoped>
.plugin-form-renderer {
  width: 100%;
}

@media (max-width: 600px) {
  .view-mode-label {
    display: none;
  }
}
</style>
