/**
 * AOFAS Form Plugin
 * American Orthopaedic Foot & Ankle Society Score
 * 
 * This plugin provides a complete form implementation including:
 * - Vue component for rendering
 * - Scoring calculation logic
 * - Translations (EN, DE)
 * - Validation
 */

import AofasForm from './AofasForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

/**
 * AOFAS Plugin Configuration
 * Template ID matches the backend plugin
 */
const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e84', // Must match backend templateId
    name: 'AOFAS',
    description: 'American Orthopaedic Foot & Ankle Society Forefoot Score - Clinical rating system for forefoot assessment',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  
  component: AofasForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  
  // Optional JSON schema for validation
  schema: {
    type: 'object',
    properties: {
      forefoot: {
        type: 'object',
        properties: {
          q1: { type: ['number', 'null'], enum: [null, 40, 30, 20, 0] },
          q2: { type: ['number', 'null'], enum: [null, 10, 7, 4, 0] },
          q3: { type: ['number', 'null'], enum: [null, 10, 5, 0] },
          q4: { type: ['number', 'null'], enum: [null, 10, 5, 0] },
          q5: { type: ['number', 'null'], enum: [null, 5, 0] },
          q6: { type: ['number', 'null'], enum: [null, 5, 0] },
          q7: { type: ['number', 'null'], enum: [null, 5, 0] },
          q8: { type: ['number', 'null'], enum: [null, 15, 8, 0] }
        }
      }
    }
  }
}

export default plugin
export { AofasForm, translations, calculateScore, validateFormData, getInitialData, generateMockData }
