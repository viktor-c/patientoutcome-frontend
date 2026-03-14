import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Stub common third-party / navigation components that are not under test
// and would otherwise cause "Failed to resolve component" Vue warnings.
config.global.stubs = {
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div />' },
  VueDatePicker: { template: '<input data-stub="VueDatePicker" />' },
}

// Mock visualViewport for Vuetify overlays in test environment
Object.defineProperty(window, 'visualViewport', {
  writable: true,
  configurable: true,
  value: {
    width: 1024,
    height: 768,
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    scale: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() { }
  observe() { }
  unobserve() { }
  disconnect() { }
  takeRecords() {
    return []
  }
} as unknown as typeof IntersectionObserver
