<script setup lang="ts">
import { computed, toRef, inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormSubmissionData, FormCommentContext } from '../../types'
import type { Ref } from 'vue'
import type { FormViewMode } from '../../composables/useFormViewMode'

const props = withDefaults(defineProps<FormComponentProps>(), {
  readonly: false,
  locale: 'en',
})

const emit = defineEmits<FormComponentEvents>()
const { t: tGlobal } = useI18n()

const { updateQuestion, getQuestion, t } = useForm({
  modelValue: toRef(props, 'modelValue'),
  calculateScore,
  translations,
  locale: toRef(props, 'locale'),
  emit: (event: string, ...args: unknown[]) => {
    if (event === 'update:modelValue') {
      emit('update:modelValue', args[0] as FormSubmissionData)
    }
  },
})

function get(key: string): number | null {
  return (getQuestion('rowe', key) as number | null) ?? null
}

function set(key: string, value: number | null) {
  if (!props.readonly) updateQuestion('rowe', key, value)
}

// ──────────────────────────────────────────────────────────────
// Score interpretation
// ──────────────────────────────────────────────────────────────
const total = computed(() => (get('stability') ?? 0) + (get('motion') ?? 0) + (get('function') ?? 0))

const interpretation = computed(() => {
  const s = total.value
  if (s >= 90) return { label: t('rowe.interpretation.excellent'), color: 'success' }
  if (s >= 75) return { label: t('rowe.interpretation.good'), color: 'green' }
  if (s >= 51) return { label: t('rowe.interpretation.fair'), color: 'warning' }
  return { label: t('rowe.interpretation.poor'), color: 'error' }
})

const isComplete = computed(() => get('stability') !== null && get('motion') !== null && get('function') !== null)

// View mode
const viewMode = inject<Ref<FormViewMode>>('formViewMode', ref('standard'))

const formCommentContext = inject<FormCommentContext | null>('formCommentContext', null)
const showCommentDialog = ref(false)
const commentDraft = ref('')

function openCommentDialog() {
  if (props.readonly || !formCommentContext) return
  commentDraft.value = ''
  showCommentDialog.value = true
}

function saveComment() {
  const content = commentDraft.value.trim()
  if (!content || !formCommentContext) return
  formCommentContext.addComment({ content })
  showCommentDialog.value = false
  commentDraft.value = ''
}

// Question definitions for each section
const stabilityOptions = computed(() => [
  { value: 50, label: t('rowe.stability.none') },
  { value: 30, label: t('rowe.stability.apprehension') },
  { value: 10, label: t('rowe.stability.subluxation') },
  { value: 0,  label: t('rowe.stability.reluxation') },
])

const motionOptions = computed(() => [
  { value: 20, label: t('rowe.motion.full') },
  { value: 15, label: t('rowe.motion.reduced75') },
  { value: 5,  label: t('rowe.motion.reduced50') },
  { value: 0,  label: t('rowe.motion.none') },
])

const functionOptions = computed(() => [
  { value: 30, label: t('rowe.function.none') },
  { value: 25, label: t('rowe.function.slight') },
  { value: 10, label: t('rowe.function.moderate') },
  { value: 0,  label: t('rowe.function.severe') },
])
</script>

<template>
  <div class="rowe-form">
    <!-- Score summary -->
    <div class="d-flex flex-wrap gap-2 mb-4">
      <v-chip color="blue-darken-2" variant="tonal">
        {{ t('rowe.section.stability') }}: {{ get('stability') ?? '—' }}/50
      </v-chip>
      <v-chip color="green-darken-2" variant="tonal">
        {{ t('rowe.section.motion') }}: {{ get('motion') ?? '—' }}/20
      </v-chip>
      <v-chip color="orange-darken-2" variant="tonal">
        {{ t('rowe.section.function') }}: {{ get('function') ?? '—' }}/30
      </v-chip>
      <v-chip color="primary" variant="elevated">
        Total: {{ total }}/100
      </v-chip>
      <v-chip v-if="isComplete" :color="interpretation.color" variant="tonal">
        {{ interpretation.label }}
      </v-chip>
    </div>

    <!-- ── STABILITY ──────────────────────────────────────── -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold bg-blue-lighten-5 pa-3">
        {{ t('rowe.section.stability') }}
      </v-card-title>
      <v-card-text class="pt-3">
        <div class="text-body-2 mb-3">{{ t('rowe.stability.label') }}</div>
        <v-radio-group
          :model-value="get('stability')"
          :readonly="readonly"
          @update:model-value="(v) => set('stability', v as number)"
        >
          <v-radio
            v-for="opt in stabilityOptions"
            :key="opt.value"
            :value="opt.value"
            color="blue-darken-2"
            class="mb-2"
          >
            <template #label>
              <span class="text-body-2">{{ opt.label }}</span>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
    </v-card>

    <!-- ── MOTION ─────────────────────────────────────────── -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold bg-green-lighten-5 pa-3">
        {{ t('rowe.section.motion') }}
      </v-card-title>
      <v-card-text class="pt-3">
        <div class="text-body-2 mb-3">{{ t('rowe.motion.label') }}</div>
        <v-radio-group
          :model-value="get('motion')"
          :readonly="readonly"
          @update:model-value="(v) => set('motion', v as number)"
        >
          <v-radio
            v-for="opt in motionOptions"
            :key="opt.value"
            :value="opt.value"
            color="green-darken-2"
            class="mb-2"
          >
            <template #label>
              <span class="text-body-2">{{ opt.label }}</span>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
    </v-card>

    <!-- ── FUNCTION ───────────────────────────────────────── -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold bg-orange-lighten-5 pa-3">
        {{ t('rowe.section.function') }}
      </v-card-title>
      <v-card-text class="pt-3">
        <div class="text-body-2 mb-3">{{ t('rowe.function.label') }}</div>
        <v-radio-group
          :model-value="get('function')"
          :readonly="readonly"
          @update:model-value="(v) => set('function', v as number)"
        >
          <v-radio
            v-for="opt in functionOptions"
            :key="opt.value"
            :value="opt.value"
            color="orange-darken-2"
            class="mb-2"
          >
            <template #label>
              <span class="text-body-2">{{ opt.label }}</span>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
    </v-card>

    <!-- Comment button -->
    <div class="d-flex justify-end mb-2" v-if="!readonly && formCommentContext">
      <v-btn
        variant="tonal"
        color="warning"
        size="small"
        prepend-icon="mdi-comment-alert-outline"
        @click="openCommentDialog"
      >
        {{ tGlobal('forms.comments.add') }}
      </v-btn>
    </div>

    <v-dialog v-model="showCommentDialog" max-width="560">
      <v-card>
        <v-card-title>{{ tGlobal('forms.comments.dialogTitle') }}</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="commentDraft"
            :label="tGlobal('forms.comments.content')"
            :hint="tGlobal('forms.comments.hint')"
            persistent-hint
            rows="4"
            maxlength="1000"
            counter
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCommentDialog = false">{{ tGlobal('buttons.cancel') }}</v-btn>
          <v-btn variant="elevated" color="primary" :disabled="!commentDraft.trim()" @click="saveComment">
            {{ tGlobal('buttons.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.rowe-form {
  max-width: 640px;
  margin: 0 auto;
}
.gap-2 {
  gap: 8px;
}
</style>
