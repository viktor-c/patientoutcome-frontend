<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ResponseError, type Consultation, type FindAllCodes200ResponseResponseObjectInnerConsultationId } from '@/api'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import DashboardSearchDialog from '@/components/dialogs/DashboardSearchDialog.vue'

import { consultationApi } from '@/api'
import { patientCaseApi } from '@/api'
import { useUserStore } from '@/stores/userStore'
const userStore = useUserStore()

const selectedDate = ref([new Date().setDate(new Date().getDate() - Number(userStore.daysBeforeConsultations || 7)), new Date().setDate(new Date().getDate() + 7)]) // Default to today and 1 week in the future

const { t, locale } = useI18n()
const router = useRouter()
const { formatLocalizedCustomDate } = useDateFormat()

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = 'DD.MM.YYYY'): string => {
  if (!date) return 'N/A'
  return formatLocalizedCustomDate(date, format)
}

const consultations = ref<FindAllCodes200ResponseResponseObjectInnerConsultationId[]>([])

// Full headers for desktop, reduced set for small screens
const desktopHeaders = [
  { title: t('dashboard.date'), value: 'dateAndTime', sortable: true },
  { title: t('forms.patient.externalId'), value: 'patientExternalIds', align: 'start' as const, sortable: true },
  { title: t('dashboard.mainDiagnosis'), value: 'patientCaseId.mainDiagnosis', sortable: true },
  { title: t('dashboard.patientCase'), value: 'patientCaseId' },
  { title: t('dashboard.forms'), value: 'forms', align: 'end' as const, sortable: false, key: 'data-table-expand' },
  { title: t('dashboard.actions'), key: 'actions', align: 'end' as const, sortable: false },
]

const mobileHeaders = [
  { title: t('forms.patient.externalId'), value: 'patientExternalIds', align: 'start' as const },
  { title: t('dashboard.date'), value: 'dateAndTime' },
  { title: t('dashboard.actions'), key: 'actions', align: 'end' as const },
]

// reactive headers switch based on window width
const headers = ref(window.innerWidth < 700 ? mobileHeaders : desktopHeaders)

// Listen for resize to toggle header set
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    headers.value = window.innerWidth < 700 ? mobileHeaders : desktopHeaders
  })
}

const openConsultation = (id: string | null | undefined) => {
  if (id) {
    router.push({ name: 'consultationoverview', params: { consultationId: id } })
  }
}

// Navigate to creation flow to start a new patient/case/consultation
const startCreationFlow = () => {
  router.push({ name: 'creation-flow' })
}

// Called when a table row is clicked. We keep this separate so we can stop
// propagation on individual action controls (icons/buttons) and still allow
// clicking the row to open the consultation.
const onRowClick = (_evt: Event, item: unknown) => {
  openConsultation((item as { item: Consultation }).item?.id)
}


// Extract patient-level external IDs (comma-separated) from the consultation item when available.
// Backend now populates `patientCaseId.patient.externalPatientId`.
const getPatientExternalIds = (item: unknown): string => {
  const obj = item as Record<string, unknown>
  const pc = obj['patientCaseId'] as Record<string, unknown> | undefined
  const patient = pc?.['patient'] as Record<string, unknown> | undefined
  const ext = patient?.['externalPatientId'] as unknown
  if (!ext) return ''
  if (Array.isArray(ext)) return (ext as unknown[]).map(String).join(', ')
  return String(ext)
}

// Return a comma-separated string of external IDs for the consultation's patient case.
// Backend now populates `patientCaseId.externalId` when available.
const getPatientCaseExternalIds = (item: unknown): string => {
  const obj = item as Record<string, unknown>
  const pc = obj['patientCaseId'] as Record<string, unknown> | undefined
  const ext = pc?.['externalId'] as unknown
  if (!ext) return ''
  if (Array.isArray(ext)) return (ext as unknown[]).map(String).join(', ')
  return String(ext)
}

const openPatientOverviewFromCase = async (caseId: string | null | undefined) => {
  if (!caseId) return

  try {
    const response = await patientCaseApi.getPatientCaseById({ caseId })
    const patientId = response.responseObject?.patient?.id
    if (patientId) {
      router.push({ name: 'patientoverview', params: { patientId } })
    } else {
      console.warn('Patient ID not found in case response')
    }
  } catch (error) {
    console.error('Error fetching patient case:', error)
  }
}

// Computed placeholder for date picker
const datePickerPlaceholder = computed(() => {
  const isDateCleared = !selectedDate.value || selectedDate.value.length === 0 ||
    (Array.isArray(selectedDate.value) && selectedDate.value.every(date => date == null))

  return isDateCleared
    ? t('dashboard.showingAllFutureConsultations', { start: formatLocalizedCustomDate(new Date(new Date().setDate(new Date().getDate() - Number(userStore.daysBeforeConsultations || 7))), 'DD.MM.YYYY') })
    : t('dashboard.selectDateRange')
})

const fetchConsultations = async () => {
  try {
    let start: string
    let end: string

    // Check if date is cleared (null, undefined, or empty array)
    if (!selectedDate.value || selectedDate.value.length === 0 ||
      (Array.isArray(selectedDate.value) && selectedDate.value.every(date => date == null))) {
      // When date is cleared, show all future consultations from the past week and onwards
      // use per-user setting for how many days to look back
      const daysBefore = Number(userStore.daysBeforeConsultations || 7)
      start = new Date(new Date().setDate(new Date().getDate() - daysBefore)).toISOString()
      end = new Date(2099, 11, 31).toISOString()
      console.log('Date cleared - fetching all future consultations from the past week onwards')
    } else {
      // Use selected date range or fallback to defaults
      start = selectedDate.value[0] ? new Date(selectedDate.value[0]).toISOString() : new Date().toISOString()
      end = selectedDate.value[1] ? new Date(selectedDate.value[1]).toISOString() : new Date(2099, 11, 31).toISOString()
    }

    console.log(`Fetching consultations from ${start} to ${end}`)

    const response = await consultationApi.getAllConsultationsOnDay({ fromDate: start, toDate: end })
    consultations.value = response.responseObject || []
    console.log('Consultations fetched successfully:', consultations.value)
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error fetching consultations:', errorMessage)
    consultations.value = []
  }
}

onMounted(async () => {
  try {
    await fetchConsultations()
    console.log('Mounted and consultations fetched')
  } catch (error) {
    console.error('Error during component mount:', error)
  }
})
</script>

<template>
  <v-container>
    <h1 class="mb-4">{{ t('dashboard.title') }}</h1>

    <!-- Date Picker and Search -->

    <v-row class="align-center">
      <v-col cols="12" sm="6" md="4">
        <VueDatePicker
                       :title="datePickerPlaceholder"
                       v-model="selectedDate"
                       multi-calendars
                       :locale="locale"
                       week-num-name="Wo"
                       format="dd.MM.yyyy"
                       week-numbers="iso"
                       :cancelText="t('buttons.cancelTimeDateText')"
                       :selectText="t('buttons.selectTimeDateText')"
                       :placeholder="datePickerPlaceholder"
                       range
                       clearable
                       @update:model-value="fetchConsultations"
                       @cleared="fetchConsultations">
        </VueDatePicker>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <DashboardSearchDialog />
      </v-col>
      <v-col cols="12" sm="6" md="4" class="d-flex justify-end">
        <v-btn
               color="primary"
               variant="elevated"
               prepend-icon="mdi-creation"
               @click="startCreationFlow">
          {{ t('buttons.startCreationFlow') }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- data table -->
    <v-data-table
                  :items="consultations"
                  :headers="headers"
                  @click:row="onRowClick"
                  show-expand
                  hover
                  density="compact"
                  :sort-by="[{ key: 'dateAndTime' }]"
                  :sort-desc="[true]">
      <template v-slot:[`item.data-table-expand`]="{ internalItem, isExpanded, toggleExpand }">
        <v-btn
               v-if="internalItem.raw.proms && internalItem.raw.proms.length > 0"
               :append-icon="isExpanded(internalItem) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
               :text="isExpanded(internalItem) ? 'Collapse' : `Show (${internalItem.raw.proms.length}) Forms`"
               class="text-none"
               color="medium-emphasis"
               size="small"
               variant="text"
               border
               slim
               @click="toggleExpand(internalItem)"></v-btn>
      </template>

      <template v-slot:expanded-row="{ columns, item }">
        <tr>
          <td :colspan="columns.length" class="py-2">
            <v-sheet rounded="lg" border>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <th>Form</th>
                    <th>Completion Status</th>
                    <th>Score</th>
                  </tr>

                  <tr v-for="(form, index) in item.proms || []" :key="(form as any).id || index">
                    <td>
                      Review <RouterLink v-if="(form as any).id" :to="`/review-form/${(form as any).id}`">
                        {{ (form as any).title || t('forms.consultation.untitledForm') }}</RouterLink>
                      <span v-else>{{ t('forms.consultation.untitledForm') }}</span>
                    </td>
                    <td>
                      {{ form.formFillStatus === "completed" ?
                        `Completed at ${safeFormatDate(form.completedAt)}`
                        : 'Not completed' }}
                    </td>
                    <td>{{ form.scoring?.total?.rawScore || 'N/A' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-sheet>
          </td>
        </tr>
      </template>

      <template v-slot:[`item.patientExternalIds`]="{ item }">
        <v-btn
               variant="text"
               color="primary"
               class="text-none pa-0"
               style="min-width: auto; height: auto;"
               @click.stop="openPatientOverviewFromCase((item.patientCaseId as any)?._id || item.patientCaseId)">
          <span class="text-truncate" style="max-width: 160px; display: inline-block; vertical-align: middle;">
            {{ getPatientExternalIds(item) || t('common.notAvailable') }}
          </span>
        </v-btn>
      </template>
      <template v-slot:[`item.patientCaseId`]="{ item }">
        <div v-if="item.patientCaseId" class="d-flex flex-column gap-1">
          <RouterLink
                      @click.stop
                      :to="{ name: 'patientcaselanding', params: { caseId: (item.patientCaseId as any)?._id || item.patientCaseId } }"
                      class="text-caption">

            {{ getPatientCaseExternalIds(item) || ((item.patientCaseId as any)?._id || item.patientCaseId) }}
          </RouterLink>
        </div>
        <span v-else>{{ t('dashboard.noPatientCase') }}</span>
      </template>
      <template v-slot:[`item.dateAndTime`]="{ item }">
        {{ safeFormatDate(item.dateAndTime) }}
      </template>

      <template v-slot:[`item.actions`]="{ item }">
        <v-tooltip :text="t('dashboard.openConsultation')" location="top">
          <template v-slot:activator="{ props }">
            <v-icon v-bind="props" color="medium-emphasis" icon="mdi-book-open-variant" size="small"
                    @click.stop="openConsultation(item.id)" class="me-1"></v-icon>
          </template>
        </v-tooltip>
      </template>
    </v-data-table>
  </v-container>
</template>
