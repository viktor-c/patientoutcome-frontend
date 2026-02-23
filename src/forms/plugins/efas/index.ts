/**
 * EFAS Form Plugin
 * European Foot and Ankle Society Score
 * 
 * This plugin provides a complete form implementation including:
 * - Vue component for rendering
 * - Scoring calculation logic
 * - Translations (EN, DE)
 * - Validation
 * - Two-section structure (Standard and Sport questions)
 */

import EfasForm from './EfasForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

/**
 * EFAS Plugin Configuration
 * Template ID matches the backend plugin
 */
const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e83', // Must match backend templateId
    name: 'EFAS',
    description: 'European Foot and Ankle Society Score - Patient-reported outcome measure for foot and ankle problems',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  
  component: EfasForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  
  // Optional JSON schema for validation
  schema: {
    type: 'object',
    properties: {
      standardfragebogen: {
        type: 'object',
        required: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
        properties: {
          q1: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q2: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q3: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q4: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q5: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          q6: { type: ['number', 'null'], minimum: 0, maximum: 4 },
        }
      },
      sportfragebogen: {
        type: 'object',
        properties: {
          s1: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          s2: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          s3: { type: ['number', 'null'], minimum: 0, maximum: 4 },
          s4: { type: ['number', 'null'], minimum: 0, maximum: 4 },
        }
      }
    },
    required: ['standardfragebogen']
  }
}

export default plugin

// Named exports for direct use
export { EfasForm, translations, calculateScore, validateFormData, getInitialData, generateMockData }
