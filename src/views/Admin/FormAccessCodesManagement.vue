<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { codeApi, consultationApi, patientCaseApi, resetConsultationFormsByCode, setCodeActivationStart } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import type { ApiCode } from '@/types'
import { ResponseError } from '@/api'
import { useDateFormat } from '@/composables/useDateFormat'

const { t, locale } = useI18n()
const router = useRouter()
const notifierStore = useNotifierStore()
const { formatLocalizedDate, dateFormats, getLocalizedDayjs } = useDateFormat()

const loading = ref(false)
const rows = ref<ApiCode[]>([])
const actionLoadingCode = ref<string | null>(null)
const search = ref('')
const showActivationStartDialog = ref(false)
const selectedCodeForActivationStart = ref<ApiCode | null>(null)
const activationStartInput = ref<Date | null>(null)
const showDeleteDialog = ref(false)
const selectedCodeForDelete = ref<ApiCode | null>(null)
const showAssignConsultationDialog = ref(false)
const selectedCodeForAssign = ref<ApiCode | null>(null)
const assignSearchQuery = ref('')
const assignResults = ref<Array<{ id: string; label: string }>>([])
const selectedConsultationIdForAssign = ref<string | null>(null)
const searchingAssignConsultation = ref(false)
const showResetDialogStep1 = ref(false)
const showResetDialogStep2 = ref(false)
const selectedCodeForReset = ref<ApiCode | null>(null)

const headers = computed(() => [
  { title: t('admin.formAccessCodes.table.code'), key: 'code', sortable: true },
  { title: t('admin.formAccessCodes.table.activatedOn'), key: 'activatedOn', sortable: true },
  { title: t('admin.formAccessCodes.table.expiresOn'), key: 'expiresOn', sortable: true },
  { title: t('admin.formAccessCodes.table.consultation'), key: 'consultation', sortable: false },
  { title: t('admin.formAccessCodes.table.actions'), key: 'actions', sortable: false },
])

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return formatLocalizedDate(value, dateFormats.dateTime)
}

const toDateTimePickerValue = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const consultationIdForCode = (code: ApiCode): string | null => {
  const consultationId = code.consultationId?.id
  if (!consultationId) return null
  return consultationId
}

const hasConsultationLink = (code: ApiCode) => !!consultationIdForCode(code)
const isCodeActive = (code: ApiCode) => !!code.activatedOn
const canManageAssignedCode = (code: ApiCode) => hasConsultationLink(code) && isCodeActive(code)
const canAssignConsultation = (code: ApiCode) => !hasConsultationLink(code)

const consultationLabel = (code: ApiCode) => {
  const consultationDate = code.consultationId?.dateAndTime
  const consultationId = consultationIdForCode(code)

  if (!consultationId) return '-'
  if (!consultationDate) return consultationId

  return `${consultationId} (${formatDateTime(consultationDate)})`
}

const loadCodes = async () => {
  loading.value = true
  try {
    const response = await codeApi.findAllCodes()
    rows.value = (response.responseObject || []).sort((a, b) => {
      const aTime = new Date(a.activatedOn || a.expiresOn || 0).getTime()
      const bTime = new Date(b.activatedOn || b.expiresOn || 0).getTime()
      return bTime - aTime
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('admin.formAccessCodes.errors.loadFailed')
    notifierStore.notify(message || t('admin.formAccessCodes.errors.loadFailed'), 'error')
  } finally {
    loading.value = false
  }
}

const withCodeAction = async (code: string, action: () => Promise<void>) => {
  actionLoadingCode.value = code
  try {
    await action()
    await loadCodes()
  } finally {
    actionLoadingCode.value = null
  }
}

const extendCode = async (code: ApiCode) => {
  await withCodeAction(code.code, async () => {
    await codeApi.renewCode({ code: code.code })
    notifierStore.notify(t('admin.formAccessCodes.messages.extended', { code: code.code }), 'success')
  })
}

const revokeCode = async (code: ApiCode) => {
  await withCodeAction(code.code, async () => {
    await codeApi.deactivateCode({ code: code.code })
    notifierStore.notify(t('admin.formAccessCodes.messages.revoked', { code: code.code }), 'success')
  })
}

const openAssignConsultationDialog = (code: ApiCode) => {
  selectedCodeForAssign.value = code
  assignSearchQuery.value = ''
  assignResults.value = []
  selectedConsultationIdForAssign.value = null
  showAssignConsultationDialog.value = true
}

const searchConsultationsForAssign = async () => {
  const query = assignSearchQuery.value.trim()
  if (query.length < 2) {
    assignResults.value = []
    selectedConsultationIdForAssign.value = null
    return
  }

  searchingAssignConsultation.value = true
  try {
    const resultMap = new Map<string, string>()

    if (/^[a-fA-F0-9]{24}$/.test(query)) {
      try {
        const byId = await consultationApi.getConsultationById({ consultationId: query })
        const consultation = byId.responseObject as any
        const foundId = consultation?.id
        if (foundId) {
          const dateAndTime = consultation?.dateAndTime
          const createdAt = consultation?.createdAt
          const forms = consultation?.forms || []
          const formLabels = forms.map((f: any) => f?.name || 'Unnamed').join(', ')
          let label = `${foundId}`
          if (dateAndTime) label += ` | Planned: ${formatDateTime(dateAndTime)}`
          if (createdAt) label += ` | Created: ${formatDateTime(createdAt)}`
          label += ` | Forms: ${forms.length}`
          if (formLabels) label += ` (${formLabels})`
          resultMap.set(foundId, label)
          // Auto-select if exact ID match
          selectedConsultationIdForAssign.value = foundId
        }
      } catch {
        // ignore not found for id path
      }
    }

    try {
      const casesResponse = await patientCaseApi.searchCasesByExternalId({ searchQuery: query })
      const cases = casesResponse.responseObject || []
      for (const patientCase of cases.slice(0, 5)) {
        const caseId = patientCase.id
        if (!caseId) continue
        const consultationsResponse = await consultationApi.getAllConsultations({ caseId })
        const consultations = consultationsResponse.responseObject || []
        consultations.forEach((consultation: any) => {
          if (!consultation.id) return
          const dateAndTime = consultation?.dateAndTime
          const createdAt = consultation?.createdAt
          const forms = consultation?.forms || []
          const formLabels = forms.map((f: any) => f?.name || 'Unnamed').join(', ')
          let label = `${consultation.id}`
          if (dateAndTime) label += ` | Planned: ${formatDateTime(dateAndTime)}`
          if (createdAt) label += ` | Created: ${formatDateTime(createdAt)}`
          label += ` | Forms: ${forms.length}`
          if (formLabels) label += ` (${formLabels})`
          resultMap.set(consultation.id, label)
        })
      }
    } catch {
      // ignore fallback search errors
    }

    assignResults.value = Array.from(resultMap.entries()).map(([id, label]) => ({ id, label }))
  } finally {
    searchingAssignConsultation.value = false
  }
}

const assignConsultation = async () => {
  if (!selectedCodeForAssign.value || !selectedConsultationIdForAssign.value) {
    notifierStore.notify(t('admin.formAccessCodes.errors.assignConsultationRequired'), 'error')
    return
  }

  await withCodeAction(selectedCodeForAssign.value.code, async () => {
    await codeApi.activateCode({
      code: selectedCodeForAssign.value?.code || '',
      consultationId: selectedConsultationIdForAssign.value || '',
    })
    notifierStore.notify(
      t('admin.formAccessCodes.messages.consultationAssigned', { code: selectedCodeForAssign.value?.code || '' }),
      'success',
    )
  })

  showAssignConsultationDialog.value = false
  selectedCodeForAssign.value = null
  selectedConsultationIdForAssign.value = null
  assignResults.value = []
}

const openSetActivationStartDialog = (code: ApiCode) => {
  selectedCodeForActivationStart.value = code
  activationStartInput.value = toDateTimePickerValue(code.activatedOn)
  showActivationStartDialog.value = true
}

const saveActivationStart = async () => {
  const code = selectedCodeForActivationStart.value
  if (!code || !activationStartInput.value) {
    notifierStore.notify(t('admin.formAccessCodes.errors.invalidActivationStart'), 'error')
    return
  }

  const iso = activationStartInput.value.toISOString()
  await withCodeAction(code.code, async () => {
    await setCodeActivationStart(code.code, iso)
    notifierStore.notify(t('admin.formAccessCodes.messages.activationStartUpdated', { code: code.code }), 'success')
  })

  showActivationStartDialog.value = false
  selectedCodeForActivationStart.value = null
  activationStartInput.value = null
}

const requestDeleteCode = (code: ApiCode) => {
  selectedCodeForDelete.value = code
  showDeleteDialog.value = true
}

const deleteCode = async () => {
  if (!selectedCodeForDelete.value) return

  await withCodeAction(selectedCodeForDelete.value.code, async () => {
    await codeApi.deleteCode({ code: selectedCodeForDelete.value?.code || '' })
    notifierStore.notify(t('admin.formAccessCodes.messages.deleted', { code: selectedCodeForDelete.value?.code || '' }), 'success')
  })

  showDeleteDialog.value = false
  selectedCodeForDelete.value = null
}

const openResetDialog = (code: ApiCode) => {
  selectedCodeForReset.value = code
  showResetDialogStep1.value = true
}

const continueResetDialog = () => {
  showResetDialogStep1.value = false
  showResetDialogStep2.value = true
}

const resetConsultationForms = async () => {
  if (!selectedCodeForReset.value) return

  await withCodeAction(selectedCodeForReset.value.code, async () => {
    await resetConsultationFormsByCode(selectedCodeForReset.value?.code || '')
    notifierStore.notify(t('admin.formAccessCodes.messages.formsReset', { code: selectedCodeForReset.value?.code || '' }), 'success')
  })

  showResetDialogStep2.value = false
  selectedCodeForReset.value = null
}

const openConsultation = (code: ApiCode) => {
  const consultationId = consultationIdForCode(code)
  if (!consultationId) return

  router.push({ name: 'consultationoverview', params: { consultationId } })
}

const handleActionError = async (error: unknown) => {
  let message = t('admin.formAccessCodes.errors.actionFailed')
  if (error instanceof ResponseError) {
    try {
      const body = await error.response.clone().json()
      message = body.message || message
    } catch {
      message = `${message} (HTTP ${error.response.status})`
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  notifierStore.notify(message, 'error')
}

const safeExtendCode = async (code: ApiCode) => {
  try {
    await extendCode(code)
  } catch (error: unknown) {
    await handleActionError(error)
  }
}

const safeRevokeCode = async (code: ApiCode) => {
  try {
    await revokeCode(code)
  } catch (error: unknown) {
    await handleActionError(error)
  }
}

const safeDeleteCode = async (code: ApiCode) => {
  try {
    requestDeleteCode(code)
  } catch (error: unknown) {
    await handleActionError(error)
  }
}

const safeSaveActivationStart = async () => {
  try {
    await saveActivationStart()
  } catch (error: unknown) {
    await handleActionError(error)
  }
}

const safeAssignConsultation = async () => {
  try {
    await assignConsultation()
  } catch (error: unknown) {
    await handleActionError(error)
  }
}

const safeDeleteConfirmedCode = async () => {
  try {
    await deleteCode()
  } catch (error: unknown) {
    await handleActionError(error)
  }
}

const safeResetConsultationForms = async () => {
  try {
    await resetConsultationForms()
  } catch (error: unknown) {
    await handleActionError(error)
  }
}

onMounted(() => {
  loadCodes()
})
</script>

<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <div class="text-h5">{{ t('admin.formAccessCodes.title') }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ t('admin.formAccessCodes.description') }}</div>
        </div>
        <div class="d-flex ga-2 align-center header-controls">
          <v-text-field
            v-model="search"
            :label="t('admin.formAccessCodes.search')"
            density="comfortable"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-magnify"
            class="search-input"
          />
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-refresh" @click="loadCodes" :loading="loading" height="48">
            {{ t('buttons.retry') }}
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="rows"
          :loading="loading"
          :search="search"
          item-value="code"
        >
          <template #item.code="{ item }">
            <div class="d-flex align-center ga-2">
              <v-icon size="18">mdi-qrcode</v-icon>
              <span class="font-weight-medium">{{ item.code }}</span>
            </div>
          </template>

          <template #item.activatedOn="{ item }">
            {{ formatDateTime(item.activatedOn) }}
          </template>

          <template #item.expiresOn="{ item }">
            {{ formatDateTime(item.expiresOn) }}
          </template>

          <template #item.consultation="{ item }">
            <div class="d-flex align-center ga-2">
              <span>{{ consultationLabel(item) }}</span>
              <v-btn
                v-if="consultationIdForCode(item)"
                icon="mdi-open-in-new"
                size="x-small"
                variant="text"
                @click="openConsultation(item)"
                :title="t('admin.formAccessCodes.openConsultation')"
              />
            </div>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex ga-1">
              <v-btn
                v-if="canAssignConsultation(item)"
                icon="mdi-link-plus"
                size="small"
                variant="text"
                color="info"
                :loading="actionLoadingCode === item.code"
                @click="openAssignConsultationDialog(item)"
                :title="t('admin.formAccessCodes.assignConsultation')"
              />
              <v-btn
                v-if="hasConsultationLink(item)"
                icon="mdi-restore"
                size="small"
                variant="text"
                color="error"
                :loading="actionLoadingCode === item.code"
                @click="openResetDialog(item)"
                :title="t('admin.formAccessCodes.resetConsultationForms')"
              />
              <v-btn
                v-if="canManageAssignedCode(item)"
                icon="mdi-clock-start"
                size="small"
                variant="text"
                color="secondary"
                :loading="actionLoadingCode === item.code"
                @click="openSetActivationStartDialog(item)"
                :title="t('admin.formAccessCodes.setActivationStart')"
              />
              <v-btn
                v-if="canManageAssignedCode(item)"
                icon="mdi-calendar-clock"
                size="small"
                variant="text"
                color="primary"
                :loading="actionLoadingCode === item.code"
                @click="safeExtendCode(item)"
                :title="t('admin.formAccessCodes.extend')"
              />
              <v-btn
                v-if="canManageAssignedCode(item)"
                icon="mdi-cancel"
                size="small"
                variant="text"
                color="warning"
                :loading="actionLoadingCode === item.code"
                @click="safeRevokeCode(item)"
                :title="t('admin.formAccessCodes.revoke')"
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                :loading="actionLoadingCode === item.code"
                @click="safeDeleteCode(item)"
                :title="t('admin.formAccessCodes.delete')"
              />
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>

  <v-dialog v-model="showActivationStartDialog" max-width="500">
    <v-card>
      <v-card-title>{{ t('admin.formAccessCodes.setActivationStartTitle') }}</v-card-title>
      <v-card-text>
        <div class="text-body-2 mb-3">
          {{ t('admin.formAccessCodes.setActivationStartDescription', { code: selectedCodeForActivationStart?.code || '' }) }}
        </div>
        <v-text-field
          :model-value="activationStartInput ? formatLocalizedDate(activationStartInput, dateFormats.dateTime) : ''"
          :label="t('admin.formAccessCodes.table.activatedOn')"
          variant="outlined"
          readonly
          hide-details="auto"
          class="mb-3"
        />
        <VueDatePicker
          v-model="activationStartInput"
          :locale="locale"
          week-num-name="Wo"
          format="dd.MM.yyyy HH:mm"
          week-numbers="iso"
          :text-input="true"
          :teleport-center="true"
          :cancelText="t('buttons.cancelTimeDateText')"
          :selectText="t('buttons.selectTimeDateText')"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showActivationStartDialog = false">{{ t('buttons.cancel') }}</v-btn>
        <v-btn color="primary" @click="safeSaveActivationStart" :loading="!!selectedCodeForActivationStart && actionLoadingCode === selectedCodeForActivationStart.code">
          {{ t('buttons.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showAssignConsultationDialog" max-width="560">
    <v-card>
      <v-card-title>{{ t('admin.formAccessCodes.assignConsultationTitle') }}</v-card-title>
      <v-card-text>
        <div class="text-body-2 mb-3">{{ t('admin.formAccessCodes.assignConsultationDescription') }}</div>
        <v-text-field
          v-model="assignSearchQuery"
          :label="t('admin.formAccessCodes.assignSearchLabel')"
          prepend-inner-icon="mdi-magnify"
          @update:model-value="searchConsultationsForAssign"
          :loading="searchingAssignConsultation"
          variant="outlined"
          class="mb-3"
        />
        <v-select
          v-model="selectedConsultationIdForAssign"
          :items="assignResults"
          item-title="label"
          item-value="id"
          :label="t('admin.formAccessCodes.assignSelectLabel')"
          :disabled="assignResults.length === 0"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showAssignConsultationDialog = false">{{ t('buttons.cancel') }}</v-btn>
        <v-btn color="primary" @click="safeAssignConsultation" :loading="!!selectedCodeForAssign && actionLoadingCode === selectedCodeForAssign.code" :disabled="!selectedConsultationIdForAssign">
          {{ t('buttons.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showDeleteDialog" max-width="500">
    <v-card>
      <v-card-title>{{ t('alerts.general.confirmDeletion') }}</v-card-title>
      <v-card-text>
        {{ t('admin.formAccessCodes.confirmDelete', { code: selectedCodeForDelete?.code || '' }) }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showDeleteDialog = false">{{ t('buttons.cancel') }}</v-btn>
        <v-btn color="error" variant="tonal" @click="safeDeleteConfirmedCode" :loading="!!selectedCodeForDelete && actionLoadingCode === selectedCodeForDelete.code">
          {{ t('buttons.delete') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showResetDialogStep1" max-width="520">
    <v-card>
      <v-card-title>{{ t('admin.formAccessCodes.resetConsultationForms') }}</v-card-title>
      <v-card-text>{{ t('admin.formAccessCodes.resetConfirmStep1', { code: selectedCodeForReset?.code || '' }) }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showResetDialogStep1 = false">{{ t('buttons.cancel') }}</v-btn>
        <v-btn color="warning" variant="tonal" @click="continueResetDialog">{{ t('buttons.continue') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showResetDialogStep2" max-width="520">
    <v-card>
      <v-card-title>{{ t('admin.formAccessCodes.resetConsultationForms') }}</v-card-title>
      <v-card-text>{{ t('admin.formAccessCodes.resetConfirmStep2', { code: selectedCodeForReset?.code || '' }) }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showResetDialogStep2 = false">{{ t('buttons.cancel') }}</v-btn>
        <v-btn color="error" variant="tonal" @click="safeResetConsultationForms" :loading="!!selectedCodeForReset && actionLoadingCode === selectedCodeForReset.code">
          {{ t('buttons.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.header-controls {
  width: 100%;
  max-width: 560px;
}

.search-input {
  flex: 1;
  min-width: 340px;
}
</style>
