<template>
  <v-container class="about-container" max-width="800">
    <v-card class="pa-6">
      <v-card-title class="text-h4 text-center mb-4">
        <v-icon class="mr-2" size="large">mdi-information-outline</v-icon>
        {{ t('about.title') }}
      </v-card-title>

      <v-card-subtitle class="text-center mb-6 text-body-1">
        {{ t('about.subtitle') }}
      </v-card-subtitle>

      <v-card-text>
        <!-- Description -->
        <v-alert type="info" variant="tonal" class="mb-6">
          <p class="mb-0">{{ t('about.description') }}</p>
        </v-alert>

        <!-- Technologies Section -->
        <h3 class="text-h6 mb-4">
          <v-icon class="mr-2">mdi-code-tags</v-icon>
          {{ t('about.technologies.title') }}
        </h3>

        <v-row class="mb-6">
          <!-- Frontend -->
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="h-100">
              <v-card-title class="text-subtitle-1">
                <v-icon class="mr-2" color="green">mdi-vuejs</v-icon>
                {{ t('about.technologies.frontend') }}
              </v-card-title>
              <v-card-text>
                <v-list density="compact" class="bg-transparent">
                  <v-list-item href="https://vuejs.org/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    Vue.js 3 (Composition API)
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://vuetifyjs.com/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    Vuetify 3 (Material Design)
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://www.typescriptlang.org/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    TypeScript
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://pinia.vuejs.org/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    Pinia (State Management)
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://vue-i18n.intlify.dev/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    Vue I18n (Internationalization)
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://www.chartjs.org/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    Chart.js (Data Visualization)
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Backend -->
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="h-100">
              <v-card-title class="text-subtitle-1">
                <v-icon class="mr-2" color="green">mdi-nodejs</v-icon>
                {{ t('about.technologies.backend') }}
              </v-card-title>
              <v-card-text>
                <v-list density="compact" class="bg-transparent">
                  <v-list-item href="https://nodejs.org/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    Node.js / Express
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://www.typescriptlang.org/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    TypeScript
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://www.mongodb.com/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    MongoDB (Database)
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://swagger.io/specification/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    OpenAPI / Swagger
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://zod.dev/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    Zod (Schema Validation)
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                  <v-list-item href="https://www.docker.com/" target="_blank">
                    <template #prepend><v-icon size="small">mdi-check</v-icon></template>
                    Docker (Containerization)
                    <template #append><v-icon size="x-small">mdi-open-in-new</v-icon></template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Links Section -->
        <h3 class="text-h6 mb-4">
          <v-icon class="mr-2">mdi-link-variant</v-icon>
          {{ t('about.links.title') }}
        </h3>

        <v-row class="mb-6">
          <v-col cols="12" sm="6" md="4">
            <v-btn
              href="https://github.com/viktor-2021/patientoutcome-frontend"
              target="_blank"
              variant="outlined"
              block
              class="mb-2"
            >
              <v-icon start>mdi-github</v-icon>
              {{ t('about.links.frontendRepo') }}
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-btn
              href="https://github.com/viktor-2021/patientoutcome-backend"
              target="_blank"
              variant="outlined"
              block
              class="mb-2"
            >
              <v-icon start>mdi-github</v-icon>
              {{ t('about.links.backendRepo') }}
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-btn
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              variant="outlined"
              block
              class="mb-2"
            >
              <v-icon start>mdi-scale-balance</v-icon>
              {{ t('about.links.license') }}
            </v-btn>
          </v-col>
        </v-row>

        <!-- License Section -->
        <h3 class="text-h6 mb-4">
          <v-icon class="mr-2">mdi-license</v-icon>
          {{ t('about.license.title') }}
        </h3>

        <v-alert type="success" variant="tonal" class="mb-4">
          <p class="mb-2"><strong>MIT License</strong></p>
          <p class="text-body-2 mb-0">{{ t('about.license.description') }}</p>
        </v-alert>

        <!-- Version Info -->
        <v-divider class="my-4"></v-divider>
        <div class="text-center text-caption text-grey">
          <p class="mb-1">{{ t('about.version', { version: appVersion }) }}</p>
          <p class="mb-0">{{ t('footer.copyright', { year: currentYear }) }}</p>
        </div>
      </v-card-text>
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
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const currentYear = new Date().getFullYear()
const appVersion = '1.0.0' // Could be imported from package.json
</script>

<style scoped>
.about-container {
  min-height: calc(100vh - 150px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 40px;
  padding-bottom: 40px;
}

.h-100 {
  height: 100%;
}

@media (max-width: 600px) {
  .about-container {
    padding: 16px;
  }
}
</style>
