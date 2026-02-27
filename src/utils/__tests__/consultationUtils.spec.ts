import { describe, it, expect, vi } from 'vitest'
import { localizeConsultationReason } from '../consultationUtils'

describe('consultationUtils', () => {
  describe('localizeConsultationReason', () => {
    const createMockI18n = (translations: Record<string, string> = {}) => ({
      t: vi.fn((key: string) => translations[key] || key),
      te: vi.fn((key: string) => key in translations),
    })

    it('should return empty string for null', () => {
      const i18n = createMockI18n()
      const result = localizeConsultationReason(null, i18n)
      expect(result).toBe('')
    })

    it('should return empty string for undefined', () => {
      const i18n = createMockI18n()
      const result = localizeConsultationReason(undefined, i18n)
      expect(result).toBe('')
    })

    describe('string codes', () => {
      it('should translate string codes when translation exists', () => {
        const i18n = createMockI18n({
          'consultation.reasons.follow_up': 'Follow Up Appointment',
        })
        const result = localizeConsultationReason('follow_up', i18n)
        expect(result).toBe('Follow Up Appointment')
        expect(i18n.te).toHaveBeenCalledWith('consultation.reasons.follow_up')
        expect(i18n.t).toHaveBeenCalledWith('consultation.reasons.follow_up')
      })

      it('should return raw string when translation does not exist', () => {
        const i18n = createMockI18n({})
        const result = localizeConsultationReason('unknown_reason', i18n)
        expect(result).toBe('unknown_reason')
        expect(i18n.te).toHaveBeenCalledWith('consultation.reasons.unknown_reason')
        expect(i18n.t).not.toHaveBeenCalled()
      })
    })

    describe('object with id', () => {
      it('should translate object id when translation exists', () => {
        const i18n = createMockI18n({
          'consultation.reasons.surgery': 'Surgical Consultation',
        })
        const result = localizeConsultationReason({ id: 'surgery' }, i18n)
        expect(result).toBe('Surgical Consultation')
      })

      it('should return raw id when translation does not exist', () => {
        const i18n = createMockI18n({})
        const result = localizeConsultationReason({ id: 'custom_reason' }, i18n)
        expect(result).toBe('custom_reason')
      })
    })

    describe('object with code', () => {
      it('should translate object code when translation exists', () => {
        const i18n = createMockI18n({
          'consultation.reasons.CHECKUP': 'Routine Checkup',
        })
        const result = localizeConsultationReason({ code: 'CHECKUP' }, i18n)
        expect(result).toBe('Routine Checkup')
      })

      it('should return raw code when translation does not exist', () => {
        const i18n = createMockI18n({})
        const result = localizeConsultationReason({ code: 'UNKNOWN' }, i18n)
        expect(result).toBe('UNKNOWN')
      })
    })

    describe('object with label', () => {
      it('should translate object label when translation exists', () => {
        const i18n = createMockI18n({
          'consultation.reasons.emergency': 'Emergency Visit',
        })
        const result = localizeConsultationReason({ label: 'emergency' }, i18n)
        expect(result).toBe('Emergency Visit')
      })

      it('should return raw label when translation does not exist', () => {
        const i18n = createMockI18n({})
        const result = localizeConsultationReason({ label: 'custom_label' }, i18n)
        expect(result).toBe('custom_label')
      })
    })

    describe('object priority', () => {
      it('should prioritize id over code and label', () => {
        const i18n = createMockI18n({
          'consultation.reasons.myId': 'From ID',
          'consultation.reasons.myCode': 'From Code',
          'consultation.reasons.myLabel': 'From Label',
        })
        const result = localizeConsultationReason(
          { id: 'myId', code: 'myCode', label: 'myLabel' },
          i18n
        )
        expect(result).toBe('From ID')
      })

      it('should use code if id is not present', () => {
        const i18n = createMockI18n({
          'consultation.reasons.myCode': 'From Code',
          'consultation.reasons.myLabel': 'From Label',
        })
        const result = localizeConsultationReason({ code: 'myCode', label: 'myLabel' }, i18n)
        expect(result).toBe('From Code')
      })

      it('should use label if id and code are not present', () => {
        const i18n = createMockI18n({
          'consultation.reasons.myLabel': 'From Label',
        })
        const result = localizeConsultationReason({ label: 'myLabel' }, i18n)
        expect(result).toBe('From Label')
      })
    })

    describe('object fallback', () => {
      it('should JSON stringify object with no id/code/label', () => {
        const i18n = createMockI18n({})
        const result = localizeConsultationReason({ foo: 'bar', num: 42 }, i18n)
        expect(result).toBe('{"foo":"bar","num":42}')
      })

      it('should handle non-string id gracefully', () => {
        const i18n = createMockI18n({})
        const result = localizeConsultationReason({ id: 123 }, i18n)
        expect(result).toBe('{"id":123}')
      })
    })

    describe('primitive fallback', () => {
      it('should convert number to string', () => {
        const i18n = createMockI18n({})
        const result = localizeConsultationReason(42, i18n)
        expect(result).toBe('42')
      })

      it('should convert boolean to string', () => {
        const i18n = createMockI18n({})
        const result = localizeConsultationReason(true, i18n)
        expect(result).toBe('true')
      })
    })
  })
})
