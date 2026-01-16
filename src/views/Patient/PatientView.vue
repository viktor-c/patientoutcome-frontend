<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
// Importing necessary for i18n
import { useI18n } from 'vue-i18n'
import { ResponseError, type Patient } from '@/api' // Adjust the path if necessary

// Importing the notifier store for notifications
import { useNotifierStore } from '@/stores/notifierStore'
const notifierStore = useNotifierStore()

// initialise internationalization
const { t } = useI18n()
// Importing the router for navigation
const router = useRouter()
// Reactive variable to manage the active tab
const activeTab = ref('searchPatient')

// Data for creating a new patient
const newPatient = ref({
  externalPatientId: '',
  sex: '',
})

const showExternalIdWarning = ref(false)

// Data for searching patients
const searchQuery = ref('')
const searchResults = ref<Patient[]>([])
const searchResult = ref<Patient | null>(null)

// Pagination state for listing patients
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalPatients = ref(0)
const totalPages = ref(0)

// Options for the "sex" dropdown
const sexOptions = [
  { value: 'male', label: t('forms.patientCase.sexOptions.male') },
  { value: 'female', label: t('forms.patientCase.sexOptions.female') },
  { value: 'diverse', label: t('forms.patientCase.sexOptions.diverse') },
  { value: 'not_disclosed', label: t('forms.patientCase.sexOptions.notDisclosed') },
]

// Use the centralized API instance
import { patientApi } from '@/api'

const SEARCH_QUERY_MINIMUM_LENGTH = import.meta.env.VITE_SEARCH_QUERY_MINIMUM_LENGTH

// Function to create a new patient
const createPatient = async () => {
  // Show warning if external ID is missing
  if (!newPatient.value.externalPatientId.trim()) {
    showExternalIdWarning.value = true
  }

  // Validate the input
  try {
    // Transform the comma-separated externalPatientId into an array
    const externalPatientIdArray = newPatient.value.externalPatientId
      ? newPatient.value.externalPatientId.split(',').map((id) => id.trim()).filter(id => id)
      : []

    const patientData = {
      ...newPatient.value,
      externalPatientId: externalPatientIdArray.length > 0 ? externalPatientIdArray : undefined,
    }

    const response = await patientApi.createPatient({ createPatientRequest: patientData })
    console.log('Patient created successfully:', response)
    router.push({ path: `/cases/${response.responseObject?.id}` })
    newPatient.value = { externalPatientId: '', sex: '' }
    showExternalIdWarning.value = false
    useNotifierStore().notify(t('alerts.patient.created'), 'success')
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error creating patient:', errorMessage)
    useNotifierStore().notify(t('alerts.patient.creationFailed'), 'error')
  }
}

// Function to list all patients with pagination
const getAllPatients = async () => {
  try {
    const response = await patientApi.getPatients({
      page: String(currentPage.value),
      limit: String(itemsPerPage.value)
    })

    if (!response.responseObject) {
      console.debug('no patients Found')
      useNotifierStore().notify(t('alerts.patient.noneFound'), 'info')
      searchResults.value = []
      totalPatients.value = 0
      totalPages.value = 0
      return
    }

    // Handle paginated response structure
    searchResults.value = response.responseObject.patients || []
    totalPatients.value = response.responseObject.total || 0
    totalPages.value = response.responseObject.totalPages || 0
    console.log('List of patients:', response.responseObject)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error listing patients:', errorMessage)
    notifierStore.notify(t('alerts.patient.searchFailed'), 'error')
  }
}

// Function to search for patients
const searchPatient = async () => {
  if (searchQuery.value.length < SEARCH_QUERY_MINIMUM_LENGTH) {
    console.debug(`Search query must have at least ${SEARCH_QUERY_MINIMUM_LENGTH} characters`)
    searchResult.value = null
    return
  }
  try {
    const response = await patientApi.getPatientByExternalId({ id: searchQuery.value })
    if (response.responseObject == undefined) {
      console.debug('no Patient by external id found')
      return
    }
    searchResult.value = response.responseObject
    console.log('Search result:', response.responseObject)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    searchResult.value = null
    console.error('Error searching for patient:', errorMessage)
    notifierStore.notify(t('alerts.patient.searchFailed'), 'error')
  }
}

// Watcher to refresh the list of patients when the "listPatients" tab is selected
watch(activeTab, (newTab) => {
  if (newTab === 'listPatients') {
    currentPage.value = 1 // Reset to first page when switching tabs
    getAllPatients()
  }
})

// Function to handle page changes
const handlePageChange = (page: number) => {
  currentPage.value = page
  getAllPatients()
}
</script>

<template>
  <v-container class="w-100">
    <v-card>
      <v-tabs v-model="activeTab" bg-color="primary">
        <v-tab :value="'createPatient'">{{ t('tabs.createPatient') }}</v-tab>
        <v-tab :value="'searchPatient'">{{ t('tabs.searchPatient') }}</v-tab>
        <v-tab :value="'listPatients'">{{ t('tabs.listPatients') }}</v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="activeTab">
          <v-tabs-window-item :value="'createPatient'">
            <v-alert
                     type="info"
                     variant="tonal"
                     class="mb-4"
                     density="compact">
              {{ t('alerts.patient.optionalFieldsInfo') }}
            </v-alert>

            <v-alert
                     v-if="showExternalIdWarning"
                     type="warning"
                     variant="tonal"
                     class="mb-4"
                     closable
                     @click:close="showExternalIdWarning = false">
              {{ t('alerts.patient.noExternalIdWarning') }}
            </v-alert>

            <v-form @submit.prevent="createPatient">
              <v-text-field
                            :label="t('forms.externalId')"
                            v-model="newPatient.externalPatientId"
                            placeholder="Enter comma-separated IDs"
                            :hint="t('forms.externalIdHint')"
                            persistent-hint></v-text-field>
              <v-select
                        :label="t('forms.sex')"
                        v-model="newPatient.sex"
                        :items="sexOptions"
                        item-value="value"
                        item-title="label"
                        outlined
                        dense
                        clearable></v-select>
              <v-btn color="success" @click="createPatient">{{ t('forms.submit') }}</v-btn>
            </v-form>
          </v-tabs-window-item>

          <v-tabs-window-item :value="'searchPatient'">
            <v-form @submit.prevent="searchPatient">
              <v-text-field @input="searchPatient" :label="t('forms.searchByExternalId')"
                            v-model="searchQuery"></v-text-field>
            </v-form>
            <p v-if="searchResult" class="mt-3">
              {{
                t('forms.patientDetails', {
                  externalId: searchResult.externalPatientId,
                })
              }}
              <RouterLink :to="`/patient-overview/${searchResult.id}`">
                <v-btn size="small" color="primary">{{ t('buttons.openPatient') }}</v-btn>
              </RouterLink>
            </p>
            <p v-else-if="searchQuery.length < SEARCH_QUERY_MINIMUM_LENGTH">
              {{ t('forms.searchQueryTooShort') }}
            </p>
            <p v-else-if="searchQuery">
              {{ t('forms.noPatientFound', { externalId: searchQuery }) }}
            </p>
          </v-tabs-window-item>

          <v-tabs-window-item :value="'listPatients'">
            <v-data-table
                          :headers="[
                            { title: t('forms.externalId'), key: 'externalPatientId', sortable: false },
                            { title: t('forms.sex'), key: 'sex', sortable: false },
                            { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
                          ]"
                          :items="searchResults"
                          :items-length="totalPatients"
                          :items-per-page="itemsPerPage"
                          :page="currentPage"
                          hide-default-footer
                          class="elevation-1">
              <template #item.externalPatientId="{ item }">
                {{ item.externalPatientId?.[0] || '-' }}
              </template>

              <template #item.sex="{ item }">
                {{ item.sex || '-' }}
              </template>

              <template #item.actions="{ item }">
                <RouterLink :to="`/cases/patient/${item.id}`">
                  <v-btn size="small" color="primary" variant="tonal">
                    {{ t('buttons.openPatient') }}
                  </v-btn>
                </RouterLink>
              </template>

              <template #bottom>
                <div class="d-flex justify-center align-center pa-4">
                  <v-pagination
                                v-model="currentPage"
                                :length="totalPages"
                                :total-visible="7"
                                @update:modelValue="handlePageChange"></v-pagination>
                  <span class="ml-4 text-caption">
                    {{ t('pagination.showing', {
                      start: (currentPage - 1) * itemsPerPage + 1,
                      end: Math.min(currentPage * itemsPerPage, totalPatients),
                      total: totalPatients
                    }) }}
                  </span>
                </div>
              </template>
            </v-data-table>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>
    </v-card>
  </v-container>
</template>
