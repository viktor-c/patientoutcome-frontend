<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables/useDateFormat'
import ConsultationCard from '@/components/consultation/ConsultationCard.vue'
import {
  type GetAllPatientCases200ResponseResponseObjectInner as PatientCaseWithDetails,
} from '@/api'

const { t } = useI18n()
const { formatLocalizedCustomDate } = useDateFormat()

// Props
const props = defineProps<{
  patientCase: PatientCaseWithDetails
  patientId: string
}>()

// Emits
const emit = defineEmits<{
  'open-case': [caseId: string | null | undefined]
  'open-consultation': [consultationId: string | null | undefined]
  'update-consultations': []
}>()

// Helper function to safely format dates
const safeFormatDate = (date: string | null | undefined, format: string = 'DD.MM.YYYY HH:mm'): string => {
  if (!date) return t('common.notAvailable')
  return formatLocalizedCustomDate(date, format)
}

// Helper functions
const getCaseStatusColor = computed((): string => {
  // Use a simple color scheme based on case age
  const createdDate = new Date(props.patientCase.createdAt || '')
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  if (createdDate >= thirtyDaysAgo) return 'success'
  return 'warning'
})

const formatDiagnosisList = (diagnoses: string[] | undefined): string => {
  if (!diagnoses || diagnoses.length === 0) return t('common.notAvailable')
  return diagnoses.join(', ')
}

// Event handlers
const handleOpenCase = () => {
  emit('open-case', props.patientCase.id)
}

const handleOpenConsultation = (consultationId: string | null | undefined) => {
  emit('open-consultation', consultationId)
}
</script>

<template>
  <v-expansion-panel :value="patientCase.id">
    <!-- Case Header -->
    <v-expansion-panel-title>
      <div class="d-flex align-center w-100">
        <div class="flex-grow-1">
          <div class="d-flex align-center mb-2">
            <v-icon class="me-2">mdi-folder</v-icon>
            <span class="text-h6">{{ t('patientOverview.case') }} #{{ patientCase.externalId || patientCase.id }}</span>
            <v-chip
                    :color="getCaseStatusColor"
                    size="small"
                    class="ms-2">
              {{ t('patientOverview.caseDetails') }}
            </v-chip>
          </div>
          <div class="text-body-2 text-medium-emphasis">
            <strong>{{ t('patientOverview.mainDiagnosis') }}:</strong>
            {{ formatDiagnosisList(patientCase.mainDiagnosis) }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            <strong>{{ t('patientOverview.created') }}:</strong>
            {{ safeFormatDate(patientCase.createdAt, 'DD.MM.YYYY') }}
          </div>
        </div>

        <v-btn
               color="primary"
               variant="outlined"
               size="small"
               @click.stop="handleOpenCase"
               class="ms-2">
          {{ t('patientOverview.viewCase') }}
        </v-btn>
      </div>
    </v-expansion-panel-title>

    <!-- Case Content -->
    <v-expansion-panel-text>
      <v-row>
        <!-- Case Details -->
        <v-col cols="12" lg="6">
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-h6">
              <v-icon class="me-2">mdi-information</v-icon>
              {{ t('patientOverview.caseDetails') }}
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>{{ t('patientOverview.caseId') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patientCase.id }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <v-list-item-title>{{ t('patientOverview.externalId') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patientCase.externalId || t('common.notAvailable') }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <v-list-item-title>{{ t('patientOverview.mainDiagnosis') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <div v-if="patientCase.mainDiagnosis?.length">
                      <v-chip
                              v-for="diagnosis in patientCase.mainDiagnosis"
                              :key="diagnosis"
                              size="small"
                              class="me-1 mb-1">
                        {{ diagnosis }}
                      </v-chip>
                    </div>
                    <span v-else>{{ t('common.notAvailable') }}</span>
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="patientCase.mainDiagnosisICD10?.length">
                  <v-list-item-title>{{ t('patientOverview.mainDiagnosisICD10') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                            v-for="icd in patientCase.mainDiagnosisICD10"
                            :key="icd"
                            size="small"
                            variant="outlined"
                            class="me-1 mb-1">
                      {{ icd }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="patientCase.otherDiagnosis?.length">
                  <v-list-item-title>{{ t('patientOverview.otherDiagnosis') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                            v-for="diagnosis in patientCase.otherDiagnosis"
                            :key="diagnosis"
                            size="small"
                            color="secondary"
                            class="me-1 mb-1">
                      {{ diagnosis }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <v-list-item-title>{{ t('patientOverview.medicalHistory') }}</v-list-item-title>
                  <v-list-item-subtitle>{{ patientCase.medicalHistory || t('common.notAvailable')
                    }}</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="patientCase.supervisors?.length">
                  <v-list-item-title>{{ t('patientOverview.supervisors') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                            v-for="(supervisor, supervisorIndex) in patientCase.supervisors"
                            :key="typeof supervisor === 'string' ? supervisor : supervisorIndex"
                            size="small"
                            color="info"
                            class="me-1 mb-1">
                      {{ typeof supervisor === 'string' ? supervisor : supervisor.username || `Supervisor
                      ${supervisorIndex + 1}` }}
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="patientCase.notes?.length">
                  <v-list-item-title>{{ t('patientOverview.notes') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{patientCase.notes.map(note => typeof note === 'string' ? note : note.note || note).join('; ')}}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" lg="6">
          <!-- Surgeries -->
          <v-card variant="outlined" v-if="patientCase.surgeries?.length">
            <v-card-title class="text-h6">
              <v-icon class="me-2">mdi-hospital</v-icon>
              {{ t('patientOverview.surgeries') }}
            </v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item
                             v-for="(surgery, surgeryIndex) in patientCase.surgeries"
                             :key="surgery.id || `surgery-${surgeryIndex}`">
                  <v-list-item-title>{{ surgery.therapy || t('patientOverview.unnamedSurgery') }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <div>
                      <strong>{{ t('patientOverview.date') }}:</strong> {{ safeFormatDate(surgery.surgeryDate) }}
                    </div>
                    <div v-if="surgery.side">
                      <strong>{{ t('patientOverview.side') }}:</strong> {{ surgery.side }}
                    </div>
                    <div v-if="surgery.anaesthesiaType">
                      <strong>{{ t('patientOverview.anaesthesia') }}:</strong>
                      {{ typeof surgery.anaesthesiaType === 'object' ? surgery.anaesthesiaType.type :
                        surgery.anaesthesiaType }}
                    </div>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row><v-row>
        <!-- Consultations -->
        <v-col cols="6" lg="6">
          <ConsultationCard
                            :case-id="patientCase.id"
                            :patient-id="patientId"
                            @open-consultation="handleOpenConsultation"
                            @update-consultations="$emit('update-consultations')" />
        </v-col>
      </v-row>
    </v-expansion-panel-text>
  </v-expansion-panel>
</template>

<style scoped>
.v-timeline {
  max-height: 600px;
  overflow-y: auto;
}

.v-chip {
  font-weight: 500;
}

.text-h6 {
  font-weight: 600;
}
</style>
