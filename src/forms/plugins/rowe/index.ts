/**
 * Rowe Shoulder Instability Score Form Plugin
 *
 * Reference: Rowe CR. The Bankart procedure: a long-term end-result study.
 * J Bone Joint Surg Am. 1978;60:1–16.
 */

import RoweForm from './RoweForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e8d', // Must match backend FormTemplate _id
    name: 'Rowe Score',
    description: 'Rowe Shoulder Instability Score – Assessment of shoulder stability after dislocation / Bankart procedure',
    version: '1.0.0',
    supportedLocales: ['en', 'de'],
  },

  component: RoweForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,

  schema: {
    type: 'object',
    properties: {
      rowe: {
        type: 'object',
        properties: {
          stability: { type: ['number', 'null'], enum: [null, 0, 10, 30, 50] },
          motion:    { type: ['number', 'null'], enum: [null, 0, 5, 15, 20] },
          function:  { type: ['number', 'null'], enum: [null, 0, 10, 25, 30] },
        },
      },
    },
    required: ['rowe'],
  },
}

export default plugin
export { RoweForm, translations, calculateScore, validateFormData, getInitialData, generateMockData }
