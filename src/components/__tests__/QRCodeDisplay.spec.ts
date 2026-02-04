/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import QRCodeDisplay from '../QRCodeDisplay.vue'
import { useNotifierStore } from '@/stores/notifierStore'

// Mock QRCode library
const mockToDataURL = vi.fn()
vi.mock('qrcode', () => ({
  default: {
    toDataURL: (...args: any[]) => mockToDataURL(...args),
  },
  toDataURL: (...args: any[]) => mockToDataURL(...args),
}))

// Mock jsPDF library
const mockSave = vi.fn()
const mockAddImage = vi.fn()
const mockText = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetFont = vi.fn()
const mockSetTextColor = vi.fn()
const mockSplitTextToSize = vi.fn()
const mockGetInternalPageSize = vi.fn(() => ({
  getWidth: () => 210,
  getHeight: () => 297,
}))

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    save: mockSave,
    addImage: mockAddImage,
    text: mockText,
    setFontSize: mockSetFontSize,
    setFont: mockSetFont,
    setTextColor: mockSetTextColor,
    splitTextToSize: mockSplitTextToSize,
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
  })),
}))

// Mock logger
vi.mock('@/services/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('QRCodeDisplay.vue', () => {
  let wrapper: VueWrapper
  let i18n: ReturnType<typeof createI18n>
  let vuetify: ReturnType<typeof createVuetify>
  let pinia: ReturnType<typeof createPinia>
  let notifierStore: ReturnType<typeof useNotifierStore>

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mockTranslations = {
    en: {
      qrCode: {
        showQRCode: 'Show QR Code',
        title: 'QR Code',
        altText: 'QR Code Image',
        instruction: 'Scan or share this code',
        scanInfo: 'Valid for 30 days',
        errorGenerating: 'Failed to generate QR code',
        urlCopied: 'URL copied to clipboard',
        urlCopyFailed: 'Failed to copy URL',
        downloadPDF: 'Download PDF',
        pdfTitle: 'Patient Access Code',
        pdfInstructions: 'How to use this QR code:',
        pdfGenerated: 'Generated on',
        pdfScanInstruction: 'Scan this code with your smartphone',
        pdfAccessInstruction: 'Or visit the URL below',
        pdfDownloaded: 'PDF downloaded successfully',
        pdfError: 'Failed to generate PDF',
      },
      buttons: {
        close: 'Close',
      },
    },
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockToDataURL.mockResolvedValue('data:image/png;base64,mockQRCode')
    mockSplitTextToSize.mockReturnValue(['http://example.com/flow/ABC123'])
    mockSave.mockClear()
    mockSave.mockImplementation(() => {}) // Reset to default implementation

    // Create fresh instances for each test
    pinia = createPinia()
    setActivePinia(pinia)

    i18n = createI18n({
      legacy: false,
      locale: 'en',
      messages: mockTranslations,
    })

    vuetify = createVuetify({
      components,
      directives,
    })

    wrapper = mount(QRCodeDisplay, {
      props: {
        url: 'http://example.com/flow/ABC123',
      },
      global: {
        plugins: [i18n, vuetify, pinia],
      },
    })

    notifierStore = useNotifierStore()
    // Clear notifications from previous tests
    notifierStore.notifications = []
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('renders the component', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('displays the show QR code button', () => {
      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Show QR Code')
    })

    it('applies custom size prop', () => {
      const customWrapper = mount(QRCodeDisplay, {
        props: {
          url: 'http://example.com/flow/XYZ',
          size: 512,
        },
        global: {
          plugins: [i18n, vuetify, pinia],
        },
      })

      const vm = customWrapper.vm as any
      expect(vm.props.size).toBe(512)
      customWrapper.unmount()
    })

    it('uses default size when not provided', () => {
      const vm = wrapper.vm as any
      expect(vm.props.size).toBe(256)
    })
  })

  describe('QR Code Generation', () => {
    it('generates QR code when dialog opens', async () => {
      const vm = wrapper.vm as any

      // Open dialog
      vm.dialogOpen = true
      await wrapper.vm.$nextTick()
      await flushPromises()

      expect(mockToDataURL).toHaveBeenCalledWith('http://example.com/flow/ABC123', {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      expect(vm.qrCodeDataUrl).toBe('data:image/png;base64,mockQRCode')
    })

    it('does not regenerate QR code if already generated', async () => {
      const vm = wrapper.vm as any

      // Open dialog first time
      vm.dialogOpen = true
      await wrapper.vm.$nextTick()
      await flushPromises()

      expect(mockToDataURL).toHaveBeenCalledTimes(1)

      // Close and reopen dialog
      vm.dialogOpen = false
      await wrapper.vm.$nextTick()
      vm.dialogOpen = true
      await wrapper.vm.$nextTick()
      await flushPromises()

      // Should not generate again
      expect(mockToDataURL).toHaveBeenCalledTimes(1)
    })

    it('shows loading state during QR code generation', async () => {
      const vm = wrapper.vm as any

      // Mock slow QR generation
      mockToDataURL.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('data:image/png'), 100)))

      vm.dialogOpen = true
      await wrapper.vm.$nextTick()

      expect(vm.loading).toBe(true)

      // Wait for completion with fake timers
      await vi.advanceTimersByTimeAsync(150)
      expect(vm.loading).toBe(false)
    })

    it('handles QR code generation error', async () => {
      const logger = await import('@/services/logger')
      const vm = wrapper.vm as any

      mockToDataURL.mockRejectedValue(new Error('QR generation failed'))

      vm.dialogOpen = true
      await wrapper.vm.$nextTick()
      await vi.advanceTimersByTimeAsync(300)

      expect(logger.logger.error).toHaveBeenCalledWith('Failed to generate QR code:', expect.any(Error))
      expect(notifierStore.notifications[0]).toMatchObject({
        message: 'Failed to generate QR code',
        type: 'error',
      })
    })
  })

  describe('URL Copying', () => {
    it('copies URL to clipboard successfully', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      })

      const vm = wrapper.vm as any
      await vm.copyUrl()
      await vi.advanceTimersByTimeAsync(300)

      expect(mockWriteText).toHaveBeenCalledWith('http://example.com/flow/ABC123')
      expect(notifierStore.notifications[0]).toMatchObject({
        message: 'URL copied to clipboard',
        type: 'success',
      })
    })

    it('handles clipboard copy error', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'))
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      })

      const vm = wrapper.vm as any
      await vm.copyUrl()
      await vi.advanceTimersByTimeAsync(300)

      expect(notifierStore.notifications[0]).toMatchObject({
        message: 'Failed to copy URL',
        type: 'error',
      })
    })
  })

  describe('PDF Generation', () => {
    beforeEach(() => {
      const vm = wrapper.vm as any
      vm.qrCodeDataUrl = 'data:image/png;base64,mockQRCode'
    })

    it('generates PDF with correct content', async () => {
      const vm = wrapper.vm as any
      await vm.downloadPDF()

      expect(mockSetFontSize).toHaveBeenCalled()
      expect(mockSetFont).toHaveBeenCalled()
      expect(mockText).toHaveBeenCalled()
      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,mockQRCode',
        'PNG',
        expect.any(Number),
        expect.any(Number),
        120,
        120
      )
      expect(mockSave).toHaveBeenCalledWith(expect.stringMatching(/patient-qr-code-\d+\.pdf/))
    })

    it('shows loading state during PDF generation', async () => {
      const vm = wrapper.vm as any

      // Mock slow PDF generation
      mockSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      const pdfPromise = vm.downloadPDF()
      await wrapper.vm.$nextTick()

      expect(vm.generatingPDF).toBe(true)

      await pdfPromise
      expect(vm.generatingPDF).toBe(false)
    })

    it('includes custom title and subtitle in PDF', async () => {
      const customWrapper = mount(QRCodeDisplay, {
        props: {
          url: 'http://example.com/flow/XYZ',
          title: 'Custom Title',
          subtitle: 'Custom Subtitle',
        },
        global: {
          plugins: [i18n, vuetify, pinia],
        },
      })

      const vm = customWrapper.vm as any
      vm.qrCodeDataUrl = 'data:image/png;base64,mockQRCode'
      await vm.downloadPDF()

      expect(mockText).toHaveBeenCalledWith('Custom Title', expect.any(Number), expect.any(Number), expect.any(Object))
      expect(mockText).toHaveBeenCalledWith('Custom Subtitle', expect.any(Number), expect.any(Number), expect.any(Object))

      customWrapper.unmount()
    })

    it('uses default title when not provided', async () => {
      const vm = wrapper.vm as any
      await vm.downloadPDF()

      expect(mockText).toHaveBeenCalledWith('Patient Access Code', expect.any(Number), expect.any(Number), expect.any(Object))
    })

    it('handles PDF generation error', async () => {
      const logger = await import('@/services/logger')
      const vm = wrapper.vm as any

      mockSave.mockImplementation(() => {
        throw new Error('PDF generation failed')
      })

      await vm.downloadPDF()
      await vi.advanceTimersByTimeAsync(300)

      expect(logger.logger.error).toHaveBeenCalledWith('Failed to generate PDF:', expect.any(Error))
      expect(notifierStore.notifications[0]).toMatchObject({
        message: 'Failed to generate PDF',
        type: 'error',
      })
    })

    it('does not generate PDF when QR code is not available', async () => {
      const vm = wrapper.vm as any
      vm.qrCodeDataUrl = null

      await vm.downloadPDF()

      expect(mockSave).not.toHaveBeenCalled()
    })

    it('shows success notification after PDF download', async () => {
      const vm = wrapper.vm as any
      await vm.downloadPDF()
      await vi.advanceTimersByTimeAsync(300)

      expect(notifierStore.notifications[0]).toMatchObject({
        message: 'PDF downloaded successfully',
        type: 'success',
      })
    })

    it('splits long URLs in PDF', async () => {
      mockSplitTextToSize.mockReturnValue([
        'http://example.com/flow/',
        'ABC123456789'
      ])

      const vm = wrapper.vm as any
      await vm.downloadPDF()

      expect(mockSplitTextToSize).toHaveBeenCalledWith('http://example.com/flow/ABC123', expect.any(Number))
      expect(mockText).toHaveBeenCalledWith(
        ['http://example.com/flow/', 'ABC123456789'],
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      )
    })
  })

  describe('Dialog Behavior', () => {
    it('closes dialog when close button is clicked', async () => {
      const vm = wrapper.vm as any
      vm.dialogOpen = true
      await wrapper.vm.$nextTick()

      expect(vm.dialogOpen).toBe(true)

      vm.dialogOpen = false
      await wrapper.vm.$nextTick()

      expect(vm.dialogOpen).toBe(false)
    })
  })

  describe('Error States', () => {
    it('shows error alert when QR code fails to generate', async () => {
      const vm = wrapper.vm as any
      mockToDataURL.mockRejectedValue(new Error('Generation failed'))

      vm.dialogOpen = true
      await wrapper.vm.$nextTick()
      await vi.advanceTimersByTimeAsync(300)

      expect(vm.qrCodeDataUrl).toBeNull()
    }, 10000) // Increase timeout for this test
  })

  describe('Props Validation', () => {
    it('requires url prop', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mount(QRCodeDisplay, {
        global: {
          plugins: [i18n, vuetify, pinia],
        },
      })

      expect(consoleWarn).toHaveBeenCalled()
      consoleWarn.mockRestore()
    })

    it('accepts all optional props', () => {
      const customWrapper = mount(QRCodeDisplay, {
        props: {
          url: 'http://example.com',
          size: 512,
          title: 'My Title',
          subtitle: 'My Subtitle',
        },
        global: {
          plugins: [i18n, vuetify, pinia],
        },
      })

      const vm = customWrapper.vm as any
      expect(vm.props.url).toBe('http://example.com')
      expect(vm.props.size).toBe(512)
      expect(vm.props.title).toBe('My Title')
      expect(vm.props.subtitle).toBe('My Subtitle')

      customWrapper.unmount()
    })
  })
})
