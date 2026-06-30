/**
 * Constant-Murley Shoulder Score Form Plugin
 *
 * Reference: Constant CR, Murley AHG. A clinical method of functional assessment
 * of the shoulder. Clin Orthop Relat Res. 1987;214:160–4.
 */

import ConstantForm from './ConstantForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e8c', // Must match backend FormTemplate _id
    name: 'Constant Score',
    description: 'Constant-Murley Shoulder Score – Clinician-administered assessment of shoulder function (pain, ADL, ROM, strength)',
    version: '1.0.0',
    supportedLocales: ['en', 'de'],
  },

  component: ConstantForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,

  schema: {
    type: 'object',
    properties: {
      constant: {
        type: 'object',
        properties: {
          pain:             { type: ['number', 'null'], minimum: 0, maximum: 15 },
          adlWork:          { type: ['number', 'null'], minimum: 0, maximum: 4 },
          adlLeisure:       { type: ['number', 'null'], minimum: 0, maximum: 4 },
          adlSleep:         { type: ['number', 'null'], minimum: 0, maximum: 2 },
          adlHandReach:     { type: ['number', 'null'], enum: [null, 2, 4, 6, 8, 10] },
          flexion:          { type: ['number', 'null'], minimum: 0, maximum: 180 },
          abduction:        { type: ['number', 'null'], minimum: 0, maximum: 180 },
          er1:              { type: ['number', 'null'], enum: [null, 0, 2] },
          er2:              { type: ['number', 'null'], enum: [null, 0, 2] },
          er3:              { type: ['number', 'null'], enum: [null, 0, 2] },
          er4:              { type: ['number', 'null'], enum: [null, 0, 2] },
          er5:              { type: ['number', 'null'], enum: [null, 0, 2] },
          internalRotation: { type: ['number', 'null'], enum: [null, 0, 2, 4, 6, 8, 10] },
          strengthKg:       { type: ['number', 'null'], minimum: 0 },
        },
      },
    },
    required: ['constant'],
  },
}

export default plugin
export { ConstantForm, translations, calculateScore, validateFormData, getInitialData, generateMockData }
