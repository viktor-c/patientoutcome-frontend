<template>
  <v-container class="about pa-6">
    <v-row justify="center">
      <v-col cols="12" lg="10" xl="8">
        <!-- Header Section -->
        <v-card class="pa-6 mb-6" elevation="4">
          <v-card-title class="text-h3 mb-4 text-center">
            {{ t('about.title') }}
          </v-card-title>

          <v-card-subtitle class="text-h5 mb-4 text-center text-primary">
            {{ t('about.description') }}
          </v-card-subtitle>

          <v-card-text class="text-body-1 text-center mb-6">
            {{ t('about.subtitle') }}
          </v-card-text>
        </v-card>

        <!-- Technologies Section -->
        <v-card class="pa-6 mb-6" elevation="4">
          <v-card-title class="text-h4 mb-6">
            {{ t('about.technologies.title') }}
          </v-card-title>

          <v-row>
            <!-- Frontend Technologies -->
            <v-col cols="12" md="6">
              <v-card-subtitle class="text-h6 mb-3">
                {{ t('about.technologies.frontend') }}
              </v-card-subtitle>
              <v-list dense>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="primary" class="me-2">mdi-vuejs</v-icon>
                      <a href="https://vuejs.org/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.vue') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="primary" class="me-2">mdi-material-design</v-icon>
                      <a href="https://vuetifyjs.com/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.vuetify') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="primary" class="me-2">mdi-language-typescript</v-icon>
                      <a href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.typescript') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="primary" class="me-2">mdi-store</v-icon>
                      <a href="https://pinia.vuejs.org/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.pinia') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="primary" class="me-2">mdi-translate</v-icon>
                      <a href="https://vue-i18n.intlify.dev/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.vuei18n') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="primary" class="me-2">mdi-chart-line</v-icon>
                      <a href="https://www.chartjs.org/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.chartjs') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-col>

            <!-- Backend Technologies -->
            <v-col cols="12" md="6">
              <v-card-subtitle class="text-h6 mb-3">
                {{ t('about.technologies.backend') }}
              </v-card-subtitle>
              <v-list dense>
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="success" class="me-2">mdi-nodejs</v-icon>
                      <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.nodejs') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="success" class="me-2">mdi-language-typescript</v-icon>
                      <a href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.typescript') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="success" class="me-2">mdi-database</v-icon>
                      <a href="https://www.mongodb.com/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.mongodb') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="success" class="me-2">mdi-api</v-icon>
                      <a href="https://swagger.io/specification/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.openapi') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="success" class="me-2">mdi-shield-check</v-icon>
                      <a href="https://zod.dev/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.zod') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>

                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title>
                      <v-icon color="success" class="me-2">mdi-docker</v-icon>
                      <a href="https://www.docker.com/" target="_blank" rel="noopener noreferrer">
                        {{ t('about.tech.docker') }}
                      </a>
                    </v-list-item-title>
                  </v-list-item-content>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card>

        <!-- Source Code & Resources -->
        <v-card class="pa-6 mb-6" elevation="4">
          <v-card-title class="text-h4 mb-4">
            {{ t('about.sourceCode.title') }}
          </v-card-title>

          <v-row>
            <v-col cols="12" md="4">
              <v-card
                href="https://github.com/viktor-c/patientoutcome-frontend"
                target="_blank"
                rel="noopener noreferrer"
                class="pa-4 text-center"
                elevation="2"
                hover
              >
                <v-icon size="48" color="primary" class="mb-2">mdi-github</v-icon>
                <div class="text-h6">{{ t('about.sourceCode.frontendRepo') }}</div>
                <v-icon class="mt-2">mdi-open-in-new</v-icon>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card
                href="https://github.com/viktor-c/patientoutcome-backend"
                target="_blank"
                rel="noopener noreferrer"
                class="pa-4 text-center"
                elevation="2"
                hover
              >
                <v-icon size="48" color="success" class="mb-2">mdi-server</v-icon>
                <div class="text-h6">{{ t('about.sourceCode.backendRepo') }}</div>
                <v-icon class="mt-2">mdi-open-in-new</v-icon>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                class="pa-4 text-center"
                elevation="2"
                hover
              >
                <v-icon size="48" color="warning" class="mb-2">mdi-license</v-icon>
                <div class="text-h6">{{ t('about.sourceCode.mitLicense') }}</div>
                <v-icon class="mt-2">mdi-open-in-new</v-icon>
              </v-card>
            </v-col>
          </v-row>
        </v-card>

        <!-- License Section -->
        <v-card class="pa-6 mb-6" elevation="4">
          <v-card-title class="text-h4 mb-4">
            {{ t('about.license.title') }}
          </v-card-title>

          <v-card-subtitle class="text-h5 mb-3">
            {{ t('about.license.mit') }}
          </v-card-subtitle>

          <v-card-text class="text-body-1 mb-4">
            {{ t('about.license.description') }}
          </v-card-text>

          <v-card-text class="text-body-1">
            {{ t('about.license.requirement') }}
          </v-card-text>
        </v-card>

        <!-- Help Improve Section -->
        <v-card class="pa-6 mb-6" elevation="4">
          <v-card-title class="text-h4 mb-4">
            {{ t('about.helpImprove.title') }}
          </v-card-title>

          <v-card-text class="text-body-1 mb-4">
            {{ t('about.helpImprove.description') }}
          </v-card-text>

          <v-card-text class="text-body-1 mb-6">
            {{ t('about.helpImprove.foundBug') }}
          </v-card-text>

          <v-row justify="center">
            <v-col cols="auto">
              <v-btn
                href="https://github.com/viktor-c/patientoutcome-frontend/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
                size="large"
                prepend-icon="mdi-bug"
              >
                {{ t('about.helpImprove.reportIssue') }}
              </v-btn>
            </v-col>

            <v-col cols="auto" class="text-center pt-2">
              {{ t('about.helpImprove.or') }}
            </v-col>

            <v-col cols="auto">
              <v-btn
                href="/feedback"
                color="secondary"
                size="large"
                prepend-icon="mdi-message"
              >
                {{ t('about.helpImprove.contactUs') }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card>

        <!-- Documentation & Presentations (keeping existing content) -->
        <v-card class="pa-6 mb-6" elevation="4">
          <v-card-title class="text-h4 mb-4">
            Documentation & Presentations
          </v-card-title>

          <v-card-text class="text-body-1 mb-6">
            This system manages patient outcomes through structured consultations and form-based data collection.
            Below you can find detailed documentation and presentations about the system.
          </v-card-text>

          <v-list>
            <v-list-item
              href="/gffc-presentation/index.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <v-list-item-content>
                <v-list-item-title><v-icon>mdi-presentation</v-icon> Main Presentation</v-list-item-title>
                <v-list-item-subtitle>Overview of the system architecture and features</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>

            <v-list-item
              href="/gffc-presentation/implementation-summary.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <v-list-item-content>
                <v-list-item-title><v-icon>mdi-code-braces</v-icon>Implementation Summary</v-list-item-title>
                <v-list-item-subtitle>Technical details and implementation notes</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>

            <v-list-item
              href="/gffc-presentation/cost-analysis.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <v-list-item-content>
                <v-list-item-title><v-icon>mdi-calculator</v-icon>Cost Analysis</v-list-item-title>
                <v-list-item-subtitle>Development costs and resource breakdown</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>

        <!-- Footer -->
        <v-row justify="center">
          <v-col cols="auto">
            <div class="text-center">
              <div class="text-caption mb-2">{{ t('about.version') }}</div>
              <div class="text-caption">{{ t('footer.copyright', { year: new Date().getFullYear() }) }}</div>
              <v-btn
                variant="text"
                size="small"
                href="/"
                class="mt-2"
                prepend-icon="mdi-home"
              >
                {{ t('feedback.backToHome') }}
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.about {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

@media (max-width: 1023px) {
  .about {
    min-height: auto;
    padding-top: 2rem;
    padding-bottom: 2rem;
  }
}

a {
  text-decoration: none;
  color: inherit;
}

a:hover {
  text-decoration: underline;
}
</style>
