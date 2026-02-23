import { describe, it, expect } from 'vitest'
import { generateScaleInfo, FORM_TYPES } from '../scaleInfo'
import type { SubscaleScore } from '@/types/backend/scoring'

const makeScore = (rawScore: number, maxScore = 100): SubscaleScore => ({
  name: 'Test',
  rawScore,
  maxScore,
  isComplete: true,
})

describe('scaleInfo', () => {
  describe('FORM_TYPES constants', () => {
    it('should define expected form type IDs', () => {
      expect(FORM_TYPES.MOXFQ).toBe('67b4e612d0feb4ad99ae2e85')
      expect(FORM_TYPES.VAS).toBe('67b4e612d0feb4ad99ae2e86')
      expect(FORM_TYPES.EFAS).toBe('efas')
      expect(FORM_TYPES.AOFAS).toBe('aofas')
      expect(FORM_TYPES.VISAA).toBe('visa-a')
    })
  })

  describe('generateScaleInfo', () => {
    it('should return null for null score', () => {
      expect(generateScaleInfo(null, 'moxfq')).toBeNull()
    })

    it('should return null for undefined score', () => {
      expect(generateScaleInfo(undefined, 'moxfq')).toBeNull()
    })

    it('should route to MOXFQ plugin by template ID', () => {
      const score = makeScore(60)
      const result = generateScaleInfo(score, FORM_TYPES.MOXFQ)

      expect(result).not.toBeNull()
      expect(result!.min).toBe(0)
      expect(result!.max).toBe(100)
      expect(result!.polarity).toBe('lower-is-better')
    })

    it('should route to MOXFQ plugin by name substring', () => {
      const score = makeScore(60)
      const result = generateScaleInfo(score, 'moxfq-form')

      expect(result).not.toBeNull()
      expect(result!.polarity).toBe('lower-is-better')
    })

    it('should route to EFAS plugin', () => {
      const score = makeScore(75)
      const result = generateScaleInfo(score, 'efas')

      expect(result).not.toBeNull()
      expect(result!.polarity).toBe('higher-is-better')
    })

    it('should route to AOFAS plugin', () => {
      const score = makeScore(80)
      const result = generateScaleInfo(score, 'aofas')

      expect(result).not.toBeNull()
      expect(result!.polarity).toBe('higher-is-better')
      expect(result!.goodLabel).toBe('Excellent')
    })

    it('should route to AOFAS by substring match', () => {
      const score = makeScore(70)
      const result = generateScaleInfo(score, 'aofas-hindfoot')

      expect(result).not.toBeNull()
      expect(result!.polarity).toBe('higher-is-better')
    })

    it('should route to VAS plugin', () => {
      const score = makeScore(5, 10)
      const result = generateScaleInfo(score, FORM_TYPES.VAS)

      expect(result).not.toBeNull()
      expect(result!.polarity).toBe('lower-is-better')
      expect(result!.min).toBe(0)
      expect(result!.max).toBe(10)
    })

    it('should route to VISA-A plugin', () => {
      const score = makeScore(70)
      const result = generateScaleInfo(score, 'visa-a')

      expect(result).not.toBeNull()
      expect(result!.polarity).toBe('higher-is-better')
    })

    it('should return default scale for unknown form type', () => {
      const score = makeScore(50, 100)
      const result = generateScaleInfo(score, 'unknown-form-xyz')

      expect(result).not.toBeNull()
      expect(result!.min).toBe(0)
      expect(result!.polarity).toBe('higher-is-better')
      expect(result!.goodLabel).toBe('Good')
      expect(result!.badLabel).toBe('Bad')
    })

    it('should pass subscaleKey to plugin', () => {
      const score = makeScore(60)
      // MOXFQ supports subscale keys; passing one should not throw
      const result = generateScaleInfo(score, FORM_TYPES.MOXFQ, 'walking')
      expect(result).not.toBeNull()
    })
  })
})
