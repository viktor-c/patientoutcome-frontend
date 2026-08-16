<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ResponseError } from '@/api'
import { codeApi, caseContactApi } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'

const { t, locale } = useI18n()
const router = useRouter()
const notifierStore = useNotifierStore()

const patientCode = ref('')
const errorMessage = ref('')
const showGreeting = ref(true) // Controls the visibility of the greeting message
const showInput = ref(false) // Controls the visibility of the input field
const showMessage = ref(false) // Controls the visibility of the success message
const isArchivedCode = ref(false) // Flag for archived code
const showContactForm = ref(false) // Controls visibility of contact form
const contactMessage = ref('')
const sendingReport = ref(false)

// Captcha state
const captchaId = ref('')
const captchaSvg = ref('')
const captchaAnswer = ref('')
const loadingCaptcha = ref(false)

contactMessage.value = t('flow.archivedCodeMessage') // Initialize contact message
// Accept code as a prop from the route
const props = defineProps<{
  code?: string | null
}>()

const showNormalFlow = () => {
  // errorMessage.value = '' // Clear any validation errors
  setTimeout(() => {
    moveToTop.value = true
    setTimeout(() => {
      showH2.value = true
      showInput2.value = true
    }, 100) // Delay for h2 and input to appear after h1 moves
  }, 500) // Delay for h1
}

const loadCaptcha = async () => {
  loadingCaptcha.value = true
  try {
    const response = await caseContactApi.getCaseContactCaptcha()
    if (response.responseObject) {
      captchaId.value = response.responseObject.captchaId
      captchaSvg.value = response.responseObject.captchaSvg
    }
  } catch (error) {
    console.error('Failed to load captcha:', error)
    errorMessage.value = 'Failed to load captcha'
  } finally {
    loadingCaptcha.value = false
  }
}

const sendContactReport = async () => {
  if (!contactMessage.value.trim()) {
    errorMessage.value = t('flow.yourMessage') + ' is required'
    return
  }

  if (!captchaAnswer.value.trim()) {
    errorMessage.value = 'Please complete the captcha'
    return
  }

  sendingReport.value = true
  errorMessage.value = ''

  try {
    const response = await caseContactApi.submitCaseContactReport({
      submitCaseContactReportRequest: {
        code: patientCode.value,
        message: contactMessage.value,
        captchaId: captchaId.value,
        captchaAnswer: captchaAnswer.value,
        locale: locale.value,
      },
    })

    // Check if the response indicates success
    if (response.success) {
      notifierStore.notify(t('flow.reportSent'), 'success')
      showContactForm.value = false
      contactMessage.value = ''
      captchaAnswer.value = ''

      // Redirect to patient flow without code after 2 seconds
      setTimeout(() => {
        router.push({ name: 'patientflow' })
      }, 2000)
    } else {
      // Response returned but success is false
      errorMessage.value = response.message || t('flow.reportError')
      notifierStore.notify(errorMessage.value, 'error')
      // Reload captcha on error
      await loadCaptcha()
      captchaAnswer.value = ''
    }
  } catch (error: unknown) {
    console.error('Error sending contact report:', error)
    if (error instanceof ResponseError) {
      const errorData = await error.response.json()
      errorMessage.value = errorData.message || t('flow.reportError')
    } else {
      errorMessage.value = t('flow.reportError')
    }
    notifierStore.notify(errorMessage.value, 'error')
    // Reload captcha on error
    await loadCaptcha()
    captchaAnswer.value = ''
  } finally {
    sendingReport.value = false
  }
}

const validateCode = async () => {
  if (patientCode.value.length >= 5) {
    try {
      const isValid = await codeApi.isValidCode({ code: patientCode.value })
      console.debug(`isValidCode response: ${isValid}`)
      if (isValid && isValid.success) {
        // Slide out greeting and input box
        showGreeting.value = false
        showInput.value = false

        // Show success message
        showMessage.value = true

        setTimeout(() => {
          // Slide up success message
          // showMessage.value = false;
          router.push({ name: 'showConsultationForms', params: { externalCode: patientCode.value } })
          console.debug(`Redirecting to showConsultationForms with code: ${patientCode.value}`)
        }, 4000) // Keep success message visible for 2 seconds
      } else {
        errorMessage.value = t('flow.invalidCodeMessage')
        patientCode.value = '' // Clear the input
        showNormalFlow()
      }
    } catch (error: unknown) {
      let errMessage = 'An unexpected error occurred'
      if (error instanceof ResponseError) {
        const statusCode = error.response.status
        const responseData = await error.response.json()
        errMessage = responseData.message

        console.error('Error validating code:', statusCode, errMessage)

        // Handle different error statuses
        if (statusCode === 403) {
          // Archived code - show special UI
          isArchivedCode.value = true
          errorMessage.value = errMessage
          return
        } else if (statusCode === 404 || statusCode === 400 || statusCode === 500) {
          errorMessage.value = errMessage.includes('not currently active')
            ? t('flow.consultationNotActiveMessage')
            : t('flow.invalidCodeMessage')
          patientCode.value = '' // Clear the input to allow re-entry
          showNormalFlow()
        }
      } else {
        errorMessage.value = t('flow.invalidCodeMessage')
        showNormalFlow()
      }
      console.error('Error when validating code:', error)
    }
  } else {
    errorMessage.value = t('flow.codeHint')
  }
}

const moveToTop = ref(false)
const showH2 = ref(false)
const showInput2 = ref(false)

// Handle transitions and auto-validate if code is in URL
onMounted(() => {
  // If code is provided in URL, pre-fill and auto-validate
  if (props.code) {
    patientCode.value = props.code
    setTimeout(() => {
      validateCode()
    }, 500)
  } else {
    // Otherwise show the normal greeting flow
    showNormalFlow()
  }
})
</script>

<template>
  <!-- Archived Code UI -->
  <v-container v-if="isArchivedCode" class="archived-code-container">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card class="pa-6 animate__animated animate__fadeIn">
          <v-card-title class="text-h4 text-center mb-4">
            <v-icon size="large" color="error" class="me-2">mdi-archive-alert</v-icon>
            {{ t('flow.archivedCodeTitle') }}
          </v-card-title>

          <v-card-text>
            <v-alert type="error" variant="tonal" prominent class="mb-6">
              {{ t('flow.archivedCodeMessage') }}
            </v-alert>

            <v-divider class="my-6"></v-divider>

            <!-- Contact Form Section -->
            <div v-if="!showContactForm">
              <p class="text-center mb-4">{{ t('flow.reportIssueDescription') }}</p>
              <v-btn
                color="primary"
                variant="elevated"
                size="large"
                block
                @click="showContactForm = true; loadCaptcha()"
                prepend-icon="mdi-email-alert">
                {{ t('flow.contactPhysician') }}
              </v-btn>
            </div>

            <div v-else>
              <h3 class="text-h6 mb-3">{{ t('flow.reportIssueTitle') }}</h3>

              <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
                <div class="text-caption">
                  <v-icon size="small" class="me-1">mdi-information</v-icon>
                  {{ t('flow.reportIssueNote') }}
                </div>
              </v-alert>

              <v-textarea
                v-model="contactMessage"
                :label="t('flow.yourMessage')"
                rows="4"
                variant="outlined"
                class="mb-4"></v-textarea>

              <!-- Captcha Section -->
              <div class="mb-4">
                <div v-if="loadingCaptcha" class="text-center py-4">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  <p class="text-caption mt-2">Loading captcha...</p>
                </div>
                <div v-else-if="captchaSvg">
                  <div class="captcha-container mb-2" v-html="captchaSvg"></div>
                  <v-text-field
                    v-model="captchaAnswer"
                    label="Enter the code shown above"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    class="mb-2"></v-text-field>
                  <v-btn
                    size="x-small"
                    variant="text"
                    prepend-icon="mdi-refresh"
                    @click="loadCaptcha(); captchaAnswer = ''">
                    New captcha
                  </v-btn>
                </div>
              </div>

              <v-alert v-if="errorMessage" type="error" density="compact" class="mb-4">
                {{ errorMessage }}
              </v-alert>

              <div class="d-flex gap-2">
                <v-btn
                  color="grey"
                  variant="text"
                  @click="showContactForm = false; contactMessage = ''; captchaAnswer = ''; errorMessage = ''">
                  {{ t('buttons.cancel') }}
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn
                  color="primary"
                  variant="elevated"
                  :loading="sendingReport"
                  :disabled="!captchaAnswer || !contactMessage.trim()"
                  @click="sendContactReport"
                  prepend-icon="mdi-send">
                  {{ t('flow.sendReport') }}
                </v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- Normal Flow UI -->
  <v-container v-show="!showMessage && !isArchivedCode">
    <v-row justify="center">
      <v-col cols="12" md="6">
        <h1 class="start animate__animated animate__fadeInUp" :class="{ 'move-to-top': moveToTop }">
          {{ t('flow.greeting') }}
        </h1>
        <h2 v-if="showH2" class="animate__animated animate__fadeInUp"
            :class="{ 'move-to-top-h2': moveToTop, 'start-position-h2': !moveToTop }">
          {{ t('flow.advice') }}
        </h2>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col cols="4">
        <v-text-field
                      v-if="showInput2"
                      v-model="patientCode"
                      class="animate__animated animate__fadeInUp"
                      :label="t('flow.enterPatientCode')"
                      :hint="t('flow.codeHint')"
                      :error-messages="errorMessage"
                      @input="validateCode"
                      clearable></v-text-field>
      </v-col>
    </v-row>
  </v-container>

  <!-- Success Message -->
  <h1 v-if="showMessage" class="success-message animate__animated animate__fadeInUpBig">
    {{ t('flow.successMessage') }}
  </h1>
</template>

<style scoped>
/* Archived code container */
.archived-code-container {
  margin-top: 10vh;
}

/* Transition for sliding up the greeting message, input field, and success message */
.greeting-message {
  text-align: center;
  margin-top: 35vh;
  /* Center the greeting message vertically */
}

.greeting-message-top {
  text-align: center;
  margin-top: 5vh;
  /* Move greeting message to the top */
}

.success-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 75vh;
  /* Full viewport height */
  text-align: center;
  font-size: 2em;
  color: green;
}

.start {
  /* position: absolute; */
  top: 300px;
  left: auto;
  text-align: center;
  font-size: 2em;
  color: #333;
  margin-top: 50px;
}

.start-position-h2 {
  /* position: absolute; */
  top: 300px;
  /* Adjust this value to set the initial position of h2 */
  left: auto;
  text-align: center;
  font-size: 1em;
  color: #666;
  margin-top: 20px;
}

/* Animation for moving h1 to the top */
.move-to-top {
  /* position: absolute; */
  top: 2rem;
  left: auto;
  text-align: center;
  transform: translateX(-50%);
  transition: top 0.5s ease;
}

/* Animation for moving h2 to the top underneath h1 */
.move-to-top-h2 {
  /* position: absolute; */
  margin-top: 1rem;
  top: 2rem;
  /* Adjust to place h2 underneath h1 */
  left: auto;
  text-align: center;
  transform: translateX(-50%);
  transition: top 0.5s ease;
}
</style>
