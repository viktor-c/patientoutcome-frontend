<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        <h2>{{ t('kioskList.title') }}</h2>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="kioskUsers"
          :loading="loading"
          :items-per-page="10"
          class="elevation-1"
        >
          <template v-slot:[`item.username`]="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.username }}</div>
            </div>
          </template>

          <template v-slot:[`item.consultation`]="{ item }">
            <div v-if="item.consultationId && consultationCache[item.consultationId]">
              <div>{{ formatConsultationInfo(consultationCache[item.consultationId]) }}</div>
              <div class="text-caption text-grey">
                {{ formatDate(consultationCache[item.consultationId]?.dateAndTime) }}
              </div>
            </div>
            <div v-else-if="item.consultationId" class="text-grey">
              <v-progress-circular indeterminate size="24"></v-progress-circular>
            </div>
            <span v-else class="text-grey">{{ t('kioskList.notAssigned') }}</span>
          </template>

          <template v-slot:[`item.status`]="{ item }">
            <v-chip
              v-if="item.consultationId && consultationCache[item.consultationId]"
              :color="getStatusColor(consultationCache[item.consultationId])"
              size="small"
              variant="flat"
            >
              {{ getStatusText(consultationCache[item.consultationId]) }}
            </v-chip>
            <span v-else class="text-grey">-</span>
          </template>

          <template v-slot:[`item.actions`]="{ item }">
            <v-btn
              v-if="item.consultationId"
              color="error"
              size="small"
              variant="text"
              prepend-icon="mdi-delete"
              :loading="revokingUserId === item.id"
              @click="revokeKiosk(item)"
            >
              {{ t('kioskList.revoke') }}
            </v-btn>
            <span v-else class="text-grey text-caption">{{ t('kioskList.notAssigned') }}</span>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { type UserNoPassword, type Consultation } from '@/api'
import { kioskApi, consultationApi } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'

const { t } = useI18n()
const notifierStore = useNotifierStore()

const kioskUsers = ref<UserNoPassword[]>([])
const consultationCache = ref<Record<string, Consultation | null>>({})
const loading = ref(false)
const revokingUserId = ref<string | null>(null)

const headers = [
  { title: t('kioskList.kioskUser'), key: 'username', sortable: true },
  { title: t('kioskList.consultation'), key: 'consultation', sortable: false },
  { title: t('kioskList.status'), key: 'status', sortable: false },
  { title: t('kioskList.actions'), key: 'actions', sortable: false, align: 'end' as const }
]

const fetchKiosks = async () => {
  loading.value = true
  try {
    const response = await kioskApi.getAllKiosks()
    kioskUsers.value = response.responseObject || []

    // Fetch consultation details for each assigned kiosk user
    const consultationsToFetch = kioskUsers.value.filter((user) => user.consultationId)

    for (const user of consultationsToFetch) {
      if (user.consultationId && !consultationCache.value[user.consultationId]) {
        try {
          const consultationResponse = await consultationApi.getConsultationById({
            consultationId: user.consultationId
          })
          consultationCache.value[user.consultationId] =
            (consultationResponse.responseObject as unknown as Consultation) || null
        } catch (error) {
          console.error(`Failed to fetch consultation ${user.consultationId}:`, error)
          consultationCache.value[user.consultationId] = null
        }
      }
    }
  } catch (error: unknown) {
    console.error('Failed to fetch kiosk users:', error)
    notifierStore.notify(t('kioskList.fetchError'), 'error')
  } finally {
    loading.value = false
  }
}

const revokeKiosk = async (user: UserNoPassword) => {
  if (!user.id) return

  const confirmed = confirm(t('kioskList.confirmRevoke', { name: user.name }))
  if (!confirmed) return

  revokingUserId.value = user.id
  try {
    await kioskApi.deleteConsultationFor({
      kioskUserId: user.id
    })
    notifierStore.notify(t('kioskList.revokeSuccess'), 'success')
    await fetchKiosks() // Refresh the list
  } catch (error: unknown) {
    console.error('Failed to revoke kiosk:', error)
    notifierStore.notify(t('kioskList.revokeError'), 'error')
  } finally {
    revokingUserId.value = null
  }
}

const formatConsultationInfo = (consultation: Consultation | null): string => {
  if (!consultation) return 'N/A'

  // Show patient external ID from the patient case, or consultation ID
  if (consultation.patientCaseId) {
    const patientCaseIdStr = consultation.patientCaseId as string | { patient?: { externalPatientId?: string[] } }
    if (typeof patientCaseIdStr === 'object' && patientCaseIdStr.patient?.externalPatientId) {
      const externalIds = patientCaseIdStr.patient.externalPatientId
      if (Array.isArray(externalIds) && externalIds.length > 0) {
        return `Patient: ${externalIds[0]}`
      } else if (typeof externalIds === 'string') {
        return `Patient: ${externalIds}`
      }
    }

    // Fallback to case ID if available
    if (
      typeof patientCaseIdStr === 'object' &&
      'externalId' in patientCaseIdStr &&
      patientCaseIdStr.externalId
    ) {
      return `Case: ${patientCaseIdStr.externalId}`
    }
  }
  return `ID: ${consultation.id || 'N/A'}`
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

const getStatusColor = (consultation: Consultation | null): string => {
  if (!consultation) return 'grey'
  // Check if any forms are completed
  if (consultation.proms?.length > 0) {
    const hasCompleted = consultation.proms.some(
      (p) => (p as Record<string, unknown>).formFillStatus === 'completed'
    )
    if (hasCompleted) return 'success'
  }
  return 'primary'
}

const getStatusText = (consultation: Consultation | null): string => {
  if (!consultation) return t('kioskList.statusInactive')
  if (consultation.proms?.length > 0) {
    const hasCompleted = consultation.proms.some(
      (p) => (p as Record<string, unknown>).formFillStatus === 'completed'
    )
    if (hasCompleted) return t('kioskList.statusCompleted')
  }
  return t('kioskList.statusActive')
}

onMounted(() => {
  fetchKiosks()
})
</script>

<style scoped>
.text-caption {
  font-size: 0.75rem;
}

.text-grey {
  color: #757575;
}
</style>
