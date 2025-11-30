<template>
  <v-container class="feedback-container" max-width="600">
    <v-card class="pa-6">
      <v-card-title class="text-h5 text-center mb-4">
        <v-icon class="mr-2">mdi-message-text-outline</v-icon>
        {{ t('feedback.title') }}
      </v-card-title>

      <v-card-subtitle class="text-center mb-4">
        {{ t('feedback.subtitle') }}
      </v-card-subtitle>

      <v-form ref="formRef" v-model="valid" @submit.prevent="submitFeedback">
        <v-text-field
          v-model="form.name"
          :label="t('feedback.name')"
          :placeholder="t('feedback.namePlaceholder')"
          prepend-inner-icon="mdi-account"
          variant="outlined"
          class="mb-3"
        />

        <v-text-field
          v-model="form.email"
          :label="t('feedback.email')"
          :placeholder="t('feedback.emailPlaceholder')"
          :rules="emailRules"
          prepend-inner-icon="mdi-email"
          type="email"
          variant="outlined"
          class="mb-3"
        />

        <v-textarea
          v-model="form.message"
          :label="t('feedback.message')"
          :placeholder="t('feedback.messagePlaceholder')"
          :rules="messageRules"
          prepend-inner-icon="mdi-text"
          variant="outlined"
          rows="5"
          required
          class="mb-3"
        />

        <!-- Server-side Captcha -->
        <v-card variant="outlined" class="mb-4 pa-4">
          <div class="d-flex align-center justify-space-between">
            <div class="captcha-question">
              <v-icon class="mr-2">mdi-shield-check-outline</v-icon>
              <span v-if="captchaLoading" class="text-body-1">{{ t('feedback.captchaLoading') }}</span>
              <span v-else class="text-body-1">{{ captchaQuestion }} = ?</span>
            </div>
            <v-btn 
              icon
              variant="text"
              size="small"
              :loading="captchaLoading"
              @click="fetchCaptcha"
              :title="t('feedback.refreshCaptcha')"
            >
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </div>
          <v-text-field
            v-model="form.captchaAnswer"
            :label="t('feedback.captchaLabel')"
            :rules="captchaRules"
            variant="outlined"
            type="number"
            class="mt-3"
            density="compact"
            hide-spin-buttons
            :disabled="captchaLoading || !captchaId"
          />
        </v-card>

        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="loading"
          :disabled="!valid || loading || !captchaId"
        >
          <v-icon class="mr-2">mdi-send</v-icon>
          {{ t('feedback.submit') }}
        </v-btn>
      </v-form>

      <v-alert
        v-if="submitSuccess"
        type="success"
        class="mt-4"
        closable
        @click:close="submitSuccess = false"
      >
        {{ t('feedback.successMessage') }}
      </v-alert>

      <v-alert
        v-if="submitError"
        type="error"
        class="mt-4"
        closable
        @click:close="submitError = ''"
      >
        {{ submitError }}
      </v-alert>
    </v-card>

    <div class="text-center mt-4">
      <router-link :to="{ name: 'Login' }" class="text-decoration-none">
        <v-icon class="mr-1">mdi-arrow-left</v-icon>
        {{ t('feedback.backToHome') }}
      </router-link>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { feedbackApi } from '@/api'

const { t, locale } = useI18n()
const router = useRouter()

const formRef = ref()
const valid = ref(false)
const loading = ref(false)
const captchaLoading = ref(false)
const submitSuccess = ref(false)
const submitError = ref('')

const form = reactive({
  name: '',
  email: '',
  message: '',
  captchaAnswer: '',
})

// Server-side captcha state
const captchaId = ref('')
const captchaQuestion = ref('')

const fetchCaptcha = async () => {
  captchaLoading.value = true
  form.captchaAnswer = ''
  
  try {
    const response = await feedbackApi.getCaptcha()
    console.debug('Captcha response:', response)

    // The responseObject directly contains captchaId and question
    // Cast to any to handle the schema mismatch between OpenAPI spec and actual response
    const captchaData = response.responseObject as unknown as { captchaId?: string; question?: string } | undefined
    
    if (response.success && captchaData?.captchaId) {
      captchaId.value = captchaData.captchaId
      captchaQuestion.value = captchaData.question ?? ''
    } else {
      console.error('Failed to fetch captcha:', response.message)
      captchaId.value = ''
      captchaQuestion.value = t('feedback.captchaError')
    }
  } catch (error) {
    console.error('Captcha fetch error:', error)
    captchaId.value = ''
    captchaQuestion.value = t('feedback.captchaError')
  } finally {
    captchaLoading.value = false
  }
}

onMounted(() => {
  fetchCaptcha()
})

// Validation rules
const emailRules = [
  (v: string) => !v || /.+@.+\..+/.test(v) || t('feedback.invalidEmail'),
]

const messageRules = [
  (v: string) => !!v || t('feedback.messageRequired'),
  (v: string) => v.length >= 10 || t('feedback.messageMinLength'),
]

const captchaRules = [
  (v: string) => !!v || t('feedback.captchaRequired'),
]

const submitFeedback = async () => {
  const { valid: isValid } = await formRef.value.validate()
  if (!isValid) return

  loading.value = true
  submitSuccess.value = false
  submitError.value = ''

  try {
    const response = await feedbackApi.submitFeedback({
      submitFeedbackRequest: {
        name: form.name || undefined,
        email: form.email || undefined,
        message: form.message,
        captchaId: captchaId.value,
        captchaAnswer: form.captchaAnswer,
        locale: locale.value,
      },
    })

    if (response.success) {
      submitSuccess.value = true
      // Reset form
      form.name = ''
      form.email = ''
      form.message = ''
      form.captchaAnswer = ''
      formRef.value.reset()
      // Navigate to home page after a short delay to show success message
      setTimeout(() => {
        router.push({ name: 'Login' })
      }, 1500)
    } else {
      submitError.value = response.message || t('feedback.errorMessage')
      // Refresh captcha on error (the old one is invalidated)
      fetchCaptcha()
    }
  } catch (error) {
    console.error('Feedback submission error:', error)
    submitError.value = t('feedback.errorMessage')
    fetchCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.feedback-container {
  min-height: calc(100vh - 150px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 40px;
  padding-bottom: 40px;
}

.captcha-question {
  display: flex;
  align-items: center;
  font-weight: 500;
}

@media (max-width: 600px) {
  .feedback-container {
    padding: 16px;
  }
}
</style>
