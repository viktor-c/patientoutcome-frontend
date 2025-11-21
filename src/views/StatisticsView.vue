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
          <v-col cols="12">
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
                <div class="d-flex flex-wrap gap-4">
                  <v-chip color="green" variant="flat">
                    <v-icon start>mdi-chart-line</v-icon>
                    {{ aofasLabel }}
                  </v-chip>
                  <v-chip color="blue" variant="flat">
                    <v-icon start>mdi-chart-line</v-icon>
                    {{ efasLabel }}
                  </v-chip>
                  <v-chip color="purple" variant="flat">
                    <v-icon start>mdi-chart-line</v-icon>
                    {{ moxfqLabel }}
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
  TimeScale
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
// Mapping of formTemplateId -> category key. Replace the placeholder ids with your real template ids.
const TEMPLATE_ID_TO_CATEGORY: Record<string, "aofas" | "efas" | "moxfq"> = {
  '67b4e612d0feb4ad99ae2e84': 'aofas',
  '67b4e612d0feb4ad99ae2e83': 'efas',
  '67b4e612d0feb4ad99ae2e85': 'moxfq',
};

// Labels for each category; these will be updated from prom titles when available
const aofasLabel = ref("AOFAS");
const efasLabel = ref("EFAS");
const moxfqLabel = ref("MOXFQ");

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

  consultations.forEach((consultation, idx) => {
    // Determine a sensible date for the consultation: prefer the first prom that has scoring
    const firstPromWithScore = consultation.proms && consultation.proms.length > 0
      ? (consultation.proms as GetCaseStatistics200ResponseResponseObjectConsultationsInnerPromsInner[]).find(
          p => p.scoring && (p.scoring as PromScoring).total != null,
        )
      : null;
    const dateStr = (firstPromWithScore?.createdAt ?? new Date()).toString();

    // Default scores
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
          }

          if (cat === "aofas" && score != null) aofasScore = score;
          if (cat === "efas" && score != null) efasScore = score;
          if (cat === "moxfq" && score != null) moxfqScore = score;
        }
      }
    }

    realTime.push({
      date: dateStr,
      dateIndex: idx,
      aofasScore,
      efasScore,
      moxfqScore,
    });

    fixedInterval.push({
      date: dateStr,
      dateIndex: idx + 1,
      aofasScore,
      efasScore,
      moxfqScore,
    });
  });

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

  // Extract labels based on mode
  const labels = timelineMode.value === "realTime"
    ? (data as GetScoreData200ResponseResponseObjectRealTimeInner[]).map(point => new Date(point.date ?? 0))
    : data.map((_, index) => `Visit ${index + 1}`);

  return {
    labels,
    datasets: [
      {
        label: aofasLabel.value,
        data: data.map(point => point.aofasScore),
        borderColor: "rgb(76, 175, 80)",
        backgroundColor: "rgba(76, 175, 80, 0.1)",
        tension: 0.1,
        spanGaps: true,
      },
      {
        label: efasLabel.value,
        data: data.map(point => point.efasScore),
        borderColor: "rgb(33, 150, 243)",
        backgroundColor: "rgba(33, 150, 243, 0.1)",
        tension: 0.1,
        spanGaps: true,
      },
      {
        label: moxfqLabel.value,
        data: data.map(point => point.moxfqScore),
        borderColor: "rgb(156, 39, 176)",
        backgroundColor: "rgba(156, 39, 176, 0.1)",
        tension: 0.1,
        spanGaps: true,
      },
    ],
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
    return {
      ...baseOptions,
      scales: {
        ...baseOptions.scales,
        x: {
          type: "time",
          time: {
            unit: "day",
            displayFormats: {
              day: "MMM dd, yyyy",
            },
          },
          title: {
            display: true,
            text: "Date",
          },
        },
      },
    };
  } else {
    return {
      ...baseOptions,
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
.gap-4 {
  gap: 1rem;
}
</style>
