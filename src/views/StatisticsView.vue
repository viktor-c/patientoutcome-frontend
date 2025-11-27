<template>
  <v-container fluid class="pa-4">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>📊 Patient Case Statistics</span>
        <v-chip v-if="statistics" color="primary" variant="elevated">
          {{ statistics.totalConsultations }} Consultations
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- Reference Date Info -->
        <v-row v-if="statistics && ((statistics as any).surgeryDate || (statistics as any).caseCreatedAt)" class="mb-4">
          <v-col>
            <v-alert type="info" variant="tonal" density="compact">
              <template v-if="(statistics as any).surgeryDate">
                <v-icon start>mdi-hospital-box</v-icon>
                <strong>OP-Datum:</strong> {{ new Date((statistics as any).surgeryDate).toLocaleDateString('de-DE') }}
                <span class="ml-2 text-caption">(Zeitlinie relativ zur Operation)</span>
              </template>
              <template v-else-if="(statistics as any).caseCreatedAt">
                <v-icon start>mdi-folder-clock</v-icon>
                <strong>Fall erstellt:</strong> {{ new Date((statistics as
                  any).caseCreatedAt).toLocaleDateString('de-DE') }}
                <span class="ml-2 text-caption">(Zeitlinie relativ zur Fallerstellung)</span>
              </template>
            </v-alert>
          </v-col>
        </v-row>

        <!-- Timeline Mode Toggle -->
        <v-row class="mb-4">
          <v-col>
            <v-btn-toggle v-model="timelineMode" color="primary" mandatory>
              <v-btn value="realTime">
                <v-icon start>mdi-calendar-clock</v-icon>
                Real Date & Time
              </v-btn>
              <v-btn value="fixedInterval">
                <v-icon start>mdi-chart-timeline-variant</v-icon>
                Fixed Intervals
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>

        <!-- Loading State -->
        <v-row v-if="loading" class="justify-center">
          <v-col cols="auto">
            <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          </v-col>
        </v-row>

        <!-- Error State -->
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- Chart Display -->
        <v-row v-if="!loading && !error && chartData">
          <v-col cols="6">
            <Line :data="chartData" :options="chartOptions" />
          </v-col>
        </v-row>

        <!-- No Data State -->
        <v-row v-if="!loading && !error && !chartData">
          <v-col cols="12" class="text-center">
            <v-icon size="64" color="grey-lighten-1">mdi-chart-line-variant</v-icon>
            <p class="text-grey-darken-1 mt-2">No score data available</p>
          </v-col>
        </v-row>

        <!-- Legend -->
        <v-row v-if="chartData" class="mt-4">
          <v-col>
            <v-card variant="outlined">
              <v-card-text>
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                          :color="visibleSeries.aofas ? 'green' : 'grey'"
                          :variant="visibleSeries.aofas ? 'flat' : 'outlined'"
                          clickable
                          @click="toggleSeriesVisibility('aofas')"
                          class="cursor-pointer">
                    <v-icon start>mdi-chart-line</v-icon>
                    {{ aofasLabel }}
                    <v-icon end>{{ visibleSeries.aofas ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
                  </v-chip>
                  <v-chip
                          :color="visibleSeries.efas ? 'blue' : 'grey'"
                          :variant="visibleSeries.efas ? 'flat' : 'outlined'"
                          clickable
                          @click="toggleSeriesVisibility('efas')"
                          class="cursor-pointer">
                    <v-icon start>mdi-chart-line</v-icon>
                    {{ efasLabel }}
                    <v-icon end>{{ visibleSeries.efas ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
                  </v-chip>
                  <v-chip
                          :color="visibleSeries.moxfq ? 'purple' : 'grey'"
                          :variant="visibleSeries.moxfq ? 'flat' : 'outlined'"
                          clickable
                          @click="toggleSeriesVisibility('moxfq')"
                          class="cursor-pointer">
                    <v-icon start>mdi-chart-line</v-icon>
                    {{ moxfqLabel }}
                    <v-icon end>{{ visibleSeries.moxfq ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
                  </v-chip>
                  <v-chip
                          :color="visibleSeries.vas ? 'orange' : 'grey'"
                          :variant="visibleSeries.vas ? 'flat' : 'outlined'"
                          clickable
                          @click="toggleSeriesVisibility('vas')"
                          class="cursor-pointer">
                    <v-icon start>mdi-chart-line</v-icon>
                    {{ vasLabel }}
                    <v-icon end>{{ visibleSeries.vas ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import { useNotifierStore } from "@/stores/notifierStore";
import { statisticsApi } from '@/api'
import type {
  GetCaseStatistics200ResponseResponseObject,
  GetScoreData200ResponseResponseObject,
  GetScoreData200ResponseResponseObjectRealTimeInner,
  GetCaseStatistics200ResponseResponseObjectConsultationsInner,
  GetCaseStatistics200ResponseResponseObjectConsultationsInnerPromsInner,
  GetCaseStatistics200ResponseResponseObjectConsultationsInnerPromsInnerScoring,
} from '@/api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

// Use generated model types from the OpenAPI client

const route = useRoute();
const notifierStore = useNotifierStore();

const caseId = computed(() => route.params.caseId as string);
const timelineMode = ref<"realTime" | "fixedInterval">("realTime");
const loading = ref(false);
const error = ref<string | null>(null);
const statistics = ref<GetCaseStatistics200ResponseResponseObject | null>(null);
const scoreData = ref<GetScoreData200ResponseResponseObject | null>(null);

// Store actual acquisition dates for tooltip display
const acquisitionDates = ref<Date[]>([]);

// Calculate time since surgery or case creation
const calculateTimeSinceReference = (consultationDate: Date, referenceDate: Date): string => {
  const diffMs = consultationDate.getTime() - referenceDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  // Show months when more than 12 weeks (3 months)
  if (diffWeeks > 12) {
    return `${diffMonths} Monate`;
  } else {
    return `${diffWeeks} Wochen`;
  }
};
// Mapping of formTemplateId -> category key. Replace the placeholder ids with your real template ids.
const TEMPLATE_ID_TO_CATEGORY: Record<string, "aofas" | "efas" | "moxfq" | "vas"> = {
  '67b4e612d0feb4ad99ae2e84': 'aofas',
  '67b4e612d0feb4ad99ae2e83': 'efas',
  '67b4e612d0feb4ad99ae2e85': 'moxfq',
  '67b4e612d0feb4ad99ae2e86': 'vas', // VAS template ID
};

// Labels for each category; these will be updated from prom titles when available
const aofasLabel = ref("AOFAS");
const efasLabel = ref("EFAS");
const moxfqLabel = ref("MOXFQ");
const vasLabel = ref("VAS");

// Track which series are visible in the chart
const visibleSeries = ref<Record<string, boolean>>({
  aofas: true,
  efas: true,
  moxfq: true,
  vas: true,
});

// Toggle series visibility
const toggleSeriesVisibility = (series: string) => {
  visibleSeries.value[series] = !visibleSeries.value[series];
};

// Local helper type that extends the generated prom type with the new formTemplateId
type PromWithTemplate = GetCaseStatistics200ResponseResponseObjectConsultationsInnerPromsInner & {
  formTemplateId?: string | null;
};
type PromScoring = GetCaseStatistics200ResponseResponseObjectConsultationsInnerPromsInnerScoring;

// Convert consultations returned by getCaseStatistics into the score-data shape
const computeScoreDataFromConsultations = (consultations: GetCaseStatistics200ResponseResponseObjectConsultationsInner[] | undefined) => {
  if (!consultations || consultations.length === 0) return null;

  const realTime: GetScoreData200ResponseResponseObjectRealTimeInner[] = [];
  const fixedInterval: GetScoreData200ResponseResponseObjectRealTimeInner[] = [];
  const dates: Date[] = [];

  consultations.forEach((consultation, idx) => {
    // Determine a sensible date for the consultation: prefer the first prom that has scoring
    const firstPromWithScore = consultation.proms && consultation.proms.length > 0
      ? (consultation.proms as GetCaseStatistics200ResponseResponseObjectConsultationsInnerPromsInner[]).find(
        p => p.scoring && (p.scoring as PromScoring).total != null,
      )
      : null;
    const dateStr = (firstPromWithScore?.createdAt ?? new Date()).toString();
    const acquisitionDate = new Date(dateStr);
    dates.push(acquisitionDate);    // Default scores
    let aofasScore: number | null = null;
    let efasScore: number | null = null;
    let moxfqScore: number | null = null;

    // Iterate prom entries and assign scores into categories using formTemplateId mapping
    if (consultation.proms && Array.isArray(consultation.proms)) {
      for (const promRaw of consultation.proms as GetCaseStatistics200ResponseResponseObjectConsultationsInnerPromsInner[]) {
        const prom = promRaw as PromWithTemplate;
        // Skip proms that have no scoring or no total score
        const hasTotal = !!prom.scoring && (prom.scoring as PromScoring).total != null;
        if (!hasTotal) continue;

        const tplId = prom.formTemplateId ? String(prom.formTemplateId) : null;
        const score = prom.scoring?.total?.normalizedScore ?? null;

        if (tplId && TEMPLATE_ID_TO_CATEGORY[tplId]) {
          const cat = TEMPLATE_ID_TO_CATEGORY[tplId];
          // update label from prom title if provided (only if the prom has a score)
          if (prom.title) {
            if (cat === "aofas") aofasLabel.value = prom.title;
            if (cat === "efas") efasLabel.value = prom.title;
            if (cat === "moxfq") moxfqLabel.value = prom.title;
            if (cat === "vas") vasLabel.value = prom.title;
          }

          if (cat === "aofas" && score != null) aofasScore = score;
          if (cat === "efas" && score != null) efasScore = score;
          if (cat === "moxfq" && score != null) moxfqScore = score;
        }
      }
    }

    let vasScore: number | null = null;

    // Check if any prom is VAS (pain scale)
    if (consultation.proms && Array.isArray(consultation.proms)) {
      for (const promRaw of consultation.proms as GetCaseStatistics200ResponseResponseObjectConsultationsInnerPromsInner[]) {
        const prom = promRaw as PromWithTemplate;
        const hasTotal = !!prom.scoring && (prom.scoring as PromScoring).total != null;
        if (!hasTotal) continue;

        // Check if this is a VAS form (pain scale) by looking at title or structure
        if (prom.scoring?.total?.normalizedScore !== undefined) {
          const score = prom.scoring.total.normalizedScore;
          // VAS has a specific structure, check if rawData contains painScale
          const rawData = (prom.scoring?.rawData as Record<string, unknown>) ?? {};
          if ((rawData as Record<string, unknown>)?.painScale !== undefined) {
            vasScore = score;
          }
        }
      }
    }

    (realTime as unknown as Array<Record<string, unknown>>).push({
      date: dateStr,
      dateIndex: idx,
      aofasScore,
      efasScore,
      moxfqScore,
      vasScore,
    });

    (fixedInterval as unknown as Array<Record<string, unknown>>).push({
      date: dateStr,
      dateIndex: idx + 1,
      aofasScore,
      efasScore,
      moxfqScore,
      vasScore,
    });
  });

  // Store the acquisition dates for tooltip display
  acquisitionDates.value = dates;

  return { realTime, fixedInterval } as GetScoreData200ResponseResponseObject;
};

// Fetch statistics data using generated API client
const fetchStatistics = async () => {
  loading.value = true;
  error.value = null;

  try {
    const resp = await statisticsApi.getCaseStatistics({ caseId: caseId.value });
    // API wraps the payload in a response object
    statistics.value = resp.responseObject ?? null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    notifierStore.error(error.value);
  } finally {
    loading.value = false;
  }
};

// We derive scoreData from the consultations returned by getCaseStatistics

// Compute chart data based on timeline mode
const chartData = computed<ChartData<"line"> | null>(() => {
  if (!scoreData.value) return null;

  const data = timelineMode.value === "realTime"
    ? scoreData.value.realTime
    : scoreData.value.fixedInterval;

  if (!data || data.length === 0) return null;

  // For realTime mode, we use {x, y} format for proper time scale
  // For fixedInterval mode, we use simple labels
  const isRealTime = timelineMode.value === "realTime";

  const labels = isRealTime
    ? [] // Not used for time scale with {x, y} data
    : data.map((_, index) => `Visit ${index + 1}`);

  const datasets = [];

  if (visibleSeries.value.aofas) {
    datasets.push({
      label: aofasLabel.value,
      data: isRealTime
        ? data.map(point => ({
          x: new Date(point.date ?? 0).getTime(),
          y: point.aofasScore
        }))
        : data.map(point => point.aofasScore),
      borderColor: "rgb(76, 175, 80)",
      backgroundColor: "rgba(76, 175, 80, 0.1)",
      tension: 0.1,
      spanGaps: true,
    });
  }

  if (visibleSeries.value.efas) {
    datasets.push({
      label: efasLabel.value,
      data: isRealTime
        ? data.map(point => ({
          x: new Date(point.date ?? 0).getTime(),
          y: point.efasScore
        }))
        : data.map(point => point.efasScore),
      borderColor: "rgb(33, 150, 243)",
      backgroundColor: "rgba(33, 150, 243, 0.1)",
      tension: 0.1,
      spanGaps: true,
    });
  }

  if (visibleSeries.value.moxfq) {
    datasets.push({
      label: moxfqLabel.value,
      data: isRealTime
        ? data.map(point => ({
          x: new Date(point.date ?? 0).getTime(),
          y: point.moxfqScore
        }))
        : data.map(point => point.moxfqScore),
      borderColor: "rgb(156, 39, 176)",
      backgroundColor: "rgba(156, 39, 176, 0.1)",
      tension: 0.1,
      spanGaps: true,
    });
  }

  if (visibleSeries.value.vas) {
    datasets.push({
      label: vasLabel.value,
      data: isRealTime
        ? data.map(point => ({
          x: new Date(point.date ?? 0).getTime(),
          y: (point as Record<string, unknown>).vasScore as number | null
        }))
        : data.map(point => (point as Record<string, unknown>).vasScore as number | null),
      borderColor: "rgb(255, 152, 0)",
      backgroundColor: "rgba(255, 152, 0, 0.1)",
      tension: 0.1,
      spanGaps: true,
    });
  }

  return {
    labels,
    datasets,
  };
});

// Chart options based on timeline mode
const chartOptions = computed<ChartOptions<"line">>(() => {
  const baseOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      title: {
        display: true,
        text: "Patient Reported Outcome Measures (PROMs) Over Time",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: "xy",
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "xy",
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Score",
        },
      },
    },
  };

  if (timelineMode.value === "realTime") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats = statistics.value as any;

    // Calculate x-axis bounds
    const surgeryDate = stats?.surgeryDate ? new Date(stats.surgeryDate) : null;
    const caseCreatedAt = stats?.caseCreatedAt ? new Date(stats.caseCreatedAt) : null;
    const referenceDate = surgeryDate || caseCreatedAt || new Date();

    // BUG FIX (gffc branch): Use last consultation date instead of current date
    // This allows the chart to show future consultation dates in the gffc branch
    // TODO: Remove this change when merging to main branch - revert to: const now = new Date();
    const lastConsultationDate = acquisitionDates.value.length > 0
      ? new Date(Math.max(...acquisitionDates.value.map(d => d.getTime())))
      : new Date();
    // BUG FIX END

    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            title: (context) => {
              if (context.length === 0) return "";
              const dataIndex = context[0].dataIndex;
              const date = acquisitionDates.value[dataIndex];
              if (date && referenceDate) {
                const timeSince = calculateTimeSinceReference(date, referenceDate);
                return `${date.toLocaleDateString('de-DE')} (${timeSince} nach ${surgeryDate ? 'OP' : 'Fallerstellung'})`;
              }
              return date ? date.toLocaleDateString('de-DE') : '';
            },
          },
        },
      },
      scales: {
        ...baseOptions.scales,
        x: {
          type: "time",
          min: referenceDate.getTime(),
          max: lastConsultationDate.getTime(), // BUG FIX (gffc): was now.getTime()
          time: {
            unit: "week",
            displayFormats: {
              week: "dd MMM yyyy",
              day: "dd MMM yyyy",
              month: "MMM yyyy",
            },
          },
          title: {
            display: true,
            text: surgeryDate ? "Zeit seit OP" : "Zeit seit Fallerstellung",
          },
        },
      },
    };
  } else {
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            title: (context) => {
              if (context.length === 0) return "";
              const dataIndex = context[0].dataIndex;
              const date = acquisitionDates.value[dataIndex];
              if (date) {
                return `Visit on ${date.toLocaleDateString('de-DE')} ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
              }
              return `Visit ${dataIndex + 1}`;
            },
          },
        },
      },
      scales: {
        ...baseOptions.scales,
        x: {
          title: {
            display: true,
            text: "Visit Number",
          },
        },
      },
    };
  }
});

// Watch for timeline mode changes and refetch if needed
watch(timelineMode, () => {
  // Data already contains both modes, just trigger re-render via computed
});

// Fetch data on mount
onMounted(async () => {
  await fetchStatistics();
  // After statistics loaded, compute score data from consultations
  if (statistics.value) {
    scoreData.value = computeScoreDataFromConsultations(
      // cast to typed consultations array
      (statistics.value.consultations as GetCaseStatistics200ResponseResponseObjectConsultationsInner[]) ?? [],
    );
  }
});
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}

.gap-4 {
  gap: 1rem;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
