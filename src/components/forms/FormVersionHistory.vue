<template>
  <v-dialog v-model="dialog" max-width="900px" scrollable>
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        icon
        size="small"
        variant="text"
        :disabled="!canViewVersions"
      >
        <v-icon>mdi-history</v-icon>
        <v-tooltip activator="parent">Version History</v-tooltip>
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-history</v-icon>
        Form Version History
        <v-spacer />
        <v-chip color="primary" size="small" class="ml-2">
          Current: v{{ currentVersion }}
        </v-chip>
        <v-btn icon="mdi-close" size="small" variant="text" @click="dialog = false" class="ml-2" />
      </v-card-title>

      <v-divider />

      <v-card-text style="max-height: 600px">
        <v-alert v-if="loading" type="info" variant="tonal" class="mb-4">
          <v-progress-circular indeterminate size="20" class="mr-2" />
          Loading version history...
        </v-alert>

        <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <v-alert v-else-if="versions.length === 0" type="info" variant="tonal">
          No version history available. This form has not been modified yet.
        </v-alert>

        <v-timeline v-else side="end" density="compact" align="start">
          <v-timeline-item
            v-for="version in versions"
            :key="version.version"
            :dot-color="getVersionColor(version)"
            size="small"
          >
            <template #opposite>
              <v-chip size="small" :color="version.version === currentVersion ? 'primary' : 'default'">
                v{{ version.version }}
              </v-chip>
            </template>

            <v-card elevation="2" class="mb-2">
              <v-card-title class="text-body-1 py-2">
                <div class="d-flex align-center">
                  <span>{{ formatDate(version.changedAt) }}</span>
                  <v-chip
                    v-if="version.isRestoration"
                    size="x-small"
                    color="warning"
                    class="ml-2"
                  >
                    <v-icon start size="x-small">mdi-restore</v-icon>
                    Restored from v{{ version.restoredFromVersion }}
                  </v-chip>
                  <v-chip
                    v-if="version.version === currentVersion"
                    size="x-small"
                    color="success"
                    class="ml-2"
                  >
                    <v-icon start size="x-small">mdi-check-circle</v-icon>
                    Current
                  </v-chip>
                </div>
              </v-card-title>

              <v-card-subtitle class="py-1">
                Changed by: {{ version.changedBy }}
              </v-card-subtitle>

              <v-card-text class="py-2">
                <div v-if="version.changeNotes" class="text-body-2">
                  {{ version.changeNotes }}
                </div>
                <div v-else class="text-body-2 text-medium-emphasis">
                  No notes provided
                </div>
              </v-card-text>

              <v-card-actions class="py-1 px-2">
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  @click="handleViewVersion(version.version)"
                >
                  <v-icon start>mdi-eye</v-icon>
                  View
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  color="info"
                  :disabled="compareSelection.length >= 2"
                  @click="toggleCompareSelection(version.version)"
                >
                  <v-icon start>
                    {{ compareSelection.includes(version.version) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
                  </v-icon>
                  {{ compareSelection.includes(version.version) ? 'Selected' : 'Select' }}
                </v-btn>
                <v-spacer />
                <v-btn
                  v-if="version.version !== currentVersion"
                  size="small"
                  variant="text"
                  color="warning"
                  @click="openRestoreDialog(version.version)"
                >
                  <v-icon start>mdi-restore</v-icon>
                  Restore
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-btn
          v-if="compareSelection.length === 2"
          color="info"
          variant="elevated"
          @click="handleCompareVersions"
        >
          <v-icon start>mdi-compare</v-icon>
          Compare v{{ compareSelection[0] }} and v{{ compareSelection[1] }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Restore Confirmation Dialog -->
    <v-dialog v-model="restoreDialog" max-width="500px">
      <v-card>
        <v-card-title>
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          Confirm Version Restoration
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            Are you sure you want to restore version {{ versionToRestore }}?
            This will create a new version with the old data.
          </v-alert>

          <v-textarea
            v-model="restoreNotes"
            label="Restoration Notes (Optional)"
            placeholder="Describe why you are restoring this version..."
            rows="3"
            variant="outlined"
          />

          <div class="text-caption text-medium-emphasis mt-2">
            Default note: "Restored from version {{ versionToRestore }}"
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="restoreDialog = false">Cancel</v-btn>
          <v-btn
            color="warning"
            variant="elevated"
            :loading="restoring"
            @click="confirmRestore"
          >
            <v-icon start>mdi-restore</v-icon>
            Restore Version
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { formVersionService, formatVersionDate, type FormVersion } from '@/services/formVersionService'

const props = defineProps<{
  formId: string
  currentVersion: number
}>()

const emit = defineEmits<{
  viewVersion: [version: number]
  compareVersions: [v1: number, v2: number]
  versionRestored: []
}>()

const userStore = useUserStore()

// State
const dialog = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const versions = ref<FormVersion[]>([])
const compareSelection = ref<number[]>([])
const restoreDialog = ref(false)
const versionToRestore = ref<number | null>(null)
const restoreNotes = ref('')
const restoring = ref(false)

// Computed
const canViewVersions = computed(() => {
  return userStore.hasRole('admin') || userStore.hasRole('doctor')
})

// Methods
const formatDate = (dateString: string) => {
  return formatVersionDate(dateString)
}

const getVersionColor = (version: FormVersion) => {
  if (version.version === props.currentVersion) return 'success'
  if (version.isRestoration) return 'warning'
  return 'primary'
}

const toggleCompareSelection = (versionNumber: number) => {
  const index = compareSelection.value.indexOf(versionNumber)
  if (index > -1) {
    compareSelection.value.splice(index, 1)
  } else if (compareSelection.value.length < 2) {
    compareSelection.value.push(versionNumber)
  }
  // Sort to ensure v1 < v2
  compareSelection.value.sort((a, b) => a - b)
}

const handleViewVersion = (version: number) => {
  emit('viewVersion', version)
  dialog.value = false
}

const handleCompareVersions = () => {
  if (compareSelection.value.length === 2) {
    emit('compareVersions', compareSelection.value[0], compareSelection.value[1])
    dialog.value = false
  }
}

const openRestoreDialog = (version: number) => {
  versionToRestore.value = version
  restoreNotes.value = ''
  restoreDialog.value = true
}

const confirmRestore = async () => {
  if (versionToRestore.value === null) return

  try {
    restoring.value = true
    await formVersionService.restoreVersion(
      props.formId,
      versionToRestore.value,
      restoreNotes.value || undefined
    )

    // Success - emit event and reload history
    emit('versionRestored')
    await loadVersionHistory()

    restoreDialog.value = false
    restoreNotes.value = ''
  } catch (err: unknown) {
    const errorPayload = err as { response?: { data?: { message?: string } } }
    console.error('Error restoring version:', err)
    error.value = errorPayload.response?.data?.message || 'Failed to restore version'
  } finally {
    restoring.value = false
  }
}

const loadVersionHistory = async () => {
  if (!canViewVersions.value) {
    error.value = 'You do not have permission to view version history'
    return
  }

  try {
    loading.value = true
    error.value = null

    const response = await formVersionService.getVersionHistory(props.formId)

    if (response.success && response.responseObject) {
      versions.value = response.responseObject
    } else {
      error.value = response.message || 'Failed to load version history'
    }
  } catch (err: unknown) {
    const errorPayload = err as { response?: { data?: { message?: string } } }
    console.error('Error loading version history:', err)
    error.value = errorPayload.response?.data?.message || 'Failed to load version history'
  } finally {
    loading.value = false
  }
}

// Watch dialog open to load data
watch(dialog, (newValue) => {
  if (newValue && canViewVersions.value) {
    loadVersionHistory()
    compareSelection.value = []
  }
})
</script>

<style scoped>
.v-timeline {
  padding-top: 0;
}

.v-timeline-item {
  padding-bottom: 12px;
}
</style>
