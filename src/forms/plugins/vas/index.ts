/**
 * VAS Form Plugin
 * Visual Analog Scale for Pain Assessment
 * 
 * This plugin provides a complete form implementation including:
 * - Vue component for rendering
 * - Scoring calculation logic
 * - Translations (EN, DE)
 * - Validation
 */

import VasForm from './VasForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

/**
 * VAS Plugin Configuration
 * Template ID matches the backend plugin
 */
const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e86', // Must match backend templateId
    name: 'VAS',
    description: 'Visual Analog Scale for Pain Assessment - A simple scale to measure pain intensity from 0 to 10',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  
  component: VasForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  
  // Optional JSON schema for validation
  schema: {
    type: 'object',
    properties: {
      painScale: {
        type: 'object',
        properties: {
          painLevel: { type: ['number', 'null'], minimum: 0, maximum: 10 }
        }
      }
    }
  }
}

export default plugin
