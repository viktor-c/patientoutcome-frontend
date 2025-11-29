<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import { consultationApi } from '@/api'
import type {
  GetAllConsultations200Response,
  FindAllCodes200ResponseResponseObjectInnerConsultationId as Consultation,
  FindAllCodes200ResponseResponseObjectInnerConsultationIdNotesInner as ConsultationNote
} from '@/api'

const { t } = useI18n()
const { formatLocalizedCustomDate } = useDateFormat()

// Props
const props = defineProps<{
  caseId: string | null | undefined
  patientId: string
}>()

// Emits
const emit = defineEmits<{
  'open-consultation': [consultationId: string | null | undefined],
  'update-consultations': [],
  'create-consultation': []
}>()

// State
const consultations = ref<Consultation[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = 'DD.MM.YYYY HH:mm'): string => {
  if (!date) return t('common.notAvailable')
  return formatLocalizedCustomDate(date, format)
}

// Helper functions
const getConsultationStatusColor = (consultation: Consultation): string => {
  const formCount = consultation.proms?.length || 0
  const completedForms = consultation.proms?.filter((form) => form.formFillStatus === 'completed').length || 0

  if (formCount === 0) return 'grey'
  if (completedForms === formCount) return 'success'
  if (completedForms > 0) return 'warning'
  return 'info'
}

const getConsultationStatusText = (consultation: Consultation): string => {
  const formCount = consultation.proms?.length || 0
  const completedForms = consultation.proms?.filter((form) => form.formFillStatus === 'completed').length || 0

  if (formCount === 0) return t('patientOverview.noForms')
  return `${completedForms}/${formCount} ${t('patientOverview.formsCompleted')}`
}

const formatNotesList = (notes: ConsultationNote[] | undefined): string => {
  if (!notes || notes.length === 0) return t('patientOverview.noNotes')
  return notes.map(note => {
    const noteObj = note as unknown as Record<string, unknown>
    const content = noteObj.content || noteObj.text || 'No content'
    const createdAt = noteObj.createdAt || noteObj.date || 'No date'
    return `${content} (${createdAt})`
  }).join(', ')
}

// Helper function to safely extract consultation ID
const getConsultationId = (consultation: Consultation): string => {
  if (typeof consultation.id === 'string') {
    return consultation.id
  } else if (typeof consultation.id === 'object' && consultation.id !== null) {
    const idObj = consultation.id as Record<string, unknown>
    return String(idObj._id || idObj.id || consultation.id)
  } else {
    return String(consultation.id)
  }
}

// Computed
const sortedConsultations = computed(() => {
  return [...consultations.value].sort((a, b) => {
    const dateA = new Date(a.dateAndTime || '').getTime()
    const dateB = new Date(b.dateAndTime || '').getTime()
    return dateB - dateA // Most recent first
  })
})

// Methods
const fetchConsultations = async () => {
  if (!props.caseId) {
    consultations.value = []
    return
  }

  loading.value = true
  error.value = null

  try {
    const response: GetAllConsultations200Response = await consultationApi.getAllConsultations({
      caseId: props.caseId
    })

    if (response.success && response.responseObject) {
      consultations.value = response.responseObject
    } else {
      consultations.value = []
      error.value = response.message || t('common.errorLoadingData')
    }
  } catch (err: unknown) {
    console.error('Error fetching consultations:', err)
    error.value = err instanceof Error ? err.message : t('common.errorLoadingData')
    consultations.value = []
  } finally {
    loading.value = false
  }
}

const refreshConsultations = async () => {
  await fetchConsultations()
  emit('update-consultations')
}

// Lifecycle
onMounted(async () => {
  await fetchConsultations()
})

// Watch for caseId changes
watch(
  () => props.caseId,
  () => {
    fetchConsultations()
  }
)

// Expose refresh method for parent components
defineExpose({
  refreshConsultations
})
</script>

<template>
  <v-card variant="outlined">
    <v-card-title class="text-h6">
      <div class="d-flex align-center w-100">
        <v-icon class="me-2">mdi-calendar-multiple</v-icon>
        {{ t('patientOverview.consultations') }}
        <v-chip size="small" class="ms-2">{{ consultations.length }}</v-chip>
        <v-spacer />
        <v-btn
               icon="mdi-plus"
               variant="text"
               size="small"
               @click="$emit('create-consultation')"
               class="ms-2">
        </v-btn>
        <v-btn
               icon="mdi-refresh"
               variant="text"
               size="small"
               :loading="loading"
               @click="refreshConsultations"
               class="ms-2">
        </v-btn>
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="mt-2 text-medium-emphasis">{{ t('common.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-4">
        <v-icon color="error" size="48">mdi-alert-circle</v-icon>
        <p class="mt-2 text-error">{{ error }}</p>
        <v-btn
               color="primary"
               variant="outlined"
               size="small"
               @click="fetchConsultations"
               class="mt-2">
          {{ t('common.retry') }}
        </v-btn>
      </div>

      <!-- Empty State -->
      <div v-else-if="!consultations.length" class="text-center py-4">
        <v-icon color="grey" size="48">mdi-calendar-blank</v-icon>
        <p class="mt-2 text-medium-emphasis">{{ t('patientOverview.noConsultations') }}</p>
      </div>

      <!-- Consultations Timeline -->

      <div v-else
           v-for="(consultation, consultationIndex) in sortedConsultations"
           :key="getConsultationId(consultation) || `consultation-${consultationIndex}`"
           :dot-color="getConsultationStatusColor(consultation)"
           size="small">

        <div class="text-caption text-medium-emphasis">

        </div>

        <v-card variant="outlined" size="small" class="mb-2">
          <v-card-title>
            <div class="d-flex align-center justify-space-between mb-2">{{ safeFormatDate(consultation.dateAndTime,
              'DD.MM.YY') }}
              <div class="text-subtitle-2">
                {{ t('patientOverview.consultation') }} #
                <RouterLink
                            class="consultation-id-link"
                            :to="{ name: 'consultationoverview', params: { consultationId: getConsultationId(consultation) } }">
                  {{ getConsultationId(consultation) }}
                </RouterLink>
              </div>
              <v-chip
                      :color="getConsultationStatusColor(consultation)"
                      size="x-small">
                {{ getConsultationStatusText(consultation) }}
              </v-chip>
            </div>
          </v-card-title>
          <v-card-text class="pa-3">



            <div class="text-body-2 mb-2">
              <strong>{{ t('patientOverview.dateTime') }}:</strong>
              {{ safeFormatDate(consultation.dateAndTime) }}
            </div>

            <div class="text-body-2 mb-2" v-if="consultation.reasonForConsultation?.length">
              <strong>{{ t('patientOverview.reason') }}:</strong>
              <div class="mt-1">
                <v-chip
                        v-for="reason in consultation.reasonForConsultation"
                        :key="reason"
                        size="x-small"
                        class="me-1">
                  {{ reason }}
                </v-chip>
              </div>
            </div>

            <div class="text-body-2 mb-2" v-if="consultation.visitedBy?.length">
              <strong>{{ t('patientOverview.visitedBy') }}:</strong>
              <div class="mt-1">
                <v-chip
                        v-for="(visitor, visitorIndex) in consultation.visitedBy"
                        :key="visitorIndex"
                        size="x-small"
                        color="info"
                        class="me-1">
                  {{ typeof visitor === 'string' ? visitor : `Visitor ${visitorIndex + 1}` }}
                </v-chip>
              </div>
            </div>

            <div class="text-body-2 mb-2" v-if="consultation.notes?.length">
              <strong>{{ t('patientOverview.notes') }}:</strong>
              {{ formatNotesList(consultation.notes) }}
            </div>

            <!-- Forms -->
            <div v-if="consultation.proms?.length" class="mt-3">
              <div class="text-caption text-medium-emphasis mb-2">
                {{ t('patientOverview.forms') }}:
              </div>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                        v-for="(form, formIndex) in consultation.proms"
                        :key="form.id || `form-${formIndex}`"
                        size="x-small"
                        :color="form.formFillStatus === 'completed' ? 'success' : 'warning'"
                        class="me-1">
                  {{ form.title || t('patientOverview.unnamedForm') }}
                  <template
                            v-if="form.scoring?.total !== undefined && form.scoring?.total !== null && form.scoring.total.rawScore !== undefined && form.scoring.total.rawScore !== null">
                    ({{ form.scoring?.total.rawScore }})
                  </template>
                </v-chip>
              </div>
            </div>

            <div class="d-flex justify-end mt-3">
              <v-btn
                     color="primary"
                     variant="text"
                     size="small">
                <RouterLink
                            :to="{ name: 'consultationoverview', params: { consultationId: getConsultationId(consultation) } }">
                  {{ t('patientOverview.viewDetails') }}
                </RouterLink>
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.v-timeline {
  /* Allow the timeline to expand and use the page (window) scrollbar
     instead of creating its own internal scrollbar. */
  max-height: none;
  overflow: visible;
}

.v-chip {
  font-weight: 500;
}

.text-h6 {
  font-weight: 600;
}
</style>
