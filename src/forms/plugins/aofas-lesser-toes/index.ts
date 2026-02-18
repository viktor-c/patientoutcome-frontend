/**
 * AOFAS Lesser Toes Form Plugin
 * American Orthopaedic Foot & Ankle Society Lesser Toes (MTP-IP) Score
 */

import AofasLesserToesForm from './AofasLesserToesForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e87',
    name: 'AOFAS Lesser Toes',
    description: 'American Orthopaedic Foot & Ankle Society Lesser Toes (MTP-IP) Score - Clinical rating system for lesser toes (rays 2-5) assessment',
    version: '1.0.0',
    supportedLocales: ['en', 'de']
  },
  
  component: AofasLesserToesForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  
  schema: {
    type: 'object',
    properties: {
      lesserToes: {
        type: 'object',
        properties: {
          q1: { type: ['number', 'null'], enum: [null, 40, 30, 20, 0] },
          q2: { type: ['number', 'null'], enum: [null, 10, 7, 4, 0] },
          q3: { type: ['number', 'null'], enum: [null, 10, 5, 0] },
          q4: { type: ['number', 'null'], enum: [null, 14, 7, 0] },
          q5: { type: ['number', 'null'], enum: [null, 6, 0] },
          q6: { type: ['number', 'null'], enum: [null, 5, 0] },
          q7: { type: ['number', 'null'], enum: [null, 5, 0] },
          q8: { type: ['number', 'null'], enum: [null, 10, 5, 0] }
        }
      }
    }
  }
}

export default plugin
export { AofasLesserToesForm, translations, calculateScore, validateFormData, getInitialData, generateMockData }
