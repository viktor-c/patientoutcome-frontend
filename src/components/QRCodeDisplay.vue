<template>
  <v-dialog v-model="dialogOpen" max-width="400">
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        color="primary"
        variant="text"
        size="small"
        :loading="loading"
      >
        <v-icon start>mdi-qrcode</v-icon>
        {{ t('qrCode.showQRCode') }}
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ t('qrCode.title') }}</span>
        <v-btn icon variant="text" @click="dialogOpen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="text-center">
        <div v-if="loading" class="py-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else-if="qrCodeDataUrl" class="qr-container">
          <img :src="qrCodeDataUrl" :alt="t('qrCode.altText')" class="qr-image" />
          <div class="mt-4">
            <p class="text-body-2 text-medium-emphasis mb-2">{{ t('qrCode.instruction') }}</p>
            <v-text-field
              :model-value="url"
              readonly
              density="compact"
              variant="outlined"
              hide-details
              class="mb-2"
            >
              <template v-slot:append-inner>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="copyUrl"
                >
                  <v-icon>mdi-content-copy</v-icon>
                </v-btn>
              </template>
            </v-text-field>
            <v-chip size="small" color="primary" variant="text">
              <v-icon start size="small">mdi-information</v-icon>
              {{ t('qrCode.scanInfo') }}
            </v-chip>
          </div>
        </div>
        <div v-else>
          <v-alert type="error" variant="tonal">
            {{ t('qrCode.errorGenerating') }}
          </v-alert>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn
          color="secondary"
          variant="outlined"
          @click="downloadPDF"
          :loading="generatingPDF"
          :disabled="!qrCodeDataUrl"
        >
          <v-icon start>mdi-download</v-icon>
          {{ t('qrCode.downloadPDF') }}
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialogOpen = false">
          {{ t('buttons.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotifierStore } from '@/stores/notifierStore'
import { logger } from '@/services/logger'

const { t } = useI18n()
const notifierStore = useNotifierStore()

interface Props {
  url: string
  size?: number
  title?: string
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 150,
  title: '',
  subtitle: ''
})

const dialogOpen = ref(false)
const loading = ref(false)
const generatingPDF = ref(false)
const qrCodeDataUrl = ref<string | null>(null)

// Generate QR code when dialog opens
watch(dialogOpen, async (isOpen) => {
  if (isOpen && !qrCodeDataUrl.value) {
    await generateQRCode()
  }
})

const generateQRCode = async () => {
  loading.value = true
  try {
    const QRCode = await import('qrcode')
    qrCodeDataUrl.value = await QRCode.toDataURL(props.url, { 
      width: props.size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    logger.error('Failed to generate QR code:', error)
    notifierStore.notify(t('qrCode.errorGenerating'), 'error')
  } finally {
    loading.value = false
  }
}

const copyUrl = () => {
  navigator.clipboard.writeText(props.url).then(() => {
    notifierStore.notify(t('qrCode.urlCopied'), 'success')
  }).catch(() => {
    notifierStore.notify(t('qrCode.urlCopyFailed'), 'error')
  })
}

const downloadPDF = async () => {
  if (!qrCodeDataUrl.value) return

  generatingPDF.value = true
  try {
    // Dynamic import to reduce bundle size
    const { jsPDF } = await import('jspdf')
    
    // Create PDF document (DIN A5 size - half of A4)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    })

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    const title = props.title || t('qrCode.pdfTitle')
    doc.text(title, pageWidth / 2, 15, { align: 'center' })
    
    // Subtitle
    if (props.subtitle) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(props.subtitle, pageWidth / 2, 23, { align: 'center' })
    }
    
    // Instructions
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(t('qrCode.pdfInstructions'), pageWidth / 2, 32, { align: 'center' })
    
    // QR Code - centered and sized for A5
    const qrSize = 70 // mm (reduced for A5 page size)
    const qrX = (pageWidth - qrSize) / 2
    const qrY = 42
    doc.addImage(qrCodeDataUrl.value, 'PNG', qrX, qrY, qrSize, qrSize)
    
    // URL below QR code
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const urlY = qrY + qrSize + 8
    
    // Split URL if too long
    const maxWidth = pageWidth - 15
    const urlLines = doc.splitTextToSize(props.url, maxWidth)
    doc.text(urlLines, pageWidth / 2, urlY, { align: 'center' })
    
    // Footer with date
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    const footerText = `${t('qrCode.pdfGenerated')}: ${new Date().toLocaleDateString()}`
    doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' })
    
    // Additional instructions at bottom
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    const instructionLines = [
      t('qrCode.pdfScanInstruction'),
      t('qrCode.pdfAccessInstruction')
    ]
    let instructionY = urlY + (urlLines.length * 4) + 6
    instructionLines.forEach((line) => {
      if (instructionY < pageHeight - 10) {
        doc.text(line, pageWidth / 2, instructionY, { align: 'center' })
        instructionY += 5
      }
    })
    
    // Save PDF
    const filename = `patient-qr-code-${new Date().getTime()}.pdf`
    doc.save(filename)
    
    notifierStore.notify(t('qrCode.pdfDownloaded'), 'success')
  } catch (error) {
    logger.error('Failed to generate PDF:', error)
    notifierStore.notify(t('qrCode.pdfError'), 'error')
  } finally {
    generatingPDF.value = false
  }
}
</script>

<style scoped>
.qr-container {
  padding: 16px 0;
}

.qr-image {
  max-width: 100%;
  height: auto;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px;
  background: white;
}
</style>
