<template>
  <!-- ── Trigger ─────────────────────────────────────────────── -->
  <div class="icd-ops-search-field">
    <v-label v-if="label" class="icd-ops-field-label text-caption mb-1 d-block">
      {{ label }}
    </v-label>

    <v-input
             :hint="hintText"
             :persistent-hint="persistentHint"
             :error-messages="fieldError ? [fieldError] : []"
             :disabled="disabled"
             :density="density"
             :variant="variant"
             hide-details="auto"
             style="cursor: pointer"
             @click="!disabled && !readonly ? openDialog() : undefined">
      <template #default>
        <div
             class="icd-ops-trigger d-flex align-center flex-wrap ga-1 pa-1 w-100"
             style="min-height: 40px; cursor: pointer">
          <!-- Multiple selections: chips -->
          <template v-if="multiple && Array.isArray(selectedValue) && selectedValue.length">
            <v-chip
                    v-for="(val, idx) in displayChips"
                    :key="idx"
                    size="small"
                    color="primary"
                    :closable="closableChips && !disabled && !readonly"
                    @click.stop
                    @click:close="removeItem(idx)">
              <strong>{{ typeof val === 'object' ? val.code : val }}</strong>
              <span v-if="typeof val === 'object'" class="ml-1 text-truncate" style="max-width: 160px">
                – {{ val.label }}
              </span>
            </v-chip>
          </template>

          <!-- Single selection -->
          <template v-else-if="!multiple && selectedValue !== null && selectedValue !== undefined">
            <span class="text-body-2">
              <strong>{{
                typeof selectedValue === 'object' && selectedValue !== null
                  ? (selectedValue as IcdOpsEntry).code
                  : selectedValue
              }}</strong>
              <span v-if="typeof selectedValue === 'object' && selectedValue !== null" class="ml-1 text-grey-darken-1">
                – {{ (selectedValue as IcdOpsEntry).label }}
              </span>
            </span>
          </template>

          <!-- Placeholder -->
          <span v-else class="text-grey text-body-2">
            {{ placeholder || `${type === 'icd' ? 'ICD-10' : 'OPS'}-Code auswählen…` }}
          </span>

          <v-spacer />

          <!-- Clear button -->
          <v-btn
                 v-if="clearable && hasValue && !disabled && !readonly"
                 icon
                 variant="text"
                 size="x-small"
                 class="ml-1"
                 :aria-label="`${label || type.toUpperCase()} zurücksetzen`"
                 @click.stop="clearSelection">
            <v-icon size="small">mdi-close-circle-outline</v-icon>
          </v-btn>

          <!-- Open dialog icon -->
          <v-icon v-if="!disabled && !readonly" size="small" class="text-grey">mdi-magnify</v-icon>
        </div>
      </template>
    </v-input>
  </div>

  <!-- ── Dialog ──────────────────────────────────────────────── -->
  <v-dialog
            v-model="dialogOpen"
            max-width="680"
            scrollable
            :persistent="false">
    <v-card class="icd-ops-dialog-card">
      <!-- Header -->
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon class="mr-2">{{ type === 'icd' ? 'mdi-hospital-box-outline' : 'mdi-needle' }}</v-icon>
        <span>{{ type === 'icd' ? 'ICD-10-GM Diagnose' : 'OPS Prozedur' }}</span>
        <v-chip
                v-if="multiple"
                size="x-small"
                color="white"
                text-color="primary"
                variant="tonal"
                class="ml-2">
          Mehrfachauswahl
        </v-chip>
        <v-spacer />
        <v-btn icon variant="text" color="white" @click="dialogOpen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <!-- Search bar -->
      <v-card-text class="pa-3 pb-1 icd-ops-search-header"
                   style="position: sticky; top: 0; z-index: 1; background: white">
        <v-text-field
                      ref="searchRef"
                      v-model="searchInput"
                      :placeholder="searchPlaceholder"
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      autofocus
                      density="compact"
                      variant="outlined"
                      hide-details
                      @click:clear="clearSearch"
                      @keydown.enter="onEnterKey" />

        <!-- Mode indicator -->
        <div class="d-flex align-center mt-1 mb-1 ga-2">
          <v-chip
                  size="x-small"
                  :color="searchMode === 'code-prefix' ? 'primary' : 'secondary'"
                  variant="tonal">
            <v-icon start size="10">
              {{ searchMode === 'code-prefix' ? 'mdi-code-tags' : 'mdi-text-search' }}
            </v-icon>
            {{ searchMode === 'code-prefix' ? 'Code-Navigation' : 'Textsuche' }}
          </v-chip>
          <span class="text-caption text-grey">
            <template v-if="searchInput && searchMode === 'code-prefix' && isGroupNav">
              Klicken Sie einen Code an, um die Suche zu verfeinern
            </template>
            <template v-else-if="searchInput && searchMode === 'code-prefix' && !isGroupNav">
              Klicken Sie einen Code an, um ihn auszuwählen
            </template>
            <template v-else-if="searchInput && searchMode === 'text-search'">
              Klicken Sie einen Code an, um die Unterkategorien anzuzeigen
            </template>
            <template v-else>
              {{ type === 'icd' ? 'Buchstabe = Code, Text = Beschreibung' : 'Ziffer = Code, Text = Beschreibung' }}
            </template>
          </span>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Results -->
      <v-card-text class="pa-0 icd-ops-results" @scroll="onScroll">
        <!-- Parent-context banner (terminal codes only) -->
        <div
             v-if="contextEntry && !isGroupNav"
             class="d-flex align-center px-4 py-2 ga-2"
             style="background: rgba(var(--v-theme-primary), 0.06); border-bottom: 1px solid rgba(var(--v-theme-primary), 0.15); cursor: pointer"
             data-testid="context-entry-banner"
             @click="drillToCode(contextEntry.code)">
          <v-icon size="14" color="primary" class="flex-shrink-0">mdi-arrow-up-left</v-icon>
          <v-chip
                  size="x-small"
                  color="primary"
                  variant="outlined"
                  class="font-weight-bold flex-shrink-0">
            {{ contextEntry.code }}
          </v-chip>
          <span class="text-caption font-weight-medium text-truncate">{{ contextEntry.label }}</span>
          <v-chip size="x-small" color="primary" variant="text" class="flex-shrink-0 text-caption">
            {{ kindLabel(contextEntry.kind) }}
          </v-chip>
        </div>

        <!-- Items list -->
        <v-list v-if="items.length > 0" lines="two" density="compact" class="pa-0">
          <v-list-item
                       v-for="item in items"
                       :key="item.code"
                       :active="isSelected(item)"
                       color="primary"
                       class="px-4"
                       @click="selectItem(item)">
            <template #prepend>
              <v-chip
                      size="small"
                      color="primary"
                      :variant="isSelected(item) ? 'flat' : 'outlined'"
                      class="mr-3 font-weight-bold"
                      style="min-width: 76px; justify-content: center">
                {{ item.code }}
              </v-chip>
            </template>

            <v-list-item-title class="text-body-2">{{ item.label }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ kindLabel(item.kind) }}
              <span v-if="searchMode === 'code-prefix' && (isGroupNav || shouldDrillDeeper(item))"
                    class="ml-1 text-grey">
                · Klicken um die Auswahl einzugrenzen
              </span>
              <span v-else-if="searchMode === 'text-search'" class="ml-1 text-grey">
                · Klicken für Unterkategorien
              </span>
              <span v-else-if="searchMode === 'code-prefix' && !isGroupNav" class="ml-1 text-grey">
                · Klicken zum Auswählen
              </span>
            </v-list-item-subtitle>

            <template v-if="isSelected(item)" #append>
              <v-icon color="primary" size="small">mdi-check-circle</v-icon>
            </template>
          </v-list-item>

          <!-- Infinite-scroll sentinel (text-search mode only) -->
          <div
               v-if="hasMore"
               v-intersect="onIntersect"
               class="d-flex justify-center pa-3">
            <v-progress-circular v-if="loading" indeterminate size="24" />
            <span v-else class="text-caption text-grey">Scrollen für mehr Ergebnisse…</span>
          </div>
        </v-list>

        <!-- Loading state (initial) -->
        <div v-else-if="loading" class="d-flex justify-center align-center pa-10">
          <v-progress-circular indeterminate size="40" />
        </div>

        <!-- No results -->
        <div
             v-else-if="searchInput && searchInput.length >= minChars && !loading"
             class="d-flex flex-column align-center justify-center pa-10 text-grey">
          <v-icon size="48" class="mb-2">mdi-magnify-off</v-icon>
          <span class="text-body-2">Keine Ergebnisse gefunden</span>
          <span v-if="searchMode === 'code-prefix'" class="text-caption mt-1">
            Geben Sie mehr Zeichen ein oder versuchen Sie Textsuche
          </span>
        </div>

        <!-- Initial/empty state -->
        <div v-else class="d-flex flex-column align-center justify-center pa-10 text-grey">
          <v-icon size="52" class="mb-3">
            {{ type === 'icd' ? 'mdi-hospital-box-outline' : 'mdi-needle' }}
          </v-icon>
          <span class="text-body-2 font-weight-medium mb-1">{{ searchPlaceholder }}</span>
          <span class="text-caption">{{ hintText }}</span>
          <div class="mt-3 text-caption text-center" style="max-width: 320px">
            <span v-if="type === 'icd'">
              <strong>Code-Navigation:</strong> Beginnen Sie mit einem Buchstaben (z.B. M, A, K)<br>
              <strong>Textsuche:</strong> Geben Sie eine Beschreibung ein
            </span>
            <span v-else>
              <strong>Code-Navigation:</strong> Beginnen Sie mit einer Ziffer (z.B. 5, 8)<br>
              <strong>Textsuche:</strong> Geben Sie eine Beschreibung ein
            </span>
          </div>
        </div>
      </v-card-text>

      <!-- Footer -->
      <v-divider
                 v-if="items.length > 0 || (multiple && Array.isArray(selectedValue) && (selectedValue as Array<any>).length > 0)" />
      <v-card-actions class="px-4 py-2 d-flex align-center">
        <span class="text-caption text-grey">
          <template v-if="totalResults > 0">
            {{ items.length }} von {{ totalResults }} Ergebnissen
          </template>
        </span>
        <v-spacer />
        <!-- Show selected count in multiple mode — hover to see/manage list -->
        <template v-if="multiple && Array.isArray(selectedValue) && (selectedValue as Array<any>).length > 0">
          <v-menu
                  open-on-hover
                  :close-on-content-click="false"
                  location="top end"
                  offset="6"
                  max-width="320">
            <template #activator="{ props: menuProps }">
              <v-chip
                      v-bind="menuProps"
                      size="small"
                      color="primary"
                      variant="tonal"
                      style="cursor: default">
                {{ (selectedValue as Array<any>).length }} ausgewählt
                  <v-icon end size="12">mdi-chevron-up</v-icon>
              </v-chip>
            </template>

            <!-- Popup list of selected codes -->
            <v-card elevation="4" rounded="lg">
              <v-card-title class="text-caption text-grey px-3 pt-2 pb-0">
                Ausgewählte Codes
              </v-card-title>
              <v-list density="compact" class="pa-1" style="max-height: 240px; overflow-y: auto">
                <v-list-item
                             v-for="(val, idx) in displayChips"
                             :key="typeof val === 'object' ? (val as IcdOpsEntry).code : val"
                             rounded="md"
                             class="px-2"
                             min-height="36"
                             style="cursor: pointer"
                             @click="drillToCode(typeof val === 'object' ? (val as IcdOpsEntry).code : (val as string))">
                  <!-- Code chip — click bubbles to row handler -->
                  <template #prepend>
                    <v-chip
                            size="x-small"
                            color="primary"
                            variant="outlined"
                            class="mr-2 font-weight-bold">
                      {{ typeof val === 'object' ? (val as IcdOpsEntry).code : val }}
                    </v-chip>
                  </template>

                  <v-list-item-title class="text-caption text-truncate">
                    {{ typeof val === 'object' ? (val as IcdOpsEntry).label : '' }}
                  </v-list-item-title>

                  <!-- Remove button — stop propagation so it doesn't drill -->
                  <template #append>
                    <v-btn
                           icon
                           variant="text"
                           size="x-small"
                           color="grey"
                           @click.stop="removeItem(idx)">
                      <v-icon size="14">mdi-close</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>

          <v-btn size="small" variant="text" class="ml-2" @click="dialogOpen = false">
            Übernehmen
          </v-btn>
        </template>
        <v-btn v-else size="small" variant="text" @click="dialogOpen = false">
          Abbrechen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useIcdOpsSearch } from '@/composables/useIcdOpsSearch'
import type { IcdOpsEntry } from '@/services/icdopsService'
import type { VTextField } from 'vuetify/components'

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────

export interface IcdOpsSearchFieldProps {
  /** 'icd' for ICD-10 diagnosis codes, 'ops' for OPS procedure codes */
  type: 'icd' | 'ops'
  /** v-model value – the selected code string(s) or full entry/entries if returnObject */
  modelValue?: string | string[] | IcdOpsEntry | IcdOpsEntry[] | (string | IcdOpsEntry)[] | null
  /** Input label */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Whether to return full { code, label, kind } object instead of just code string */
  returnObject?: boolean
  /** Allow multiple selections */
  multiple?: boolean
  /** Show chips for selections (useful with multiple) */
  chips?: boolean
  /** Allow removing chips (useful with multiple) */
  closableChips?: boolean
  /** Items per page (text-search mode) */
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
  /** Debounce delay in ms (defaults to VITE_ICD_OPS_DEBOUNCE_MS env var) */
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
  debounceMs: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | IcdOpsEntry | IcdOpsEntry[] | (string | IcdOpsEntry)[] | null]
}>()

// ──────────────────────────────────────────────────────────────
// Composable
// ──────────────────────────────────────────────────────────────

const composableOptions = computed(() => ({
  limit: props.limit,
  kind: props.kind,
  debounceMs: props.debounceMs,
  minChars: props.minChars,
}))

const {
  query,
  items,
  loading,
  error: searchError,
  hasMore,
  totalResults,
  loadMore,
  searchMode,
  isGroupNav,
  contextEntry,
} = useIcdOpsSearch(props.type, composableOptions.value)

// ──────────────────────────────────────────────────────────────
// Local state
// ──────────────────────────────────────────────────────────────

const dialogOpen = ref(false)
const searchInput = ref('')
const searchRef = ref<InstanceType<typeof VTextField> | null>(null)
const fieldError = ref<string | null>(null)

// Initialize selected value
type SingleValue = IcdOpsEntry | string | null
type MultiValue = (IcdOpsEntry | string)[]
type SelectedValueType = SingleValue | MultiValue

const initializeSelectedValue = (): SelectedValueType => {
  if (props.multiple) {
    if (Array.isArray(props.modelValue)) return [...props.modelValue]
    if (props.modelValue) return [props.modelValue]
    return []
  }
  return props.modelValue ?? null
}

const selectedValue = ref<SelectedValueType>(initializeSelectedValue())

// ──────────────────────────────────────────────────────────────
// Computed
// ──────────────────────────────────────────────────────────────

const hasValue = computed(() => {
  if (props.multiple) {
    return Array.isArray(selectedValue.value) && (selectedValue.value as Array<unknown>).length > 0
  }
  return selectedValue.value !== null && selectedValue.value !== undefined
})

const displayChips = computed((): (IcdOpsEntry | string)[] => {
  if (!Array.isArray(selectedValue.value)) return []
  return selectedValue.value as (IcdOpsEntry | string)[]
})

const hintText = computed(() => {
  if (props.type === 'icd') return 'ICD-10-GM 2026 Diagnoseschlüssel'
  return 'OPS 2026 Prozedurkode'
})

const searchPlaceholder = computed(() => {
  if (props.type === 'icd') return 'Code oder Bezeichnung eingeben…'
  return 'Code (Ziffern) oder Bezeichnung eingeben…'
})

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function kindLabel(kind: string): string {
  switch (kind) {
    case 'chapter': return 'Kapitel'
    case 'block': return 'Gruppe'
    case 'category': return 'Kategorie'
    default: return kind
  }
}

function isSelected(item: IcdOpsEntry): boolean {
  const code = item.code
  if (props.multiple) {
    if (!Array.isArray(selectedValue.value)) return false
    return (selectedValue.value as (IcdOpsEntry | string)[]).some(
      (v) => (typeof v === 'object' ? v.code : v) === code,
    )
  }
  if (selectedValue.value === null || selectedValue.value === undefined) return false
  const sv = selectedValue.value as SingleValue
  return (typeof sv === 'object' && sv !== null ? (sv as IcdOpsEntry).code : sv) === code
}

// ──────────────────────────────────────────────────────────────
// Dialog actions
// ──────────────────────────────────────────────────────────────

function openDialog() {
  dialogOpen.value = true
  nextTick(() => {
    searchInput.value = ''
    query.value = ''
  })
}

function clearSearch() {
  searchInput.value = ''
  query.value = ''
}

/**
 * Set the search box to a specific code and focus it so the user
 * can refine the code (e.g. from the selected-codes popup).
 */
function drillToCode(code: string) {
  searchInput.value = code
  nextTick(() => {
    const inputEl = searchRef.value?.$el?.querySelector('input') as HTMLInputElement | null
    inputEl?.focus()
  })
}

function clearSelection() {
  selectedValue.value = props.multiple ? [] : null
  emit('update:modelValue', props.multiple ? [] : null)
}

function removeItem(idx: number) {
  if (!Array.isArray(selectedValue.value)) return
  const arr = [...(selectedValue.value as (IcdOpsEntry | string)[])]
  arr.splice(idx, 1)
  selectedValue.value = arr
  emit('update:modelValue', arr)
}

function selectItem(item: IcdOpsEntry) {
  // In code-prefix mode with group navigation: drill down instead of selecting
  if (searchMode.value === 'code-prefix' && isGroupNav.value) {
    searchInput.value = item.code
    return
  }

  // Non-terminal codes in code-navigation mode should continue drilling down
  // instead of being selected, even if the backend no longer marks them as a
  // broad navigation group.
  if (searchMode.value === 'code-prefix' && shouldDrillDeeper(item)) {
    searchInput.value = item.code
    return
  }

  // Non-terminal codes (chapter/block) always drill regardless of isGroupNav.
  // This fixes ICD codes being selected instead of refined when the user clicks
  // on a chapter or block entry.
  if (item.kind === 'chapter' || item.kind === 'block') {
    searchInput.value = item.code
    return
  }

  // In text-search mode: always drill into code navigation so the user
  // can refine to terminal codes (e.g. clicking "5-787" shows its sub-codes).
  // If the code turns out to be terminal (no children), it can then be selected.
  if (searchMode.value === 'text-search') {
    searchInput.value = item.code
    return
  }

  const value = props.returnObject ? item : item.code

  if (props.multiple) {
    const arr = Array.isArray(selectedValue.value)
      ? [...(selectedValue.value as (IcdOpsEntry | string)[])]
      : []
    const existingIdx = arr.findIndex(
      (v) => (typeof v === 'object' ? (v as IcdOpsEntry).code : v) === item.code,
    )
    if (existingIdx >= 0) {
      // Deselect
      arr.splice(existingIdx, 1)
    } else {
      arr.push(value)
    }
    selectedValue.value = arr
    emit('update:modelValue', arr)
    // Stay open for multiple selection
  } else {
    selectedValue.value = value
    emit('update:modelValue', value)
    // Close dialog after single selection
    dialogOpen.value = false
  }
}

/**
 * Returns true only for codes that represent a selectable terminal node.
 *
 * ICD-10: terminal codes contain a decimal point subdivision (e.g. M20.1, M20.10).
 *         Three-character codes (e.g. M20) still have children → not terminal.
 *
 * OPS: terminal codes end with a letter after stripping formatting characters
 *      (e.g. 5-788.1a → "57881a" ends with a letter).
 *      Codes without a trailing letter (e.g. 5-788.1 → "57881") still have
 *      sub-codes → not terminal.
 */
function isTerminalCode(code: string, type: 'icd' | 'ops'): boolean {
  if (type === 'icd') {
    return /^[A-Za-z]\d{2}\.[A-Za-z0-9]+$/.test(code)
  }
  const suffix = code.split('.')[1] ?? ''
  return suffix.length >= 2 || /[A-Za-z]/.test(suffix)
}

function hasVisibleChildren(code: string): boolean {
  return items.value.some((item) => item.code !== code && item.code.startsWith(code))
}

function shouldDrillDeeper(item: IcdOpsEntry): boolean {
  if (item.kind === 'chapter' || item.kind === 'block') return true
  if (hasVisibleChildren(item.code)) return true
  return !isTerminalCode(item.code, props.type)
}

function onEnterKey(e: KeyboardEvent) {
  if (!searchInput.value || items.value.length === 0) return
  e.preventDefault()
  const typed = searchInput.value.trim().toUpperCase()
  const exactMatch = items.value.find((item) => item.code.toUpperCase() === typed)
  const target = exactMatch ?? items.value[0]

  // Always drill if the target is not a terminal (selectable) code.
  // This covers both exact matches (e.g. typing "5-787.1") and fuzzy matches
  // (e.g. typing "5-7871" which resolves to the same non-terminal code).
  if (!isTerminalCode(target.code, props.type)) {
    searchInput.value = target.code
    return
  }
  selectItem(target)
}

function onScroll(e: Event) {
  const target = e.target as HTMLElement
  if (!target) return
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollTop + clientHeight >= scrollHeight - 80) {
    loadMore()
  }
}

function onIntersect(isIntersecting: boolean) {
  if (isIntersecting && hasMore.value && !loading.value) {
    loadMore()
  }
}

// ──────────────────────────────────────────────────────────────
// Watchers
// ──────────────────────────────────────────────────────────────

// Sync search input to composable query
watch(searchInput, (val) => {
  query.value = val ?? ''
})

// Sync external v-model changes → local selectedValue
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

// Propagate composable error to field
watch(searchError, (err) => {
  fieldError.value = err
})
</script>

<style scoped>
.icd-ops-search-field :deep(.v-input__control) {
  cursor: pointer;
}

.icd-ops-trigger {
  border-radius: 4px;
  transition: background 0.15s;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.icd-ops-trigger:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.icd-ops-dialog-card {
  height: 50vh;
  min-height: 50vh;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
}

.icd-ops-search-header {
  flex: 0 0 auto;
}

.icd-ops-results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
}

@media (max-width: 600px) {
  .icd-ops-dialog-card {
    height: 80vh;
    min-height: 80vh;
    max-height: 80vh;
  }
}
</style>
