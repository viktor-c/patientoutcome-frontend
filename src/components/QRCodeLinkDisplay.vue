<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotifierStore } from '@/stores/notifierStore'
import QRCodeDisplay from '@/components/QRCodeDisplay.vue'
import { logger } from '@/services/logger'

interface Props {
  url: string
  label?: string
  hideUrl?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  hideUrl: false,
})

const { t } = useI18n()
const notifierStore = useNotifierStore()

const hasUrl = computed(() => props.url && props.url.length > 0)

const copyUrlToClipboard = async () => {
  if (!hasUrl.value) return
  try {
    await navigator.clipboard.writeText(props.url)
    notifierStore.notify(t('creationFlow.urlCopied'), 'success')
  } catch (error) {
    logger.error('❌ Error copying URL to clipboard:', error)
    notifierStore.notify(t('creationFlow.urlCopyFailed'), 'error')
  }
}

const openUrl = () => {
  if (!hasUrl.value) return
  window.open(props.url, '_blank')
}
</script>

<template>
  <div v-if="hasUrl" class="qr-code-link-display">
    <!-- Label section -->
    <div v-if="label" class="mb-3">
      <p class="mb-2 font-weight-bold">{{ label }}</p>
    </div>

    <!-- QR Code and URL Section -->
    <v-card variant="outlined" class="qr-content-card">
      <v-card-text class="pa-4">
        <v-row align="center">
          <!-- QR Code Column -->
          <v-col cols="12" sm="4" class="d-flex justify-center">
            <QRCodeDisplay :url="url" :size="180" />
          </v-col>

          <!-- URL and Actions Column -->
          <v-col cols="12" sm="8">
            <v-text-field
              :value="url"
              readonly
              density="compact"
              variant="outlined"
              hide-details
              class="mb-3"
            >
              <template #append-inner>
                <v-btn
                  icon="mdi-content-copy"
                  size="x-small"
                  variant="text"
                  :title="t('buttons.copy')"
                  class="mr-2"
                  @click.stop="copyUrlToClipboard"
                />
                <v-btn
                  icon="mdi-open-in-new"
                  size="x-small"
                  variant="text"
                  :title="t('buttons.open')"
                  @click.stop="openUrl"
                />
              </template>
            </v-text-field>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.qr-code-link-display {
  width: 100%;
}

.qr-content-card {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

:deep(.v-card__text) {
  padding: 16px;
}
</style>
