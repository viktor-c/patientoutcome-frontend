<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export interface ElsnerPoint {
  week: number
  expectation: number
  date?: string
}

interface Props {
  points: ElsnerPoint[]
  selectedWeek?: number | null
  selectedExpectation?: number | null
  interactive?: boolean
  showTrendLine?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
  betterAreaLabel?: string
  worseAreaLabel?: string
  title?: string
  xMax?: number
  yMax?: number
}

const props = withDefaults(defineProps<Props>(), {
  selectedWeek: null,
  selectedExpectation: null,
  interactive: false,
  showTrendLine: false,
  xAxisLabel: 'Weeks postoperative',
  yAxisLabel: 'Patient expectation',
  betterAreaLabel: 'better',
  worseAreaLabel: 'worse',
  title: '',
  xMax: 12,
  yMax: 140,
})

const emit = defineEmits<{
  (e: 'select-expectation', value: number): void
}>()

const { locale } = useI18n()
const currentLocale = computed(() => locale.value === 'de' ? 'de-DE' : 'en-US')

const width = 720
const height = 360
const paddingLeft = 56
const paddingRight = 20
const paddingTop = 20
const paddingBottom = 44

const innerWidth = computed(() => width - paddingLeft - paddingRight)
const innerHeight = computed(() => height - paddingTop - paddingBottom)

const effectiveXMax = computed(() => {
  const maxWeekFromPoints = props.points.reduce((max, p) => Math.max(max, p.week), 0)
  const selected = props.selectedWeek ?? 0
  return Math.max(props.xMax, selected, maxWeekFromPoints, 1)
})

const effectiveYMax = computed(() => Math.max(1, props.yMax))

const xTicks = computed(() => {
  const max = effectiveXMax.value
  const step = max <= 12 ? 1 : max <= 24 ? 2 : 4
  const ticks: number[] = []
  for (let tick = 0; tick <= max; tick += step) {
    ticks.push(tick)
  }
  if (ticks[ticks.length - 1] !== max) ticks.push(max)
  return ticks
})

function toCanvasX(week: number): number {
  return paddingLeft + (week / effectiveXMax.value) * innerWidth.value
}

function toCanvasY(expectation: number): number {
  const clamped = Math.max(0, Math.min(effectiveYMax.value, expectation))
  return paddingTop + innerHeight.value - (clamped / effectiveYMax.value) * innerHeight.value
}

const sortedPoints = computed(() => {
  return [...props.points].sort((a, b) => a.week - b.week)
})

const trendLinePath = computed(() => {
  if (!props.showTrendLine || sortedPoints.value.length === 0) return ''

  return sortedPoints.value
    .map((point, index) => {
      const x = toCanvasX(point.week)
      const y = toCanvasY(point.expectation)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
})

const referenceLine = computed(() => {
  return {
    x1: toCanvasX(0),
    y1: toCanvasY(0),
    x2: toCanvasX(effectiveXMax.value),
    y2: toCanvasY(effectiveYMax.value),
  }
})

const betterAreaPath = computed(() => {
  const xMin = paddingLeft
  const xMax = paddingLeft + innerWidth.value
  const yMin = paddingTop

  return `M ${xMin} ${yMin} L ${xMax} ${yMin} L ${referenceLine.value.x2} ${referenceLine.value.y2} L ${referenceLine.value.x1} ${referenceLine.value.y1} Z`
})

const worseAreaPath = computed(() => {
  const xMin = paddingLeft
  const xMax = paddingLeft + innerWidth.value
  const yMax = paddingTop + innerHeight.value

  return `M ${xMin} ${yMax} L ${xMax} ${yMax} L ${referenceLine.value.x2} ${referenceLine.value.y2} L ${referenceLine.value.x1} ${referenceLine.value.y1} Z`
})

const selectedPoint = computed(() => {
  if (props.selectedWeek == null || props.selectedExpectation == null) return null
  return {
    x: toCanvasX(props.selectedWeek),
    y: toCanvasY(props.selectedExpectation),
  }
})

function onChartClick(event: MouseEvent) {
  if (!props.interactive || props.selectedWeek == null) return

  const target = event.currentTarget as SVGSVGElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  const y = event.clientY - rect.top
  const normalized = (paddingTop + innerHeight.value - y) / innerHeight.value
  const expectation = Math.round(Math.max(0, Math.min(1, normalized)) * effectiveYMax.value)
  emit('select-expectation', expectation)
}

// Tooltip
const TOOLTIP_W = 170
const TOOLTIP_H = 46

const hoveredPoint = ref<ElsnerPoint | null>(null)

function onPointMouseEnter(point: ElsnerPoint) {
  hoveredPoint.value = point
}

function onPointMouseLeave() {
  hoveredPoint.value = null
}

const tooltipTransform = computed(() => {
  if (!hoveredPoint.value) return ''
  const x = toCanvasX(hoveredPoint.value.week)
  const y = toCanvasY(hoveredPoint.value.expectation)
  let tx = x - TOOLTIP_W / 2
  let ty = y - TOOLTIP_H - 12
  tx = Math.max(paddingLeft, Math.min(width - paddingRight - TOOLTIP_W, tx))
  if (ty < paddingTop) ty = y + 12
  return `translate(${tx}, ${ty})`
})

const tooltipDateText = computed(() => {
  const p = hoveredPoint.value
  if (!p) return ''
  if (p.date) {
    return new Date(p.date).toLocaleString(currentLocale.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }
  return `${props.xAxisLabel}: ${p.week}`
})

const tooltipScoreText = computed(() => {
  const p = hoveredPoint.value
  if (!p) return ''
  return `${props.yAxisLabel}: ${p.expectation}`
})
</script>

<template>
  <div class="elsner-chart-wrapper">
    <p v-if="title" class="chart-title">{{ title }}</p>

    <svg
      class="elsner-chart"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      @click="onChartClick"
      @mouseleave="onPointMouseLeave"
    >
      <path :d="betterAreaPath" class="better-area" />
      <path :d="worseAreaPath" class="worse-area" />

      <line :x1="paddingLeft" :y1="paddingTop + innerHeight" :x2="paddingLeft + innerWidth" :y2="paddingTop + innerHeight" stroke="#546e7a" stroke-width="1.5" />
      <line :x1="paddingLeft" :y1="paddingTop" :x2="paddingLeft" :y2="paddingTop + innerHeight" stroke="#546e7a" stroke-width="1.5" />

      <line
        :x1="referenceLine.x1"
        :y1="referenceLine.y1"
        :x2="referenceLine.x2"
        :y2="referenceLine.y2"
        stroke="#1565c0"
        stroke-width="2"
      />

      <template v-for="tick in xTicks" :key="`x-${tick}`">
        <line
          :x1="toCanvasX(tick)"
          :y1="paddingTop + innerHeight"
          :x2="toCanvasX(tick)"
          :y2="paddingTop + innerHeight + 6"
          stroke="#546e7a"
          stroke-width="1"
        />
        <text
          :x="toCanvasX(tick)"
          :y="paddingTop + innerHeight + 20"
          text-anchor="middle"
          class="tick-label"
        >
          {{ tick }}
        </text>
      </template>

      <path
        v-if="trendLinePath"
        :d="trendLinePath"
        fill="none"
        stroke="#e53935"
        stroke-width="2"
      />

      <text
        :x="paddingLeft + innerWidth * 0.22"
        :y="paddingTop + innerHeight * 0.2"
        text-anchor="middle"
        class="area-label better-label"
      >
        {{ betterAreaLabel }}
      </text>

      <text
        :x="paddingLeft + innerWidth * 0.78"
        :y="paddingTop + innerHeight * 0.83"
        text-anchor="middle"
        class="area-label worse-label"
      >
        {{ worseAreaLabel }}
      </text>

      <circle
        v-for="point in sortedPoints"
        :key="`p-${point.week}-${point.expectation}`"
        :cx="toCanvasX(point.week)"
        :cy="toCanvasY(point.expectation)"
        r="3.5"
        fill="#e53935"
        class="data-point"
        @mouseenter="onPointMouseEnter(point)"
        @mouseleave="onPointMouseLeave"
      />

      <circle
        v-if="selectedPoint"
        :cx="selectedPoint.x"
        :cy="selectedPoint.y"
        r="6"
        fill="#e53935"
        fill-opacity="0.2"
      />
      <circle
        v-if="selectedPoint"
        :cx="selectedPoint.x"
        :cy="selectedPoint.y"
        r="4"
        fill="#e53935"
      />

      <text
        :x="paddingLeft + innerWidth / 2"
        :y="height - 8"
        text-anchor="middle"
        class="axis-label"
      >
        {{ xAxisLabel }}
      </text>
      <text
        :x="paddingLeft / 2"
        :y="paddingTop + innerHeight / 2"
        text-anchor="middle"
        :transform="`rotate(-90 ${paddingLeft / 2} ${paddingTop + innerHeight / 2})`"
        class="axis-label"
      >
        {{ yAxisLabel }}
      </text>

      <!-- Hover tooltip -->
      <g v-if="hoveredPoint" :transform="tooltipTransform" style="pointer-events: none;">
        <rect x="0" y="0" :width="TOOLTIP_W" :height="TOOLTIP_H" rx="4" ry="4"
          fill="white" stroke="#546e7a" stroke-width="1"
          style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.18));"
        />
        <text x="8" y="17" class="tooltip-line">{{ tooltipDateText }}</text>
        <text x="8" y="35" class="tooltip-line tooltip-score-line">{{ tooltipScoreText }}</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.elsner-chart-wrapper {
  width: 100%;
}

.chart-title {
  margin-bottom: 8px;
  font-weight: 600;
}

.elsner-chart {
  width: 100%;
  max-width: 720px;
  background: #f5f7fa;
  border: 1px solid #dce3ea;
  border-radius: 8px;
  cursor: crosshair;
}

.tick-label {
  fill: #455a64;
  font-size: 11px;
}

.axis-label {
  fill: #263238;
  font-size: 12px;
  font-weight: 600;
}

.better-area {
  fill: rgba(46, 125, 50, 0.12);
}

.worse-area {
  fill: rgba(198, 40, 40, 0.1);
}

.area-label {
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
}

.better-label {
  fill: #2e7d32;
}

.worse-label {
  fill: #c62828;
}

.data-point {
  cursor: pointer;
}

.tooltip-line {
  fill: #263238;
  font-size: 12px;
}

.tooltip-score-line {
  font-weight: 600;
}
</style>
