<script setup lang="ts">
import { ref } from 'vue'
import PluginFormRenderer from '@/forms/components/PluginFormRenderer.vue'

import { formtemplateApi } from '@/api'
import type { ApiFormTemplate as FormTemplate, PatientFormData } from '@/types'
import { getAccessLevelColor, getAccessLevelDescription } from '@/services/formVersionService'

// Available form templates to test
const availableTemplates = ref<Array<{ id: string; title: string; description: string; accessLevel: string }>>([])
const selectedTemplateId = ref<string | null>(null)
const loading = ref(true)
const formData = ref<PatientFormData | null>(null)
const selectedTemplate = ref<FormTemplate | null>(null)
const loadingTemplate = ref(false)
const savingAccessLevel = ref(false)
const editableAccessLevel = ref<'patient' | 'authenticated' | 'inactive'>('patient')
const saveStatus = ref<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

const accessLevelOptions = [
  { title: 'Patient', value: 'patient' },
  { title: 'Authenticated', value: 'authenticated' },
  { title: 'Inactive', value: 'inactive' }
]

// Load available templates on mount
const loadTemplates = async () => {
  try {
    loading.value = true
    const response = await formtemplateApi.getFormTemplatesShortlist()
    if (response.responseObject) {
      availableTemplates.value = response.responseObject.map(template => ({
        id: template.id == null ? '' : String(template.id),
        title: template.title,
        description: template.description,
        accessLevel: (template as { accessLevel?: string }).accessLevel || 'patient'
      }))
      if (availableTemplates.value.length > 0) {
        selectedTemplateId.value = availableTemplates.value[0].id
        await loadTemplateDetails(availableTemplates.value[0].id)
      }
    }
  } catch (error) {
    console.error('Failed to load form templates:', error)
  } finally {
    loading.value = false
  }
}

// Load template details
const loadTemplateDetails = async (templateId: string) => {
  try {
    loadingTemplate.value = true
    const response = await formtemplateApi.getFormTemplateById({ templateId })
    selectedTemplate.value = response.responseObject || null
    editableAccessLevel.value = ((selectedTemplate.value as { accessLevel?: 'patient' | 'authenticated' | 'inactive' } | null)?.accessLevel) || 'patient'

    // FormTemplates no longer have sample data - start with empty form
    formData.value = null
    console.debug('Loaded template (no sample data available):', selectedTemplate.value)
  } catch (error) {
    console.error('Failed to load form template:', error)
    selectedTemplate.value = null
  } finally {
    loadingTemplate.value = false
  }
}

const saveTemplateAccessLevel = async () => {
  if (!selectedTemplateId.value || !selectedTemplate.value) return

  try {
    savingAccessLevel.value = true
    saveStatus.value = null

    await formtemplateApi.updateFormTemplate({
      templateId: selectedTemplateId.value,
      updateFormTemplateRequest: {
        id: selectedTemplate.value.id,
        title: selectedTemplate.value.title,
        description: selectedTemplate.value.description,
        accessLevel: editableAccessLevel.value
      }
    })

    selectedTemplate.value = {
      ...selectedTemplate.value,
      accessLevel: editableAccessLevel.value
    }

    const index = availableTemplates.value.findIndex(template => template.id === selectedTemplateId.value)
    if (index !== -1) {
      availableTemplates.value[index].accessLevel = editableAccessLevel.value
    }

    saveStatus.value = { type: 'success', message: 'Access level updated successfully.' }
  } catch (error) {
    console.error('Failed to update access level:', error)
    saveStatus.value = { type: 'error', message: 'Failed to update access level.' }
  } finally {
    savingAccessLevel.value = false
  }
}



// Reset form data to initial state from template
const resetForm = () => {
  // Start with empty form data
  formData.value = null
  console.debug('Form reset to empty data')
}

// Handle form changes - receives PatientFormData from plugin
const handleFormChange = (submissionData: PatientFormData) => {
  console.debug('Form submission data changed:', submissionData)
  formData.value = submissionData
  console.debug('- Raw data:', submissionData.rawFormData)
  console.debug('- Subscales:', submissionData.subscales)
  console.debug('- Fill status:', submissionData.fillStatus)
}

// Calculate scoring for the form
const calculateScoring = async () => {
  try {
    if (!selectedTemplateId.value || !formData.value) return

    // TODO: Implement scoring calculation via backend API
    // For now, scoring is disabled until backend scoring endpoint is available
    console.warn('Scoring calculation not yet implemented for frontend')
  } catch (error) {
    console.error('Failed to calculate form score:', error)
  }
}

// Initialize on component mount
loadTemplates()

// Watch for template changes and reload
const handleTemplateChange = () => {
  resetForm()
  if (selectedTemplateId.value) {
    loadTemplateDetails(selectedTemplateId.value)
  }
}
</script>

<template>
  <div class="form-templates-tester pa-6">
    <div class="mb-6">
      <h1 class="text-h3 mb-2">Form Templates Tester</h1>
      <p class="text-subtitle-1 text-grey">Test and preview all available form templates with empty data</p>
    </div>

    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title>Select Template</v-card-title>
          <v-card-text>
            <v-skeleton-loader
                               v-if="loading"
                               type="list-item-three-line@3"
                               class="mb-4"></v-skeleton-loader>
            <v-select
                      v-else
                      v-model="selectedTemplateId"
                      :items="availableTemplates"
                      item-title="title"
                      item-value="id"
                      label="Choose a form template"
                      outlined
                      dense
                      @update:model-value="handleTemplateChange">
              <template #item="{ item, props }">
                <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.description">
                  <template #append>
                    <v-chip
                            size="x-small"
                            :color="getAccessLevelColor(item.raw.accessLevel)"
                            variant="tonal">
                      {{ item.raw.accessLevel }}
                    </v-chip>
                  </template>
                </v-list-item>
              </template>
              <template #selection="{ item }">
                <div>
                  <div class="font-weight-medium">{{ item.raw.title }}</div>
                  <div class="text-caption text-grey">{{ item.raw.description }}</div>
                </div>
              </template>
            </v-select>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title>Actions</v-card-title>
          <v-card-text>
            <v-alert
                     v-if="saveStatus"
                     :type="saveStatus.type"
                     variant="tonal"
                     class="mb-3">
              {{ saveStatus.message }}
            </v-alert>

            <v-select
                      v-model="editableAccessLevel"
                      :items="accessLevelOptions"
                      item-title="title"
                      item-value="value"
                      label="Template access level"
                      outlined
                      dense
                      :disabled="!selectedTemplate"
                      class="mb-3">
              <template #selection>
                <v-chip
                        size="small"
                        :color="getAccessLevelColor(editableAccessLevel)"
                        variant="tonal">
                  {{ editableAccessLevel }}
                </v-chip>
              </template>
            </v-select>

            <div class="text-caption text-medium-emphasis mb-3" v-if="selectedTemplate">
              {{ getAccessLevelDescription(editableAccessLevel) }}
            </div>

            <v-btn
                   color="success"
                   variant="outlined"
                   @click="saveTemplateAccessLevel"
                   :loading="savingAccessLevel"
                   :disabled="!selectedTemplate"
                   block
                   class="mb-2">
              <v-icon left>mdi-content-save</v-icon>
              Save Access Level
            </v-btn>

            <v-btn
                   color="primary"
                   variant="outlined"
                   @click="resetForm"
                   block>
              <v-icon left>mdi-refresh</v-icon>
              Reset Form
            </v-btn>
            <v-btn
                   color="secondary"
                   variant="outlined"
                   @click="calculateScoring"
                   block
                   :disabled="!formData || !formData.rawFormData || Object.keys(formData.rawFormData).length === 0">
              <v-icon left>mdi-calculator</v-icon>
              Calculate Score
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Form Renderer -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card variant="outlined" class="form-preview-card">
          <v-card-title class="bg-primary text-white">
            Form Preview
          </v-card-title>
          <v-card-text class="pa-6">
            <v-skeleton-loader
                               v-if="loadingTemplate"
                               type="article@5"></v-skeleton-loader>
            <PluginFormRenderer
                                v-else
                                :key="`form-${selectedTemplateId}`"
                                :template-id="selectedTemplateId || ''"
                                :model-value="formData"
                                @update:model-value="handleFormChange" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Scoring Display -->
    <v-row v-if="formData?.subscales || formData?.totalScore" class="mb-6">
      <v-col cols="12">
        <v-card variant="outlined" class="scoring-card">
          <v-card-title class="bg-success text-white">
            Calculated Scoring
          </v-card-title>
          <v-card-text class="pa-6">
            <!-- Subscales -->
            <v-row class="mb-6">
              <v-col
                     v-for="(subscale, key) in formData?.subscales"
                     :key="key"
                     cols="12"
                     sm="6"
                     md="3">
                <v-card v-if="subscale" variant="tonal" color="primary" class="pa-4 h-100">
                  <div class="text-subtitle-2 font-weight-medium mb-1">{{ subscale.name }}</div>
                  <div class="text-h5 font-weight-bold mb-2">
                    {{ subscale.rawScore }}/{{ subscale.maxScore }}
                  </div>
                  <v-progress-linear
                                     :model-value="subscale.normalizedScore || 0"
                                     height="6"
                                     rounded
                                     color="white"
                                     class="mb-2"></v-progress-linear>
                  <div class="text-caption">
                    {{ subscale.completionPercentage }}% Complete
                  </div>
                </v-card>
              </v-col>
            </v-row>

            <!-- Total Score -->
            <v-divider class="my-4"></v-divider>
            <v-card v-if="formData?.totalScore" variant="tonal" color="success" class="pa-6">
              <div class="text-h6 mb-2">Total Score</div>
              <div class="text-h3 font-weight-bold mb-2">
                {{ formData.totalScore.rawScore }}/{{ formData.totalScore.maxScore }}
              </div>
              <v-progress-linear
                                 :model-value="formData.totalScore.rawScore || 0"
                                 :max="formData.totalScore.maxScore"
                                 height="12"
                                 rounded
                                 color="white"
                                 class="mb-4"></v-progress-linear>
              <div class="text-body2">{{ formData.totalScore.description }}</div>
              <div class="text-caption mt-2">
                {{ formData.totalScore.completionPercentage }}% Complete ({{ formData.totalScore.answeredQuestions }}/{{
                  formData.totalScore.totalQuestions }} questions)
              </div>
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Raw Data Display -->
    <v-row class="mb-6">
      <v-col cols="12" lg="6">
        <v-card variant="outlined">
          <v-card-title>Form Data (JSON)</v-card-title>
          <v-card-text>
            <v-expansion-panels>
              <v-expansion-panel>
                <v-expansion-panel-title>View Raw Data</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <pre class="text-caption" style="overflow: auto;">{{ JSON.stringify(formData?.rawFormData, null, 2) }}
              </pre>
                </v-expansion-panel-text>
              </v-expansion-panel>
              <v-expansion-panel>
                <v-expansion-panel-title>View Form Metadata</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <pre class="text-caption" style="overflow: auto;">{{ JSON.stringify(formData ? {
                    fillStatus:
                      formData.fillStatus, completedAt: formData.completedAt, beginFill: formData.beginFill
                  } : null, null, 2)
                }}</pre>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </div>
</template>

<style scoped>
.form-templates-tester {
  background-color: #fafafa;
  min-height: 100vh;
}

.form-preview-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.subscales-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

pre {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  max-height: 400px;
}

.w-100 {
  width: 100%;
}

.h-100 {
  height: 100%;
}
</style>
