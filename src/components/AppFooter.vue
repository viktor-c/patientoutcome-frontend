<template>
  <v-footer 
    app 
    height="44" 
    class="app-footer" 
    :class="{ 'footer-visible': isAtBottom }"
    color="primary" 
    dark
  >
    <v-container fluid class="pa-0 px-4">
      <v-row align="center" justify="space-between" no-gutters>
        <v-col cols="auto" md="4" class="text-start">
          <router-link :to="{ name: 'about' }" class="footer-copyright-link">
            <span class="d-none d-md-inline">{{ t('footer.copyright', { year: currentYear }) }}</span>
            <span class="d-md-none">© {{ currentYear }}</span>
          </router-link>
        </v-col>

        <v-col cols="auto" md="4" class="text-center">
          <div class="footer-links">
            <router-link :to="{ name: 'about' }" class="footer-link">
              <v-icon size="small" class="d-md-none">mdi-information-outline</v-icon>
              <span class="d-none d-md-inline">{{ t('footer.about') }}</span>
            </router-link>
            <span class="footer-separator">|</span>
            <router-link :to="{ name: 'feedback' }" class="footer-link">
              <v-icon size="small" class="mr-md-1">mdi-email-outline</v-icon>
              <span class="d-none d-md-inline">{{ t('footer.contact') }}</span>
            </router-link>
          </div>
        </v-col>

        <v-col cols="auto" md="4" class="text-end">
          <span class="footer-version">v{{ appVersion }}</span>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const currentYear = computed(() => new Date().getFullYear())

// You can read this from package.json or env variable if needed
const appVersion = computed(() => import.meta.env.VITE_APP_VERSION || '1.0.0')

// Track if user is at bottom of page
const isAtBottom = ref(false)

const checkScrollPosition = () => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const scrollHeight = document.documentElement.scrollHeight
  const clientHeight = document.documentElement.clientHeight
  
  // Show footer when within 100px of bottom or when page is not scrollable
  const threshold = 100
  isAtBottom.value = scrollHeight <= clientHeight || (scrollTop + clientHeight >= scrollHeight - threshold)
}

onMounted(() => {
  window.addEventListener('scroll', checkScrollPosition)
  window.addEventListener('resize', checkScrollPosition)
  // Check initial position
  checkScrollPosition()
})

onUnmounted(() => {
  window.removeEventListener('scroll', checkScrollPosition)
  window.removeEventListener('resize', checkScrollPosition)
})
</script>

<style scoped>
.app-footer {
  padding: 4px 0;
  margin-top: auto;
  min-height: 44px;
  transform: translateY(100%);
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.app-footer.footer-visible {
  transform: translateY(0);
  opacity: 1;
}

.footer-copyright-link {
  font-size: 0.75rem;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  transition: opacity 0.15s;
}

.footer-copyright-link:hover {
  opacity: 1;
  text-decoration: underline;
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

@media (max-width: 600px) {
  .footer-copyright-link {
    font-size: 0.7rem;
  }

  .footer-version {
    font-size: 0.55rem;
  }

  .footer-link {
    font-size: 0.65rem;
  }
}
</style>
