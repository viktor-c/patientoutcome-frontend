<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

type CascadeOption = {
  key: string
  label: string
  count: number
  defaultChecked?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  warningText: string
  finalWarningText: string
  options?: CascadeOption[]
  loading?: boolean
}>(), {
  options: () => [],
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  confirm: [selectedOptions: Record<string, boolean>]
}>()

const { t } = useI18n()
const step = ref(0)
const selectedOptions = ref<Record<string, boolean>>({})

const hasOptions = computed(() => props.options.length > 0)

const resetState = () => {
  step.value = 0
  selectedOptions.value = Object.fromEntries(
    props.options.map(option => [option.key, option.defaultChecked !== false])
  )
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetState()
    }
  },
  { immediate: true }
)

watch(
  () => props.options,
  () => {
    if (props.modelValue) {
      resetState()
    }
  },
  { deep: true }
)

const closeDialog = () => {
  emit('update:modelValue', false)
}

const cancel = () => {
  closeDialog()
  emit('cancel')
}

const proceedToFinalConfirmation = () => {
  step.value = 1
}

const confirmDelete = () => {
  emit('confirm', selectedOptions.value)
}
</script>

<template>
  <v-dialog
            :model-value="modelValue"
            max-width="520px"
            @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h5" :class="step === 1 ? 'text-error' : ''">
        {{ step === 0 ? title : t('cascadeDeleteDialog.finalTitle') }}
      </v-card-title>

      <v-card-text v-if="step === 0" class="py-4">
        <p class="mb-4">{{ warningText }}</p>

        <div v-if="hasOptions">
          <p class="text-subtitle-2 mb-2">{{ t('cascadeDeleteDialog.alsoDeleteLabel') }}</p>
          <v-checkbox
                      v-for="option in options"
                      :key="option.key"
                      v-model="selectedOptions[option.key]"
                      :disabled="option.disabled"
                      density="compact"
                      hide-details
                      class="my-1">
            <template #label>
              {{ option.label }} ({{ option.count }} {{ t('cascadeDeleteDialog.items', option.count) }})
            </template>
          </v-checkbox>
        </div>
      </v-card-text>

      <v-card-text v-else class="py-4">
        <p class="text-error font-weight-bold">
          {{ finalWarningText }}
        </p>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn
               color="default"
               variant="text"
               :disabled="loading"
               @click="cancel">
          {{ t('buttons.cancel') }}
        </v-btn>

        <v-btn
               v-if="step === 0"
               color="error"
               variant="elevated"
               :disabled="loading"
               @click="proceedToFinalConfirmation">
          {{ t('buttons.delete') }}
        </v-btn>

        <v-btn
               v-else
               color="error"
               variant="elevated"
               :loading="loading"
               @click="confirmDelete">
          {{ t('buttons.confirmDelete') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
