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
const markerPosition = computed(() => {
  if (!props.scaleInfo) return '0%'
  return `${Math.max(0, Math.min(100, props.scaleInfo.normalizedValue))}%`
})

// Determine gradient direction based on polarity
// If higher-is-better: green on right (100%), red on left (0%)
// If lower-is-better: green on left (0%), red on right (100%)
const gradientDirection = computed(() => {
  if (!props.scaleInfo) return 'to right, #ef5350, #ffa726, #ffee58, #9ccc65, #66bb6a'
  if (props.scaleInfo.polarity === 'higher-is-better') {
    return 'to right, #ef5350, #ffa726, #ffee58, #9ccc65, #66bb6a' // red to green
  } else {
    return 'to right, #66bb6a, #9ccc65, #ffee58, #ffa726, #ef5350' // green to red
  }
})

// Determine label positions based on polarity
const leftLabel = computed(() => {
  if (!props.scaleInfo) return ''
  return props.scaleInfo.polarity === 'higher-is-better' 
    ? props.scaleInfo.badLabel 
    : props.scaleInfo.goodLabel
})

const rightLabel = computed(() => {
  if (!props.scaleInfo) return ''
  return props.scaleInfo.polarity === 'higher-is-better' 
    ? props.scaleInfo.goodLabel 
    : props.scaleInfo.badLabel
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
      <span class="text-caption">{{ scaleInfo.min }}</span>
      <span class="text-caption">{{ scaleInfo.max }}</span>
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
