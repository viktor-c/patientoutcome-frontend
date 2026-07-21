<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import type { ApiCode } from '@/types'
import { useDateFormat } from '@/composables/useDateFormat'

const props = defineProps<{
  modelValue: boolean
  code: ApiCode | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: { code: string; activatedOn: string; expiresOn: string }]
}>()

const { t } = useI18n()
const { formatLocalizedDate, dateFormats, getLocalizedDayjs } = useDateFormat()

const internalVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const initialDuration = ref<number>(0)

// Initialize dates when dialog opens
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && props.code) {
      startDate.value = props.code.activatedOn ? new Date(props.code.activatedOn) : new Date()
      endDate.value = props.code.expiresOn ? new Date(props.code.expiresOn) : new Date()
      
      // Calculate and store initial duration in milliseconds
      if (startDate.value && endDate.value) {
        initialDuration.value = endDate.value.getTime() - startDate.value.getTime()
      }
    }
  },
  { immediate: true },
)

const applyPresetToStart = (preset: '8h' | '-8h' | '1d' | '-1d' | '1w' | '-1w' | '1m' | '-1m') => {
  if (!startDate.value) {
    startDate.value = new Date()
  }

  let newDate = getLocalizedDayjs(startDate.value)

  switch (preset) {
    case '8h':
      newDate = newDate.add(8, 'hour')
      break
    case '-8h':
      newDate = newDate.subtract(8, 'hour')
      break
    case '1d':
      newDate = newDate.add(1, 'day')
      break
    case '-1d':
      newDate = newDate.subtract(1, 'day')
      break
    case '1w':
      newDate = newDate.add(1, 'week')
      break
    case '-1w':
      newDate = newDate.subtract(1, 'week')
      break
    case '1m':
      newDate = newDate.add(1, 'month')
      break
    case '-1m':
      newDate = newDate.subtract(1, 'month')
      break
  }

  startDate.value = newDate.toDate()
  
  // Maintain initial duration by updating end date
  if (endDate.value && initialDuration.value > 0) {
    endDate.value = new Date(startDate.value.getTime() + initialDuration.value)
  }
}

const applyPresetToEnd = (preset: '8h' | '-8h' | '1d' | '-1d' | '1w' | '-1w' | '1m' | '-1m') => {
  if (!endDate.value) {
    endDate.value = new Date()
  }

  let newDate = getLocalizedDayjs(endDate.value)

  switch (preset) {
    case '8h':
      newDate = newDate.add(8, 'hour')
      break
    case '-8h':
      newDate = newDate.subtract(8, 'hour')
      break
    case '1d':
      newDate = newDate.add(1, 'day')
      break
    case '-1d':
      newDate = newDate.subtract(1, 'day')
      break
    case '1w':
      newDate = newDate.add(1, 'week')
      break
    case '-1w':
      newDate = newDate.subtract(1, 'week')
      break
    case '1m':
      newDate = newDate.add(1, 'month')
      break
    case '-1m':
      newDate = newDate.subtract(1, 'month')
      break
  }

  endDate.value = newDate.toDate()
}

const handleSave = () => {
  if (props.code && startDate.value && endDate.value) {
    emit('save', {
      code: props.code.code,
      activatedOn: startDate.value.toISOString(),
      expiresOn: endDate.value.toISOString(),
    })
    internalVisible.value = false
  }
}

const handleCancel = () => {
  internalVisible.value = false
}

const title = computed(() =>
  t('admin.formAccessCodes.editTimeWindowTitle', { code: props.code?.code || '' }),
)

const isFormValid = computed(() => {
  if (!startDate.value || !endDate.value) return false
  return startDate.value <= endDate.value
})
</script>

<template>
  <v-dialog v-model="internalVisible" max-width="700px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-calendar-clock</v-icon>
        {{ title }}
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ t('admin.formAccessCodes.editTimeWindowDescription') }}
        </p>

        <!-- Start Date Section -->
        <div class="mb-4">
          <div class="mb-2 text-subtitle-1 font-weight-medium">
            {{ t('admin.formAccessCodes.table.activatedOn') }}
          </div>
          <VueDatePicker
            v-model="startDate"
            :enable-time-picker="true"
            :teleport="true"
            :format="formatLocalizedDate"
            auto-apply
          />
          <div class="mt-3">
            <div class="mb-2 text-caption text-medium-emphasis">
              {{ t('admin.formAccessCodes.quickAdjustStart') }}
            </div>
            <div class="d-flex flex-wrap gap-2">
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                @click="applyPresetToStart('-8h')"
                prepend-icon="mdi-minus"
              >
                {{ t('admin.formAccessCodes.presets.label8h') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                @click="applyPresetToStart('8h')"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.formAccessCodes.presets.label8h') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                @click="applyPresetToStart('-1d')"
                prepend-icon="mdi-minus"
              >
                {{ t('admin.formAccessCodes.presets.label1d') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                @click="applyPresetToStart('1d')"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.formAccessCodes.presets.label1d') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                @click="applyPresetToStart('-1w')"
                prepend-icon="mdi-minus"
              >
                {{ t('admin.formAccessCodes.presets.label1w') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                @click="applyPresetToStart('1w')"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.formAccessCodes.presets.label1w') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                @click="applyPresetToStart('-1m')"
                prepend-icon="mdi-minus"
              >
                {{ t('admin.formAccessCodes.presets.label1m') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="secondary"
                @click="applyPresetToStart('1m')"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.formAccessCodes.presets.label1m') }}
              </v-btn>
            </div>
          </div>
        </div>

        <v-divider class="my-4" />

        <!-- End Date Section -->
        <div class="mb-4">
          <div class="mb-2 text-subtitle-1 font-weight-medium">
            {{ t('admin.formAccessCodes.table.expiresOn') }}
          </div>
          <VueDatePicker
            v-model="endDate"
            :enable-time-picker="true"
            :teleport="true"
            :format="formatLocalizedDate"
            auto-apply
          />
          <div class="mt-3">
            <div class="mb-2 text-caption text-medium-emphasis">
              {{ t('admin.formAccessCodes.quickAdjustEnd') }}
            </div>
            <div class="d-flex flex-wrap gap-2">
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="applyPresetToEnd('-8h')"
                prepend-icon="mdi-minus"
              >
                {{ t('admin.formAccessCodes.presets.label8h') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="applyPresetToEnd('8h')"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.formAccessCodes.presets.label8h') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="applyPresetToEnd('-1d')"
                prepend-icon="mdi-minus"
              >
                {{ t('admin.formAccessCodes.presets.label1d') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="applyPresetToEnd('1d')"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.formAccessCodes.presets.label1d') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="applyPresetToEnd('-1w')"
                prepend-icon="mdi-minus"
              >
                {{ t('admin.formAccessCodes.presets.label1w') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="applyPresetToEnd('1w')"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.formAccessCodes.presets.label1w') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="applyPresetToEnd('-1m')"
                prepend-icon="mdi-minus"
              >
                {{ t('admin.formAccessCodes.presets.label1m') }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                @click="applyPresetToEnd('1m')"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.formAccessCodes.presets.label1m') }}
              </v-btn>
            </div>
          </div>
        </div>

        <v-alert
          v-if="startDate && endDate && startDate > endDate"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          {{ t('admin.formAccessCodes.invalidDateRange') }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">{{ t('buttons.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" @click="handleSave" :disabled="!isFormValid">
          {{ t('buttons.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Ensure VueDatePicker fits nicely with Vuetify styling */
:deep(.dp__input) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 12px;
  padding-left: 40px;
  font-size: 0.875rem;
}

:deep(.dp__input):hover {
  border-color: rgba(var(--v-theme-primary));
}

:deep(.dp__input):focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}
</style>
