import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export const useDashboardStore = defineStore('dashboard', () => {
  // Persist date range filter to localStorage
  const selectedDateRange = useLocalStorage<[number | null, number | null] | null>('dashboard-selected-date-range', null)

  // Initialize with stored value or null
  const dateRange = ref<[number | null, number | null] | null>(selectedDateRange.value)

  // Watch for changes and sync to localStorage
  watch(dateRange, (newValue) => {
    selectedDateRange.value = newValue
  }, { deep: true })

  // Set date range
  const setDateRange = (range: [number | null, number | null] | null) => {
    dateRange.value = range
  }

  // Get date range
  const getDateRange = (): [number | null, number | null] | null => {
    return dateRange.value
  }

  // Clear date range
  const clearDateRange = () => {
    dateRange.value = null
  }

  return {
    dateRange,
    setDateRange,
    getDateRange,
    clearDateRange,
  }
})
