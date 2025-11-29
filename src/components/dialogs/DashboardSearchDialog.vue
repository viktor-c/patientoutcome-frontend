<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ResponseError } from '@/api'
import { patientApi, patientCaseApi } from '@/api'
import type { Patient, PatientCase } from '@/types'

const SEARCH_QUERY_MINIMUM_LENGTH = Number(import.meta.env.VITE_SEARCH_QUERY_MINIMUM_LENGTH || 3)

const { t } = useI18n()
const router = useRouter()

// Dialog state
const dialogOpen = ref(false)
const searchQuery = ref('')
const isSearching = ref(false)

// Search results
const searchResultsPatients = ref<Patient[]>([])
const searchResultsCases = ref<PatientCase[]>([])

// Helper: remove all characters except letters and digits
const sanitizeAlnum = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '')

// Function to format search query with dashes at positions 4 and 8 (for display only)
const formatSearchQuery = (value: string) => {
  const cleanValue = sanitizeAlnum(value)
  const formatted = cleanValue;
  // for (let i = 0; i < cleanValue.length; i++) {
  //   if (i === 3 || i === 6) {
  //     formatted += '-'
  //   }
  //   formatted += cleanValue[i]
  // }
  return formatted
}

// Computed property to check if any results were found
const hasResults = computed(() => {
  return searchResultsPatients.value.length > 0 ||
    searchResultsCases.value.length > 0
})

// Computed property to check if search was performed but no results found
const showNoResultsMessage = computed(() => {
  //searchQuery can be null or undefined, so we check its length safely
  return (searchQuery.value?.length ?? 0) >= SEARCH_QUERY_MINIMUM_LENGTH && !hasResults.value && !isSearching.value
})

// Total results count
const totalResultsCount = computed(() => {
  return searchResultsPatients.value.length +
    searchResultsCases.value.length
})

// Open the dialog
const openDialog = () => {
  dialogOpen.value = true
}

// Close the dialog and reset
const closeDialog = () => {
  dialogOpen.value = false
}

// Clear search and results
const clearSearch = () => {
  searchQuery.value = ''
  searchResultsPatients.value = []
  searchResultsCases.value = []
}

// Navigate to patient overview
const openPatientOverview = (patientId: string | undefined) => {
  if (patientId) {
    router.push({ name: 'patientoverview', params: { patientId } })
    closeDialog()
  }
}

// Navigate to patient case landing
const openPatientCase = (caseId: string | undefined) => {
  if (caseId) {
    router.push({ name: 'patientcaselanding', params: { caseId } })
    closeDialog()
  }
}

// Main search function
const performSearch = async () => {
  const raw = String(searchQuery.value || '').trim()
  const sanitized = sanitizeAlnum(raw)

  // Update displayed value with formatted
  searchQuery.value = formatSearchQuery(sanitized)

  // If nothing remains after sanitization, clear results and return
  if (sanitized.length === 0) {
    searchResultsPatients.value = []
    searchResultsCases.value = []
    return
  }

  if (sanitized.length < SEARCH_QUERY_MINIMUM_LENGTH) {
    console.debug(`Search query must have at least ${SEARCH_QUERY_MINIMUM_LENGTH} characters`)
    return
  }

  isSearching.value = true

  // Search patients and cases in parallel
  const searchPromises = [
    searchPatients(sanitized),
    searchCases(sanitized)
  ]

  await Promise.allSettled(searchPromises)
  isSearching.value = false
}

// Search patients by external ID (partial match)
const searchPatients = async (query: string) => {
  try {
    const response = await patientApi.findPatientsByExternalId({ searchQuery: query })
    if (response.responseObject && response.responseObject.length > 0) {
      searchResultsPatients.value = response.responseObject as unknown as Patient[]
    } else {
      searchResultsPatients.value = []
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error searching patients:', errorMessage)
    searchResultsPatients.value = []
  }
}

// Search patient cases by external ID
const searchCases = async (query: string) => {
  try {
    const response = await patientCaseApi.searchCasesByExternalId({ searchQuery: query })
    if (response.responseObject && response.responseObject.length > 0) {
      searchResultsCases.value = response.responseObject as unknown as PatientCase[]
    } else {
      searchResultsCases.value = []
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error searching cases:', errorMessage)
    searchResultsCases.value = []
  }
}

// Watch for dialog open to focus input
watch(dialogOpen, (isOpen) => {
  if (!isOpen) {
    // Reset when dialog closes
    clearSearch()
  }
})

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

// Expose openDialog for external use
defineExpose({ openDialog })
</script>

<template>
  <!-- Trigger input field -->
  <v-text-field
                v-model="searchQuery"
                :placeholder="t('dashboardSearch.placeholder')"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                readonly
                @click="openDialog"
                @focus="openDialog"
                @click:clear="clearSearch"
                class="dashboard-search-trigger"
                style="max-width: 300px;">
  </v-text-field>

  <!-- Search Dialog -->
  <v-dialog v-model="dialogOpen" max-width="700" scrollable location="top">
    <v-card :style="{ maxHeight: hasResults ? '80vh' : 'auto', display: 'flex', flexDirection: 'column' }">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-magnify" class="me-2"></v-icon>
        {{ t('dashboardSearch.title') }}
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog"></v-btn>
      </v-card-title>

      <v-card-text :style="{ flex: hasResults ? '1' : '0', overflowY: hasResults ? 'auto' : 'visible' }">
        <!-- Search Input -->
        <v-text-field
                      v-model="searchQuery"
                      @input="debouncedSearch"
                      autofocus
                      clearable
                      :label="t('dashboardSearch.searchLabel')"
                      :hint="t('dashboardSearch.searchHint')"
                      persistent-hint
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                      class="mb-4">
          <template v-slot:append>
            <v-progress-circular
                                 v-if="isSearching"
                                 indeterminate
                                 size="20"
                                 width="2"
                                 color="primary">
            </v-progress-circular>
          </template>
        </v-text-field>

        <!-- Results Summary -->
        <v-chip v-if="hasResults" color="success" variant="tonal" size="small" class="mb-4">
          {{ t('dashboardSearch.resultsFound', { count: totalResultsCount }) }}
        </v-chip>

        <!-- No Results Message -->
        <v-alert v-if="showNoResultsMessage" type="info" variant="tonal" class="mb-4">
          {{ t('dashboardSearch.noResults') }}
        </v-alert>

        <!-- Patient Results -->
        <v-card v-if="searchResultsPatients.length > 0" variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-1 d-flex align-center">
            <v-icon icon="mdi-account" size="small" class="me-2"></v-icon>
            {{ t('dashboardSearch.patientsFound', { count: searchResultsPatients.length }) }}
          </v-card-title>
          <v-list density="compact">
            <v-list-item
                         v-for="patient in searchResultsPatients"
                         :key="patient.id || 'patient-' + Math.random()"
                         @click="openPatientOverview(patient.id ?? undefined)"
                         class="cursor-pointer"
                         :title="patient.externalPatientId?.join(', ') || t('common.notAvailable')">
              <template v-slot:prepend>
                <v-icon icon="mdi-account-outline" size="small"></v-icon>
              </template>
              <template v-slot:append>
                <v-icon icon="mdi-chevron-right" size="small"></v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Patient Case Results -->
        <v-card v-if="searchResultsCases.length > 0" variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-1 d-flex align-center">
            <v-icon icon="mdi-folder-account" size="small" class="me-2"></v-icon>
            {{ t('dashboardSearch.casesFound', { count: searchResultsCases.length }) }}
          </v-card-title>
          <v-list density="compact">
            <v-list-item
                         v-for="caseItem in searchResultsCases"
                         :key="caseItem.id || 'case-' + Math.random()"
                         @click="openPatientCase(caseItem.id ?? undefined)"
                         class="cursor-pointer">
              <template v-slot:prepend>
                <v-icon icon="mdi-folder-outline" size="small"></v-icon>
              </template>
              <v-list-item-title>
                {{ caseItem.externalId || caseItem.id }}
              </v-list-item-title>
              <template v-slot:append>
                <v-icon icon="mdi-chevron-right" size="small"></v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>

      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeDialog">{{ t('buttons.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dashboard-search-trigger {
  cursor: pointer;
}

.dashboard-search-trigger :deep(input) {
  cursor: pointer;
}
</style>
