/**
 * AOFAS Midfoot Form Plugin
 * American Orthopaedic Foot & Ankle Society Midfoot Score
 */

import AofasMidfootForm from './AofasMidfootForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e89', // Must match backend FormTemplate _id
    name: 'AOFAS Midfoot',
    description: 'American Orthopaedic Foot & Ankle Society Midfoot Score - Clinical rating system for midfoot assessment',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  
  component: AofasMidfootForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  
  schema: {
    type: 'object',
    properties: {
      midfoot: {
        type: 'object',
        properties: {
          q1: { type: ['number', 'null'], enum: [null, 40, 30, 20, 0] },
          q2: { type: ['number', 'null'], enum: [null, 10, 7, 4, 0] },
          q3: { type: ['number', 'null'], enum: [null, 10, 5, 0] },
          q4: { type: ['number', 'null'], enum: [null, 5, 4, 2, 0] },
          q5: { type: ['number', 'null'], enum: [null, 5, 3, 0] },
          q6: { type: ['number', 'null'], enum: [null, 8, 4, 0] },
          q7: { type: ['number', 'null'], enum: [null, 6, 3, 0] },
          q8: { type: ['number', 'null'], enum: [null, 6, 0] },
          q9: { type: ['number', 'null'], enum: [null, 5, 0] },
          q10: { type: ['number', 'null'], enum: [null, 10, 5, 0] }
        }
      }
    }
  }
}

export default plugin
export { AofasMidfootForm, translations, calculateScore, validateFormData, getInitialData, generateMockData }
