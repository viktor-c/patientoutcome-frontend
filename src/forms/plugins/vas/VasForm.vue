<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useForm } from '../../composables/useForm'
import { calculateScore } from './scoring'
import { translations } from './translations'
import type { FormComponentProps, FormComponentEvents, FormData as PluginFormData } from '../../types'
import type { ScoringData } from '@/types/backend/scoring'

// Component props following the plugin interface
const props = withDefaults(defineProps<FormComponentProps>(), {
  readonly: false,
  locale: 'en'
})

// Component events
const emit = defineEmits<FormComponentEvents>()

// Use the shared form composable
const { localData, updateQuestion, t } = useForm({
  modelValue: toRef(props, 'modelValue'),
  calculateScore,
  translations,
  locale: toRef(props, 'locale'),
  emit: (event: string, ...args: unknown[]) => {
    if (event === 'update:modelValue') {
      emit('update:modelValue', args[0] as PluginFormData)
    } else if (event === 'score-change') {
      emit('score-change', args[0] as ScoringData)
    } else if (event === 'validation-change') {
      emit('validation-change', args[0] as boolean)
    }
  }
})

// Pain faces configuration
const painFaces = [
  { value: 0, emoji: '😊', color: '#4CAF50', label: 'vas.face.0' },
  { value: 2, emoji: '🙂', color: '#8BC34A', label: 'vas.face.2' },
  { value: 4, emoji: '😐', color: '#FFC107', label: 'vas.face.4' },
  { value: 6, emoji: '😟', color: '#FF9800', label: 'vas.face.6' },
  { value: 8, emoji: '😣', color: '#FF5722', label: 'vas.face.8' },
  { value: 10, emoji: '😫', color: '#F44336', label: 'vas.face.10' }
]

// Get current pain level value
const currentPainLevel = computed(() => {
  return localData.value.painScale?.painLevel ?? null
})

// Get current face based on pain level
const currentFace = computed(() => {
  if (currentPainLevel.value === null) return null
  
  // Find the closest face to current pain level
  return painFaces.reduce((closest, face) => {
    const currentDiff = Math.abs((currentPainLevel.value as number) - face.value)
    const closestDiff = Math.abs((currentPainLevel.value as number) - closest.value)
    return currentDiff < closestDiff ? face : closest
  })
})

// Get slider color based on pain level
const sliderColor = computed(() => {
  if (currentPainLevel.value === null) return '#9E9E9E'
  
  const painValue = currentPainLevel.value as number
  if (painValue <= 2) return '#4CAF50'
  if (painValue <= 4) return '#8BC34A'
  if (painValue <= 6) return '#FFC107'
  if (painValue <= 8) return '#FF9800'
  return '#F44336'
})

// Handle pain level change
function handlePainLevelChange(value: number) {
  if (!props.readonly) {
    updateQuestion('painScale', 'painLevel', value)
  }
}

// Handle face click
function handleFaceClick(value: number) {
  if (!props.readonly) {
    updateQuestion('painScale', 'painLevel', value)
  }
}
</script>

<template>
  <div class="vas-container">
    <h3 class="mb-4">{{ t('vas.title.description') }}</h3>

    <!-- Instructions -->
    <div class="mb-4 text-caption text-grey">
      <p>
        <strong>{{ t('vas.instructions.title') }}:</strong>
        {{ t('vas.instructions.description') }}
      </p>
    </div>

    <!-- Current Pain Display -->
    <div v-if="currentFace && currentPainLevel !== null" class="current-pain-display mb-6">
      <div class="pain-face-large" :style="{ color: currentFace.color }">
        {{ currentFace.emoji }}
      </div>
      <div class="pain-label">
        {{ t(currentFace.label) }}
      </div>
      <v-chip :color="sliderColor" class="pain-value-chip">
        {{ (currentPainLevel as number).toFixed(1) }}
      </v-chip>
    </div>

    <!-- Pain Scale Slider -->
    <div class="pain-slider-container mb-6">
      <v-label class="mb-2">
        {{ t('painScale.painLevel.label') }}
      </v-label>
      
      <v-slider
        :model-value="currentPainLevel ?? undefined"
        @update:model-value="handlePainLevelChange"
        :min="0"
        :max="10"
        :step="0.1"
        :ticks="painFaces.reduce((acc, face) => ({ ...acc, [face.value]: '' }), {})"
        :color="sliderColor"
        :readonly="readonly"
        show-ticks="always"
        thumb-label="always"
        class="pain-slider"
      >
        <template #prepend>
          <div class="slider-label">
            {{ t('painScale.tick.low') }}
          </div>
        </template>
        <template #append>
          <div class="slider-label">
            {{ t('painScale.tick.high') }}
          </div>
        </template>
      </v-slider>
    </div>

    <!-- Pain Faces Grid -->
    <div class="pain-faces-grid">
      <div
        v-for="face in painFaces"
        :key="face.value"
        class="pain-face-item"
        :class="{ 
          active: currentPainLevel === face.value,
          readonly: readonly
        }"
        @click="handleFaceClick(face.value)"
      >
        <div class="pain-face-emoji" :style="{ color: face.color }">
          {{ face.emoji }}
        </div>
        <div class="pain-face-value">{{ face.value }}</div>
        <div class="pain-face-label">{{ t(face.label) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vas-container {
  width: 100%;
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.current-pain-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: #f5f5f5;
  border-radius: 8px;
}

.pain-face-large {
  font-size: 80px;
  line-height: 1;
}

.pain-label {
  font-size: 1.2rem;
  font-weight: 500;
  text-align: center;
}

.pain-value-chip {
  font-size: 1.5rem;
  font-weight: bold;
  height: 48px;
  padding: 0 24px;
}

.pain-slider-container {
  padding: 0 16px;
}

.slider-label {
  font-size: 0.75rem;
  text-align: center;
  max-width: 80px;
  line-height: 1.2;
  color: #666;
}

.pain-slider {
  margin: 16px 0;
}

.pain-faces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.pain-face-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
}

.pain-face-item:hover:not(.readonly) {
  background: #f0f0f0;
  border-color: #e0e0e0;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.pain-face-item.active {
  border-color: currentColor;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.pain-face-item.readonly {
  cursor: default;
}

.pain-face-emoji {
  font-size: 48px;
  line-height: 1;
}

.pain-face-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #666;
}

.pain-face-label {
  font-size: 0.85rem;
  text-align: center;
  color: #666;
  line-height: 1.2;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .pain-faces-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .pain-face-large {
    font-size: 60px;
  }

  .pain-face-emoji {
    font-size: 36px;
  }

  .pain-label {
    font-size: 1rem;
  }

  .slider-label {
    font-size: 0.65rem;
    max-width: 60px;
  }
}

@media (min-width: 600px) {
  .pain-faces-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 900px) {
  .pain-faces-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
