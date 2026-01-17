<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDateFormat } from '@/composables/useDateFormat'
import { type Consultation, type Surgery, type GetAllPatientCases200ResponseResponseObjectInner, ResponseError } from '@/api'
import { surgeryApi, consultationApi } from '@/api'
import { useNotifierStore, useConsultationStore } from '@/stores/'
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'

// Combined item interface
interface CombinedItem {
  type: 'consultation' | 'surgery'
  data: Consultation | Surgery
  date: string | null
}

// Props
interface Props {
  caseItem: GetAllPatientCases200ResponseResponseObjectInner & {
    consultations?: Consultation[]
  }
  patientId: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  refreshCases: []
}>()

const { t } = useI18n()
const router = useRouter()
const { formatLocalizedCustomDate } = useDateFormat()
const notifierStore = useNotifierStore()
const consultationStore = useConsultationStore()

// Surgery dialog state
const showSurgeryDialog = ref(false)
const selectedSurgery = ref<Surgery | null>(null)

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = 'DD.MM.YYYY HH:mm'): string => {
  if (!date) return 'N/A'
  return formatLocalizedCustomDate(date, format)
}

// Generate combined items for chronological view
const combinedItems = computed(() => {
  const items: CombinedItem[] = []

  // Add consultations
  if (props.caseItem.consultations) {
    props.caseItem.consultations.forEach(consultation => {
      items.push({
        type: 'consultation',
        data: consultation,
        date: consultation.dateAndTime
      })
    })
  }

  // Add surgeries
  if (props.caseItem.surgeries) {
    props.caseItem.surgeries.forEach(surgery => {
      items.push({
        type: 'surgery',
        data: surgery,
        date: surgery.surgeryDate
      })
    })
  }

  // Sort by date (newest first)
  items.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return items
})

// Delete a consultation
const deleteConsultation = async (caseId: string, consultationId: string) => {
  try {
    await consultationApi.deleteConsultation({ consultationId })
    console.log('Consultation deleted successfully:', consultationId)
    notifierStore.notify(t('alerts.consultation.deleted'), 'success')
    emit('refreshCases')
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error deleting consultation:', errorMessage)
    notifierStore.notify(t('alerts.consultation.deletionFailed'), 'error')
  }
}

// Delete a surgery
const deleteSurgery = async (caseId: string, surgeryId: string) => {
  try {
    await surgeryApi.deleteSurgeryById({ surgeryId })
    console.log('Surgery deleted successfully:', surgeryId)
    notifierStore.notify(t('alerts.surgery.deleted'), 'success')
    emit('refreshCases')
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Error deleting surgery:', errorMessage)
    notifierStore.notify(t('alerts.surgery.deletionFailed'), 'error')
  }
}

// Edit a surgery
const editSurgery = (surgery: Surgery) => {
  selectedSurgery.value = surgery
  showSurgeryDialog.value = true
}

// Create a new surgery
const createNewSurgery = () => {
  selectedSurgery.value = null
  showSurgeryDialog.value = true
}

// Handle surgery dialog submit
const handleSurgerySubmit = () => {
  showSurgeryDialog.value = false
  selectedSurgery.value = null
  emit('refreshCases')
}

// Handle surgery dialog cancel
const handleSurgeryCancel = () => {
  showSurgeryDialog.value = false
  selectedSurgery.value = null
}

// Edit a consultation
const editConsultation = (consultation: Consultation) => {
  consultationStore.setConsultation(consultation)
  router.push(`/consultation/patient/${props.patientId}/case/${props.caseItem.id}/consultation/${consultation.id}`)
}
</script>

<template>
  <tr>
    <td colspan="3" class="pa-4">
      <h4>{{ t('cases.chronological') }}</h4>
    </td>
  </tr>
  <v-table hover>
    <thead>
      <tr>
        <th></th>
        <th class="text-left">{{ t('cases.table.type') }}</th>
        <th class="text-left">{{ t('cases.table.date') }}</th>
        <th class="text-left">{{ t('cases.table.description') }}</th>
        <th class="text-left">{{ t('cases.table.actions') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, index) in combinedItems" :key="`${item.type}-${item.data.id || index}`">
        <td>{{ index + 1 }}</td>
        <td>
          <v-chip :color="item.type === 'surgery' ? 'red' : 'blue'" size="small">
            <v-icon :icon="item.type === 'surgery' ? 'mdi-medical-bag' : 'mdi-account-heart'"></v-icon>
            {{ item.type === 'surgery' ? t('buttons.surgery') : t('buttons.consultation') }}
          </v-chip>
        </td>
        <td>{{ item.date ? safeFormatDate(item.date) : 'N/A' }}</td>
        <td>
          <template v-if="item.type === 'surgery'">
            {{ (item.data as Surgery).therapy || t('surgery.unnamedSurgery') }}
          </template>
          <template v-else>
            <span v-for="reason in ((item.data as Consultation).reasonForConsultation || [])" :key="reason">
              {{ reason }}&nbsp;
            </span>
          </template>
        </td>
        <td>
          <template v-if="item.type === 'surgery'">
            <v-btn size="small" color="primary" @click="editSurgery(item.data as Surgery)">
              <v-icon icon="mdi-pencil"></v-icon>{{ t('buttons.editSurgery') }}
            </v-btn>
            <v-btn size="small" variant="plain" color="error"
                   @click="deleteSurgery(caseItem.id!, (item.data as Surgery).id!)">
              <v-icon icon="mdi-trash-can"></v-icon>{{ t('buttons.deleteSurgery') }}
            </v-btn>
          </template>
          <template v-else>
            <v-btn size="small" color="primary" @click="editConsultation(item.data as Consultation)">
              <v-icon icon="mdi-pencil"></v-icon>{{ t('buttons.editConsultation') }}
            </v-btn>
            <v-btn size="small" variant="plain" color="error"
                   @click="deleteConsultation(caseItem.id!, (item.data as Consultation).id!)">
              <v-icon icon="mdi-trash-can"></v-icon>{{ t('buttons.deleteConsultation') }}
            </v-btn>
          </template>
        </td>
      </tr>
      <tr>
        <td colspan="5">
          <v-btn size="small" color="primary"
                 @click="$router.push(`/consultation/patient/${patientId}/case/${caseItem.id}/consultation/new`)">
            <v-icon icon="mdi-plus"></v-icon>{{ t('buttons.consultation') }}
          </v-btn>
          <v-btn size="small" color="success" class="ml-2" @click="createNewSurgery()">
            <v-icon icon="mdi-plus"></v-icon>{{ t('buttons.createSurgery') }}
          </v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>

  <!-- Surgery Dialog -->
  <v-dialog v-model="showSurgeryDialog" max-width="800px" persistent>
    <CreateEditSurgeryDialog
                             :patient-case-id="caseItem.id!"
                             :surgery="selectedSurgery"
                             :patient-case-data="caseItem"
                             @submit="handleSurgerySubmit"
                             @cancel="handleSurgeryCancel" />
  </v-dialog>
</template>

<style scoped>
.v-btn {
  text-transform: none !important;
}
</style>
