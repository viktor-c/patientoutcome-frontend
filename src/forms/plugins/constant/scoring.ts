/**
 * Constant-Murley Shoulder Score Scoring Logic
 *
 * Reference: Constant CR, Murley AHG. A clinical method of functional assessment of the shoulder.
 * Clin Orthop Relat Res. 1987;214:160-4.
 * German version from: http://www.schulterfragebogen.de/Constant-Arzt-Score.pdf
 *
 * Total: 100 points
 * - Pain           (0–15 pts)
 * - Activities ADL (0–20 pts): work + leisure + sleep + hand-reach
 * - Range of Motion(0–40 pts): flexion + abduction + external rotation + internal rotation
 * - Strength       (0–25 pts): 1 point per 0.45 kg (1 point per pound), max 25 pts
 */

import type { FormData } from '../../types'
import type { ScoringData, SubscaleScore } from '@/types/backend/scoring'

/**
 * Forward flexion / abduction degree ranges → points
 */
function rangeToPoints(degrees: number | null | undefined): number | null {
  if (degrees === null || degrees === undefined) return null
  if (degrees <= 30) return 0
  if (degrees <= 60) return 2
  if (degrees <= 90) return 4
  if (degrees <= 120) return 6
  if (degrees <= 150) return 8
  return 10
}

/**
 * Strength in kg → points (1 point per pound = 1 point per 0.45 kg), max 25
 */
function kgToStrengthPoints(kg: number | null | undefined): number | null {
  if (kg === null || kg === undefined) return null
  return Math.min(25, Math.round(kg / 0.45))
}

function makeSubscale(
  name: string,
  description: string,
  rawScore: number,
  maxScore: number,
  answeredQuestions: number,
  totalQuestions: number
): SubscaleScore {
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  const normalizedScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100 * 100) / 100 : 0
  return {
    name,
    description,
    rawScore,
    normalizedScore,
    maxScore,
    answeredQuestions,
    totalQuestions,
    completionPercentage,
    isComplete: answeredQuestions === totalQuestions,
  }
}

/**
 * Calculate Constant-Murley score from form data.
 *
 * Data structure expected under `data.constant`:
 *   pain          : 0–15 (integer, direct VAS-style scale)
 *   adlWork       : 0–4
 *   adlLeisure    : 0–4
 *   adlSleep      : 0–2
 *   adlHandReach  : 2 | 4 | 6 | 8 | 10
 *   flexion       : 0–180  (degrees, will be bucketed)
 *   abduction     : 0–180  (degrees, will be bucketed)
 *   er1           : 0 | 2  (hand on top of head, elbow forward)
 *   er2           : 0 | 2  (hand on top of head, elbow to side)
 *   er3           : 0 | 2  (hand behind head, elbow forward)
 *   er4           : 0 | 2  (hand behind head, elbow to side)
 *   er5           : 0 | 2  (unrestricted overhead movement)
 *   internalRotation : 0 | 2 | 4 | 6 | 8 | 10
 *   strengthKg    : number in kg (converted to points internally)
 */
export function calculateScore(data: FormData): ScoringData {
  const d = (data.constant ?? {}) as Record<string, number | null | undefined>

  // --- Pain (0–15) ---
  const pain = typeof d.pain === 'number' ? d.pain : null
  const painScore = pain !== null ? Math.min(15, Math.max(0, pain)) : null

  // --- ADL (0–20) ---
  const adlWork = typeof d.adlWork === 'number' ? d.adlWork : null
  const adlLeisure = typeof d.adlLeisure === 'number' ? d.adlLeisure : null
  const adlSleep = typeof d.adlSleep === 'number' ? d.adlSleep : null
  const adlHandReach = typeof d.adlHandReach === 'number' ? d.adlHandReach : null

  const adlFields = [adlWork, adlLeisure, adlSleep, adlHandReach]
  const adlAnswered = adlFields.filter(v => v !== null).length
  const adlRaw = adlFields.reduce<number>((sum, v) => sum + (v ?? 0), 0)

  // --- ROM (0–40) ---
  const flexionPts = rangeToPoints(d.flexion as number | null)
  const abductionPts = rangeToPoints(d.abduction as number | null)

  // External rotation: each er1-er5 stores 0 or 2 (points)
  const er1 = typeof d.er1 === 'number' ? d.er1 : null
  const er2 = typeof d.er2 === 'number' ? d.er2 : null
  const er3 = typeof d.er3 === 'number' ? d.er3 : null
  const er4 = typeof d.er4 === 'number' ? d.er4 : null
  const er5 = typeof d.er5 === 'number' ? d.er5 : null
  const erFields = [er1, er2, er3, er4, er5]
  const erAnswered = erFields.filter(v => v !== null).length
  const erRaw = erFields.reduce<number>((sum, v) => sum + (v ?? 0), 0)

  const internalRotation = typeof d.internalRotation === 'number' ? d.internalRotation : null

  const romFields: Array<number | null> = [flexionPts, abductionPts, erAnswered > 0 ? erRaw : null, internalRotation]
  const romAnswered = romFields.filter(v => v !== null).length
  const romRaw = (flexionPts ?? 0) + (abductionPts ?? 0) + erRaw + (internalRotation ?? 0)
  // Count er as one question block; total ROM sub-questions = 4 (flexion, abduction, extRot, intRot)
  const romTotalQuestions = 4

  // --- Strength (0–25) ---
  const strengthKg = typeof d.strengthKg === 'number' ? d.strengthKg : null
  const strengthPts = kgToStrengthPoints(strengthKg)

  // --- Totals ---
  const allAnswered = [painScore, adlWork, adlLeisure, adlSleep, adlHandReach, flexionPts, abductionPts, internalRotation, strengthPts]
    .filter(v => v !== null).length + erAnswered
  // total questions: pain(1) + adl(4) + flexion(1) + abduction(1) + er(5) + internalRot(1) + strength(1) = 14
  const totalQuestions = 14

  const totalRaw =
    (painScore ?? 0) +
    adlRaw +
    romRaw +
    (strengthPts ?? 0)

  const subscalePain = makeSubscale('Pain', 'Shoulder pain severity (0 = severe, 15 = none)', painScore ?? 0, 15, pain !== null ? 1 : 0, 1)
  const subscaleAdl = makeSubscale('Activities of Daily Living', 'Work, leisure, sleep and hand reach', adlRaw, 20, adlAnswered, 4)
  const subscaleRom = makeSubscale('Range of Motion', 'Flexion, abduction, external and internal rotation', romRaw, 40, romAnswered + (erAnswered > 0 ? 1 : 0) - (erAnswered > 0 ? 1 : 0) + erAnswered, romTotalQuestions + 1)
  const subscaleStrength = makeSubscale('Strength', 'Abduction strength (0–25 points, 1 pt per 0.45 kg)', strengthPts ?? 0, 25, strengthKg !== null ? 1 : 0, 1)

  const isComplete = allAnswered === totalQuestions
  const completionPercentage = Math.round((allAnswered / totalQuestions) * 100)

  const totalScore: SubscaleScore = {
    name: 'Constant-Murley Total',
    description: 'Constant-Murley Shoulder Score',
    rawScore: totalRaw,
    normalizedScore: Math.round((totalRaw / 100) * 100 * 100) / 100,
    maxScore: 100,
    answeredQuestions: allAnswered,
    totalQuestions,
    completionPercentage,
    isComplete,
  }

  return {
    rawFormData: { constant: d },
    subscales: {
      pain: subscalePain,
      adl: subscaleAdl,
      rom: subscaleRom,
      strength: subscaleStrength,
    },
    totalScore,
  }
}

/**
 * Validate Constant score form data
 */
export function validateFormData(data: FormData): boolean {
  const d = (data.constant ?? {}) as Record<string, unknown>

  // Pain 0–15
  if (d.pain !== null && d.pain !== undefined) {
    if (typeof d.pain !== 'number' || d.pain < 0 || d.pain > 15) return false
  }
  // ADL sub-scores
  if (d.adlWork !== null && d.adlWork !== undefined) {
    if (typeof d.adlWork !== 'number' || d.adlWork < 0 || d.adlWork > 4) return false
  }
  if (d.adlLeisure !== null && d.adlLeisure !== undefined) {
    if (typeof d.adlLeisure !== 'number' || d.adlLeisure < 0 || d.adlLeisure > 4) return false
  }
  if (d.adlSleep !== null && d.adlSleep !== undefined) {
    if (typeof d.adlSleep !== 'number' || d.adlSleep < 0 || d.adlSleep > 2) return false
  }
  if (d.adlHandReach !== null && d.adlHandReach !== undefined) {
    if (typeof d.adlHandReach !== 'number' || ![2, 4, 6, 8, 10].includes(d.adlHandReach as number)) return false
  }
  // ROM – flexion / abduction in degrees
  for (const key of ['flexion', 'abduction'] as const) {
    if (d[key] !== null && d[key] !== undefined) {
      if (typeof d[key] !== 'number' || (d[key] as number) < 0 || (d[key] as number) > 180) return false
    }
  }
  // External rotation bits (0 or 2 each)
  for (const key of ['er1', 'er2', 'er3', 'er4', 'er5'] as const) {
    if (d[key] !== null && d[key] !== undefined) {
      if (![0, 2].includes(d[key] as number)) return false
    }
  }
  // Internal rotation enum 0|2|4|6|8|10
  if (d.internalRotation !== null && d.internalRotation !== undefined) {
    if (![0, 2, 4, 6, 8, 10].includes(d.internalRotation as number)) return false
  }
  // Strength ≥ 0
  if (d.strengthKg !== null && d.strengthKg !== undefined) {
    if (typeof d.strengthKg !== 'number' || d.strengthKg < 0) return false
  }
  return true
}

/**
 * Get initial (empty) Constant score form data
 */
export function getInitialData(): FormData {
  return {
    constant: {
      pain: null,
      adlWork: null,
      adlLeisure: null,
      adlSleep: null,
      adlHandReach: null,
      flexion: null,
      abduction: null,
      er1: null,
      er2: null,
      er3: null,
      er4: null,
      er5: null,
      internalRotation: null,
      strengthKg: null,
    },
  }
}

/**
 * Generate representative mock data for testing
 * Represents a moderately impaired shoulder (expected total ~68 pts)
 * pain=10, adl=14, rom=28, strength=16
 */
export function generateMockData(): FormData {
  return {
    constant: {
      pain: 10,          // 10/15
      adlWork: 3,        // 3/4
      adlLeisure: 3,     // 3/4
      adlSleep: 2,       // 2/2
      adlHandReach: 6,   // up to neck = 6/10 → 14/20 ADL total
      flexion: 100,      // 91–120° → 6 pts
      abduction: 100,    // 91–120° → 6 pts
      er1: 2,            // +2
      er2: 2,            // +2
      er3: 2,            // +2
      er4: 0,            // +0
      er5: 0,            // +0  → extRot = 8
      internalRotation: 6,  // belt line L3 = 6/10
      strengthKg: 7.2,   // ~16 pts (7.2 / 0.45 = 16)
    },
  }
}
