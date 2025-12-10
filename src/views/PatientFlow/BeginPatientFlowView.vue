<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ResponseError } from '@/api'
import { codeApi } from '@/api'

const { t } = useI18n()
const router = useRouter()

const patientCode = ref('')
const errorMessage = ref('')
const showGreeting = ref(true) // Controls the visibility of the greeting message
const showInput = ref(false) // Controls the visibility of the input field
const showMessage = ref(false) // Controls the visibility of the success message

// Accept code as a prop from the route
const props = defineProps<{
  code?: string | null
}>()

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
      }
    } catch (error: unknown) {
      let errMessage = 'An unexpected error occurred'
      if (error instanceof ResponseError) {
        errMessage = (await error.response.json()).message
        console.error('Error validating code:', error.response.status, errMessage)
      }
      //TODO do we really have an invalid code? maybe the server is down?
      errorMessage.value = t('flow.invalidCodeMessage')
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
    setTimeout(() => {
      moveToTop.value = true
      setTimeout(() => {
        showH2.value = true
        showInput2.value = true
      }, 100) // Delay for h2 and input to appear after h1 moves
    }, 500) // 2 seconds delay for h1
  }
})
</script>

<template>
  <v-container v-show="!showMessage">
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
  <h1 v-if="showMessage" class="success-message animate__animated animate__fadeInUpBig">
    {{ t('flow.successMessage') }}
  </h1>
</template>

<style scoped>
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
