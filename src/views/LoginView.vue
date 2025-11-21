<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ResponseError } from '@/api'
import { useNotifierStore } from '@/stores/notifierStore'
import { useI18n } from 'vue-i18n'
import { userApi } from '@/api'
import type { LoginUser200ResponseResponseObject } from '@/api'

const { t } = useI18n()

const router = useRouter()
const userStore = useUserStore()
const notifierStore = useNotifierStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)

// Check if username starts with "kiosk" for kiosk mode
const isKioskMode = computed(() => {
  return username.value.trim().startsWith('kiosk')
})

// Computed: check if form is ready to submit
const canSubmit = computed(() => {
  // For kiosk mode, only username is required
  if (isKioskMode.value) {
    return username.value.trim() !== ''
  }
  // For normal mode, both fields are required
  return username.value.trim() !== '' && password.value.trim() !== ''
})


const login = async () => {
  if (!username.value) {
    notifierStore.notify('Please enter a username.', 'error')
    return
  }

  // Check if kiosk mode
  if (isKioskMode.value) {
    // Kiosk login (passwordless)
    isLoading.value = true
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:40001'}/user/kiosk-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username: username.value }),
      })
      
      const data = await response.json()
      
      if (data.responseObject && data.success && data.statusCode === 200) {
        userStore.setSession({
          username: username.value,
          department: data.responseObject.department,
          belongsToCenter: data.responseObject.belongsToCenter,
          email: data.responseObject.email || '',
          roles: data.responseObject.roles || [],
          postopWeek: data.responseObject.postopWeek
        })
        notifierStore.notify('Kiosk login successful!', 'success')
        router.push('/kiosk')
      } else {
        notifierStore.notify(data.message || 'Kiosk login failed', 'error')
      }
    } catch (error: unknown) {
      console.error('Kiosk login error:', error)
      notifierStore.notify('An error occurred during kiosk login.', 'error')
    } finally {
      isLoading.value = false
    }
  } else {
    // Normal login with password
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
          roles: (response.responseObject as LoginUser200ResponseResponseObject & { roles?: string[] }).roles || []
        })
        notifierStore.notify(t('login.loginSuccessfull'), 'success')
        const redirect = router.currentRoute.value.query.redirect as string | undefined
        if (redirect) {
          router.push(redirect)
        } else {
          router.push('/dashboard')
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
}
onMounted(() => {
  if (userStore.isAuthenticated()) {
    // Let the router guard redirect based on user role
    if (userStore.isKioskUser()) {
      router.push('/kiosk')
    } else {
      router.push('/dashboard')
    }
  }
})
</script>

<template>
  <v-container class="login-view">
    <v-card>
      <v-card-title>{{ t('login.title') }}</v-card-title>
      <v-card-text>
        <!-- Kiosk mode indicator -->
        <v-alert v-if="isKioskMode" type="info" variant="tonal" class="mb-4" density="compact">
          <v-icon icon="mdi-monitor-dashboard" class="mr-2"></v-icon>
          Kiosk Mode - No password required
        </v-alert>
        
        <v-form @submit.prevent="login">
          <v-text-field v-model="username" :label="t('login.username')" outlined dense required
                        autocomplete="username" autofocus
                        hint="Enter username starting with 'kiosk' for kiosk mode"></v-text-field>
          <v-text-field v-if="!isKioskMode" v-model="password" :label="t('login.password')" type="password" outlined dense
                        required autocomplete="current-password"></v-text-field>
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
                  {{ isKioskMode ? 'Kiosk Login' : t('login.loginButton') }}
                </v-btn>
              </template>
              <span>{{ isKioskMode ? 'Enter kiosk username' : t('login.fillFields') }}</span>
            </v-tooltip>

            <template v-else>
              <v-btn
                     class="mt-4 login-button"
                     :class="{ active: canSubmit }"
                     :loading="isLoading"
                     color="primary"
                     type="submit">
                {{ isKioskMode ? 'Kiosk Login' : t('login.loginButton') }}
              </v-btn>
            </template>
          </div>
          <div class="text-center mt-2 text-caption text-grey" v-if="!canSubmit">{{ isKioskMode ? 'Enter kiosk username' : t('login.fillFields') }}</div>
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
