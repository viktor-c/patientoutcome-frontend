/**
 * VISA-A Form Plugin
 * Victorian Institute of Sports Assessment - Achilles
 * 
 * This plugin provides a complete form implementation including:
 * - Vue component for rendering
 * - Scoring calculation logic with complex conditional rules
 * - Translations (EN, DE)
 * - Validation
 */

import VisaaForm from './VisaaForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

/**
 * VISA-A Plugin Configuration
 * Template ID matches the backend plugin
 */
const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e87', // Must match backend templateId
    name: 'VISA-A',
    description: 'Victorian Institute of Sports Assessment - Achilles: Assessment of Achilles tendon pain and functional limitations',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  
  component: VisaaForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  
  // Optional JSON schema for validation
  schema: {
    type: 'object',
    properties: {
      visaa: {
        type: 'object',
        properties: {
          q1: { type: ['number', 'null'], minimum: 0, maximum: 100 },
          q2: { type: ['number', 'null'], minimum: 0, maximum: 10 },
          q3: { type: ['number', 'null'], minimum: 0, maximum: 10 },
          q4: { type: ['number', 'null'], minimum: 0, maximum: 10 },
          q5: { type: ['number', 'null'], minimum: 0, maximum: 10 },
          q6: { type: ['number', 'null'], minimum: 0, maximum: 10 },
          q7: { type: ['number', 'null'], enum: [null, 0, 4, 7, 10] },
          q8_type: { type: ['string', 'null'], enum: [null, 'no_pain', 'pain_no_stop', 'pain_stop'] },
          q8a: { type: ['number', 'null'], minimum: 0, maximum: 30 },
          q8b: { type: ['number', 'null'], minimum: 0, maximum: 30 },
          q8c: { type: ['number', 'null'], minimum: 0, maximum: 30 }
        },
        required: []
      }
    },
    required: ['visaa']
  }
}

export default plugin

// Export individual pieces for convenient importing
export { VisaaForm, translations, calculateScore, validateFormData, getInitialData, generateMockData }
