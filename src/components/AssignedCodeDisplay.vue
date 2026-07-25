<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import QRCodeDisplay from './QRCodeDisplay.vue'
import type { ConsultationAccessWindow } from '@/utils/consultationAccessWindow'

interface Props {
  code: string
  modelValue?: boolean // ignoreAccessWindow value
  expiresOn?: string | null
  createdAt?: string | null
  patientFlowUrl?: string
  accessWindow?: ConsultationAccessWindow | null
  caseId?: string
  disabled?: boolean
  showRenewButton?: boolean
  showQrCode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  showRenewButton: false,
  showQrCode: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'revoke': []
  'renew': []
  'toggle-access-window': [newValue: boolean]
}>()

const { t } = useI18n()
const { formatLocalizedCustomDate } = useDateFormat()

const isUpdatingAccessWindow = ref(false)
const showSuccessIcon = ref(false)

const ignoreAccessWindow = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const safeFormatDate = (date: string | null | undefined, format: string = 'DD.MM.YYYY HH:mm'): string => {
  if (!date) return t('common.notAvailable')
  return formatLocalizedCustomDate(date, format)
}

// Check if code expires within the next 48 hours
const isCodeExpiringSoon = computed(() => {
  if (!props.expiresOn) return false
  const expiryDate = new Date(props.expiresOn)
  const now = new Date()
  const timeDifference = expiryDate.getTime() - now.getTime()
  return timeDifference > 0 && timeDifference < 48 * 60 * 60 * 1000
})

// Compute the icon based on state
const accessWindowIcon = computed(() => {
  if (showSuccessIcon.value) {
    return 'mdi-check'
  }
  return props.modelValue ? 'mdi-boom-gate-alert' : 'mdi-boom-gate'
})

// Compute the button color
const accessWindowButtonColor = computed(() => {
  if (showSuccessIcon.value) {
    return 'success'
  }
  return props.modelValue ? 'info' : 'default'
})

// Compute the tooltip text
const accessWindowTooltip = computed(() => {
  if (props.modelValue) {
    return t('consultationOverview.ignoreAccessWindowEnabled') + '. ' + t('consultationOverview.clickToEnforce')
  }
  return t('consultationOverview.ignoreAccessWindowDisabled') + '. ' + t('consultationOverview.clickToIgnore')
})

async function handleToggleAccessWindow() {
  if (isUpdatingAccessWindow.value || props.disabled) return

  const newValue = !props.modelValue

  isUpdatingAccessWindow.value = true

  try {
    // Emit event to parent to handle backend update
    emit('toggle-access-window', newValue)

    // Simulate async operation - in reality, parent will handle the update
    // We'll show success after a brief moment
    await new Promise(resolve => setTimeout(resolve, 300))

    // Show success icon
    showSuccessIcon.value = true

    // After 3 seconds, return to normal icon
    setTimeout(() => {
      showSuccessIcon.value = false
    }, 3000)
  } finally {
    isUpdatingAccessWindow.value = false
  }
}

function handleRevoke() {
  emit('revoke')
}

function handleRenew() {
  emit('renew')
}

</script>

<template>
  <div>
    <h4 class="mb-3">{{ t('consultationOverview.assignedCode') }}</h4>
    <v-list>
      <v-list-item class="border rounded-lg mb-2">
        <template #prepend>
          <v-icon class="me-2">mdi-barcode</v-icon>
        </template>
        <v-list-item-title class="font-weight-medium">
          {{ code }}
        </v-list-item-title>
        <v-list-item-subtitle>
          <div class="text-caption d-flex align-center flex-wrap gap-2">
            <span>{{ t('consultationOverview.codeStatus') }}: {{ t('consultationOverview.active') }}</span>
            <v-chip
              v-if="ignoreAccessWindow"
              size="x-small"
              color="info"
              variant="flat"
              prepend-icon="mdi-lock-open-variant"
            >
              {{ t('consultationOverview.alwaysAccessible') }}
            </v-chip>
            <v-chip
              v-if="expiresOn"
              size="x-small"
              :color="isCodeExpiringSoon ? 'warning' : 'default'"
              variant="tonal"
            >
              <v-icon start size="x-small">mdi-clock-outline</v-icon>
              {{ t('consultationOverview.codeExpiresOn', { date: safeFormatDate(expiresOn) }) }}
            </v-chip>
            <v-chip v-if="isCodeExpiringSoon && expiresOn" size="x-small" color="warning" variant="flat">
              {{ t('consultationOverview.codeExpiresSoon') }}
            </v-chip>
          </div>
        </v-list-item-subtitle>
        <template #append>
          <div class="d-flex gap-2 align-center">
            <QRCodeDisplay
              v-if="showQrCode && patientFlowUrl"
              :url="patientFlowUrl"
              :access-window="accessWindow"
              :expires-on="expiresOn || undefined"
              :case-id="caseId || undefined"
              :code-created-at="createdAt || undefined"
            />
            <v-tooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :color="accessWindowButtonColor"
                  variant="tonal"
                  size="small"
                  icon
                  @click="handleToggleAccessWindow"
                  :disabled="disabled || isUpdatingAccessWindow"
                  :loading="isUpdatingAccessWindow"
                >
                  <v-icon>{{ accessWindowIcon }}</v-icon>
                </v-btn>
              </template>
              <span>{{ accessWindowTooltip }}</span>
            </v-tooltip>
            <v-btn
              v-if="showRenewButton"
              :color="isCodeExpiringSoon ? 'warning' : 'primary'"
              variant="tonal"
              size="small"
              @click="handleRenew"
              :disabled="disabled"
              :loading="disabled"
              :title="t('consultationOverview.renewCode')"
            >
              <v-icon start>mdi-refresh</v-icon>
              {{ t('consultationOverview.codeRenewBtn') }}
            </v-btn>
            <v-btn
              color="error"
              variant="tonal"
              icon="mdi-delete"
              size="small"
              @click="handleRevoke"
              :disabled="disabled"
              :loading="disabled"
            ></v-btn>
          </div>
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>
