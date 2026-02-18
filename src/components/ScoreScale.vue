<script setup lang="ts">
import { computed } from 'vue'
import type { ScaleInfo } from '@/utils/scaleInfo'

interface Props {
  scaleInfo?: ScaleInfo | null
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 8
})

// Calculate position (0-100%)
// For consistent visual presentation: always show good on right, bad on left
// If scale is "lower-is-better", invert the position
const markerPosition = computed(() => {
  if (!props.scaleInfo) return '0%'
  let position = props.scaleInfo.normalizedValue
  
  // Invert position for lower-is-better scales so good scores appear on right
  if (props.scaleInfo.polarity === 'lower-is-better') {
    position = 100 - position
  }
  
  return `${Math.max(0, Math.min(100, position))}%`
})

// Always use red-to-green gradient (bad on left, good on right)
const gradientDirection = 'to right, #ef5350, #ffa726, #ffee58, #9ccc65, #66bb6a'

// Always show bad label on left, good label on right for consistent visual assessment
const leftLabel = computed(() => {
  if (!props.scaleInfo) return ''
  return props.scaleInfo.badLabel
})

const rightLabel = computed(() => {
  if (!props.scaleInfo) return ''
  return props.scaleInfo.goodLabel
})

// Invert min/max values for lower-is-better scales to match inverted display
const leftValue = computed(() => {
  if (!props.scaleInfo) return ''
  return props.scaleInfo.polarity === 'lower-is-better' 
    ? props.scaleInfo.max 
    : props.scaleInfo.min
})

const rightValue = computed(() => {
  if (!props.scaleInfo) return ''
  return props.scaleInfo.polarity === 'lower-is-better' 
    ? props.scaleInfo.min 
    : props.scaleInfo.max
})
</script>

<template>
  <div v-if="scaleInfo" class="score-scale">
    <!-- Labels -->
    <div class="scale-labels mb-1">
      <span class="text-caption text-medium-emphasis">{{ leftLabel }}</span>
      <span class="text-caption text-medium-emphasis">{{ rightLabel }}</span>
    </div>
    
    <!-- Scale bar -->
    <div 
      class="scale-bar" 
      :style="{ 
        height: `${height}px`,
        background: `linear-gradient(${gradientDirection})`
      }"
    >
      <!-- Marker -->
      <div 
        class="scale-marker"
        :style="{ left: markerPosition }"
      >
        <div class="marker-dot"></div>
        <div class="marker-line"></div>
      </div>
    </div>
    
    <!-- Min/Max labels -->
    <div class="scale-values mt-1">
      <span class="text-caption">{{ leftValue }}</span>
      <span class="text-caption">{{ rightValue }}</span>
    </div>
  </div>
</template>

<style scoped>
.score-scale {
  width: 100%;
  user-select: none;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scale-bar {
  position: relative;
  width: 100%;
  border-radius: 4px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.scale-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.marker-dot {
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #1976d2;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.marker-line {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 20px;
  background: #1976d2;
  margin-top: 6px;
}

.scale-values {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
