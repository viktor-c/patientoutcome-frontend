<template>
  <v-dialog v-model="dialog" max-width="1400px" fullscreen>
    <v-card>
      <v-card-title class="bg-primary">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-compare</v-icon>
          <span>Compare Form Versions</span>
          <v-spacer />
          <v-chip variant="flat" color="white" class="mr-2">
            v{{ version1 }}
          </v-chip>
          <v-icon color="white">mdi-arrow-right</v-icon>
          <v-chip variant="flat" color="white" class="ml-2 mr-4">
            v{{ version2 }}
          </v-chip>
          <v-btn
            icon="mdi-close"
            variant="text"
            color="white"
            @click="dialog = false"
          />
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0" style="height: calc(100vh - 140px); overflow-y: auto">
        <v-alert v-if="loading" type="info" variant="tonal" class="ma-4">
          <v-progress-circular indeterminate size="20" class="mr-2" />
          Loading version comparison...
        </v-alert>

        <v-alert v-else-if="error" type="error" variant="tonal" class="ma-4">
          {{ error }}
        </v-alert>

        <div v-else-if="compareData">
          <!-- Summary Banner -->
          <v-alert type="info" variant="tonal" class="ma-4 mb-2">
            <div v-if="intermediateChanges.length > 0">
              <strong>{{ intermediateChanges.length }} intermediate changes</strong> between these versions.
              <v-btn
                size="small"
                variant="text"
                @click="showIntermediate = !showIntermediate"
                class="ml-2"
              >
                {{ showIntermediate ? 'Hide' : 'Show' }} Details
              </v-btn>
            </div>
            <div v-else>
              These are consecutive versions (no intermediate changes).
            </div>
          </v-alert>

          <!-- Intermediate Changes Panel -->
          <v-expand-transition>
            <v-card v-if="showIntermediate && intermediateChanges.length > 0" class="ma-4 mb-2" elevation="2">
              <v-card-title class="text-h6 bg-grey-lighten-4">
                Intermediate Changes
              </v-card-title>
              <v-card-text>
                <v-timeline density="compact" side="end">
                  <v-timeline-item
                    v-for="change in intermediateChanges"
                    :key="change.version"
                    dot-color="info"
                    size="small"
                  >
                    <template #opposite>
                      <v-chip size="small">v{{ change.version }}</v-chip>
                    </template>
                    <div class="text-body-2">
                      <strong>{{ formatDate(change.changedAt) }}</strong>
                      by {{ change.changedBy }}
                    </div>
                    <div v-if="change.changeNotes" class="text-caption text-medium-emphasis mt-1">
                      {{ change.changeNotes }}
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card-text>
            </v-card>
          </v-expand-transition>

          <!-- Side-by-Side Comparison -->
          <v-row no-gutters class="ma-0">
            <!-- Version 1 (Older) -->
            <v-col cols="12" md="6" class="pa-4 border-e">
              <v-card elevation="2" class="mb-4">
                <v-card-title class="bg-red-lighten-5">
                  <v-icon class="mr-2" color="error">mdi-file-document-outline</v-icon>
                  Version {{ version1 }} (Older)
                </v-card-title>
                <v-card-text class="pa-2">
                  <div class="text-caption">
                    <strong>Date:</strong> {{ formatDate(compareData.v1.changedAt) }}<br />
                    <strong>Changed by:</strong> {{ compareData.v1.changedBy }}<br />
                    <strong>Notes:</strong> {{ compareData.v1.changeNotes || 'No notes provided' }}
                  </div>
                </v-card-text>
              </v-card>

              <v-card elevation="1">
                <v-card-text>
                  <div class="form-data-display">
                    <pre class="text-caption">{{ formatFormData(compareData.v1.rawData) }}</pre>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Version 2 (Newer) -->
            <v-col cols="12" md="6" class="pa-4">
              <v-card elevation="2" class="mb-4">
                <v-card-title class="bg-green-lighten-5">
                  <v-icon class="mr-2" color="success">mdi-file-document</v-icon>
                  Version {{ version2 }} (Newer)
                </v-card-title>
                <v-card-text class="pa-2">
                  <div class="text-caption">
                    <strong>Date:</strong> {{ formatDate(compareData.v2.changedAt) }}<br />
                    <strong>Changed by:</strong> {{ compareData.v2.changedBy }}<br />
                    <strong>Notes:</strong> {{ compareData.v2.changeNotes || 'No notes provided' }}
                  </div>
                </v-card-text>
              </v-card>

              <v-card elevation="1">
                <v-card-text>
                  <div class="form-data-display">
                    <pre class="text-caption">{{ formatFormData(compareData.v2.rawData) }}</pre>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="dialog = false">
          Close
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="elevated"
          @click="exportComparison"
          :disabled="!compareData"
        >
          <v-icon start>mdi-download</v-icon>
          Export Comparison
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { formVersionService, formatVersionDate, type VersionCompareResult, type FormVersion } from '@/services/formVersionService'

const props = defineProps<{
  formId: string
  version1: number
  version2: number
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const compareData = ref<VersionCompareResult | null>(null)
const changeList = ref<FormVersion[]>([])
const showIntermediate = ref(false)

// Computed
const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const intermediateChanges = computed(() => {
  // Filter out the first and last versions (those being compared)
  return changeList.value.filter(
    change => change.version > props.version1 && change.version < props.version2
  )
})

// Methods
const formatDate = (dateString: string) => {
  return formatVersionDate(dateString)
}

const formatFormData = (data: unknown) => {
  if (!data) return 'No data available'
  return JSON.stringify(data, null, 2)
}

const loadComparison = async () => {
  try {
    loading.value = true
    error.value = null

    // Load comparison data
    const compareResponse = await formVersionService.compareVersions(
      props.formId,
      props.version1,
      props.version2
    )

    if (compareResponse.success && compareResponse.responseObject) {
      compareData.value = compareResponse.responseObject
    } else {
      error.value = compareResponse.message || 'Failed to load comparison'
      return
    }

    // Load change list (for intermediate versions)
    if (props.version2 - props.version1 > 1) {
      const changeResponse = await formVersionService.getChangeList(
        props.formId,
        props.version1,
        props.version2
      )

      if (changeResponse.success && changeResponse.responseObject) {
        changeList.value = changeResponse.responseObject
      }
    }
  } catch (err: unknown) {
    const errorPayload = err as { response?: { data?: { message?: string } } }
    console.error('Error loading comparison:', err)
    error.value = errorPayload.response?.data?.message || 'Failed to load comparison'
  } finally {
    loading.value = false
  }
}

const exportComparison = () => {
  if (!compareData.value) return

  const exportData = {
    formId: props.formId,
    comparison: {
      version1: {
        number: props.version1,
        date: compareData.value.v1.changedAt,
        changedBy: compareData.value.v1.changedBy,
        notes: compareData.value.v1.changeNotes,
        data: compareData.value.v1.rawData
      },
      version2: {
        number: props.version2,
        date: compareData.value.v2.changedAt,
        changedBy: compareData.value.v2.changedBy,
        notes: compareData.value.v2.changeNotes,
        data: compareData.value.v2.rawData
      },
      intermediateChanges: intermediateChanges.value.map(change => ({
        version: change.version,
        date: change.changedAt,
        changedBy: change.changedBy,
        notes: change.changeNotes
      }))
    },
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `form-${props.formId}-comparison-v${props.version1}-v${props.version2}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// Watch dialog open to load data
watch(dialog, (newValue) => {
  if (newValue) {
    loadComparison()
  } else {
    // Reset state when dialog closes
    compareData.value = null
    changeList.value = []
    showIntermediate.value = false
    error.value = null
  }
})
</script>

<style scoped>
.form-data-display {
  max-height: 700px;
  overflow-y: auto;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
}

.form-data-display pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.border-e {
  border-right: 1px solid #e0e0e0;
}

@media (max-width: 960px) {
  .border-e {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
}
</style>
