<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AccessCodeSelector from './AccessCodeSelector.vue'

interface Props {
  codeType?: 'consultation' | 'case'
  consultationDate?: string
  disabled?: boolean
  currentCode?: string | null
  modelValue?: boolean // ignoreAccessWindow value from parent
}

const props = withDefaults(defineProps<Props>(), {
  codeType: 'consultation',
  disabled: false,
  currentCode: null,
  modelValue: false,
})

const emit = defineEmits<{
  'code-selected': [code: string, ignoreAccessWindow: boolean]
  'code-removed': []
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const ignoreAccessWindow = ref(props.modelValue)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  ignoreAccessWindow.value = newValue
})

// Emit changes to ignoreAccessWindow
watch(ignoreAccessWindow, (newValue) => {
  emit('update:modelValue', newValue)
})

function handleCodeSelected(code: string) {
  emit('code-selected', code, ignoreAccessWindow.value)
}

function handleCodeRemoved() {
  ignoreAccessWindow.value = false
  emit('code-removed')
}
</script>

<template>
  <div>
    <p class="text-body-2 text-medium-emphasis mb-3">
      {{ t('consultationOverview.noCodesAssigned') }}
    </p>
    
    <v-checkbox
      v-model="ignoreAccessWindow"
      :label="t('consultationOverview.ignoreAccessWindow')"
      :hint="t('consultationOverview.ignoreAccessWindowHint')"
      persistent-hint
      density="compact"
      class="mb-3"
      :disabled="disabled"
    ></v-checkbox>
    
    <AccessCodeSelector
      :code-type="codeType"
      :consultation-date="consultationDate"
      :disabled="disabled"
      @code-selected="handleCodeSelected"
    />
    
    <p class="text-caption text-medium-emphasis mt-2">
      {{ t('consultationOverview.selectionAssignsImmediately') }}
    </p>
  </div>
</template>
