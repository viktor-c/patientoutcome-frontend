<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <v-container class="completion-info-container">
    <v-row justify="center" class="mt-12">
      <v-col cols="12" md="8">
        <v-card class="pa-8 completion-card">
          <!-- Success Icon and Title -->
          <div class="text-center mb-8">
            <v-icon size="80" color="success" class="mb-4">mdi-check-circle</v-icon>
            <h1 class="text-h4 font-weight-bold text-success">
              {{ t('completionInfo.title') || 'Form Submission Successful!' }}
            </h1>
          </div>

          <!-- Privacy Information Section -->
          <v-divider class="my-6"></v-divider>

          <div class="privacy-section">
            <h2 class="text-h6 font-weight-bold mb-4">
              {{ t('completionInfo.privacyTitle') || 'Your Privacy & Data Protection' }}
            </h2>

            <div class="privacy-content">
              <!-- Data Collection -->
              <div class="mb-6">
                <h3 class="text-subtitle1 font-weight-semibold mb-2 text-primary">
                  {{ t('completionInfo.dataCollectionTitle') || 'What We Collect' }}
                </h3>
                <v-list class="transparent-list">
                  <v-list-item>
                    <template #prepend>
                      <v-icon color="success" size="small">mdi-check</v-icon>
                    </template>
                    <v-list-item-title class="text-body2">
                      {{ t('completionInfo.collectAnswers') || 'Only the answers you provide in this form' }}
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </div>

              <!-- What We Do NOT Collect -->
              <div class="mb-6">
                <h3 class="text-subtitle1 font-weight-semibold mb-2 text-error">
                  {{ t('completionInfo.noCollectionTitle') || 'What We Do NOT Collect' }}
                </h3>
                <v-list class="transparent-list">
                  <v-list-item>
                    <template #prepend>
                      <v-icon color="error" size="small">mdi-close</v-icon>
                    </template>
                    <v-list-item-title class="text-body2">
                      {{ t('completionInfo.noPersonalName') || 'Your name or personal identification' }}
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-icon color="error" size="small">mdi-close</v-icon>
                    </template>
                    <v-list-item-title class="text-body2">
                      {{ t('completionInfo.noPhoneNumber') || 'Your phone number or contact details' }}
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-icon color="error" size="small">mdi-close</v-icon>
                    </template>
                    <v-list-item-title class="text-body2">
                      {{ t('completionInfo.noIPAddress') || 'Your IP address or location data' }}
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-icon color="error" size="small">mdi-close</v-icon>
                    </template>
                    <v-list-item-title class="text-body2">
                      {{ t('completionInfo.noBrowserData') || 'Browser cookies or tracking information' }}
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </div>

              <!-- Anonymity -->
              <div class="mb-6 pa-4 bg-success-light rounded">
                <h3 class="text-subtitle1 font-weight-semibold mb-2 text-success">
                  {{ t('completionInfo.anonymityTitle') || 'Complete Anonymity' }}
                </h3>
                <p class="text-body2 mb-0">
                  {{ t('completionInfo.anonymityDescription') || 'Your responses are completely anonymous. We cannot trace this form back to you in any way. Your data is safe and your privacy is fully protected.' }}
                </p>
              </div>

              <!-- Purpose Section -->
              <div class="mb-6 pa-4 bg-info-light rounded">
                <h3 class="text-subtitle1 font-weight-semibold mb-2 text-info">
                  {{ t('completionInfo.purposeTitle') || 'Why We Collect This Information' }}
                </h3>
                <p class="text-body2 mb-0">
                  {{ t('completionInfo.purposeDescription') || 'This information helps us understand patient outcomes and improve healthcare services. Your feedback is invaluable and will be used only for medical research and quality improvement purposes.' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Close Message Section -->
          <v-divider class="my-6"></v-divider>

          <div class="text-center">
            <p class="text-body1 font-weight-semibold mb-2 text-success">
              {{ t('completionInfo.allDone') || '✓ All Done!' }}
            </p>
            <p class="text-body2 text-grey">
              {{ t('completionInfo.closePageMessage') || 'You can now safely close this page.' }}
            </p>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Alternative: Minimal Version for Mobile -->
    <v-row justify="center" class="mt-4 d-md-none">
      <v-col cols="12">
        <div class="text-center text-caption text-grey">
          {{ t('completionInfo.thankyou') || 'Thank you for completing the form!' }}
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.completion-info-container {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(76, 175, 80, 0.05) 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 2rem 1rem;
}

.completion-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.transparent-list {
  background-color: transparent;
}

.transparent-list :deep(.v-list-item) {
  padding-left: 0;
  padding-right: 0;
}

.transparent-list :deep(.v-list-item__prepend) {
  margin-right: 12px;
}

.bg-success-light {
  background-color: rgba(76, 175, 80, 0.1);
}

.bg-info-light {
  background-color: rgba(33, 150, 243, 0.1);
}

.text-success {
  color: #4caf50;
}

.text-info {
  color: #2196f3;
}

h3 {
  letter-spacing: 0.3px;
}
</style>
