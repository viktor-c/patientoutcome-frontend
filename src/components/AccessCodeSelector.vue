<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotifierStore } from '@/stores/notifierStore'
import { codeApi } from '@/api'
import { ResponseError } from '@/api'
import { logger } from '@/services/logger'
import type { ApiCode } from '@/types'

const { t } = useI18n()
const notifierStore = useNotifierStore()

interface Props {
  codeType?: 'consultation' | 'case'
  consultationDate?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  codeType: 'consultation',
  disabled: false,
})

const emit = defineEmits<{
  'code-selected': [code: string]
}>()

const codes = ref<ApiCode[]>([])
const selectedCode = ref<ApiCode | null>(null)
const generatingCode = ref(false)

const availableCodes = computed(() => {
  return codes.value.filter(code => 
    !code.activatedOn && 
    !code.archivedOn && 
    !code.consultationId && 
    !code.patientCaseId
  )
})

async function fetchAvailableCodes() {
  try {
    const response = await codeApi.getAllAvailableCodes()
    codes.value = response.responseObject || []
    logger.info('Codes fetched successfully', { count: codes.value.length })
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('Error fetching codes', { errorMessage })
    notifierStore.notify(t('alerts.code.fetchFailed'), 'error')
  }
}

async function generateNewCode() {
  if (generatingCode.value || props.disabled) return

  try {
    generatingCode.value = true
    logger.info('Generating new code', { codeType: props.codeType })

    // Generate a single new code, passing the consultation date if provided
    const response = await codeApi.addCodes({
      addCodesRequest: {
        numberOfCodes: 1,
        consultationDate: props.codeType === 'consultation' && props.consultationDate 
          ? props.consultationDate 
          : undefined,
      },
    })

    if (response.responseObject && response.responseObject.length > 0) {
      const newCode = response.responseObject[0]
      logger.info('New code generated successfully', { 
        codeId: newCode.id, 
        code: newCode.code,
        codeType: props.codeType 
      })

      // Add the new code to the codes list
      codes.value.unshift(newCode)

      // Select the new code
      selectedCode.value = newCode

      // Emit the selected code
      emit('code-selected', newCode.code)

      notifierStore.notify(t('alerts.code.generated'), 'success')
    } else {
      throw new Error('No code returned from API')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    logger.error('Error generating new code', { errorMessage, codeType: props.codeType })
    notifierStore.notify(t('alerts.code.generateFailed'), 'error')
  } finally {
    generatingCode.value = false
  }
}

// Watch for manual selection changes
function handleCodeChange(value: ApiCode | null) {
  if (value && value.code) {
    emit('code-selected', value.code)
  }
}

onMounted(async () => {
  await fetchAvailableCodes()
})
</script>

<template>
  <v-combobox
    v-model="selectedCode"
    :items="availableCodes"
    item-value="id"
    item-title="code"
    :label="codeType === 'case' 
      ? t('patientCaseLanding.selectCodeDialog.selectLabel') 
      : t('consultation.form-access-code')"
    outlined
    dense
    :disabled="disabled"
    @update:model-value="handleCodeChange"
    data-testid="access-code-selector"
  >
    <template #append-inner>
      <v-icon
        :class="{ 'text-success': !generatingCode && !disabled, 'text-disabled': generatingCode || disabled }"
        :style="{ cursor: (generatingCode || disabled) ? 'not-allowed' : 'pointer' }"
        @mousedown.stop.prevent
        @click.stop.prevent="!generatingCode && !disabled && generateNewCode()"
        :disabled="generatingCode || disabled"
        :title="codeType === 'case' 
          ? t('patientCaseLanding.createCaseCode') 
          : t('consultation.generateCode')"
      >
        {{ generatingCode ? 'mdi-loading' : 'mdi-plus' }}
      </v-icon>
    </template>
  </v-combobox>
</template>
