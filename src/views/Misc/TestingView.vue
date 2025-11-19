<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotifierStore } from '@/stores/notifierStore'

const { t } = useI18n()
const notifierStore = useNotifierStore()

notifierStore.info('This is a testing view. Use the links below to seed data or navigate to different parts of the application.')

// Sample data for demonstration
const samplePatientId = '6771d9d410ede2552b7bba40'
const sampleCaseId = '60d5ec49f1b2c12d88f1e8b2'
const sampleConsultationId = '60d5ec49f1b2c12d88f1e8a1'
const sampleFormId = 'form123'
const sampleExternalCode = 'XOL70'

// Route categories for the sitemap
const routeCategories = ref([
  {
    name: t('testing.sitemap.authentication'),
    icon: 'mdi-account-key',
    color: 'blue',
    routes: [
      {
        name: 'Login',
        path: '/',
        description: 'Main login page',
        requiresAuth: false,
        hasParams: false,
        kioskOnly: false
      },
      {
        name: 'Register',
        path: '/register',
        description: 'User registration',
        requiresAuth: false,
        hasParams: false,
        kioskOnly: false
      },
      {
        name: 'Logout',
        path: '/logout',
        description: 'User logout',
        requiresAuth: true,
        hasParams: false,
        kioskOnly: false
      }
    ]
  },
  {
    name: t('testing.sitemap.patientManagement'),
    icon: 'mdi-account-group',
    color: 'green',
    routes: [
      {
        name: 'Dashboard',
        path: '/dashboard',
        description: 'Main dashboard with overview',
        requiresAuth: true,
        hasParams: false,
        kioskOnly: false
      },
      {
        name: 'Patients',
        enabled: false,
        path: '/patients',
        description: 'Patient management and search',
        requiresAuth: true,
        hasParams: false,
        kioskOnly: false
      },
      {
        name: 'Patient Overview',
        path: `/patient-overview/${samplePatientId}`,
        description: 'Detailed patient overview',
        requiresAuth: true,
        hasParams: true,
        exampleParam: samplePatientId,
        kioskOnly: false
      },
      {
        name: 'Patient Cases',
        path: `/cases/patient/${samplePatientId}`,
        description: 'Cases for a specific patient',
        requiresAuth: true,
        hasParams: true,
        exampleParam: samplePatientId,
        kioskOnly: false
      },
      {
        name: 'Creation Flow',
        path: '/creation-flow',
        description: 'Patient and case creation workflow',
        requiresAuth: true,
        hasParams: false,
        kioskOnly: false
      },
      {
        name: 'Patient Flow',
        path: '/flow/',
        description: 'Begin patient flow process',
        requiresAuth: true,
        hasParams: false,
        kioskOnly: false
      }
    ]
  },
  {
    name: t('testing.sitemap.consultations'),
    icon: 'mdi-calendar-multiple',
    color: 'purple',
    routes: [
      {
        name: 'Consultation',
        path: `/consultation/patient/${samplePatientId}/case/${sampleCaseId}/consultation/${sampleConsultationId}`,
        description: 'Specific consultation view',
        requiresAuth: true,
        hasParams: true,
        exampleParam: `${samplePatientId}/${sampleCaseId}/${sampleConsultationId}`,
        kioskOnly: false
      },
      {
        name: 'Consultation Overview',
        path: `/consultation-overview/${sampleConsultationId}`,
        description: 'Consultation overview and details',
        requiresAuth: true,
        hasParams: true,
        exampleParam: sampleConsultationId,
        kioskOnly: false
      }
    ]
  },
  {
    name: t('testing.sitemap.forms'),
    icon: 'mdi-form-select',
    color: 'orange',
    routes: [
      {
        name: 'Form View',
        path: `/formview/consultation/${sampleConsultationId}`,
        description: 'Form viewing interface',
        requiresAuth: true,
        hasParams: true,
        exampleParam: sampleConsultationId,
        kioskOnly: false
      },
      {
        name: 'Review Form',
        path: `/review-form/${sampleFormId}`,
        description: 'Review form answers (see Form View above for patient perspective)',
        requiresAuth: true,
        hasParams: true,
        exampleParam: sampleFormId,
        kioskOnly: false
      },
      {
        name: 'Consultation Forms (External)',
        path: `/consultation/forms/external-code/${sampleExternalCode}`,
        description: 'Forms via external code',
        requiresAuth: false,
        hasParams: true,
        exampleParam: sampleExternalCode,
        kioskOnly: false
      },
      {
        name: 'Consultation Forms (Internal)',
        path: `/consultation/forms/consultation/${sampleConsultationId}`,
        description: 'Forms via consultation ID',
        requiresAuth: true,
        hasParams: true,
        exampleParam: sampleConsultationId,
        kioskOnly: false
      }
    ]
  },
  {
    name: t('testing.sitemap.kioskMode'),
    icon: 'mdi-tablet',
    color: 'teal',
    routes: [
      {
        name: 'Kiosk',
        path: '/kiosk',
        description: 'Kiosk mode interface',
        requiresAuth: true,
        hasParams: false,
        kioskOnly: true
      },
      {
        name: 'Kiosk Form',
        path: `/kiosk/form/${sampleFormId}`,
        description: 'Kiosk form interface',
        requiresAuth: true,
        hasParams: true,
        exampleParam: sampleFormId,
        kioskOnly: true
      }
    ]
  },
  {
    name: t('testing.sitemap.system'),
    icon: 'mdi-cog',
    color: 'grey',
    routes: [
      {
        name: 'About',
        path: '/about',
        description: 'About page',
        requiresAuth: false,
        hasParams: false,
        kioskOnly: false
      },
      {
        name: 'Testing',
        path: '/testing',
        description: 'This testing page',
        requiresAuth: true,
        hasParams: false,
        kioskOnly: false
      },
      {
        name: 'MOXFQ Test',
        path: '/moxfq-test',
        description: 'MOXFQ form JSON data development page',
        requiresAuth: true,
        hasParams: false,
        kioskOnly: false
      },
      {
        name: '404 Not Found',
        path: '/nonexistent-page',
        description: 'Error page for invalid routes',
        requiresAuth: false,
        hasParams: false,
        kioskOnly: false
      }
    ]
  }
])

const backendSeedingEndpoints = ref([
  { name: 'Patients', url: 'http://localhost:40001/seed/patients' },
  { name: 'Cases', url: 'http://localhost:40001/seed/patientCase' },
  { name: 'Consultations', url: 'http://localhost:40001/seed/consultation' },
  { name: 'Form Templates', url: 'http://localhost:40001/seed/formTemplate' },
  { name: 'Forms', url: 'http://localhost:40001/seed/forms' },
  { name: 'Users', url: 'http://localhost:40001/seed/users' },
  { name: 'Clinical Studies', url: 'http://localhost:40001/seed/clinicalStudy' },
  { name: 'Form Access Codes', url: 'http://localhost:40001/seed/form-access-codes' },
  { name: 'User Registration Codes', url: 'http://localhost:40001/seed/user-registration-codes' },
  { name: 'Reset All', url: 'http://localhost:40001/seed/reset-all' },
  { name: 'Clear All Sessions', url: 'http://localhost:40001/seed/clear-all-sessions' }
])
</script>
<template>
  <v-container class="testing-view" fluid>
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <v-card class="mb-6">
          <v-card-title class="text-h4 d-flex align-center">
            <v-icon class="me-3" color="primary">mdi-test-tube</v-icon>
            {{ t('testing.title') }}
          </v-card-title>
          <v-card-subtitle>
            {{ t('testing.sitemap.description') }}
          </v-card-subtitle>
        </v-card>
      </v-col>
    </v-row>

    <!-- Frontend Sitemap -->
    <v-row>
      <v-col cols="12">
        <v-card class="mb-6">
          <v-card-title class="text-h5 d-flex align-center">
            <v-icon class="me-2" color="primary">mdi-sitemap</v-icon>
            {{ t('testing.sitemap.title') }}
          </v-card-title>

          <v-card-text>
            <v-row>
              <v-col
                     v-for="category in routeCategories"
                     :key="category.name"
                     cols="12"
                     md="6"
                     lg="4">

                <v-card
                        variant="outlined"
                        class="h-100"
                        :class="`border-${category.color}`">

                  <v-card-title class="text-h6 d-flex align-center">
                    <v-icon
                            :color="category.color"
                            class="me-2"
                            size="24">
                      {{ category.icon }}
                    </v-icon>
                    {{ category.name }}
                  </v-card-title>

                  <v-card-text class="pa-0">
                    <v-list density="compact">
                      <v-list-item
                                   v-for="route in category.routes"
                                   :key="route.name"
                                   class="px-4">

                        <template #prepend>
                          <v-icon
                                  size="16"
                                  :color="route.requiresAuth ? 'orange' : 'green'">
                            {{ route.requiresAuth ? 'mdi-lock' : 'mdi-lock-open' }}
                          </v-icon>
                        </template>

                        <v-list-item-title class="text-body-2">
                          <router-link
                                       :to="route.path"
                                       :class="route.enabled === false ? 'disabled' : ''">
                            <strong>{{ route.name }}</strong>
                          </router-link>
                        </v-list-item-title>

                        <v-list-item-subtitle class="text-caption">
                          {{ route.description }}
                          <v-chip
                                  v-if="route.hasParams"
                                  size="x-small"
                                  color="info"
                                  class="ms-1">
                            {{ t('testing.sitemap.requiresParam') }}
                          </v-chip>
                          <v-chip
                                  v-if="route.kioskOnly"
                                  size="x-small"
                                  color="teal"
                                  class="ms-1">
                            Kiosk
                          </v-chip>
                        </v-list-item-subtitle>

                        <template #append v-if="route.hasParams">
                          <v-tooltip location="top">
                            <template #activator="{ props }">
                              <v-icon
                                      v-bind="props"
                                      size="16"
                                      color="grey">
                                mdi-information
                              </v-icon>
                            </template>
                            <span>{{ t('testing.sitemap.exampleParam') }}: {{ route.exampleParam }}</span>
                          </v-tooltip>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Legacy Testing Links -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mb-6">
          <v-card-title class="text-h6 d-flex align-center">
            <v-icon class="me-2" color="primary">mdi-web</v-icon>
            Frontend Quick Links
          </v-card-title>

          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <router-link to="/dashboard" class="text-decoration-none">
                  <v-btn variant="text" color="primary" size="small">
                    Dashboard
                  </v-btn>
                </router-link>
              </v-list-item>

              <v-list-item>
                <router-link to="/patients" class="text-decoration-none">
                  <v-btn variant="text" color="primary" size="small">
                    Patients
                  </v-btn>
                </router-link>
              </v-list-item>

              <v-list-item>
                <router-link :to="`/cases/patient/${samplePatientId}`" class="text-decoration-none">
                  <v-btn variant="text" color="primary" size="small">
                    Cases ({{ samplePatientId }})
                  </v-btn>
                </router-link>
              </v-list-item>

              <v-list-item>
                <a :href="`http://localhost:5173/consultation/forms/external-code/${sampleExternalCode}`"
                   target="_blank"
                   class="text-decoration-none">
                  <v-btn variant="text" color="primary" size="small">
                    Form by External Code ({{ sampleExternalCode }})
                    <v-icon class="ms-1" size="16">mdi-open-in-new</v-icon>
                  </v-btn>
                </a>
              </v-list-item>

              <v-list-item>
                <a :href="`http://localhost:5173/consultation/forms/consultation/${sampleConsultationId}`"
                   target="_blank"
                   class="text-decoration-none">
                  <v-btn variant="text" color="primary" size="small">
                    Form by Consultation ID
                    <v-icon class="ms-1" size="16">mdi-open-in-new</v-icon>
                  </v-btn>
                </a>
              </v-list-item>

              <v-list-item>
                <router-link to="/flow/" class="text-decoration-none">
                  <v-btn variant="text" color="primary" size="small">
                    Patient Flow
                  </v-btn>
                </router-link>
              </v-list-item>

              <v-list-item>
                <router-link to="/moxfq-test" class="text-decoration-none">
                  <v-btn variant="text" color="secondary" size="small">
                    MOXFQ Test Form
                    <v-icon class="ms-1" size="16">mdi-form-select</v-icon>
                  </v-btn>
                </router-link>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Backend Seeding -->
      <v-col cols="12" md="6">
        <v-card class="mb-6">
          <v-card-title class="text-h6 d-flex align-center">
            <v-icon class="me-2" color="secondary">mdi-database</v-icon>
            {{ t('testing.sitemap.backendSeeding') }}
          </v-card-title>

          <v-card-text>
            <v-list density="compact">
              <v-list-item
                           v-for="endpoint in backendSeedingEndpoints"
                           :key="endpoint.name">
                <a
                   :href="endpoint.url"
                   target="_blank"
                   class="text-decoration-none">
                  <v-btn
                         variant="outlined"
                         color="secondary"
                         size="small"
                         class="mb-1">
                    Seed {{ endpoint.name }}
                    <v-icon class="ms-1" size="16">mdi-open-in-new</v-icon>
                  </v-btn>
                </a>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Route Information Legend -->
    <v-row>
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-title class="text-h6">
            <v-icon class="me-2">mdi-information</v-icon>
            Legend
          </v-card-title>

          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <div class="d-flex align-center mb-2">
                  <v-icon color="green" size="16" class="me-2">mdi-lock-open</v-icon>
                  <span class="text-body-2">Public Access</span>
                </div>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <div class="d-flex align-center mb-2">
                  <v-icon color="orange" size="16" class="me-2">mdi-lock</v-icon>
                  <span class="text-body-2">Requires Authentication</span>
                </div>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <div class="d-flex align-center mb-2">
                  <v-chip size="x-small" color="info" class="me-2">Param</v-chip>
                  <span class="text-body-2">{{ t('testing.sitemap.requiresParam') }}</span>
                </div>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <div class="d-flex align-center mb-2">
                  <v-chip size="x-small" color="teal" class="me-2">Kiosk</v-chip>
                  <span class="text-body-2">Kiosk Mode Only</span>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<style scoped>
.disabled {
  text-decoration: line-through;
  opacity: 0.5;
}

.testing-view {
  padding: 20px;
  left: auto;
}
</style>
