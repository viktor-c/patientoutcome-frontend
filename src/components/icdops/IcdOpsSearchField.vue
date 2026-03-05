<template>
  <v-autocomplete
    v-model="selectedValue"
    v-model:search="searchInput"
    :items="displayItems"
    :item-title="itemTitle"
    :item-value="itemValue"
    :loading="loading"
    :label="label"
    :placeholder="placeholder"
    :hint="hintText"
    :error-messages="error ? [error] : []"
    :clearable="clearable"
    :return-object="returnObject"
    :disabled="disabled"
    :readonly="readonly"
    :density="density"
    :variant="variant"
    :no-data-text="noDataText"
    :hide-no-data="hideNoData"
    :persistent-hint="persistentHint"
    :multiple="multiple"
    :chips="chips"
    :closable-chips="closableChips"
    auto-select-first
    @update:search="onSearchUpdate"
    @scroll="onScroll"
  >
    <!-- Custom item slot showing code + label -->
    <template #item="{ item, props: itemProps }">
      <v-list-item v-bind="itemProps">
        <template #prepend>
          <v-chip size="small" color="primary" variant="outlined" class="mr-2 font-weight-bold">
            {{ item.raw.code }}
          </v-chip>
        </template>
        <v-list-item-title>{{ item.raw.label }}</v-list-item-title>
      </v-list-item>
    </template>

    <!-- Custom selection slot for single selection -->
    <template v-if="!multiple" #selection="{ item }">
      <span class="text-body-2">
        <strong>{{ item.raw.code }}</strong> – {{ item.raw.label }}
      </span>
    </template>

    <!-- Chip selection slot for multiple selection -->
    <template v-if="multiple && chips" #chip="{ item, props: chipProps }">
      <v-chip v-bind="chipProps" size="small">
        <strong>{{ item.raw.code }}</strong> – {{ item.raw.label }}
      </v-chip>
    </template>

    <!-- Loading indicator at bottom for infinite scroll -->
    <template #append-item>
      <div v-if="hasMore" v-intersect="onIntersect" class="d-flex justify-center pa-2">
        <v-progress-circular v-if="loading" indeterminate size="24" />
        <span v-else class="text-caption text-grey">Scroll for more results…</span>
      </div>
      <div v-if="!loading && totalResults > 0" class="text-caption text-grey text-center pa-1">
        {{ displayItems.length }} of {{ totalResults }} results
      </div>
    </template>
  </v-autocomplete>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useIcdOpsSearch } from '@/composables/useIcdOpsSearch'
import type { IcdOpsEntry } from '@/services/icdopsService'

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────

export interface IcdOpsSearchFieldProps {
  /** 'icd' for ICD-10 diagnosis codes, 'ops' for OPS procedure codes */
  type: 'icd' | 'ops'
  /** v-model value – the selected code string(s) (or full entry/entries if returnObject) */
  modelValue?: string | string[] | IcdOpsEntry | IcdOpsEntry[] | (string | IcdOpsEntry)[] | null
  /** Input label */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Whether to return full { code, label, kind } object instead of just code */
  returnObject?: boolean
  /** Allow multiple selections */
  multiple?: boolean
  /** Show chips for selections (useful with multiple) */
  chips?: boolean
  /** Allow removing chips (useful with multiple) */
  closableChips?: boolean
  /** Items per page */
  limit?: number
  /** Kind filter */
  kind?: 'chapter' | 'block' | 'category' | 'all'
  /** Allow clearing the input */
  clearable?: boolean
  /** Disable the input */
  disabled?: boolean
  /** Readonly mode */
  readonly?: boolean
  /** Vuetify density */
  density?: 'default' | 'comfortable' | 'compact'
  /** Vuetify variant */
  variant?: 'filled' | 'outlined' | 'plain' | 'underlined' | 'solo' | 'solo-inverted' | 'solo-filled'
  /** Show hint text */
  persistentHint?: boolean
  /** Minimum characters to start searching */
  minChars?: number
  /** Debounce delay in ms */
  debounceMs?: number
}

const props = withDefaults(defineProps<IcdOpsSearchFieldProps>(), {
  modelValue: null,
  label: '',
  placeholder: '',
  returnObject: false,
  multiple: false,
  chips: false,
  closableChips: false,
  limit: 10,
  kind: 'category',
  clearable: true,
  disabled: false,
  readonly: false,
  density: 'compact',
  variant: 'outlined',
  persistentHint: false,
  minChars: 1,
  debounceMs: 300,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | IcdOpsEntry | IcdOpsEntry[] | (string | IcdOpsEntry)[] | null]
}>()

// ──────────────────────────────────────────────────────────────
// Composable
// ──────────────────────────────────────────────────────────────

const {
  query,
  items: searchResults,
  loading,
  error,
  hasMore,
  totalResults,
  loadMore,
} = useIcdOpsSearch(props.type, {
  limit: props.limit,
  kind: props.kind,
  debounceMs: props.debounceMs,
  minChars: props.minChars,
})

// ──────────────────────────────────────────────────────────────
// Local state
// ──────────────────────────────────────────────────────────────

const searchInput = ref('')

// Initialize selected value based on multiple mode
type SingleValue = IcdOpsEntry | string | null
type MultiValue = (IcdOpsEntry | string)[]
type SelectedValueType = SingleValue | MultiValue

const initializeSelectedValue = (): SelectedValueType => {
  if (props.multiple) {
    if (Array.isArray(props.modelValue)) return props.modelValue
    if (props.modelValue) return [props.modelValue]
    return []
  }
  return props.modelValue ?? null
}

const selectedValue = ref<SelectedValueType>(initializeSelectedValue())

// ──────────────────────────────────────────────────────────────
// Computed
// ──────────────────────────────────────────────────────────────

const displayItems = computed(() => searchResults.value)

const itemTitle = (item: IcdOpsEntry) => `${item.code} – ${item.label}`
const itemValue = (item: IcdOpsEntry) => props.returnObject ? item : item.code

const hintText = computed(() => {
  if (props.type === 'icd') return 'Search ICD-10-GM 2026 diagnosis codes'
  return 'Search OPS 2026 procedure codes'
})

const noDataText = computed(() => {
  if (loading.value) return 'Searching…'
  if (searchInput.value && searchInput.value.length >= props.minChars) return 'No results found'
  return `Type at least ${props.minChars} character${props.minChars > 1 ? 's' : ''} to search`
})

const hideNoData = computed(() => {
  return !searchInput.value || searchInput.value.length < props.minChars
})

// ──────────────────────────────────────────────────────────────
// Event handlers
// ──────────────────────────────────────────────────────────────

function onSearchUpdate(value: string | null) {
  if (value !== null) {
    query.value = value
  }
}

function onScroll(e: Event) {
  const target = e.target as HTMLElement
  if (!target) return
  // When user scrolls near the bottom, load more
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    loadMore()
  }
}

/** Intersection observer callback for the append-item sentinel */
function onIntersect(isIntersecting: boolean) {
  if (isIntersecting && hasMore.value && !loading.value) {
    loadMore()
  }
}

// ──────────────────────────────────────────────────────────────
// Watchers
// ──────────────────────────────────────────────────────────────

// Emit model value changes
watch(selectedValue, (newVal) => {
  emit('update:modelValue', newVal)
})

// Sync with external v-model changes
watch(
  () => props.modelValue,
  (newVal) => {
    if (props.multiple) {
      if (Array.isArray(newVal)) {
        selectedValue.value = newVal
      } else if (newVal) {
        selectedValue.value = [newVal]
      } else {
        selectedValue.value = []
      }
    } else {
      selectedValue.value = newVal ?? null
    }
  },
)
</script>
