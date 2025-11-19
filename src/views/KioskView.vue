<script setup lang="ts">
import { ref, onMounted } from 'vue'
import LanguageSelector from '@/components/LanguageSelector.vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDateFormat } from '@/composables/useDateFormat'
import { kioskApi } from '@/api'
import type { CreateConsultation201Response } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'

const { t } = useI18n()
const router = useRouter()
const notifier = useNotifierStore()
const { formatLocalizedDate } = useDateFormat()

// Start surveys: navigate to the first incomplete form for this consultation
const startSurveys = () => {
  const consultationObj = consultation.value?.responseObject as Record<string, unknown> | undefined

  // Extract consultation id (try common fields)
  let cid = ''
  if (consultationObj) {
    if ('id' in consultationObj && consultationObj['id']) cid = String(consultationObj['id'])
    else if ('_id' in consultationObj && consultationObj['_id']) cid = String(consultationObj['_id'])
    else if ('consultationId' in consultationObj && consultationObj['consultationId']) cid = String(consultationObj['consultationId'])
  }

  if (!cid) {
    notifier.error(t('kiosk.error'))
    return
  }

  // Try to find first incomplete form in proms
  const proms = consultationObj && 'proms' in consultationObj && Array.isArray(consultationObj['proms'])
    ? (consultationObj['proms'] as unknown[])
    : undefined

  if (proms && proms.length > 0) {
    const firstIncomplete = proms.find((p) => {
      if (!p || typeof p !== 'object') return false
      const r = p as Record<string, unknown>
      // Consider a form incomplete when formFillStatus !== 'completed'
      return !('formFillStatus' in r && String(r['formFillStatus']) === 'completed')
    }) as Record<string, unknown> | undefined

    if (firstIncomplete) {
      const fid = ('id' in firstIncomplete && firstIncomplete['id']) ? String(firstIncomplete['id']) :
        ('_id' in firstIncomplete && firstIncomplete['_id']) ? String(firstIncomplete['_id']) : ''

      if (fid) {
        // Navigate directly to kiosk form view for the first incomplete form
        router.push({ name: 'kioskform', params: { formId: fid } })
        return
      }
    }
  }

  // If no incomplete form found, inform user and fall back to aggregated FormView
  notifier.info(t('forms.consultation.completed'))
  router.push({ name: 'formview', params: { consultationId: String(cid) } })
}

// Reactive state
const consultation = ref<CreateConsultation201Response | null>(null)
const loading = ref(false)
const error = ref(false)

// Load consultation data
const loadConsultation = async () => {
  loading.value = true
  error.value = false

  try {
    const response = await kioskApi.getConsultation()
    consultation.value = response
  } catch (err) {
    console.error('Failed to load consultation:', err)
    error.value = true
    notifier.error(t('kiosk.error'))
  } finally {
    loading.value = false
  }
}

// Navigate to form
const openForm = (formId: string) => {
  if (formId) {
    // Navigate to kiosk form view for this specific form using Vue Router
    router.push({
      name: 'kioskform',
      params: { formId }
    })
  }
}

// When tapping a list item on small screens, open the form directly.
const onListItemClick = (formId: string) => {
  openForm(formId)
}

// Navigate to logout
const logout = () => {
  router.push({ name: 'logout' })
}

// Refresh data
const refresh = () => {
  loadConsultation()
}

// Load data on component mount
onMounted(() => {
  loadConsultation()
})
</script>

<template>
  <v-container class="pa-6 kiosk-container">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <!-- Header -->
        <v-card class="mb-6" elevation="2">
          <v-card-title
                        class="text-h4 text-center bg-primary text-white pa-4 d-flex justify-space-between align-center">
            <div></div> <!-- Spacer for centering -->
            <div>{{ t('kiosk.title') }}</div>
            <LanguageSelector color="white" />
            <v-btn
                   @click="logout"
                   icon="mdi-logout"
                   variant="text"
                   color="white"
                   size="small">
            </v-btn>
          </v-card-title>
          <v-card-subtitle class="text-center text-h6 pa-4">
            {{ t('kiosk.welcome') }}
          </v-card-subtitle>
        </v-card>

        <!-- Loading state -->
        <v-card v-if="loading" class="text-center pa-8" elevation="1">
          <v-progress-circular
                               indeterminate
                               color="primary"
                               size="64"
                               class="mb-4" />
          <div class="text-h6">{{ t('kiosk.loading') }}</div>
        </v-card>

        <!-- Error state -->
        <v-card v-else-if="error" class="text-center pa-8" elevation="1">
          <v-icon icon="mdi-alert-circle" size="64" color="error" class="mb-4" />
          <div class="text-h6 mb-4">{{ t('kiosk.error') }}</div>
          <v-btn @click="refresh" color="primary" prepend-icon="mdi-refresh">
            {{ t('kiosk.refreshButton') }}
          </v-btn>
        </v-card>

        <!-- No consultation state -->
        <v-card v-else-if="!consultation?.responseObject" class="text-center pa-8" elevation="1">
          <v-icon icon="mdi-calendar-remove" size="64" color="grey" class="mb-4" />
          <div class="text-h6 mb-4">{{ t('kiosk.noConsultation') }}</div>
          <v-btn @click="refresh" color="primary" prepend-icon="mdi-refresh">
            {{ t('kiosk.refreshButton') }}
          </v-btn>
        </v-card>

        <!-- Consultation information -->
        <div v-else>
          <!-- Consultation Info Card -->
          <v-card class="mb-6" elevation="2">
            <v-card-title class="bg-primary text-white">
              <v-icon icon="mdi-calendar-check" class="me-2" />
              {{ t('kiosk.consultationInfo') }}
            </v-card-title>
            <v-card-text class="pa-4">
              <v-row>
                <v-col cols="12" sm="6">
                  <div class="text-subtitle-1 font-weight-bold mb-1">
                    {{ t('kiosk.patientCode') }}:
                  </div>
                  <div class="text-h6 text-primary">
                    {{ consultation.responseObject.formAccessCode || 'N/A' }}
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-subtitle-1 font-weight-bold mb-1">
                    {{ t('kiosk.consultationDate') }}:
                  </div>
                  <div class="text-h6">
                    {{ consultation.responseObject.dateAndTime ?
                      formatLocalizedDate(consultation.responseObject.dateAndTime) :
                      'N/A' }}
                  </div>
                </v-col>
              </v-row>
              <v-row v-if="consultation.responseObject.reasonForConsultation">
                <v-col cols="12">
                  <div class="text-subtitle-1 font-weight-bold mb-1">
                    {{ t('consultation.reasonForConsultation') }}:
                  </div>
                  <div class="text-body-1">
                    {{ consultation.responseObject.reasonForConsultation }}
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Forms Section -->
          <v-card elevation="2">
            <v-card-title class="bg-secondary text-white d-flex align-center forms-card-title">
              <div class="d-flex align-center w-100">
                <v-icon icon="mdi-file-document-multiple" class="me-2" />
                <div class="flex-grow-1">{{ t('kiosk.formsToComplete') }}</div>
              </div>
            </v-card-title>
            <v-card-text class="pa-0">
              <!-- No forms message -->
              <div v-if="!consultation.responseObject.proms || consultation.responseObject.proms.length === 0"
                   class="text-center pa-8">
                <v-icon icon="mdi-file-document-outline" size="64" color="grey" class="mb-4" />
                <div class="text-h6 text-grey">{{ t('kiosk.noForms') }}</div>
              </div>

              <!-- Forms list -->
              <v-list v-else>
                <v-list-item
                             v-for="(formItem, index) in consultation.responseObject.proms"
                             :key="formItem.id || index"
                             class="border-b list-item-clickable"
                             @click="onListItemClick(formItem.id || '')"
                             tabindex="0"
                             ripple
                             active-class="list-item-active">
                  <template #prepend>
                    <v-avatar
                              :color="formItem.formFillStatus === 'completed' ? 'success' : 'warning'"
                              size="40">
                      <v-icon
                              :icon="formItem.formFillStatus === 'completed' ? 'mdi-check' : 'mdi-clock-outline'"
                              color="white">
                      </v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title>
                    {{ formItem.title || t('consultation.untitledForm') }}
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <span v-if="formItem.description">{{ formItem.description }}</span>
                    <span class="ml-4">
                      {{ formItem.scoring ?
                        `${t('kiosk.scoring.total')}` : t('kiosk.noScore') }}
                    </span>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn
                           @click="openForm(formItem.id || '')"
                           :color="formItem.formData ? 'primary' : 'success'"
                           :prepend-icon="formItem.formData ? 'mdi-eye' : 'mdi-play'"
                           variant="outlined"
                           class="form-action-btn">
                      {{ formItem.formData ? t('kiosk.viewForm') : t('kiosk.startForm') }}
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
            <!-- Mobile: repeat start button at bottom of card and hide top one via CSS -->
            <v-card-actions class="forms-card-actions"
                            v-if="consultation.responseObject.proms && consultation.responseObject.proms.length > 0">
              <v-btn
                     @click="startSurveys"
                     color="primary"
                     prepend-icon="mdi-play"
                     variant="elevated" size="small" block>
                {{ t('kiosk.startSurveys') }}
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- Refresh button -->
          <div class="text-center mt-6">
            <v-btn
                   @click="refresh"
                   color="primary"
                   prepend-icon="mdi-refresh"
                   size="small"
                   block>
              {{ t('kiosk.refreshButton') }}
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.border-b:last-child {
  border-bottom: none;
}

/* Mobile optimizations */
@media (max-width: 480px) {

  /* Reduce outer container padding */
  .kiosk-container {
    padding: 8px !important;
  }

  /* Reduce vertical spacing for cards */
  .mb-6 {
    margin-bottom: 12px !important;
  }

  /* Compact card titles/subtitles */
  .v-card-title {
    padding: 10px !important;
    font-size: 1rem !important;
  }

  .v-card-subtitle {
    padding: 8px !important;
    font-size: 0.95rem !important;
  }

  /* Stack list items vertically and expand actions to full width */
  .v-list-item {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px;
    padding: 12px !important;
  }

  .v-list-item .v-list-item-title {
    margin-bottom: 4px;
  }

  .v-list-item-subtitle {
    margin-bottom: 6px;
  }

  /* Make start and refresh buttons full width on mobile; per-form action smaller and centered */
  .start-surveys-btn,
  .refresh-btn {
    width: 100% !important;
    display: block !important;
  }

  .form-action-btn {
    /* show as smaller centered button on mobile; switch to icon-only via CSS below */
    width: 40px !important;
    height: 40px !important;
    display: block !important;
    align-self: center !important;
    margin-top: 6px !important;
    padding-left: 4px !important;
    padding-right: 4px !important;
  }

  /* Move startSurveys button under the title in the forms card */
  .forms-card-title {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px;
  }

  /* Hide the top start button inside the title on mobile and show the bottom one instead */
  .forms-card-title .start-surveys-btn {
    display: none !important;
  }

  .forms-card-actions .start-surveys-btn {
    display: block !important;
    padding: 10px 12px !important;
  }

  /* Smaller avatars/icons to save space */
  .v-avatar {
    width: 36px !important;
    height: 36px !important;
  }

  /* Reduce spacing for forms area */
  .pa-4 {
    padding: 8px !important;
  }
}

/* Hide text inside per-form action buttons and keep only the icon to save space */
.form-action-btn :deep(.v-btn__content) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

/* hide anything that's not the icon (the label text) */
.form-action-btn :deep(.v-btn__content)> :not(.v-icon) {
  display: none !important;
}

/* On very small screens hide the visible form action button entirely (we'll open on tap the item) */
.form-action-btn {
  display: none !important;
}

/* indicate list items are tappable */
.list-item-clickable {
  cursor: pointer;
}

/* Active highlight for tapped list items */
.list-item-active {
  background-color: rgba(25, 118, 210, 0.08) !important;
  /* light primary tint */
}

/* Focus-visible for keyboard access */
.list-item-clickable:focus-visible {
  outline: 2px solid rgba(25, 118, 210, 0.18);
  outline-offset: 2px;
}
</style>
