<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApiCode } from '@/types'

const { t } = useI18n()

interface Props {
  modelValue: boolean
  availableCodes: ApiCode[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [code: string]
}>()

const selectedCode = ref<string | null>(null)
const showStep1 = ref(true)
const showStep2 = ref(false)

const localShow = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    if (!value) {
      // Reset state when closing
      setTimeout(() => {
        showStep1.value = true
        showStep2.value = false
        selectedCode.value = null
      }, 300)
    }
  },
})

const codeItems = computed(() => {
  return props.availableCodes
    .filter(code => !code.activatedOn && !code.archivedOn && !code.consultationId && !code.patientCaseId)
    .map(code => ({
      title: code.code,
      value: code.code,
    }))
})

const canProceedToStep2 = computed(() => !!selectedCode.value)

const proceedToStep2 = () => {
  if (!canProceedToStep2.value) return
  showStep1.value = false
  showStep2.value = true
}

const goBackToStep1 = () => {
  showStep2.value = false
  showStep1.value = true
}

const confirmSelection = () => {
  if (!selectedCode.value) return
  emit('confirm', selectedCode.value)
  localShow.value = false
}

const cancel = () => {
  localShow.value = false
}
</script>

<template>
  <v-dialog v-model="localShow" max-width="600" persistent>
    <v-card>
      <!-- Step 1: Select code -->
      <template v-if="showStep1">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-alert-circle</v-icon>
          {{ t('patientCaseLanding.selectCodeDialog.title') }}
        </v-card-title>
        
        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4">
            {{ t('patientCaseLanding.selectCodeDialog.description') }}
          </v-alert>

          <v-select
            v-model="selectedCode"
            :items="codeItems"
            :label="t('patientCaseLanding.selectCodeDialog.selectLabel')"
            :no-data-text="t('patientCaseLanding.noAvailableCodes')"
            :disabled="loading || codeItems.length === 0"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-qrcode"
          />

          <v-alert v-if="codeItems.length === 0" type="warning" variant="tonal" class="mt-2">
            {{ t('patientCaseLanding.noAvailableCodes') }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancel" :disabled="loading">
            {{ t('buttons.cancel') }}
          </v-btn>
          <v-btn 
            color="primary" 
            @click="proceedToStep2" 
            :disabled="!canProceedToStep2 || loading"
          >
            {{ t('buttons.continue') }}
          </v-btn>
        </v-card-actions>
      </template>

      <!-- Step 2: Confirm long-term activation -->
      <template v-if="showStep2">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="error">mdi-alert</v-icon>
          {{ t('patientCaseLanding.selectCodeDialog.confirmTitle') }}
        </v-card-title>
        
        <v-card-text>
          <v-alert type="warning" variant="tonal" prominent class="mb-4">
            <div class="text-h6 mb-2">
              {{ t('patientCaseLanding.selectCodeDialog.confirmStep2') }}
            </div>
            <div class="text-body-2">
              {{ t('patientCaseLanding.selectCodeDialog.confirmStep2Description', { code: selectedCode }) }}
            </div>
          </v-alert>

          <div class="text-body-1 font-weight-medium mb-2">
            {{ t('patientCaseLanding.selectCodeDialog.selectedCode') }}: 
            <v-chip color="primary" size="small" class="ml-2">{{ selectedCode }}</v-chip>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-btn variant="text" @click="goBackToStep1" :disabled="loading">
            {{ t('buttons.back') }}
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="cancel" :disabled="loading">
            {{ t('buttons.cancel') }}
          </v-btn>
          <v-btn 
            color="error" 
            @click="confirmSelection" 
            :loading="loading"
          >
            {{ t('buttons.confirm') }}
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>
