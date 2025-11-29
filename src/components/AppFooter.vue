<template>
  <v-footer app height="44" class="app-footer" color="primary" dark>
    <v-container fluid class="pa-0 px-4">
      <v-row align="center" justify="center" no-gutters>
        <v-col cols="12" md="4" class="text-center text-md-start">
          <span class="footer-copyright">
            {{ t('footer.copyright', { year: currentYear }) }}
          </span>
        </v-col>

        <v-col cols="12" md="4" class="text-center my-1 my-md-0">
          <div class="footer-links">
            <router-link :to="{ name: 'about' }" class="footer-link">
              {{ t('footer.about') }}
            </router-link>
            <span class="footer-separator">|</span>
            <router-link :to="{ name: 'feedback' }" class="footer-link">
              <v-icon size="small" class="mr-1">mdi-email-outline</v-icon>
              {{ t('footer.contact') }}
            </router-link>
          </div>
        </v-col>

        <v-col cols="12" md="4" class="text-center text-md-end">
          <span class="footer-version">v{{ appVersion }}</span>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const currentYear = computed(() => new Date().getFullYear())

// You can read this from package.json or env variable if needed
const appVersion = computed(() => import.meta.env.VITE_APP_VERSION || '1.0.0')
</script>

<style scoped>
.app-footer {
  padding: 4px 0;
  margin-top: auto;
  min-height: 44px;
}

.footer-copyright {
  font-size: 0.75rem;
  opacity: 0.9;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.footer-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  transition: opacity 0.15s;
}

.footer-link:hover {
  opacity: 1;
  text-decoration: underline;
}

.footer-separator {
  opacity: 0.5;
}

.footer-version {
  font-size: 0.65rem;
  opacity: 0.75;
}

@media (max-width: 960px) {

  .footer-copyright,
  .footer-version {
    display: block;
    margin: 2px 0;
  }

  .gffc-logo {
    height: 28px;
  }
}
</style>
