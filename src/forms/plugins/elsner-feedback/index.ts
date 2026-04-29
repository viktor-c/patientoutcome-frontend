import ElsnerFeedbackForm from './ElsnerFeedbackForm.vue'
import { translations } from './translations'
import { calculateScore, validateFormData, getInitialData, generateMockData } from './scoring'
import type { FormPlugin } from '../../types'

const plugin: FormPlugin = {
  metadata: {
    id: '67b4e612d0feb4ad99ae2e8b',
    name: 'elsner-feedback',
    description: 'Subjective postoperative feedback plotted against expected recovery line',
    version: '1.0.0',
    supportedLocales: ['en', 'de'],
  },
  component: ElsnerFeedbackForm,
  translations,
  calculateScore,
  validateFormData,
  getInitialData,
  generateMockData,
  schema: {
    type: 'object',
    properties: {
      elsnerFeedback: {
        type: 'object',
        properties: {
          currentWeek: { type: ['number', 'null'] },
          selectedExpectation: { type: ['number', 'null'], minimum: 0, maximum: 140 },
          pointsJson: { type: ['string', 'null'] },
        },
      },
    },
  },
}

export default plugin
