/**
 * Scale Information Dispatcher
 * 
 * Routes to the appropriate plugin's getScaleInfo function based on form template ID
 * Each plugin defines its own scale logic in its scoring.ts file
 */

import type { SubscaleScore } from '@/types/backend/scoring'
import * as efasPlugin from '@/forms/plugins/efas/scoring'
import * as moxfqPlugin from '@/forms/plugins/moxfq/scoring'
import * as aofasPlugin from '@/forms/plugins/aofas/scoring'
import * as vasPlugin from '@/forms/plugins/vas/scoring'
import * as visaaPlugin from '@/forms/plugins/visaa/scoring'

/**
 * Scale information for visualizing scores
 * Provides metadata about how to display and interpret a score
 */
export interface ScaleInfo {
  /** Minimum value on the scale */
  min: number
  /** Maximum value on the scale */
  max: number
  /** The normalized value on a 0-100 scale for positioning on the visualization */
  normalizedValue: number
  /** Whether higher scores are better or worse */
  polarity: 'higher-is-better' | 'lower-is-better'
  /** Label for the "good" end of the scale */
  goodLabel: string
  /** Label for the "bad" end of the scale */
  badLabel: string
}

/**
 * Form template types mapped to their known template IDs
 */
export const FORM_TYPES = {
  MOXFQ: '67b4e612d0feb4ad99ae2e85',
  EFAS: 'efas',
  AOFAS: 'aofas',
  VAS: '67b4e612d0feb4ad99ae2e86',
  VISAA: 'visa-a'
} as const

/**
 * Generate scale information for a score based on form template type
 * Delegates to the appropriate plugin's getScaleInfo function
 * 
 * @param score The subscale or total score object
 * @param templateId The form template ID or slug
 * @param subscaleKey Optional subscale key for subscale-specific scales
 * @returns ScaleInfo object for visualization
 */
export function generateScaleInfo(
  score: SubscaleScore | null | undefined,
  templateId: string,
  subscaleKey?: string
): ScaleInfo | null {
  if (!score) return null

  // Determine form type from template ID
  const formType = getFormType(templateId)

  // Route to appropriate plugin
  switch (formType) {
    case 'moxfq':
      return moxfqPlugin.getScaleInfo(score, subscaleKey)
    case 'efas':
      return efasPlugin.getScaleInfo(score, subscaleKey)
    case 'aofas':
      return aofasPlugin.getScaleInfo(score, subscaleKey)
    case 'vas':
      return vasPlugin.getScaleInfo(score, subscaleKey)
    case 'visaa':
      return visaaPlugin.getScaleInfo(score, subscaleKey)
    default:
      // Default scale info for unknown forms
      return createDefaultScaleInfo(score)
  }
}

/**
 * Determine form type from template ID
 */
function getFormType(templateId: string): string {
  const id = templateId.toLowerCase()
  if (id.includes('moxfq') || id === FORM_TYPES.MOXFQ) return 'moxfq'
  if (id.includes('efas')) return 'efas'
  if (id.includes('aofas')) return 'aofas'
  if (id.includes('vas') || id === FORM_TYPES.VAS) return 'vas'
  if (id.includes('visa-a') || id.includes('visaa')) return 'visaa'
  return 'unknown'
}

/**
 * Create default scale info for unknown form types
 */
function createDefaultScaleInfo(score: SubscaleScore): ScaleInfo {
  const rawScore = score.rawScore ?? 0
  const maxScore = score.maxScore ?? 100
  
  // Calculate normalized value for positioning (0-100 scale)
  const normalizedValue = maxScore > 0 ? (rawScore / maxScore) * 100 : 0

  return {
    min: 0,
    max: maxScore,
    normalizedValue: Math.round(normalizedValue * 100) / 100,
    polarity: 'higher-is-better',
    goodLabel: 'Good',
    badLabel: 'Bad'
  }
}

