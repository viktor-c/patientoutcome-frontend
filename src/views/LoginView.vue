<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ResponseError } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { useI18n } from 'vue-i18n'
import { userApi, setupApi } from '@/api'

const { t } = useI18n()

const router = useRouter()
const userStore = useUserStore()
const notifierStore = useNotifierStore()

// Prefill the username with `kiosk` so kiosk mode is ready on page load
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const checkingSetup = ref(true)

// Check if initial setup is required or user is already authenticated
onMounted(async () => {
  // First check if user is already authenticated
  if (userStore.isAuthenticated()) {
    // Redirect based on role
    if (userStore.isKioskUser()) {
      router.push('/kiosk')
    } else {
      router.push('/dashboard')
    }
    return
  }

  // Then check setup status
  await checkSetupStatus()
})

async function checkSetupStatus() {
  checkingSetup.value = true
  try {
    const response = await setupApi.getSetupStatus()
    if (response.success && response.responseObject?.setupRequired) {
      // Redirect to setup wizard
      router.push('/setup')
      return
    }
  } catch (error) {
    // If we can't check setup status, continue to login
    console.error('Failed to check setup status:', error)
  } finally {
    checkingSetup.value = false
  }
}

// Computed: check if form is ready to submit
const canSubmit = computed(() => {
  return username.value.trim() !== '' && password.value.trim() !== ''
})

const login = async () => {
  if (!username.value) {
    notifierStore.notify('Please enter a username.', 'error')
    return
  }

  if (!password.value) {
    notifierStore.notify('Please fill in both username and password.', 'error')
    return
  }

  isLoading.value = true
  try {
    const response = await userApi.loginUser({ loginUserRequest: { username: username.value, password: password.value } })
    if (response.responseObject && response.success && response.statusCode == 200) {
      userStore.setSession({
        username: username.value,
        department: response.responseObject.department,
        belongsToCenter: response.responseObject.belongsToCenter,
        email: response.responseObject.email || '',
        roles: response.responseObject.roles || []
      })
      notifierStore.notify(t('login.loginSuccessfull'), 'success')

      // Redirect based on user role
      if (userStore.isKioskUser()) {
        router.push('/kiosk')
      } else {
        const redirect = router.currentRoute.value.query.redirect as string | undefined
        if (redirect) {
          router.push(redirect)
        } else {
          router.push('/dashboard')
        }
      }
    } else {
      notifierStore.notify('Invalid username or password.', 'error')
    }
  } catch (error: unknown) {
    let errorMessage = 'An unexpected error occurred'
    if (error instanceof ResponseError) {
      errorMessage = (await error.response.json()).message
    }
    console.error('Login error:', errorMessage)
    notifierStore.notify('An error occurred during login.', errorMessage === 'Invalid credentials' ? 'error' : 'info')
  } finally {
    isLoading.value = false
  }
}

</script>

<template>
  <v-container class="login-view">
    <!-- Loading state while checking setup -->
    <v-card v-if="checkingSetup" class="text-center py-8">
      <v-card-text>
        <v-progress-circular indeterminate color="primary" size="48" />
        <div class="mt-4">Checking system status...</div>
      </v-card-text>
    </v-card>

    <!-- Login form -->
    <v-card v-else>
      <v-card-title>{{ t('login.title') }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="login">
          <v-text-field v-model="username" :label="t('login.username')" outlined dense required
                        autocomplete="username" autofocus></v-text-field>
          <v-text-field
            v-model="password"
            :label="t('login.password')"
            :type="showPassword ? 'text' : 'password'"
            outlined
            dense
            required
            autocomplete="current-password"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
          ></v-text-field>
          <div class="d-flex justify-center">
            <v-tooltip v-if="!canSubmit" location="top">
              <template #activator="{ props }">
                <v-btn
                       v-bind="props"
                       class="mt-4 login-button"
                       :class="{ active: canSubmit }"
                       :loading="isLoading"
                       color="primary"
                       type="submit"
                       :disabled="!canSubmit">
                  {{ t('login.loginButton') }}
                </v-btn>
              </template>
              <span>{{ t('login.fillFields') }}</span>
            </v-tooltip>

            <template v-else>
              <v-btn
                     class="mt-4 login-button"
                     :class="{ active: canSubmit }"
                     :loading="isLoading"
                     color="primary"
                     type="submit">
                {{ t('login.loginButton') }}
              </v-btn>
            </template>
          </div>
          <div class="text-center mt-2 text-caption text-grey" v-if="!canSubmit">{{ t('login.fillFields') }}</div>
        </v-form>
        <v-divider class="mt-4"></v-divider>
        <div class="text-center mt-4">
          <RouterLink to="/register">{{ t('login.registerLink') }}</RouterLink>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.login-view {
  max-width: 400px;
  margin: 0 auto;
  padding-top: 50px;
}

/* Login button styling: responsive full-width on small screens and subtle animation when active/focused */
.login-button {
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
  border-radius: 8px;
}

.login-button:focus,
.login-button:focus-visible {
  outline: none;
}

.login-button.active,
.login-button:focus {
  transform: scale(1.03);
  box-shadow: 0 8px 20px rgba(16, 24, 40, 0.12);
}

/* Make the button full width on small screens */
@media (max-width: 600px) {
  .login-button {
    width: 100%;
  }
}

</style>
