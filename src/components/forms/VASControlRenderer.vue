<script setup lang="ts">
/**
 * VAS (Visual Analog Scale) Form Renderer
 * Interactive pain scale with slider and visual feedback
 */

import { type ControlElement } from '@jsonforms/core'
import {
  useJsonFormsControl,
  type RendererProps,
} from '@jsonforms/vue'
import { computed, ref, watch } from 'vue'
import { useVuetifyControl } from '@jsonforms/vue-vuetify'
import type { ScoringData } from '@/types'

const props = defineProps<RendererProps<ControlElement>>()

const control = useVuetifyControl(useJsonFormsControl(props))

// Local state for pain level
const localPainLevel = ref<number>(0)

// Initialize from control data
const initializeLocalData = () => {
  const data = control.control.value.data
  console.debug('VAS: Initializing with data:', data)

  if (data && typeof data === 'object') {
    // Handle ScoringData structure
    if ('rawData' in data && data.rawData && typeof data.rawData === 'object') {
      const rawData = data.rawData as Record<string, Record<string, number>>
      if (rawData.painScale?.painLevel !== undefined) {
        localPainLevel.value = rawData.painScale.painLevel
      }
    }
    // Handle direct nested structure
    else if ('painScale' in data && data.painScale && typeof data.painScale === 'object') {
      const painScale = data.painScale as Record<string, number>
      if (painScale.painLevel !== undefined) {
        localPainLevel.value = painScale.painLevel
      }
    }
  }

  console.debug('VAS: Initialized pain level:', localPainLevel.value)
}

initializeLocalData()

// Pain faces configuration (based on VAS image)
const painFaces = [
  { value: 0, emoji: '😊', label: 'Keine Schmerzen', color: '#4CAF50' },
  { value: 2, emoji: '🙂', label: 'Sehr leichte Schmerzen', color: '#8BC34A' },
  { value: 4, emoji: '😐', label: 'Leichte Schmerzen', color: '#FFEB3B' },
  { value: 6, emoji: '😟', label: 'Mäßige Schmerzen', color: '#FFC107' },
  { value: 8, emoji: '😣', label: 'Starke Schmerzen', color: '#FF9800' },
  { value: 10, emoji: '😫', label: 'Unerträgliche Schmerzen', color: '#F44336' },
]

// Get current pain face
const currentPainFace = computed(() => {
  const level = localPainLevel.value
  // Find the closest pain face
  let closest = painFaces[0]
  let minDiff = Math.abs(level - painFaces[0].value)

  for (const face of painFaces) {
    const diff = Math.abs(level - face.value)
    if (diff < minDiff) {
      minDiff = diff
      closest = face
    }
  }

  return closest
})

// Calculate score (direct mapping for VAS)
const calculateScore = (painLevel: number): ScoringData => {
  const rawScore = painLevel
  const normalizedScore = (painLevel / 10) * 100 // 0-100 scale

  return {
    rawData: {
      painScale: {
        painLevel
      }
    },
    total: {
      name: 'VAS Score',
      rawScore,
      normalizedScore,
      maxPossibleScore: 10,
      answeredQuestions: 1,
      totalQuestions: 1,
      completionPercentage: 100,
      isComplete: true
    },
    subscales: {}
  }
}

// Update control value when local data changes
const updateControlValue = () => {
  const scoringData = calculateScore(localPainLevel.value)
  console.debug('VAS: Updating control with scoring data:', scoringData)
  control.onChange(scoringData)
}

// Watch for slider changes
watch(localPainLevel, () => {
  updateControlValue()
})

// Slider color based on pain level
const sliderColor = computed(() => {
  return currentPainFace.value.color
})
</script>

<template>
  <v-card class="vas-form-container" elevation="2">
    <v-card-title class="bg-primary text-white">
      <v-icon start>mdi-hospital-box</v-icon>
      Schmerzskala / Pain Scale (VAS)
    </v-card-title>

    <v-card-text class="pt-6">
      <!-- Current Pain Face Display -->
      <div class="text-center mb-8">
        <div class="pain-face-display" :style="{ color: currentPainFace.color }">
          <div class="pain-emoji">{{ currentPainFace.emoji }}</div>
          <div class="pain-label mt-2">{{ currentPainFace.label }}</div>
          <div class="pain-value mt-1">
            <v-chip :color="currentPainFace.color" size="large" variant="elevated">
              {{ localPainLevel.toFixed(1) }} / 10
            </v-chip>
          </div>
        </div>
      </div>

      <!-- Pain Scale Slider -->
      <v-row class="mb-4">
        <v-col cols="12">
          <div class="px-4">
            <v-slider
                      v-model="localPainLevel"
                      :color="sliderColor"
                      :thumb-label="true"
                      :min="0"
                      :max="10"
                      :step="0.1"
                      :ticks="painFaces.map(f => f.value)"
                      show-ticks="always"
                      :tick-size="4"
                      track-size="8"
                      thumb-size="24">
              <template #prepend>
                <span class="text-caption">0</span>
              </template>
              <template #append>
                <span class="text-caption">10</span>
              </template>
            </v-slider>
          </div>
        </v-col>
      </v-row>

      <!-- Pain Face Reference Scale -->
      <v-row class="mt-6">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-subtitle class="text-center font-weight-bold">
              Referenzskala / Reference Scale
            </v-card-subtitle>
            <v-card-text>
              <div class="pain-faces-grid">
                <div
                     v-for="face in painFaces"
                     :key="face.value"
                     class="pain-face-item"
                     :class="{ 'active': Math.abs(localPainLevel - face.value) < 1 }"
                     @click="localPainLevel = face.value">
                  <div class="face-emoji" :style="{ color: face.color }">{{ face.emoji }}</div>
                  <div class="face-value">{{ face.value }}</div>
                  <div class="face-label text-caption">{{ face.label }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Instructions -->
      <v-row class="mt-4">
        <v-col cols="12">
          <v-alert type="info" variant="tonal" density="compact">
            <div class="text-body-2">
              <strong>Anleitung:</strong> Bewegen Sie den Schieberegler oder klicken Sie auf ein Gesicht,
              um Ihre aktuelle Schmerzintensität anzugeben.
            </div>
            <div class="text-caption mt-2">
              <strong>Instructions:</strong> Move the slider or click on a face to indicate your current pain level.
            </div>
          </v-alert>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.vas-form-container {
  max-width: 800px;
  margin: 0 auto;
}

.pain-face-display {
  padding: 2rem;
}

.pain-emoji {
  font-size: 6rem;
  line-height: 1;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}

.pain-label {
  font-size: 1.5rem;
  font-weight: 600;
}

.pain-value {
  margin-top: 1rem;
}

.pain-faces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.pain-face-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.pain-face-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.pain-face-item.active {
  border-color: currentColor;
  background-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.face-emoji {
  font-size: 2.5rem;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.face-value {
  font-weight: 700;
  font-size: 1.2rem;
  margin-bottom: 0.25rem;
}

.face-label {
  text-align: center;
  line-height: 1.2;
  min-height: 2.4em;
}

/* Mobile responsiveness */
@media (max-width: 600px) {
  .pain-emoji {
    font-size: 4rem;
  }

  .pain-label {
    font-size: 1.2rem;
  }

  .pain-faces-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .face-emoji {
    font-size: 2rem;
  }
}
</style>
