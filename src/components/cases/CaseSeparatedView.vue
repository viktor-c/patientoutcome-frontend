<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDateFormat } from '@/composables/useDateFormat'
import { type Consultation, type Surgery, type GetAllPatientCases200ResponseResponseObjectInner, ResponseError } from '@/api'
import { surgeryApi, consultationApi } from '@/api'
import { useNotifierStore, useConsultationStore } from '@/stores/'
import CreateEditSurgeryDialog from '@/components/dialogs/CreateEditSurgeryDialog.vue'

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
  <!-- Surgeries Section -->
  <template v-if="caseItem.surgeries && caseItem.surgeries.length > 0">
    <tr>
      <td colspan="3" class="pa-4">
        <h4>{{ t('cases.surgeries') }}</h4>
      </td>
    </tr>
    <v-table hover>
      <thead>
        <tr>
          <th></th>
          <th class="text-left">{{ t('cases.table.surgeryDate') }}</th>
          <th class="text-left">{{ t('cases.table.therapy') }}</th>
          <th class="text-left">{{ t('cases.table.surgeons') }}</th>
          <th class="text-left">{{ t('cases.table.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(surgery, index) in caseItem.surgeries" :key="surgery.id || index">
          <td>{{ index + 1 }}</td>
          <td>{{ surgery.surgeryDate ? safeFormatDate(surgery.surgeryDate) : t('surgery.noDate') }}</td>
          <td>{{ surgery.therapy || t('surgery.noTherapy') }}</td>
          <td>
            <template v-if="surgery.surgeons && surgery.surgeons.length > 0">
              <span v-for="(surgeon, surgeonIndex) in surgery.surgeons" :key="surgeon.id || surgeonIndex">
                {{ surgeon.name || surgeon.username }}{{ surgeonIndex < surgery.surgeons.length - 1 ? ', ' : '' }}
                  </span>
            </template>
            <span v-else>{{ t('surgery.noSurgeons') }}</span>
          </td>
          <td>
            <v-btn size="small" color="primary" @click="editSurgery(surgery)">
              <v-icon icon="mdi-pencil"></v-icon>{{ t('buttons.editSurgery') }}
            </v-btn>
            <v-dialog max-width="500">
              <template v-slot:activator="{ props: activatorProps }">
                <v-btn class="text-right" v-bind="activatorProps" size="small" variant="plain" color="error">
                  <v-icon icon="mdi-trash-can"></v-icon>{{ t('buttons.deleteSurgery') }}
                </v-btn>
              </template>
              <template v-slot:default="{ isActive }">
                <v-card title="Dialog">
                  <v-card-text>
                    {{ t('alerts.surgery.confirmDelete', { surgeryId: surgery.id }) }}
                    <v-divider></v-divider>
                  </v-card-text>
                  <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn
                           color="error"
                           :text="t('buttons.confirmDelete')"
                           @click="caseItem.id && surgery.id && (isActive.value = false, deleteSurgery(caseItem.id, surgery.id))">
                    </v-btn>
                    <v-btn color="primary" :text="t('buttons.abortDeletion')" @click="isActive.value = false"></v-btn>
                  </v-card-actions>
                </v-card>
              </template>
            </v-dialog>
          </td>
        </tr>
        <tr>
          <td colspan="5">
            <v-btn size="small" color="success" @click="createNewSurgery()">
              <v-icon icon="mdi-plus"></v-icon>{{ t('buttons.createSurgery') }}
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </template>
  <template v-else>
    <tr>
      <td colspan="3" class="pa-4 text-center">
        <em>{{ t('cases.noSurgeries') }}</em>
        <br>
        <v-btn size="small" color="success" class="mt-2" @click="createNewSurgery()">
          <v-icon icon="mdi-plus"></v-icon>{{ t('buttons.createSurgery') }}
        </v-btn>
      </td>
    </tr>
  </template>

  <!-- Consultations Section -->
  <tr>
    <td colspan="3" class="pa-4">
      <h4>{{ t('cases.allConsultations') }}</h4>
    </td>
  </tr>
  <v-table hover>
    <thead>
      <tr>
        <th></th>
        <th class="text-left">{{ t('cases.table.date') }}</th>
        <th class="text-left">{{ t('cases.table.forms') }}</th>
        <th class="text-left">{{ t('cases.table.reason') }}</th>
        <th class="text-left">{{ t('cases.table.actions') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(consultation, index) in caseItem.consultations" :key="consultation.id || index">
        <td>{{ index + 1 }}</td>
        <td>{{ consultation.dateAndTime ? safeFormatDate(consultation.dateAndTime) : t('consultation.noDate') }}</td>
        <td>
          <template v-if="consultation.proms && consultation.proms.length > 0">
            <v-btn size="small" color="secondary"
                   @click="$router.push(`/consultation/forms/internal-code/${consultation.id}`)">
              <v-icon icon="mdi-file-document"></v-icon>{{ t('buttons.showForms') }}
            </v-btn>
          </template>
          <span v-else>{{ t('consultation.noForms') }}</span>
        </td>
        <td>
          <span v-for="reason in (consultation.reasonForConsultation || [])" :key="reason">
            {{ reason }}&nbsp;
          </span>
        </td>
        <td>
          <v-btn size="small" color="primary" @click="editConsultation(consultation)">
            <v-icon icon="mdi-pencil"></v-icon>{{ t('buttons.editConsultation') }}
          </v-btn>
          <v-dialog max-width="500">
            <template v-slot:activator="{ props: activatorProps }">
              <v-btn class="text-right" v-bind="activatorProps" size="small" variant="plain" color="error">
                <v-icon icon="mdi-trash-can"></v-icon>{{ t('buttons.deleteConsultation') }}
              </v-btn>
            </template>
            <template v-slot:default="{ isActive }">
              <v-card title="Dialog">
                <v-card-text>
                  {{ t('alerts.consultation.confirmDelete', { consultationId: consultation.id }) }}
                  <v-divider></v-divider>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn
                         color="error"
                         :text="t('buttons.confirmDelete')"
                         @click="caseItem.id && consultation.id && (isActive.value = false, deleteConsultation(caseItem.id, consultation.id))">
                  </v-btn>
                  <v-btn color="primary" :text="t('buttons.abortDeletion')" @click="isActive.value = false"></v-btn>
                </v-card-actions>
              </v-card>
            </template>
          </v-dialog>
        </td>
      </tr>
      <tr>
        <td colspan="5">
          <v-btn size="small" color="primary"
                 @click="$router.push(`/consultation/patient/${patientId}/case/${caseItem.id}/consultation/new`)">
            <v-icon icon="mdi-plus"></v-icon>{{ t('buttons.consultation') }}
          </v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>

  <!-- Surgery Dialog -->
  <v-dialog v-model="showSurgeryDialog" max-width="800px" :close-on-back="true">
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
