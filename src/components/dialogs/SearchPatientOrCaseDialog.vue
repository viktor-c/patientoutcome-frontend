<script setup lang="ts">
import type { Patient, PatientCase } from '@/types'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const SEARCH_QUERY_MINIMUM_LENGTH = Number(import.meta.env.VITE_SEARCH_QUERY_MINIMUM_LENGTH || 3)

const { t } = useI18n()
const router = useRouter()
const searchCaseOrPatientQuery = ref('')
const searchResultsPatients = ref<Patient[]>([])
const searchResultsCases = ref<PatientCase[]>([])

// Computed property to check if any results were found
const hasResults = computed(() => {
  return searchResultsPatients.value.length > 0 || searchResultsCases.value.length > 0
})

// Computed property to check if search was performed but no results found
const showNoResultsMessage = computed(() => {
  return searchCaseOrPatientQuery.value.length >= SEARCH_QUERY_MINIMUM_LENGTH && !hasResults.value
})

// Initialize the API client
import { ResponseError } from '@/api' // Adjust the path if necessary

import { patientApi, patientCaseApi } from '@/api.ts' // Adjust the path if necessary

// Helper: remove all characters except letters and digits
const sanitizeAlnum = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '')

// Function to format search query with dashes at positions 4 and 8 (for display only)
const formatSearchQuery = (value: string) => {
  const cleanValue = sanitizeAlnum(value)
  let formatted = ''
  for (let i = 0; i < cleanValue.length; i++) {
    if (i === 3 || i === 6) {
      formatted += '-'
    }
    formatted += cleanValue[i]
  }
  return formatted
}

// Function to navigate to the creation flow with pre-filled external ID
const startCreationFlow = () => {
  const sanitizedSearchQuery = sanitizeAlnum(searchCaseOrPatientQuery.value)
  // Use encodeURIComponent to ensure router query is safely encoded
  router.push({
    name: 'creation-flow',
    query: {
      externalId: encodeURIComponent(sanitizedSearchQuery)
    }
  })
}

// Function to search for patients
const searchPatientOrCase = async () => {
  // Trim and sanitize early. Keep `searchCaseOrPatientQuery` as user-facing value
  const raw = String(searchCaseOrPatientQuery.value || '').trim()
  const sanitized = sanitizeAlnum(raw)

  // Update displayed value with formatted (but keep only alnum for searches)
  searchCaseOrPatientQuery.value = formatSearchQuery(sanitized)

  // If nothing remains after sanitization, clear results and return
  if (sanitized.length === 0) {
    searchResultsCases.value = []
    searchResultsPatients.value = []
    return
  }

  if (sanitized.length < SEARCH_QUERY_MINIMUM_LENGTH) {
    console.debug(`Search query must have at least ${SEARCH_QUERY_MINIMUM_LENGTH} characters`)
    return
  }
  // Use sanitized for API calls and routing
  const sanitizedSearchQuery = sanitized
  try {
    const response = await patientApi.findPatientsByExternalId({ searchQuery: sanitizedSearchQuery })
    if (response.responseObject == undefined || response.responseObject.length === 0) {
      console.debug('no Patient by external id found')
      searchResultsPatients.value = []
    } else {
      searchResultsPatients.value = response.responseObject as unknown as Patient[]
      console.log('Search result:', response.responseObject)
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('SearchPatientOrCaseDialog error:', errorMessage)
    searchResultsPatients.value = []
  }

  //use patientCaseApi to search for cases, specifically searchCasesById
  try {
    const response = await patientCaseApi.searchCasesByExternalId({ searchQuery: sanitizedSearchQuery })
    if (response.responseObject == undefined || response.responseObject.length === 0) {
      console.debug('no Case by id found')
      searchResultsCases.value = []
    } else {
      searchResultsCases.value = response.responseObject as unknown as PatientCase[]
      console.log('Search result:', response.responseObject)
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('SearchPatientOrCaseDialog error', errorMessage)
    searchResultsCases.value = []
  }
}
</script>

<template>
  <v-dialog max-width="500">
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn class="" v-bind="activatorProps" size="large" variant="plain" color="info"> <v-icon
                icon="mdi-text-search-variant"></v-icon>Search/Create</v-btn>
    </template>

    <template v-slot:default="{ isActive }">
      <v-card :title="t('search.title')">
        <v-card-text>
          <v-text-field
                        v-model="searchCaseOrPatientQuery"
                        @input="searchPatientOrCase"
                        clearable
                        focused
                        :label="t('search.enterIdToSearch')"
                        :hint="t('search.noResultsHint')"></v-text-field>
          <v-divider></v-divider>

          <!-- Show no results message and creation flow button when no results found -->
          <v-card v-if="showNoResultsMessage" class="mt-4" color="info" variant="tonal">
            <v-card-title>{{ t('search.noResultsFound') }}</v-card-title>
            <v-card-text>
              <p>{{ t('search.noResultsMessage') }}</p>
              <v-btn
                     color="primary"
                     variant="elevated"
                     class="mt-3"
                     @click="startCreationFlow">
                {{ t('buttons.startCreationFlow') }}
              </v-btn>
            </v-card-text>
          </v-card>

          <v-card v-if="searchResultsPatients.length > 0" class="mt-4">
            <v-card-title>{{ t('search.foundPatients') }}</v-card-title>
            <v-list>
              <v-list-item v-for="patient in searchResultsPatients" :key="patient.id || 'patient-' + Math.random()"
                           @click="() => { }"
                           class="cursor-pointer">
                <v-list-item-title> {{ patient.externalPatientId }} </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>

          <v-card v-if="searchResultsCases.length > 0" class="mt-4">
            <v-card-title>{{ t('search.foundCases') }}</v-card-title>
            <v-list>
              <v-list-item v-for="caseItem in searchResultsCases" :key="caseItem.id || 'case-' + Math.random()"
                           @click="() => { }"
                           class="cursor-pointer">
                <v-list-item-title> {{ t('buttons.case') }} #{{ caseItem.externalId }} </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" :text="t('Add new case')" @click="isActive.value = false"></v-btn>
          <v-btn color="primary" :text="t('Add new consultation')" @click="isActive.value = false"></v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>
