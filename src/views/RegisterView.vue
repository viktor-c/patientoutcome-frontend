<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title>{{ t('register.title') }}</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="onRegister" ref="formRef">
              <v-text-field v-model="name" :label="t('register.name')" :rules="[rules.required]" required />
              <v-text-field v-model="username" :label="t('register.username')" :rules="[rules.required]" required />
              <v-text-field v-model="email" :label="t('register.email')" :rules="[rules.required, rules.email]"
                            required />
              <v-text-field
                            v-model="password"
                            :label="t('register.password')"
                            :type="showPassword ? 'text' : 'password'"
                            :append-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                            @click:append="showPassword = !showPassword"
                            :rules="[rules.required, rules.min]"
                            required />
              <v-text-field
                            v-model="confirmPassword"
                            :label="t('register.confirmPassword')"
                            :type="showPassword ? 'text' : 'password'"
                            :append-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                            @click:append="showPassword = !showPassword"
                            :rules="[rules.required, rules.match]"
                            required />
              <v-text-field v-model="registerCode" :label="t('register.registerCode')"
                            :rules="[rules.required, rules.codeFormat]" required placeholder="abc-123-xyz" />
              <v-btn type="submit" color="primary" class="mt-4" :loading="loading">
                {{ t('register.submit') }}
              </v-btn>
              <v-btn class="mt-4" color="secondary" @click="router.push({ name: 'Login' })">
                {{ t('register.backToLogin') }}
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ResponseError } from '@/api'
import { userApi } from '@/api'
import type { RegisterUserRequest } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'

const { t } = useI18n()
const router = useRouter()
const notifierStore = useNotifierStore()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const registerCode = ref('')
const email = ref('')
const name = ref('')
const showPassword = ref(false)
const loading = ref(false)
const formRef = ref()

const rules = {
  required: (v: string) => !!v || t('register.required'),
  min: (v: string) => v.length >= 6 || t('register.passwordMin'),
  match: (v: string) => v === password.value || t('register.passwordMatch'),
  codeFormat: (v: string) => /^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}$/.test(v) || t('register.codeFormat'),
  email: (v: string) => /.+@.+\..+/.test(v) || t('register.emailFormat'),
}

const onRegister = async () => {
  if (!formRef.value?.validate()) return
  loading.value = true
  const payload: RegisterUserRequest = {
    username: username.value,
    name: name.value,
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
    registrationCode: registerCode.value,
  }
  try {
    const response = await userApi.registerUser({ registerUserRequest: payload })
    if (response.success) {
      loading.value = false
      router.push({ name: 'Login' })
      notifierStore.notify(t('register.notification'), 'success')
    } else {
      loading.value = false
      console.error('Registration failed:', response.message)
      notifierStore.notify(t('register.error'), 'error')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Registration error:', errorMessage)
    loading.value = false
    notifierStore.notify(t('register.error'), 'error')
  }
}

watch(registerCode, (newVal) => {
  // Remove all non-alphanumeric characters except dashes
  let raw = newVal.replace(/[^a-zA-Z0-9]/g, '')
  // Limit to 9 alphanumeric characters
  raw = raw.slice(0, 9)
  // Insert dashes after 3rd and 7th character
  if (raw.length > 3) raw = raw.slice(0, 3) + '-' + raw.slice(3)
  if (raw.length > 7) raw = raw.slice(0, 7) + '-' + raw.slice(7)
  // Limit to 11 chars (9 + 2 dashes)
  if (raw.length > 11) raw = raw.slice(0, 11)
  // Only update if formatted value differs
  if (registerCode.value !== raw) {
    registerCode.value = raw
  }

  // Auto-submit if all fields are filled and valid
  if (username.value && email.value && password.value && confirmPassword.value && /^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}$/.test(raw) && !loading.value) {
    onRegister()
  }
})
</script>
