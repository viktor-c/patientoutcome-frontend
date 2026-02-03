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

const { t } = useI18n()
const notifierStore = useNotifierStore()

interface Props {
  url: string
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 256
})

const dialogOpen = ref(false)
const loading = ref(false)
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
    console.error('Failed to generate QR code:', error)
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
