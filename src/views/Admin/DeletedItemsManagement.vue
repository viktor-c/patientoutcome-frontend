<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ResponseError, type Patient, type PatientCase, type Form } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { patientApi, caseApi, formApi } from '@/api'

const { t } = useI18n()
const notifierStore = useNotifierStore()

// Active tab
const activeTab = ref('deletedPatients')

// Deleted patients state
const deletedPatients = ref<Patient[]>([])
const patientsPage = ref(1)
const patientsLimit = ref(10)
const patientsTotalPages = ref(0)
const patientsTotal = ref(0)

// Deleted cases state
const deletedCases = ref<PatientCase[]>([])
const casesPage = ref(1)
const casesLimit = ref(10)
const casesTotalPages = ref(0)
const casesTotal = ref(0)

// Deleted forms state
const deletedForms = ref<Form[]>([])
const formsPage = ref(1)
const formsLimit = ref(10)
const formsTotalPages = ref(0)
const formsTotal = ref(0)

// Fetch deleted patients
const fetchDeletedPatients = async () => {
  try {
    const response = await patientApi.getDeletedPatients({
      page: String(patientsPage.value),
      limit: String(patientsLimit.value)
    })

    if (response.responseObject) {
      deletedPatients.value = response.responseObject.patients || []
      patientsTotal.value = response.responseObject.total || 0
      patientsTotalPages.value = response.responseObject.totalPages || 0
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching deleted patients:', errorMessage)
    notifierStore.notify(t('alerts.patient.fetchDeletedFailed'), 'error')
  }
}

// Fetch deleted cases
const fetchDeletedCases = async () => {
  try {
    const response = await caseApi.getDeletedCases({
      page: String(casesPage.value),
      limit: String(casesLimit.value)
    })

    if (response.responseObject) {
      deletedCases.value = (response.responseObject.cases || []) as any
      casesTotal.value = response.responseObject.total || 0
      casesTotalPages.value = response.responseObject.totalPages || 0
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching deleted cases:', errorMessage)
    notifierStore.notify(t('alerts.case.fetchDeletedFailed'), 'error')
  }
}

// Fetch deleted forms
const fetchDeletedForms = async () => {
  try {
    const response = await formApi.getDeletedForms({
      page: String(formsPage.value),
      limit: String(formsLimit.value)
    })

    if (response.responseObject) {
      deletedForms.value = (response.responseObject.forms || []) as any
      formsTotal.value = response.responseObject.total || 0
      formsTotalPages.value = response.responseObject.totalPages || 0
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching deleted forms:', errorMessage)
    notifierStore.notify(t('alerts.form.fetchDeletedFailed'), 'error')
  }
}

// Restore a single patient
const restorePatient = async (patientId: string) => {
  try {
    await patientApi.restorePatient({ id: patientId })
    notifierStore.notify(t('alerts.patient.restored'), 'success')
    fetchDeletedPatients()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error restoring patient:', errorMessage)
    notifierStore.notify(t('alerts.patient.restoreFailed'), 'error')
  }
}

// Permanently delete a patient
const permanentDeletePatient = async (patientId: string) => {
  if (!confirm(t('alerts.patient.confirmPermanentDelete'))) return

  try {
    await patientApi.deletePatient({ id: patientId })
    notifierStore.notify(t('alerts.patient.permanentlyDeleted'), 'success')
    fetchDeletedPatients()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error permanently deleting patient:', errorMessage)
    notifierStore.notify(t('alerts.patient.deleteFailed'), 'error')
  }
}

// Restore a single case
const restoreCase = async (caseId: string) => {
  try {
    await caseApi.restoreCase({ caseId })
    notifierStore.notify(t('alerts.case.restored'), 'success')
    fetchDeletedCases()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error restoring case:', errorMessage)
    notifierStore.notify(t('alerts.case.restoreFailed'), 'error')
  }
}

// Permanently delete a case
const permanentDeleteCase = async (patientId: string, caseId: string) => {
  if (!confirm(t('alerts.case.confirmPermanentDelete'))) return

  try {
    await caseApi.deletePatientCaseById({ patientId, caseId })
    notifierStore.notify(t('alerts.case.permanentlyDeleted'), 'success')
    fetchDeletedCases()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error permanently deleting case:', errorMessage)
    notifierStore.notify(t('alerts.case.deleteFailed'), 'error')
  }
}

// Restore a single form
const restoreForm = async (formId: string) => {
  try {
    await formApi.restoreForm({ formId })
    notifierStore.notify(t('alerts.form.restored'), 'success')
    fetchDeletedForms()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error restoring form:', errorMessage)
    notifierStore.notify(t('alerts.form.restoreFailed'), 'error')
  }
}

// Permanently delete a form
const permanentDeleteForm = async (formId: string) => {
  if (!confirm(t('alerts.form.confirmPermanentDelete'))) return

  try {
    await formApi.deleteForm({ formId })
    notifierStore.notify(t('alerts.form.permanentlyDeleted'), 'success')
    fetchDeletedForms()
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error permanently deleting form:', errorMessage)
    notifierStore.notify(t('alerts.form.deleteFailed'), 'error')
  }
}

// Load data on mount and watch tab changes
onMounted(() => {
  fetchDeletedPatients()
})

// Watch for tab changes
watch(activeTab, (newTab) => {
  if (newTab === 'deletedCases') {
    fetchDeletedCases()
  } else if (newTab === 'deletedForms') {
    fetchDeletedForms()
  }
})

</script>

<template>
  <v-container class="w-100">
    <v-card>
      <v-card-title class="text-h5">
        {{ t('admin.deletedItemsManagement.title') }}
      </v-card-title>

      <v-tabs v-model="activeTab" bg-color="primary">
        <v-tab value="deletedPatients">{{ t('admin.deletedItemsManagement.deletedPatients') }}</v-tab>
        <v-tab value="deletedCases" @click="fetchDeletedCases">{{ t('admin.deletedItemsManagement.deletedCases') }}</v-tab>
        <v-tab value="deletedForms" @click="fetchDeletedForms">{{ t('admin.deletedItemsManagement.deletedForms') }}</v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="activeTab">
          <!-- Deleted Patients Tab -->
          <v-tabs-window-item value="deletedPatients">
            <v-data-table
              :headers="[
                { title: t('forms.externalId'), key: 'externalPatientId', sortable: false },
                { title: t('forms.sex'), key: 'sex', sortable: false },
                { title: t('common.deletedAt'), key: 'deletedAt', sortable: false },
                { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
              ]"
              :items="deletedPatients"
              :items-length="patientsTotal"
              :items-per-page="patientsLimit"
              :page="patientsPage"
              hide-default-footer
              class="elevation-1">
              <template #item.externalPatientId="{ item }">
                {{ item.externalPatientId?.[0] || '-' }}
              </template>

              <template #item.sex="{ item }">
                {{ item.sex || '-' }}
              </template>

              <template #item.deletedAt="{ item }">
                {{ item.deletedAt ? new Date(item.deletedAt).toLocaleString() : '-' }}
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex justify-end ga-2">
                  <v-btn 
                    size="small" 
                    color="success" 
                    variant="text" 
                    icon="mdi-restore"
                    @click="restorePatient(item.id!)">
                  </v-btn>
                  <v-btn 
                    size="small" 
                    color="error" 
                    variant="text" 
                    icon="mdi-delete-forever"
                    @click="permanentDeletePatient(item.id!)">
                  </v-btn>
                </div>
              </template>

              <template #bottom>
                <div class="d-flex justify-center align-center pa-4">
                  <v-pagination
                    v-model="patientsPage"
                    :length="patientsTotalPages"
                    :total-visible="7"
                    @update:modelValue="fetchDeletedPatients">
                  </v-pagination>
                  <span class="ml-4 text-caption">
                    {{ t('pagination.showing', {
                      start: (patientsPage - 1) * patientsLimit + 1,
                      end: Math.min(patientsPage * patientsLimit, patientsTotal),
                      total: patientsTotal
                    }) }}
                  </span>
                </div>
              </template>
            </v-data-table>
          </v-tabs-window-item>

          <!-- Deleted Cases Tab -->
          <v-tabs-window-item value="deletedCases">
            <v-data-table
              :headers="[
                { title: t('forms.externalId'), key: 'externalId', sortable: false },
                { title: t('common.patient'), key: 'patient', sortable: false },
                { title: t('common.deletedAt'), key: 'deletedAt', sortable: false },
                { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
              ]"
              :items="deletedCases"
              :items-length="casesTotal"
              :items-per-page="casesLimit"
              :page="casesPage"
              hide-default-footer
              class="elevation-1">
              <template #item.externalId="{ item }">
                {{ item.externalId || '-' }}
              </template>

              <template #item.patient="{ item }">
                {{ typeof item.patient === 'string' ? item.patient : ((item.patient as any)?.externalPatientId?.[0] || '-') }}
              </template>

              <template #item.deletedAt="{ item }">
                {{ item.deletedAt ? new Date(item.deletedAt).toLocaleString() : '-' }}
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex justify-end ga-2">
                  <v-btn 
                    size="small" 
                    color="success" 
                    variant="text" 
                    icon="mdi-restore"
                    @click="restoreCase((item as any)._id || item.id)">
                  </v-btn>
                  <v-btn 
                    size="small" 
                    color="error" 
                    variant="text" 
                    icon="mdi-delete-forever"
                    @click="permanentDeleteCase(typeof item.patient === 'string' ? item.patient : ((item.patient as any)?.id || (item.patient as any)?._id), (item as any)._id || item.id)">
                  </v-btn>
                </div>
              </template>

              <template #bottom>
                <div class="d-flex justify-center align-center pa-4">
                  <v-pagination
                    v-model="casesPage"
                    :length="casesTotalPages"
                    :total-visible="7"
                    @update:modelValue="fetchDeletedCases">
                  </v-pagination>
                  <span class="ml-4 text-caption">
                    {{ t('pagination.showing', {
                      start: (casesPage - 1) * casesLimit + 1,
                      end: Math.min(casesPage * casesLimit, casesTotal),
                      total: casesTotal
                    }) }}
                  </span>
                </div>
              </template>
            </v-data-table>
          </v-tabs-window-item>

          <!-- Deleted Forms Tab -->
          <v-tabs-window-item value="deletedForms">
            <v-data-table
              :headers="[
                { title: t('forms.consultation.formTitle'), key: 'title', sortable: false },
                { title: t('common.consultation'), key: 'consultationId', sortable: false },
                { title: t('common.deletedBy'), key: 'deletedBy', sortable: false },
                { title: t('common.deletionReason'), key: 'deletionReason', sortable: false },
                { title: t('common.deletedAt'), key: 'deletedAt', sortable: false },
                { title: t('common.actions'), key: 'actions', sortable: false, align: 'end' }
              ]"
              :items="deletedForms"
              :items-length="formsTotal"
              :items-per-page="formsLimit"
              :page="formsPage"
              hide-default-footer
              class="elevation-1">
              <template #item.title="{ item }">
                {{ item.title || '-' }}
              </template>

              <template #item.consultationId="{ item }">
                {{ typeof item.consultationId === 'string' ? item.consultationId : ((item.consultationId as any)?.id || (item.consultationId as any)?._id || '-') }}
              </template>

              <template #item.deletedBy="{ item }">
                {{ typeof item.deletedBy === 'string' ? item.deletedBy : ((item.deletedBy as any)?.username || (item.deletedBy as any)?._id || '-') }}
              </template>

              <template #item.deletionReason="{ item }">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <span v-bind="props" class="text-truncate d-inline-block" style="max-width: 200px;">
                      {{ item.deletionReason || '-' }}
                    </span>
                  </template>
                  <span>{{ item.deletionReason || '-' }}</span>
                </v-tooltip>
              </template>

              <template #item.deletedAt="{ item }">
                {{ item.deletedAt ? new Date(item.deletedAt).toLocaleString() : '-' }}
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex justify-end ga-2">
                  <v-btn 
                    size="small" 
                    color="success" 
                    variant="text" 
                    icon="mdi-restore"
                    @click="restoreForm((item as any)._id || item.id)">
                  </v-btn>
                  <v-btn 
                    size="small" 
                    color="error" 
                    variant="text" 
                    icon="mdi-delete-forever"
                    @click="permanentDeleteForm((item as any)._id || item.id)">
                  </v-btn>
                </div>
              </template>

              <template #bottom>
                <div class="d-flex justify-center align-center pa-4">
                  <v-pagination
                    v-model="formsPage"
                    :length="formsTotalPages"
                    :total-visible="7"
                    @update:modelValue="fetchDeletedForms">
                  </v-pagination>
                  <span class="ml-4 text-caption">
                    {{ t('pagination.showing', {
                      start: (formsPage - 1) * formsLimit + 1,
                      end: Math.min(formsPage * formsLimit, formsTotal),
                      total: formsTotal
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
