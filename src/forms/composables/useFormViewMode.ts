/**
 * Composable for managing form view mode (standard vs carousel)
 * Persists user preference in localStorage
 */
import { ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export type FormViewMode = 'standard' | 'carousel'

export function useFormViewMode() {
  // Persist view mode preference in localStorage
  const viewMode = useLocalStorage<FormViewMode>('form-view-mode', 'standard')

  // Reactive state
  const currentViewMode = ref<FormViewMode>(viewMode.value)

  // Sync with localStorage
  watch(currentViewMode, (newMode) => {
    viewMode.value = newMode
  })

  // Toggle between modes
  const toggleViewMode = () => {
    currentViewMode.value = currentViewMode.value === 'standard' ? 'carousel' : 'standard'
  }

  // Set specific mode
  const setViewMode = (mode: FormViewMode) => {
    currentViewMode.value = mode
  }

  // Check if carousel mode
  const isCarouselMode = () => currentViewMode.value === 'carousel'

  // Check if standard mode
  const isStandardMode = () => currentViewMode.value === 'standard'

  return {
    viewMode: currentViewMode,
    toggleViewMode,
    setViewMode,
    isCarouselMode,
    isStandardMode
  }
}
