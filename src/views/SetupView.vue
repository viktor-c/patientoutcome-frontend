<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotifierStore } from '@/stores/notifierStore'

const router = useRouter()
const notifierStore = useNotifierStore()

// API base URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
  department: 'Administration',
  belongsToCenter: ['1']
})

// Seeding options
const seedOptions = ref({
  seedAll: false,
  seedUsers: false,
  seedPatients: false,
  seedBlueprints: false,
  seedForms: false
})

// Database stats
const dbStats = ref<Record<string, number>>({})

// Form validation
const formValid = ref(false)
const passwordRules = [
  (v: string) => !!v || 'Password is required',
  (v: string) => v.length >= 8 || 'Password must be at least 8 characters',
  (v: string) => /[A-Z]/.test(v) || 'Must contain uppercase letter',
  (v: string) => /[a-z]/.test(v) || 'Must contain lowercase letter',
  (v: string) => /\d/.test(v) || 'Must contain a number',
  (v: string) => /[@$!%*?&#]/.test(v) || 'Must contain special character (@$!%*?&#)'
]

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
    const response = await fetch(`${API_URL}/setup/status`, {
      credentials: 'include'
    })
    const data = await response.json()
    
    if (data.success && data.responseObject) {
      setupRequired.value = data.responseObject.setupRequired
      hasAdminUser.value = data.responseObject.hasAdminUser
      hasAnyUsers.value = data.responseObject.hasAnyUsers
      databaseConnected.value = data.responseObject.databaseConnected
      
      // If setup is not required, redirect to login
      if (!data.responseObject.setupRequired) {
        router.push('/')
      }
    }
    
    // Also get database stats
    await fetchDatabaseStats()
  } catch (error) {
    console.error('Failed to check setup status:', error)
    notifierStore.notify('Failed to connect to server', 'error')
  } finally {
    isLoading.value = false
  }
}

async function fetchDatabaseStats() {
  try {
    const response = await fetch(`${API_URL}/setup/stats`, {
      credentials: 'include'
    })
    const data = await response.json()
    if (data.success && data.responseObject) {
      dbStats.value = data.responseObject
    }
  } catch (error) {
    console.error('Failed to fetch database stats:', error)
  }
}

async function createAdmin() {
  if (!canProceed.value) return
  
  isLoading.value = true
  try {
    const response = await fetch(`${API_URL}/setup/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        username: adminForm.value.username,
        password: adminForm.value.password,
        name: adminForm.value.name,
        email: adminForm.value.email,
        department: adminForm.value.department,
        belongsToCenter: adminForm.value.belongsToCenter
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      notifierStore.notify('Admin user created successfully!', 'success')
      hasAdminUser.value = true
      hasAnyUsers.value = true
      currentStep.value = 3
      // Don't call checkSetupStatus here - it would redirect to login
      // Just update the database stats
      await fetchDatabaseStats()
    } else {
      notifierStore.notify(data.message || 'Failed to create admin user', 'error')
    }
  } catch (error) {
    console.error('Failed to create admin:', error)
    notifierStore.notify('Failed to create admin user', 'error')
  } finally {
    isLoading.value = false
  }
}

async function seedDemoData() {
  isLoading.value = true
  try {
    const response = await fetch(`${API_URL}/setup/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(seedOptions.value)
    })
    
    const data = await response.json()
    
    if (data.success) {
      notifierStore.notify('Demo data seeded successfully!', 'success')
      await fetchDatabaseStats()
      dataSeeded.value = true
    } else {
      notifierStore.notify(data.message || 'Failed to seed demo data', 'info')
    }
  } catch (error) {
    console.error('Failed to seed data:', error)
    notifierStore.notify('Failed to seed demo data', 'error')
  } finally {
    isLoading.value = false
  }
}

function finishSetup() {
  router.push('/')
}

// Check if user has selected seed options but hasn't seeded yet
const hasSeedOptionsSelected = computed(() => {
  return seedOptions.value.seedAll || 
         seedOptions.value.seedUsers || 
         seedOptions.value.seedPatients || 
         seedOptions.value.seedBlueprints || 
         seedOptions.value.seedForms
})

// Confirmation dialog state
const showSeedConfirmDialog = ref(false)
const dataSeeded = ref(false)

function handleStep3Continue() {
  // If user selected seed options but hasn't seeded, show confirmation
  if (hasSeedOptionsSelected.value && !dataSeeded.value) {
    showSeedConfirmDialog.value = true
  } else {
    nextStep()
  }
}

async function confirmSeedAndContinue() {
  showSeedConfirmDialog.value = false
  await seedDemoData()
  nextStep()
}

function skipSeedAndContinue() {
  showSeedConfirmDialog.value = false
  nextStep()
}

function nextStep() {
  if (canProceed.value && currentStep.value < 4) {
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
              <v-card-title class="text-h4 text-center py-6 primary white--text" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <v-icon size="48" class="mr-3" color="white">mdi-cog-outline</v-icon>
                <span class="text-white">PatientOutcome Setup</span>
              </v-card-title>
              
              <!-- Loading state -->
              <template v-if="isLoading">
                <v-card-text class="text-center py-12">
                  <v-progress-circular indeterminate size="64" color="primary" />
                  <div class="mt-4 text-h6">Checking system status...</div>
                </v-card-text>
              </template>
              
              <!-- Setup wizard -->
              <template v-else>
                <!-- Stepper -->
                <v-stepper v-model="currentStep" alt-labels class="elevation-0">
                  <v-stepper-header>
                    <v-stepper-item :complete="currentStep > 1" :value="1" title="Connection" />
                    <v-divider />
                    <v-stepper-item :complete="currentStep > 2" :value="2" title="Admin User" />
                    <v-divider />
                    <v-stepper-item :complete="currentStep > 3" :value="3" title="Demo Data" />
                    <v-divider />
                    <v-stepper-item :value="4" title="Complete" />
                  </v-stepper-header>
                  
                  <v-stepper-window>
                    <!-- Step 1: Connection Status -->
                    <v-stepper-window-item :value="1">
                      <v-card-text class="px-6 py-4">
                        <h3 class="text-h5 mb-4">System Status</h3>
                        
                        <v-list>
                          <v-list-item>
                            <template #prepend>
                              <v-icon :color="databaseConnected ? 'success' : 'error'">
                                {{ databaseConnected ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                              </v-icon>
                            </template>
                            <v-list-item-title>Database Connection</v-list-item-title>
                            <v-list-item-subtitle>
                              {{ databaseConnected ? 'Connected to MongoDB' : 'Not connected' }}
                            </v-list-item-subtitle>
                          </v-list-item>
                          
                          <v-list-item>
                            <template #prepend>
                              <v-icon :color="hasAdminUser ? 'success' : 'warning'">
                                {{ hasAdminUser ? 'mdi-check-circle' : 'mdi-account-alert' }}
                              </v-icon>
                            </template>
                            <v-list-item-title>Admin User</v-list-item-title>
                            <v-list-item-subtitle>
                              {{ hasAdminUser ? 'Admin user exists' : 'No admin user - setup required' }}
                            </v-list-item-subtitle>
                          </v-list-item>
                          
                          <v-list-item>
                            <template #prepend>
                              <v-icon color="info">mdi-information</v-icon>
                            </template>
                            <v-list-item-title>Users in Database</v-list-item-title>
                            <v-list-item-subtitle>
                              {{ dbStats.users || 0 }} users
                            </v-list-item-subtitle>
                          </v-list-item>
                        </v-list>
                        
                        <v-alert v-if="!databaseConnected" type="error" variant="tonal" class="mt-4">
                          Cannot connect to the database. Please check your server configuration.
                        </v-alert>
                        
                        <v-alert v-else-if="setupRequired" type="info" variant="tonal" class="mt-4">
                          <v-alert-title>Initial Setup Required</v-alert-title>
                          This appears to be a fresh installation. Please create an admin user to continue.
                        </v-alert>
                      </v-card-text>
                    </v-stepper-window-item>
                    
                    <!-- Step 2: Create Admin User -->
                    <v-stepper-window-item :value="2">
                      <v-card-text class="px-6 py-4">
                        <h3 class="text-h5 mb-4">Create Admin User</h3>
                        <p class="text-body-2 mb-4">Create the first administrator account for the system.</p>
                        
                        <v-form v-model="formValid">
                          <v-row>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="adminForm.username"
                                label="Username"
                                prepend-inner-icon="mdi-account"
                                :rules="[(v: string) => !!v || 'Username is required', (v: string) => v.length >= 3 || 'Min 3 characters']"
                                variant="outlined"
                                required
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="adminForm.name"
                                label="Full Name"
                                prepend-inner-icon="mdi-badge-account"
                                :rules="[(v: string) => !!v || 'Name is required']"
                                variant="outlined"
                                required
                              />
                            </v-col>
                            <v-col cols="12">
                              <v-text-field
                                v-model="adminForm.email"
                                label="Email"
                                type="email"
                                prepend-inner-icon="mdi-email"
                                :rules="[(v: string) => !!v || 'Email is required', (v: string) => /.+@.+\..+/.test(v) || 'Invalid email']"
                                variant="outlined"
                                required
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="adminForm.password"
                                label="Password"
                                type="password"
                                prepend-inner-icon="mdi-lock"
                                :rules="passwordRules"
                                variant="outlined"
                                required
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="adminForm.confirmPassword"
                                label="Confirm Password"
                                type="password"
                                prepend-inner-icon="mdi-lock-check"
                                :rules="[(v: string) => !!v || 'Please confirm password', () => passwordsMatch || 'Passwords do not match']"
                                variant="outlined"
                                required
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="adminForm.department"
                                label="Department"
                                prepend-inner-icon="mdi-domain"
                                variant="outlined"
                              />
                            </v-col>
                            <v-col cols="12" md="6">
                              <v-text-field
                                v-model="adminForm.belongsToCenter[0]"
                                label="Center ID"
                                prepend-inner-icon="mdi-hospital-building"
                                variant="outlined"
                              />
                            </v-col>
                          </v-row>
                        </v-form>
                        
                        <v-alert type="info" variant="tonal" density="compact" class="mt-2">
                          <strong>Password Requirements:</strong> Minimum 8 characters with uppercase, lowercase, number, and special character.
                        </v-alert>
                      </v-card-text>
                    </v-stepper-window-item>
                    
                    <!-- Step 3: Seed Demo Data -->
                    <v-stepper-window-item :value="3">
                      <v-card-text class="px-6 py-4">
                        <h3 class="text-h5 mb-4">Demo Data (Optional)</h3>
                        <p class="text-body-2 mb-4">
                          Would you like to populate the database with demo data? This is useful for testing and demonstration purposes.
                        </p>
                        
                        <v-alert type="warning" variant="tonal" class="mb-4">
                          <v-alert-title>Warning</v-alert-title>
                          Seeding demo data will reset existing data in the selected categories. Use with caution in production.
                        </v-alert>
                        
                        <v-card variant="outlined" class="mb-4">
                          <v-card-text>
                            <v-switch
                              v-model="seedOptions.seedAll"
                              label="Seed All Demo Data"
                              color="primary"
                              hide-details
                              class="mb-2"
                            />
                            
                            <v-divider class="my-3" />
                            
                            <div class="text-subtitle-2 mb-2">Or select specific data:</div>
                            
                            <v-switch
                              v-model="seedOptions.seedUsers"
                              label="Demo Users (doctors, nurses, students)"
                              color="secondary"
                              hide-details
                              :disabled="seedOptions.seedAll"
                              density="compact"
                            />
                            <v-switch
                              v-model="seedOptions.seedPatients"
                              label="Demo Patients"
                              color="secondary"
                              hide-details
                              :disabled="seedOptions.seedAll"
                              density="compact"
                            />
                            <v-switch
                              v-model="seedOptions.seedBlueprints"
                              label="Form Templates & Blueprints"
                              color="secondary"
                              hide-details
                              :disabled="seedOptions.seedAll"
                              density="compact"
                            />
                            <v-switch
                              v-model="seedOptions.seedForms"
                              label="Demo Forms & Consultations"
                              color="secondary"
                              hide-details
                              :disabled="seedOptions.seedAll"
                              density="compact"
                            />
                          </v-card-text>
                        </v-card>
                        
                        <v-btn
                          color="secondary"
                          variant="outlined"
                          :loading="isLoading"
                          :disabled="!seedOptions.seedAll && !seedOptions.seedUsers && !seedOptions.seedPatients && !seedOptions.seedBlueprints && !seedOptions.seedForms"
                          @click="seedDemoData"
                        >
                          <v-icon start>mdi-database-plus</v-icon>
                          Seed Selected Data
                        </v-btn>
                        
                        <!-- Current database stats -->
                        <v-card variant="outlined" class="mt-4">
                          <v-card-title class="text-subtitle-1">Current Database Status</v-card-title>
                          <v-card-text>
                            <v-chip-group>
                              <v-chip v-for="(count, collection) in dbStats" :key="collection" size="small" variant="tonal">
                                {{ collection }}: {{ count }}
                              </v-chip>
                            </v-chip-group>
                          </v-card-text>
                        </v-card>
                      </v-card-text>
                    </v-stepper-window-item>
                    
                    <!-- Step 4: Complete -->
                    <v-stepper-window-item :value="4">
                      <v-card-text class="text-center px-6 py-8">
                        <v-icon size="96" color="success" class="mb-4">mdi-check-circle</v-icon>
                        <h3 class="text-h4 mb-4">Setup Complete!</h3>
                        <p class="text-body-1 mb-6">
                          Your PatientOutcome system is now configured and ready to use.
                        </p>
                        
                        <v-alert type="success" variant="tonal" class="mb-4 text-left">
                          <v-alert-title>Next Steps</v-alert-title>
                          <ul class="mt-2">
                            <li>Login with your new admin account</li>
                            <li>Configure additional users as needed</li>
                            <li>Set up form templates and blueprints</li>
                            <li>Start managing patient outcomes!</li>
                          </ul>
                        </v-alert>
                        
                        <v-btn
                          color="primary"
                          size="large"
                          @click="finishSetup"
                        >
                          <v-icon start>mdi-login</v-icon>
                          Go to Login
                        </v-btn>
                      </v-card-text>
                    </v-stepper-window-item>
                  </v-stepper-window>
                </v-stepper>
                
                <!-- Navigation buttons -->
                <v-card-actions class="pa-4">
                  <v-btn
                    v-if="currentStep > 1 && currentStep < 4"
                    variant="text"
                    @click="prevStep"
                  >
                    <v-icon start>mdi-chevron-left</v-icon>
                    Back
                  </v-btn>
                  
                  <v-spacer />
                  
                  <v-btn
                    v-if="currentStep === 1"
                    color="primary"
                    :disabled="!canProceed"
                    @click="nextStep"
                  >
                    Continue
                    <v-icon end>mdi-chevron-right</v-icon>
                  </v-btn>
                  
                  <v-btn
                    v-if="currentStep === 2"
                    color="primary"
                    :disabled="!canProceed"
                    :loading="isLoading"
                    @click="createAdmin"
                  >
                    Create Admin & Continue
                    <v-icon end>mdi-chevron-right</v-icon>
                  </v-btn>
                  
                  <v-btn
                    v-if="currentStep === 3"
                    color="primary"
                    @click="handleStep3Continue"
                  >
                    {{ hasSeedOptionsSelected && !dataSeeded ? 'Continue' : 'Skip & Continue' }}
                    <v-icon end>mdi-chevron-right</v-icon>
                  </v-btn>
                </v-card-actions>
              </template>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
      
      <!-- Seed Confirmation Dialog -->
      <v-dialog v-model="showSeedConfirmDialog" max-width="500" persistent>
        <v-card>
          <v-card-title class="text-h5">
            <v-icon color="warning" class="mr-2">mdi-database-alert</v-icon>
            Seed Demo Data?
          </v-card-title>
          <v-card-text>
            <p>You have selected demo data options but haven't seeded the data yet.</p>
            <p class="mt-2">Would you like to seed the demo data now, or skip and continue without seeding?</p>
          </v-card-text>
          <v-card-actions>
            <v-btn
              variant="text"
              @click="skipSeedAndContinue"
            >
              Skip (Don't Seed)
            </v-btn>
            <v-spacer />
            <v-btn
              color="primary"
              variant="elevated"
              :loading="isLoading"
              @click="confirmSeedAndContinue"
            >
              <v-icon start>mdi-database-plus</v-icon>
              Seed Data & Continue
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-main>
  </v-app>
</template>

<style scoped>
.text-white {
  color: white !important;
}
</style>
