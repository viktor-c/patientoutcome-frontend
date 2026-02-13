/**
* Form Plugin System Demo/Test Page
*
* This page demonstrates how to use the new plugin-based form system.
* It can also serve as a testing ground for new plugins.
*/

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAllFormPlugins } from '@/forms/registry'
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'
import type { FormSubmissionData } from '@/forms/types'
import type { ScoringData } from '@/types/backend/scoring'

// Get all available plugins
const availablePlugins = getAllFormPlugins()

// Selected plugin
const selectedPluginId = ref<string>(
  availablePlugins.length > 0 ? availablePlugins[0].metadata.id : ''
)

// Current locale
const currentLocale = ref<string>('en')

// Form data - store raw form data
const formData = ref<Record<string, unknown>>({})

// Scoring data
const scoring = ref<ScoringData | null>(null)

// Validation state
const isValid = ref<boolean>(true)

// Read-only mode
const readonly = ref<boolean>(false)

// Selected plugin metadata
const selectedPlugin = computed(() => {
  return availablePlugins.find(p => p.metadata.id === selectedPluginId.value)
})

// Initialize form data when plugin changes
function handlePluginChange() {
  const plugin = selectedPlugin.value
  if (plugin) {
    formData.value = plugin.getInitialData()
    scoring.value = null
  }
}

// Load mock data
function loadMockData() {
  const plugin = selectedPlugin.value
  if (plugin?.generateMockData) {
    formData.value = plugin.generateMockData()
  }
}

// Clear form
function clearForm() {
  const plugin = selectedPlugin.value
  if (plugin) {
    formData.value = plugin.getInitialData()
    scoring.value = null
  }
}

// Handle form data changes - receives FormSubmissionData from plugin
function handleDataChange(submissionData: FormSubmissionData) {
  formData.value = submissionData.rawData as unknown as Record<string, unknown>
  scoring.value = submissionData.scoring
  console.log('[PluginDemo] Form submission data updated:', submissionData)
  console.log('[PluginDemo] - Raw data:', submissionData.rawData)
  console.log('[PluginDemo] - Scoring:', submissionData.scoring)
  console.log('[PluginDemo] - Is complete:', submissionData.isComplete)
}

// Handle scoring changes
function handleScoreChange(newScoring: ScoringData) {
  scoring.value = newScoring
  console.log('[PluginDemo] Scoring updated:', newScoring)
}

// Handle validation changes
function handleValidationChange(valid: boolean) {
  isValid.value = valid
  console.log('[PluginDemo] Validation changed:', valid)
}

// Format score for display
function formatScore(score: number | undefined): string {
  return score !== undefined ? score.toFixed(2) : 'N/A'
}

// Copy JSON to clipboard
function copyToClipboard() {
  navigator.clipboard.writeText(JSON.stringify(formData.value, null, 2))
}

// Initialize with first plugin
if (selectedPluginId.value) {
  handlePluginChange()
}
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>Form Plugin System Demo</h1>
        <p class="text-subtitle-1">
          Test and demonstrate the new plugin-based form architecture
        </p>
      </v-col>
    </v-row>

    <!-- Controls -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Configuration</v-card-title>
          <v-card-text>
            <!-- Plugin selector -->
            <v-select
                      v-model="selectedPluginId"
                      :items="availablePlugins"
                      item-title="metadata.name"
                      item-value="metadata.id"
                      label="Select Form"
                      @update:model-value="handlePluginChange">
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <v-list-item-title>{{ item.raw.metadata.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.raw.metadata.description }}</v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>

            <!-- Locale selector -->
            <v-select
                      v-model="currentLocale"
                      :items="selectedPlugin?.metadata.supportedLocales || ['en']"
                      label="Language"
                      class="mt-4" />

            <!-- Read-only toggle -->
            <v-switch
                      v-model="readonly"
                      label="Read-only mode"
                      color="primary"
                      class="mt-2" />

            <!-- Action buttons -->
            <div class="mt-4">
              <v-btn
                     color="primary"
                     variant="outlined"
                     @click="loadMockData"
                     class="mr-2"
                     :disabled="!selectedPlugin?.generateMockData">
                Load Mock Data
              </v-btn>
              <v-btn
                     color="error"
                     variant="outlined"
                     @click="clearForm">
                Clear Form
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Plugin Info</v-card-title>
          <v-card-text v-if="selectedPlugin">
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Plugin ID</v-list-item-title>
                <v-list-item-subtitle class="text-caption font-mono">
                  {{ selectedPlugin.metadata.id }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Version</v-list-item-title>
                <v-list-item-subtitle>
                  {{ selectedPlugin.metadata.version }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Supported Languages</v-list-item-title>
                <v-list-item-subtitle>
                  {{ selectedPlugin.metadata.supportedLocales.join(', ').toUpperCase() }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Validation</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip
                          :color="isValid ? 'success' : 'error'"
                          size="small"
                          variant="flat">
                    {{ isValid ? 'Valid' : 'Invalid' }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Form renderer -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Form</v-card-title>
          <v-card-text>
            <PluginFormRenderer
                                v-if="selectedPluginId"
                                :template-id="selectedPluginId"
                                :model-value="(formData as any)"
                                :readonly="readonly"
                                :locale="currentLocale"
                                @update:model-value="handleDataChange"
                                @validation-change="handleValidationChange" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Scoring display -->
    <v-row v-if="scoring">
      <v-col cols="12">
        <v-card>
          <v-card-title>Scoring Results</v-card-title>
          <v-card-text>
            <!-- Total score -->
            <div v-if="scoring.total" class="mb-4">
              <h3>Total Score</h3>
              <v-row class="mt-2">
                <v-col cols="6" md="3">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-caption">Raw Score</div>
                      <div class="text-h5">
                        {{ scoring.total.rawScore }} / {{ scoring.total.maxPossibleScore }}
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-caption">Normalized (0-100)</div>
                      <div class="text-h5">
                        {{ formatScore(scoring.total.normalizedScore) }}
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-caption">Completion</div>
                      <div class="text-h5">
                        {{ formatScore(scoring.total.completionPercentage) }}%
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card variant="outlined">
                    <v-card-text>
                      <div class="text-caption">Status</div>
                      <div class="text-h6">
                        <v-chip
                                :color="scoring.total.isComplete ? 'success' : 'warning'"
                                size="small">
                          {{ scoring.total.isComplete ? 'Complete' : 'Incomplete' }}
                        </v-chip>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <!-- Subscales -->
            <div v-if="Object.keys(scoring.subscales).length > 0">
              <h3>Subscale Scores</h3>
              <v-row class="mt-2">
                <v-col
                       v-for="(subscale, key) in scoring.subscales"
                       :key="key"
                       cols="12"
                       md="4">
                  <v-card variant="outlined" v-if="subscale">
                    <v-card-title class="text-subtitle-1">
                      {{ subscale.name }}
                    </v-card-title>
                    <v-card-text>
                      <div v-if="subscale.description" class="text-caption mb-2">
                        {{ subscale.description }}
                      </div>
                      <div class="d-flex justify-space-between">
                        <span>Raw:</span>
                        <strong>{{ subscale.rawScore }} / {{ subscale.maxPossibleScore }}</strong>
                      </div>
                      <div class="d-flex justify-space-between">
                        <span>Normalized:</span>
                        <strong>{{ formatScore(subscale.normalizedScore) }}</strong>
                      </div>
                      <div class="d-flex justify-space-between">
                        <span>Progress:</span>
                        <strong>{{ subscale.answeredQuestions }} / {{ subscale.totalQuestions }}</strong>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Raw data display -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            Raw Data
            <v-spacer />
            <v-btn
                   size="small"
                   variant="text"
                   @click="copyToClipboard">
              Copy JSON
            </v-btn>
          </v-card-title>
          <v-card-text>
            <pre class="code-block">{{ JSON.stringify(formData, null, 2) }}</pre>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.code-block {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.font-mono {
  font-family: 'Courier New', monospace;
}
</style>
