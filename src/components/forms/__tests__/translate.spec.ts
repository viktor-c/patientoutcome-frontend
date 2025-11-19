import { describe, it, expect, beforeEach, vi } from 'vitest'
import { inject } from 'vue'

// Mock the inject function from Vue
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    inject: vi.fn(),
  }
})

describe('translate helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return translate function that uses injected jsonforms i18n', async () => {
    const mockInject = inject as ReturnType<typeof vi.fn>
    mockInject.mockReturnValue({
      i18n: {
        translate: (key: string, defaultMessage?: string) => {
          if (key === 'test.key') return 'Translated Text'
          return defaultMessage || key
        },
      },
    })

    // Dynamic import after mocking
    const { createTranslate } = await import('../translate')
    const translate = createTranslate()

    expect(typeof translate).toBe('function')
    const result = translate('test.key', 'Default')
    expect(result).toBe('Translated Text')
  })

  it('should return default message when translation not found', async () => {
    const mockInject = inject as ReturnType<typeof vi.fn>
    mockInject.mockReturnValue({
      i18n: {
        translate: (key: string, defaultMessage?: string) => defaultMessage || key,
      },
    })

    const { createTranslate } = await import('../translate')
    const translate = createTranslate()
    const result = translate('missing.key', 'Default Message')

    expect(result).toBe('Default Message')
  })

  it('should return key when no translation and no default', async () => {
    const mockInject = inject as ReturnType<typeof vi.fn>
    mockInject.mockReturnValue({
      i18n: {
        translate: (key: string, defaultMessage?: string) => defaultMessage || key,
      },
    })

    const { createTranslate } = await import('../translate')
    const translate = createTranslate()
    const result = translate('some.key')

    expect(result).toBe('some.key')
  })

  it('should handle missing jsonforms injection gracefully', async () => {
    const mockInject = inject as ReturnType<typeof vi.fn>
    mockInject.mockReturnValue(undefined)

    const { createTranslate } = await import('../translate')
    const translate = createTranslate()
    const result = translate('test.key', 'Fallback')

    expect(result).toBe('Fallback')
  })
})
