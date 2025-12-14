<script setup lang="ts">
import { computed, ref } from 'vue'
import { JsonForms } from '@jsonforms/vue'
import { type JsonSchema, type UISchemaElement } from '@jsonforms/core'
import { extendedVuetifyRenderers } from '@jsonforms/vue-vuetify'
import { markRaw } from 'vue'
import markdownit from 'markdown-it'

import { entry as EfasQuestionSliderControlRenderer } from '@/components/forms/EfasQuestionSliderControlRenderer.entry'
import { entry as AofasControlRenderer } from '@/components/forms/AofasControlRenderer.entry'
import { entry as MoxfqTableRenderer } from '@/components/forms/MoxfqTableRenderer.entry'
import { entry as VASControlRenderer } from '@/components/forms/VASControlRenderer.entry'
import { entry as VisaaControlRenderer } from '@/components/forms/VisaaControlRenderer.entry'

import { formtemplateApi } from '@/api'
import type { ScoringData } from '@/types'

const renderers = markRaw([
  ...extendedVuetifyRenderers,
  EfasQuestionSliderControlRenderer,
  AofasControlRenderer,
  MoxfqTableRenderer,
  VASControlRenderer,
  VisaaControlRenderer,
])

const md = markdownit({
  html: true,
  linkify: false,
  typographer: true,
  breaks: true,
})

// Available form templates to test
const availableTemplates = ref<Array<{ id: string; title: string; description: string }>>([])
const selectedTemplateId = ref<string | null>(null)
const loading = ref(true)
const testFormData = ref<Record<string, unknown>>({})
const scoring = ref<ScoringData | null>(null)
const selectedTemplate = ref<any>(null)
const loadingTemplate = ref(false)

// Load available templates on mount
const loadTemplates = async () => {
  try {
    loading.value = true
    const response = await formtemplateApi.getFormTemplatesShortlist()
    if (response.responseObject) {
      availableTemplates.value = response.responseObject.map(template => ({
        id: template.id || '',
        title: template.title,
        description: template.description,
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
    selectedTemplate.value = response.responseObject
    
    // Use the formData from the template directly - it already has the correct structure
    if (response.responseObject?.formData) {
      testFormData.value = JSON.parse(JSON.stringify(response.responseObject.formData))
      console.debug('Loaded template formData:', testFormData.value)
    } else {
      // Fallback to empty object if no formData exists
      testFormData.value = {}
      console.warn('No formData found in template, using empty object')
    }
  } catch (error) {
    console.error('Failed to load form template:', error)
    selectedTemplate.value = null
  } finally {
    loadingTemplate.value = false
  }
}

const formSchema = computed(() => {
  const template = selectedTemplate.value
  return template?.formSchema as JsonSchema | undefined
})

const formSchemaUI = computed(() => {
  const template = selectedTemplate.value
  return template?.formSchemaUI as UISchemaElement | undefined
})

const formTranslations = computed(() => {
  const template = selectedTemplate.value
  return template?.translations || {}
})

// JSONForms translator using template translations
const translator = (key: string, defaultMessage?: string): string => {
  const backendTranslations = formTranslations.value as Record<string, Record<string, unknown>> | undefined
  if (backendTranslations) {
    const localeTranslations = backendTranslations['en'] || {}
    
    let value: unknown = localeTranslations
    if (value && typeof value === 'object' && value !== null && key in value) {
      value = (value as Record<string, unknown>)[key]
      if (typeof value === 'string') {
        return value
      }
    }
  }
  return defaultMessage || key
}

// Reset form data to initial state from template
const resetForm = () => {
  // Use the formData from the template (clone it to avoid mutations)
  if (selectedTemplate.value?.formData) {
    testFormData.value = JSON.parse(JSON.stringify(selectedTemplate.value.formData))
  } else {
    testFormData.value = {}
  }
  scoring.value = null
  console.debug('Form reset to template formData:', testFormData.value)
}

// Handle form changes - update without triggering recursion
const handleFormChange = (event: any) => {
  console.debug('Form data changed:', event.data)
  // Simply assign the data - JsonForms already handles reactivity
  testFormData.value = event.data as Record<string, unknown>
}

// Calculate scoring for the form
const calculateScoring = async () => {
  try {
    if (!selectedTemplateId.value || !testFormData.value) return
    
    // TODO: Implement scoring calculation via backend API
    // For now, scoring is disabled until backend scoring endpoint is available
    console.warn('Scoring calculation not yet implemented for frontend')
    scoring.value = null
  } catch (error) {
    console.error('Failed to calculate form score:', error)
    scoring.value = null
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
              class="mb-4"
            ></v-skeleton-loader>
            <v-select
              v-else
              v-model="selectedTemplateId"
              :items="availableTemplates"
              item-title="title"
              item-value="id"
              label="Choose a form template"
              outlined
              dense
              @update:model-value="handleTemplateChange"
            >
              <template #item="{ item, props }">
                <v-list-item v-bind="props" :title="item.raw.title" :subtitle="item.raw.description" />
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
            <v-button-group class="w-100" divided>
              <v-btn
                color="primary"
                variant="outlined"
                @click="resetForm"
                block
              >
                <v-icon left>mdi-refresh</v-icon>
                Reset Form
              </v-btn>
              <v-btn
                color="secondary"
                variant="outlined"
                @click="calculateScoring"
                block
                :disabled="!testFormData || Object.keys(testFormData).length === 0"
              >
                <v-icon left>mdi-calculator</v-icon>
                Calculate Score
              </v-btn>
            </v-button-group>
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
              v-if="loadingTemplate || !formSchema || !formSchemaUI"
              type="article@5"
            ></v-skeleton-loader>
            <JsonForms
              v-else
              :key="`form-${selectedTemplateId}`"
              :data="testFormData"
              :schema="formSchema"
              :uischema="formSchemaUI"
              :renderers="renderers"
              :translations="formTranslations"
              :i18n="{ translate: translator, locale: 'en' }"
              @change="handleFormChange"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Scoring Display -->
    <v-row v-if="scoring" class="mb-6">
      <v-col cols="12">
        <v-card variant="outlined" class="scoring-card">
          <v-card-title class="bg-success text-white">
            Calculated Scoring
          </v-card-title>
          <v-card-text class="pa-6">
            <!-- Subscales -->
            <v-row class="mb-6">
              <v-col
                v-for="(subscale, key) in scoring.subscales"
                :key="key"
                cols="12"
                sm="6"
                md="3"
              >
                <v-card v-if="subscale" variant="tonal" color="primary" class="pa-4 h-100">
                  <div class="text-subtitle-2 font-weight-medium mb-1">{{ subscale.name }}</div>
                  <div class="text-h5 font-weight-bold mb-2">
                    {{ subscale.rawScore }}/{{ subscale.maxPossibleScore }}
                  </div>
                  <v-progress-linear
                    :model-value="subscale.normalizedScore || 0"
                    height="6"
                    rounded
                    color="white"
                    class="mb-2"
                  ></v-progress-linear>
                  <div class="text-caption">
                    {{ subscale.completionPercentage }}% Complete
                  </div>
                </v-card>
              </v-col>
            </v-row>

            <!-- Total Score -->
            <v-divider class="my-4"></v-divider>
            <v-card v-if="scoring.total" variant="tonal" color="success" class="pa-6">
              <div class="text-h6 mb-2">Total Score</div>
              <div class="text-h3 font-weight-bold mb-2">
                {{ scoring.total.rawScore }}/{{ scoring.total.maxPossibleScore }}
              </div>
              <v-progress-linear
                :model-value="scoring.total.rawScore || 0"
                :max="scoring.total.maxPossibleScore"
                height="12"
                rounded
                color="white"
                class="mb-4"
              ></v-progress-linear>
              <div class="text-body2">{{ scoring.total.description }}</div>
              <div class="text-caption mt-2">
                {{ scoring.total.completionPercentage }}% Complete ({{ scoring.total.answeredQuestions }}/{{ scoring.total.totalQuestions }} questions)
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
              <v-expansion-panel title="View Raw Data">
                <pre class="text-caption" style="overflow: auto;">{{ JSON.stringify(testFormData, null, 2) }}</pre>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="6">
        <v-card variant="outlined">
          <v-card-title>Scoring Data (JSON)</v-card-title>
          <v-card-text>
            <v-expansion-panels>
              <v-expansion-panel title="View Scoring Data">
                <pre class="text-caption" style="overflow: auto;">{{ JSON.stringify(scoring, null, 2) }}</pre>
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

.scoring-card {
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
