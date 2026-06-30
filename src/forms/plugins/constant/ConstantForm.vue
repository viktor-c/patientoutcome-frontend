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
  return (getQuestion('constant', key) as number | null) ?? null
}

function set(key: string, value: number | null) {
  if (!props.readonly) updateQuestion('constant', key, value)
}

// ──────────────────────────────────────────────────────────────
// External rotation checkboxes: er1–er5 each store 0 or 2
// ──────────────────────────────────────────────────────────────
function toggleER(key: string) {
  if (props.readonly) return
  const current = get(key)
  set(key, current === 2 ? 0 : 2)
}

function erChecked(key: string): boolean {
  return get(key) === 2
}

// ──────────────────────────────────────────────────────────────
// Strength: kg input → numeric model
// ──────────────────────────────────────────────────────────────
const strengthKgModel = computed({
  get: () => get('strengthKg'),
  set: (v) => set('strengthKg', v === null ? null : Number(v)),
})

const strengthPoints = computed(() => {
  const kg = get('strengthKg')
  if (kg === null) return '—'
  return Math.min(25, Math.round(kg / 0.45))
})

// ──────────────────────────────────────────────────────────────
// Degree number inputs (flexion / abduction)
// ──────────────────────────────────────────────────────────────
function degreeModel(key: string) {
  return {
    get: () => get(key),
    set: (v: number | null) => set(key, v === null ? null : Math.min(180, Math.max(0, Number(v)))),
  }
}
const flexionModel = computed(degreeModel('flexion'))
const abductionModel = computed(degreeModel('abduction'))

// ──────────────────────────────────────────────────────────────
// View mode
// ──────────────────────────────────────────────────────────────
const viewMode = inject<Ref<FormViewMode>>('formViewMode', ref('standard'))
const isCarouselMode = computed(() => viewMode.value === 'carousel')

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

// ──────────────────────────────────────────────────────────────
// Computed score summary
// ──────────────────────────────────────────────────────────────
const scorePreview = computed(() => {
  const pain = get('pain') ?? 0
  const adl = (get('adlWork') ?? 0) + (get('adlLeisure') ?? 0) + (get('adlSleep') ?? 0) + (get('adlHandReach') ?? 0)
  const rom =
    rangePoints(get('flexion')) +
    rangePoints(get('abduction')) +
    (['er1','er2','er3','er4','er5'] as const).reduce((s, k) => s + (get(k) ?? 0), 0) +
    (get('internalRotation') ?? 0)
  const strength = get('strengthKg') !== null ? Math.min(25, Math.round((get('strengthKg') as number) / 0.45)) : 0
  return { pain, adl, rom, strength, total: pain + adl + rom + strength }
})

function rangePoints(deg: number | null): number {
  if (deg === null) return 0
  if (deg <= 30) return 0
  if (deg <= 60) return 2
  if (deg <= 90) return 4
  if (deg <= 120) return 6
  if (deg <= 150) return 8
  return 10
}

const handReachOptions = computed(() => [
  { value: 2,  label: t('constant.adlHandReach.belt') },
  { value: 4,  label: t('constant.adlHandReach.xiphoid') },
  { value: 6,  label: t('constant.adlHandReach.neck') },
  { value: 8,  label: t('constant.adlHandReach.head') },
  { value: 10, label: t('constant.adlHandReach.overhead') },
])

const internalRotationOptions = computed(() => [
  { value: 0,  label: t('constant.ir.thigh') },
  { value: 2,  label: t('constant.ir.buttock') },
  { value: 4,  label: t('constant.ir.lumbosacral') },
  { value: 6,  label: t('constant.ir.waist') },
  { value: 8,  label: t('constant.ir.t12') },
  { value: 10, label: t('constant.ir.scapula') },
])
</script>

<template>
  <div class="constant-form">
    <!-- Score summary chip row -->
    <div class="d-flex flex-wrap gap-2 mb-4">
      <v-chip color="blue-darken-2" variant="tonal">
        {{ t('constant.section.pain') }}: {{ scorePreview.pain }}/15
      </v-chip>
      <v-chip color="green-darken-2" variant="tonal">
        ADL: {{ scorePreview.adl }}/20
      </v-chip>
      <v-chip color="orange-darken-2" variant="tonal">
        ROM: {{ scorePreview.rom }}/40
      </v-chip>
      <v-chip color="purple-darken-2" variant="tonal">
        {{ t('constant.section.strength') }}: {{ scorePreview.strength }}/25
      </v-chip>
      <v-chip color="primary" variant="elevated">
        Total: {{ scorePreview.total }}/100
      </v-chip>
    </div>

    <!-- ── PAIN ─────────────────────────────────────────── -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold bg-blue-lighten-5 pa-3">
        {{ t('constant.section.pain') }}
      </v-card-title>
      <v-card-text class="pt-4">
        <div class="text-body-2 mb-2">{{ t('constant.pain.label') }}</div>
        <div class="text-caption text-medium-emphasis mb-4">{{ t('constant.pain.hint') }}</div>
        <v-slider
          :model-value="get('pain')"
          :readonly="readonly"
          :min="0"
          :max="15"
          :step="1"
          show-ticks="always"
          tick-size="4"
          thumb-label
          color="blue-darken-2"
          track-color="blue-lighten-4"
          @update:model-value="(v) => set('pain', v)"
        >
          <template #prepend>
            <span class="text-caption">0</span>
          </template>
          <template #append>
            <span class="text-caption">15</span>
          </template>
        </v-slider>
        <div class="text-center text-h6 font-weight-bold text-blue-darken-2">
          {{ get('pain') ?? '—' }} / 15
        </div>
      </v-card-text>
    </v-card>

    <!-- ── ADL ──────────────────────────────────────────── -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold bg-green-lighten-5 pa-3">
        {{ t('constant.section.adl') }}
      </v-card-title>
      <v-card-text class="pt-4">

        <!-- Work -->
        <div class="text-body-2 mb-1">{{ t('constant.adlWork.label') }}</div>
        <v-slider
          :model-value="get('adlWork')"
          :readonly="readonly"
          :min="0" :max="4" :step="1"
          show-ticks="always" tick-size="4" thumb-label
          color="green-darken-2"
          @update:model-value="(v) => set('adlWork', v)"
          class="mb-2"
        />

        <!-- Leisure -->
        <div class="text-body-2 mb-1">{{ t('constant.adlLeisure.label') }}</div>
        <v-slider
          :model-value="get('adlLeisure')"
          :readonly="readonly"
          :min="0" :max="4" :step="1"
          show-ticks="always" tick-size="4" thumb-label
          color="green-darken-2"
          @update:model-value="(v) => set('adlLeisure', v)"
          class="mb-2"
        />

        <!-- Sleep -->
        <div class="text-body-2 mb-1">{{ t('constant.adlSleep.label') }}</div>
        <v-slider
          :model-value="get('adlSleep')"
          :readonly="readonly"
          :min="0" :max="2" :step="1"
          show-ticks="always" tick-size="4" thumb-label
          color="green-darken-2"
          @update:model-value="(v) => set('adlSleep', v)"
          class="mb-4"
        />

        <!-- Hand reach -->
        <div class="text-body-2 mb-2">{{ t('constant.adlHandReach.label') }}</div>
        <v-radio-group
          :model-value="get('adlHandReach')"
          :readonly="readonly"
          @update:model-value="(v) => set('adlHandReach', v as number)"
        >
          <v-radio
            v-for="opt in handReachOptions"
            :key="opt.value"
            :value="opt.value"
            color="green-darken-2"
          >
            <template #label>
              <span class="text-body-2">{{ opt.label }}</span>
            </template>
          </v-radio>
        </v-radio-group>

        <div class="text-right text-caption text-green-darken-2 font-weight-medium">
          ADL subtotal: {{ scorePreview.adl }} / 20
        </div>
      </v-card-text>
    </v-card>

    <!-- ── ROM ──────────────────────────────────────────── -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold bg-orange-lighten-5 pa-3">
        {{ t('constant.section.rom') }}
      </v-card-title>
      <v-card-text class="pt-4">

        <!-- Flexion degree input -->
        <v-text-field
          v-model.number="flexionModel"
          :readonly="readonly"
          :label="t('constant.flexion.label')"
          type="number"
          min="0" max="180"
          suffix="°"
          hide-spin-buttons
          density="compact"
          class="mb-1"
          @update:model-value="(v) => set('flexion', v === '' || v === null ? null : Number(v))"
        />
        <div class="text-caption text-medium-emphasis mb-4">
          → {{ rangePoints(get('flexion')) }} / 10 {{ t('constant.points') }}
        </div>

        <!-- Abduction degree input -->
        <v-text-field
          v-model.number="abductionModel"
          :readonly="readonly"
          :label="t('constant.abduction.label')"
          type="number"
          min="0" max="180"
          suffix="°"
          hide-spin-buttons
          density="compact"
          class="mb-1"
          @update:model-value="(v) => set('abduction', v === '' || v === null ? null : Number(v))"
        />
        <div class="text-caption text-medium-emphasis mb-4">
          → {{ rangePoints(get('abduction')) }} / 10 {{ t('constant.points') }}
        </div>

        <!-- External rotation checkboxes -->
        <div class="text-body-2 mb-2">{{ t('constant.er.label') }}</div>
        <v-list density="compact" class="mb-2 pa-0">
          <v-list-item
            v-for="erKey in ['er1','er2','er3','er4','er5']"
            :key="erKey"
            :disabled="readonly"
            class="pa-1"
          >
            <template #prepend>
              <v-checkbox-btn
                :model-value="erChecked(erKey)"
                :disabled="readonly"
                color="orange-darken-2"
                @update:model-value="toggleER(erKey)"
              />
            </template>
            <v-list-item-title class="text-body-2">
              {{ t(`constant.${erKey}.label`) }}
            </v-list-item-title>
            <template #append>
              <v-chip size="x-small" :color="erChecked(erKey) ? 'orange-darken-2' : 'grey'" variant="tonal">
                {{ erChecked(erKey) ? '+2' : '0' }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
        <div class="text-caption text-medium-emphasis mb-4">
          External rotation total: {{ (['er1','er2','er3','er4','er5'] as const).reduce((s, k) => s + (get(k) ?? 0), 0) }} / 10
        </div>

        <!-- Internal rotation -->
        <div class="text-body-2 mb-2">{{ t('constant.internalRotation.label') }}</div>
        <v-radio-group
          :model-value="get('internalRotation')"
          :readonly="readonly"
          @update:model-value="(v) => set('internalRotation', v as number)"
        >
          <v-radio
            v-for="opt in internalRotationOptions"
            :key="opt.value"
            :value="opt.value"
            color="orange-darken-2"
          >
            <template #label>
              <span class="text-body-2">{{ opt.label }}</span>
            </template>
          </v-radio>
        </v-radio-group>

        <div class="text-right text-caption text-orange-darken-2 font-weight-medium">
          ROM subtotal: {{ scorePreview.rom }} / 40
        </div>
      </v-card-text>
    </v-card>

    <!-- ── STRENGTH ─────────────────────────────────────── -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1 font-weight-bold bg-purple-lighten-5 pa-3">
        {{ t('constant.section.strength') }}
      </v-card-title>
      <v-card-text class="pt-4">
        <v-text-field
          v-model.number="strengthKgModel"
          :readonly="readonly"
          :label="t('constant.strengthKg.label')"
          :hint="t('constant.strengthKg.hint')"
          persistent-hint
          type="number"
          min="0" max="15"
          step="0.05"
          suffix="kg"
          hide-spin-buttons
          density="compact"
          class="mb-2"
          @update:model-value="(v) => set('strengthKg', v === '' || v === null ? null : Number(v))"
        />
        <div class="text-center text-h6 font-weight-bold text-purple-darken-2 mt-2">
          {{ strengthPoints }} / 25
        </div>
      </v-card-text>
    </v-card>

    <!-- ── Comment dialog ──────────────────────────────── -->
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
.constant-form {
  max-width: 640px;
  margin: 0 auto;
}
.gap-2 {
  gap: 8px;
}
</style>
