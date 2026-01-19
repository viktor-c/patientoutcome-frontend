<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifierStore } from '@/stores/notifierStore'
import { useI18n } from 'vue-i18n'
import { setupApi } from '@/api'
import { logger } from '@/services/logger'

const router = useRouter()
const notifierStore = useNotifierStore()
const { t, locale } = useI18n()

// Language options
const languages = [
  { title: 'English', value: 'en' },
  { title: 'Deutsch', value: 'de' }
]

function changeLanguage(lang: string) {
  locale.value = lang
  localStorage.setItem('locale', lang)
}

// Setup state
const isLoading = ref(true)
const setupRequired = ref(false)
const hasAdminUser = ref(false)
const hasAnyUsers = ref(false)
const databaseConnected = ref(false)
const currentStep = ref(1)

// Admin form data
const adminForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  email: '',
  department: 'Fußchirurgie',
  departmentShortName: 'Fußchirurgie',
  departmentDescription: 'Fußchirurgie Klinikum Fulda',
  centerName: 'Klinikum Fulda',
  centerShortName: 'KliFulda',
  centerDescription: 'Klinikum Fulda - Main Medical Center',
  belongsToCenter: ['1']
})

// Starter data options
const seedStarterData = ref(false)
const seedingStarterData = ref(false)

// Database stats
const dbStats = ref<Record<string, number>>({})

// Form validation
const formValid = ref(false)
const passwordRules = computed(() => [
  (v: string) => !!v || t('setup.step2.validation.passwordRequired'),
  (v: string) => v.length >= 8 || t('setup.step2.validation.passwordMin'),
  (v: string) => /[A-Z]/.test(v) || t('setup.step2.validation.passwordUppercase'),
  (v: string) => /[a-z]/.test(v) || t('setup.step2.validation.passwordLowercase'),
  (v: string) => /\d/.test(v) || t('setup.step2.validation.passwordNumber'),
  (v: string) => /[@$!%*?&#]/.test(v) || t('setup.step2.validation.passwordSpecial')
])

const passwordsMatch = computed(() => {
  return adminForm.value.password === adminForm.value.confirmPassword
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return databaseConnected.value
  }
  if (currentStep.value === 2) {
    return (
      adminForm.value.username.length >= 3 &&
      adminForm.value.password.length >= 8 &&
      passwordsMatch.value &&
      adminForm.value.name.length >= 2 &&
      adminForm.value.email.includes('@')
    )
  }
  return true
})

// Check setup status on mount
onMounted(async () => {
  await checkSetupStatus()
})

async function checkSetupStatus() {
  isLoading.value = true
  try {
    const response = await setupApi.getSetupStatus()

    if (response.success && response.responseObject) {
      setupRequired.value = response.responseObject.setupRequired
      hasAdminUser.value = response.responseObject.hasAdminUser
      hasAnyUsers.value = response.responseObject.hasAnyUsers
      databaseConnected.value = response.responseObject.databaseConnected

      // If setup is not required, redirect to login
      if (!response.responseObject.setupRequired) {
        router.push('/')
      }
    }

    // Also get database stats
    await fetchDatabaseStats()
  } catch (error) {
    console.error('Failed to check setup status:', error)
    notifierStore.notify(t('setup.notifications.serverError'), 'error')
  } finally {
    isLoading.value = false
  }
}

async function fetchDatabaseStats() {
  try {
    const response = await setupApi.getSetupDatabaseStats()
    if (response.success && response.responseObject) {
      dbStats.value = response.responseObject
    }
  } catch (error) {
    logger.error('Failed to check setup status', error)
  }
}

async function createAdmin() {
  if (!canProceed.value) return

  isLoading.value = true
  try {
    const response = await setupApi.createAdminUser({
      createAdminUserRequest: {
        username: adminForm.value.username,
        password: adminForm.value.password,
        name: adminForm.value.name,
        email: adminForm.value.email,
        department: adminForm.value.department,
        departmentShortName: adminForm.value.departmentShortName,
        departmentDescription: adminForm.value.departmentDescription,
        centerName: adminForm.value.centerName,
        centerShortName: adminForm.value.centerShortName,
        centerDescription: adminForm.value.centerDescription,
        belongsToCenter: adminForm.value.belongsToCenter
      } as any // Cast to any until API types are regenerated
    })

    if (response.success) {
      notifierStore.notify(t('setup.notifications.adminCreated'), 'success')
      hasAdminUser.value = true
      hasAnyUsers.value = true
      currentStep.value = 3
      // Don't call checkSetupStatus here - it would redirect to login
      // Just update the database stats
      await fetchDatabaseStats()
    } else {
      notifierStore.notify(response.message || t('setup.notifications.adminCreateFailed'), 'error')
    }
  } catch (error) {
    console.error('Failed to create admin:', error)
    notifierStore.notify(t('setup.notifications.adminCreateFailed'), 'error')
  } finally {
    isLoading.value = false
  }
}

async function seedStarter() {
  seedingStarterData.value = true
  try {
    const response = await setupApi.seedStarterData()
    
    if (response.success) {
      notifierStore.notify(t('setup.step4.starterDataSeeded'), 'success')
      await fetchDatabaseStats()
    } else {
      notifierStore.notify(response.message || t('setup.step4.starterDataFailed'), 'error')
    }
  } catch (error) {
    console.error('Failed to seed starter data:', error)
    notifierStore.notify(t('setup.step4.starterDataFailed'), 'error')
  } finally {
    seedingStarterData.value = false
  }
}

function finishSetup() {
  router.push('/')
}

function nextStep() {
  if (canProceed.value && currentStep.value < 3) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <v-row justify="center" align="center">
          <v-col cols="12" sm="10" md="8" lg="6">
            <v-card elevation="12" class="rounded-lg">
              <!-- Language selector in top right -->
              <div class="d-flex justify-end pa-2" style="position: absolute; top: 0; right: 0; z-index: 1;">
                <v-menu>
                  <template #activator="{ props }">
                    <v-btn
                           v-bind="props"
                           variant="text"
                           size="small"
                           class="text-white">
                      <v-icon start>mdi-translate</v-icon>
                      {{ locale === 'de' ? 'DE' : 'EN' }}
                      <v-icon end>mdi-chevron-down</v-icon>
                    </v-btn>
                  </template>
                  <v-list density="compact">
                    <v-list-item
                                 v-for="lang in languages"
                                 :key="lang.value"
                                 :active="locale === lang.value"
                                 @click="changeLanguage(lang.value)">
                      <v-list-item-title>{{ lang.title }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>

              <v-card-title class="text-h4 text-center py-6 primary white--text"
                            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: relative;">
                <v-icon size="48" class="mr-3" color="white">mdi-cog-outline</v-icon>
                <span class="text-white">{{ t('setup.title') }}</span>
              </v-card-title>

              <!-- Loading state -->
              <template v-if="isLoading">
                <v-card-text class="text-center py-12">
                  <v-progress-circular indeterminate size="64" color="primary" />
                  <div class="mt-4 text-h6">{{ t('setup.checkingStatus') }}</div>
                </v-card-text>
              </template>

              <!-- Setup wizard -->
              <template v-else>
                <!-- Stepper -->
                <v-stepper v-model="currentStep" alt-labels class="elevation-0">
                  <v-stepper-header>
                    <v-stepper-item :complete="currentStep > 1" :value="1" :title="t('setup.steps.connection')" />
                    <v-divider />
                    <v-stepper-item :complete="currentStep > 2" :value="2" :title="t('setup.steps.adminUser')" />
                    <v-divider />
                    <v-stepper-item :value="3" :title="t('setup.steps.complete')" />
                  </v-stepper-header>

                  <v-stepper-window>
                    <!-- Step 1: Connection Status -->
                    <v-stepper-window-item :value="1">
                      <v-card-text class="px-6 py-4">
                        <h3 class="text-h5 mb-4">{{ t('setup.step1.title') }}</h3>

                        <v-list>
                          <v-list-item>
                            <template #prepend>
                              <v-icon :color="databaseConnected ? 'success' : 'error'">
                                {{ databaseConnected ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                              </v-icon>
                            </template>
                            <v-list-item-title>{{ t('setup.step1.databaseConnection') }}</v-list-item-title>
                            <v-list-item-subtitle>
                              {{ databaseConnected ? t('setup.step1.connectedToMongoDB') : t('setup.step1.notConnected')
                              }}
                            </v-list-item-subtitle>
                          </v-list-item>

                          <v-list-item>
                            <template #prepend>
                              <v-icon :color="hasAdminUser ? 'success' : 'warning'">
                                {{ hasAdminUser ? 'mdi-check-circle' : 'mdi-account-alert' }}
                              </v-icon>
                            </template>
                            <v-list-item-title>{{ t('setup.step1.adminUser') }}</v-list-item-title>
                            <v-list-item-subtitle>
                              {{ hasAdminUser ? t('setup.step1.adminExists') : t('setup.step1.noAdminSetupRequired') }}
                            </v-list-item-subtitle>
                          </v-list-item>

                          <v-list-item>
                            <template #prepend>
                              <v-icon color="info">mdi-information</v-icon>
                            </template>
                            <v-list-item-title>{{ t('setup.step1.usersInDatabase') }}</v-list-item-title>
                            <v-list-item-subtitle>
                              {{ t('setup.step1.usersCount', { count: dbStats.users || 0 }) }}
                            </v-list-item-subtitle>
                          </v-list-item>
                        </v-list>

                        <v-alert v-if="!databaseConnected" type="error" variant="tonal" class="mt-4">
                          {{ t('setup.step1.databaseError') }}
                        </v-alert>

                        <v-alert v-else-if="setupRequired" type="info" variant="tonal" class="mt-4">
                          <v-alert-title>{{ t('setup.step1.setupRequired') }}</v-alert-title>
                          {{ t('setup.step1.setupRequiredDescription') }}
                        </v-alert>
                      </v-card-text>
                    </v-stepper-window-item>

                    <!-- Step 2: Create Admin User -->
                    <v-stepper-window-item :value="2">
                      <v-card-text class="px-6 py-4">
                        <h3 class="text-h5 mb-4">{{ t('setup.step2.title') }}</h3>
                        <p class="text-body-2 mb-4">{{ t('setup.step2.description') }}</p>

                        <v-form v-model="formValid" @submit.prevent="createAdmin"
                                @keyup.enter="canProceed && createAdmin()">
                          <v-row>
                            <v-col cols="12" md="6">
                              <v-text-field
                                            v-model="adminForm.username"
                                            :label="t('setup.step2.username')"
                                            prepend-inner-icon="mdi-account"
                                            :rules="[(v: string) => !!v || t('setup.step2.validation.usernameRequired'), (v: string) => v.length >= 3 || t('setup.step2.validation.usernameMin')]"
                                            variant="outlined"
                                            required />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                            v-model="adminForm.name"
                                            :label="t('setup.step2.fullName')"
                                            prepend-inner-icon="mdi-badge-account"
                                            :rules="[(v: string) => !!v || t('setup.step2.validation.nameRequired')]"
                                            variant="outlined"
                                            required />
                            </v-col>
                            <v-col cols="12">
                              <v-text-field
                                            v-model="adminForm.email"
                                            :label="t('setup.step2.email')"
                                            type="email"
                                            prepend-inner-icon="mdi-email"
                                            :rules="[(v: string) => !!v || t('setup.step2.validation.emailRequired'), (v: string) => /.+@.+\..+/.test(v) || t('setup.step2.validation.emailInvalid')]"
                                            variant="outlined"
                                            required />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                            v-model="adminForm.password"
                                            :label="t('setup.step2.password')"
                                            type="password"
                                            prepend-inner-icon="mdi-lock"
                                            :rules="passwordRules"
                                            variant="outlined"
                                            required />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                            v-model="adminForm.confirmPassword"
                                            :label="t('setup.step2.confirmPassword')"
                                            type="password"
                                            prepend-inner-icon="mdi-lock-check"
                                            :rules="[(v: string) => !!v || t('setup.step2.validation.confirmRequired'), () => passwordsMatch || t('setup.step2.validation.passwordMismatch')]"
                                            variant="outlined"
                                            required
                                            @keyup.enter="canProceed && createAdmin()" />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                            v-model="adminForm.department"
                                            :label="t('setup.step2.department')"
                                            prepend-inner-icon="mdi-domain"
                                            variant="outlined" />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                            v-model="adminForm.departmentShortName"
                                            :label="t('setup.step2.departmentShortName')"
                                            prepend-inner-icon="mdi-text-short"
                                            :hint="t('setup.step2.departmentShortNameHint')"
                                            persistent-hint
                                            maxlength="20"
                                            variant="outlined" />
                            </v-col>
                            <v-col cols="12">
                              <v-text-field
                                            v-model="adminForm.departmentDescription"
                                            :label="t('setup.step2.departmentDescription')"
                                            prepend-inner-icon="mdi-text-box"
                                            :hint="t('setup.step2.departmentDescriptionHint')"
                                            persistent-hint
                                            maxlength="500"
                                            variant="outlined" />
                            </v-col>
                            
                            <!-- Center Information -->
                            <v-col cols="12">
                              <v-divider class="my-2" />
                              <p class="text-subtitle-2 mt-4 mb-2">{{ t('setup.step2.centerInformation') || 'Center Information' }}</p>
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                            v-model="adminForm.centerName"
                                            :label="t('setup.step2.centerName') || 'Center Name'"
                                            prepend-inner-icon="mdi-hospital-building"
                                            variant="outlined" />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                            v-model="adminForm.centerShortName"
                                            :label="t('setup.step2.centerShortName') || 'Center Short Name'"
                                            prepend-inner-icon="mdi-text-short"
                                            :hint="t('setup.step2.centerShortNameHint') || 'Short abbreviation for the center'"
                                            persistent-hint
                                            maxlength="20"
                                            variant="outlined" />
                            </v-col>
                            <v-col cols="12">
                              <v-text-field
                                            v-model="adminForm.centerDescription"
                                            :label="t('setup.step2.centerDescription') || 'Center Description'"
                                            prepend-inner-icon="mdi-text-box"
                                            :hint="t('setup.step2.centerDescriptionHint') || 'Description of the medical center'"
                                            persistent-hint
                                            maxlength="500"
                                            variant="outlined" />
                            </v-col>
                          </v-row>
                        </v-form>

                        <v-alert type="info" variant="tonal" density="compact" class="mt-2">
                          <strong>{{ t('setup.step2.passwordRequirements') }}</strong> {{
                            t('setup.step2.passwordRequirementsText') }}
                        </v-alert>
                      </v-card-text>
                    </v-stepper-window-item>

                    <!-- Step 3: Complete -->
                    <v-stepper-window-item :value="3">
                      <v-card-text class="text-center px-6 py-8">
                        <v-icon size="96" color="success" class="mb-4">mdi-check-circle</v-icon>
                        <h3 class="text-h4 mb-4">{{ t('setup.step4.title') }}</h3>
                        <p class="text-body-1 mb-6">
                          {{ t('setup.step4.description') }}
                        </p>

                        <!-- Starter Data Section -->
                        <v-card class="mb-6 text-left" variant="outlined">
                          <v-card-title class="d-flex align-center">
                            <v-icon class="mr-2" color="primary">mdi-package-variant</v-icon>
                            {{ t('setup.step4.starterDataTitle') }}
                          </v-card-title>
                          <v-card-text>
                            <p class="text-body-2 mb-3">{{ t('setup.step4.starterDataDescription') }}</p>
                            <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                              {{ t('setup.step4.starterDataInfo') }}
                            </v-alert>
                            <v-btn
                              color="primary"
                              variant="outlined"
                              :loading="seedingStarterData"
                              @click="seedStarter"
                              block
                            >
                              <v-icon start>mdi-database-plus</v-icon>
                              {{ t('setup.step4.seedStarterData') }}
                            </v-btn>
                          </v-card-text>
                        </v-card>

                        <v-alert type="success" variant="tonal" class="mb-4 text-left">
                          <v-alert-title>{{ t('setup.step4.nextSteps') }}</v-alert-title>
                          <ul class="mt-2">
                            <li>{{ t('setup.step4.nextStep1') }}</li>
                            <li>{{ t('setup.step4.nextStep2') }}</li>
                            <li>{{ t('setup.step4.nextStep3') }}</li>
                            <li>{{ t('setup.step4.nextStep4') }}</li>
                          </ul>
                        </v-alert>

                        <v-btn
                               color="primary"
                               size="large"
                               @click="finishSetup">
                          <v-icon start>mdi-login</v-icon>
                          {{ t('setup.step4.goToLogin') }}
                        </v-btn>
                      </v-card-text>
                    </v-stepper-window-item>
                  </v-stepper-window>
                </v-stepper>

                <!-- Navigation buttons -->
                <v-card-actions class="pa-4">
                  <v-btn
                         v-if="currentStep > 1 && currentStep < 3"
                         variant="text"
                         @click="prevStep">
                    <v-icon start>mdi-chevron-left</v-icon>
                    {{ t('setup.buttons.back') }}
                  </v-btn>

                  <v-spacer />

                  <v-btn
                         v-if="currentStep === 1"
                         color="primary"
                         :disabled="!canProceed"
                         @click="nextStep">
                    {{ t('setup.buttons.continue') }}
                    <v-icon end>mdi-chevron-right</v-icon>
                  </v-btn>

                  <v-btn
                         v-if="currentStep === 2"
                         color="primary"
                         :disabled="!canProceed"
                         :loading="isLoading"
                         @click="createAdmin">
                    {{ t('setup.buttons.createAdminContinue') }}
                    <v-icon end>mdi-chevron-right</v-icon>
                  </v-btn>
                </v-card-actions>
              </template>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.text-white {
  color: white !important;
}
</style>