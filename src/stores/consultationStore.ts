import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Consultation } from '@/api'

export const useConsultationStore = defineStore('consultation', () => {
  const consultation = ref<Consultation | null>(null)

  const setConsultation = (newConsultation: Consultation) => {
    consultation.value = newConsultation
  }

  const clearConsultation = () => {
    consultation.value = null
  }

  return {
    consultation,
    setConsultation,
    clearConsultation,
  }
})
