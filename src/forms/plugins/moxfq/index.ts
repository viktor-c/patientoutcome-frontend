/**
 * MOXFQ Form Plugin
 * Manchester-Oxford Foot Questionnaire
 * 
 * This plugin provides a complete form implementation including:
 * - Vue component for rendering
 * - Scoring calculation logic
 * - Translations (EN, DE)
 * - Validation
 */

import MoxfqForm from './MoxfqForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

/**
 * MOXFQ Plugin Configuration
 * Template ID matches the backend plugin
 */
const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e85', // Must match backend templateId
    name: 'MOXFQ',
    description: 'Manchester-Oxford Foot Questionnaire - Assesses foot and ankle pain and its impact on daily activities',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  
  component: MoxfqForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  
  // Optional JSON schema for validation
  schema: {
    type: 'object',
    properties: {
      moxfq: {
        type: 'object',
        properties: {
          q1: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q2: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q3: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q4: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q5: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q6: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q7: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q8: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q9: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q10: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q11: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q12: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q13: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q14: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q15: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q16: { type: ['number', 'null'], minimum: 0, maximum: 4 }
        }
      }
    }
  }
}

export default plugin
