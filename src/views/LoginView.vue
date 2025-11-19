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

// Computed: are both fields filled?
const canSubmit = computed(() => {
  return username.value.trim() !== '' && password.value.trim() !== ''
})


const login = async () => {
  if (!username.value || !password.value) {
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
        email: response.responseObject.email || '', // Ensure email is set, default to empty string if not provided
        roles: (response.responseObject as LoginUser200ResponseResponseObject & { roles?: string[] }).roles || [] // Will be populated when backend provides roles field
      })
      notifierStore.notify(t('login.loginSuccessfull'), 'success')
      // Redirect to intended route if present, otherwise let router guard decide based on role
      const redirect = router.currentRoute.value.query.redirect as string | undefined
      if (redirect) {
        router.push(redirect)
      } else {
        // Let the router guard redirect based on user role
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
        <v-form @submit.prevent="login">
          <v-text-field v-model="username" :label="t('login.username')" outlined dense required
                        autocomplete="username" autofocus></v-text-field>
          <v-text-field v-model="password" :label="t('login.password')" type="password" outlined dense
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
