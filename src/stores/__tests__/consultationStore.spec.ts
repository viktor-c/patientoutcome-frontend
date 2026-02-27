import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConsultationStore } from '@/stores/consultationStore'
import type { Consultation } from '@/api'

describe('consultationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockConsultation: Consultation = {
    id: 'consultation-123',
    patient: 'patient-123',
    patientCase: 'case-123',
    surgery: 'surgery-123',
    link: 'http://example.com/consultation',
    proms: [],
    uuid: 'uuid-123',
    createdAt: '2026-01-15T10:00:00Z',
    blueprintId: 'blueprint-123',
  }

  describe('initial state', () => {
    it('should have null consultation on creation', () => {
      const store = useConsultationStore()
      expect(store.consultation).toBeNull()
    })
  })

  describe('setConsultation', () => {
    it('should set the consultation', () => {
      const store = useConsultationStore()
      store.setConsultation(mockConsultation)
      expect(store.consultation).toEqual(mockConsultation)
    })

    it('should overwrite existing consultation', () => {
      const store = useConsultationStore()
      store.setConsultation(mockConsultation)
      
      const newConsultation: Consultation = {
        ...mockConsultation,
        id: 'consultation-456',
      }
      store.setConsultation(newConsultation)
      
      expect(store.consultation).toEqual(newConsultation)
      expect(store.consultation?.id).toBe('consultation-456')
    })
  })

  describe('clearConsultation', () => {
    it('should clear the consultation to null', () => {
      const store = useConsultationStore()
      store.setConsultation(mockConsultation)
      expect(store.consultation).not.toBeNull()
      
      store.clearConsultation()
      expect(store.consultation).toBeNull()
    })

    it('should be safe to call when already null', () => {
      const store = useConsultationStore()
      expect(store.consultation).toBeNull()
      
      store.clearConsultation()
      expect(store.consultation).toBeNull()
    })
  })

  describe('reactivity', () => {
    it('should be reactive when consultation changes', () => {
      const store = useConsultationStore()
      
      // Verify state changes correctly by checking values
      expect(store.consultation).toBeNull()
      
      store.setConsultation(mockConsultation)
      expect(store.consultation).toEqual(mockConsultation)
      
      store.clearConsultation()
      expect(store.consultation).toBeNull()
    })
  })
})
