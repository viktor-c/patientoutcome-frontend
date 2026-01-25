<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ref, computed } from 'vue'
import LanguageSelector from '@/components/LanguageSelector.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useNotifierStore, useUserStore } from '@/stores/'

import AppAlert from '@/components/AppAlert.vue'
import { EditUserSettingsDialog } from '@/components/dialogs/';

const { locale, t } = useI18n()

const theme = ref('light')
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

// LanguageSelector component handles locales and flags

// Access notifier store
const notifierStore = useNotifierStore()
const userStore = useUserStore()
const router = useRouter()

const showEditUserSettingsKey = ref(0);

const shouldShowNavBar = computed(() => userStore.isAuthenticated() && !userStore.isKioskUser())

// Format time based on locale
function formatDateTime(DateTime: string) {
  return new Intl.DateTimeFormat(locale.value, { timeStyle: 'short' }).format(new Date(DateTime))
}

const showEditUserSettings = ref(false);

const editUserSettings = () => {
  showEditUserSettingsKey.value++;
  // Reset the dialog key to force re-render
  showEditUserSettings.value = true;
}

const logout = async () => {
  await userStore.logout();
  router.push("/");
  notifierStore.notify(t('login.logoutSuccessfull'), 'success')
}

</script>

<template>
  <app-alert />
  <v-app :theme="theme">
    <template v-if="shouldShowNavBar">
      <v-app-bar app color="primary" dark>
        <!-- Hamburger Menu -->
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon v-bind="props" class="mr-2">
              <v-icon>mdi-menu</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item :to="{ name: 'dashboard' }">
              <template #prepend>
                <v-icon>mdi-home</v-icon>
              </template>
              <v-list-item-title>{{ t('common.dashboard') || 'Dashboard' }}</v-list-item-title>
            </v-list-item>
            <v-list-item :to="{ name: 'kioskassignments' }">
              <template #prepend>
                <v-icon>mdi-monitor-dashboard</v-icon>
              </template>
              <v-list-item-title>{{ t('dashboard.kioskAssignments') }}</v-list-item-title>
            </v-list-item>
            <!-- BUG only allow this for GFFC,  -->
            <v-list-item v-if="userStore.hasRole('admin') || userStore.hasRole('doctor')" :to="{ name: 'activitylog' }">
              <template #prepend>
                <v-icon>mdi-text-box-multiple</v-icon>
              </template>
              <v-list-item-title>Activity Log</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="!userStore.isKioskUser()"
                         :to="{ name: 'statistics', params: { caseId: '677da5d8cb4569ad1c65515f' } }">
              <template #prepend>
                <v-icon>mdi-chart-line</v-icon>
              </template>
              <v-list-item-title>GFFC Statistics</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="userStore.hasRole('admin')" :to="{ name: 'admin-users' }">
              <template #prepend>
                <v-icon>mdi-shield-account</v-icon>
              </template>
              <v-list-item-title>Admin Panel</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <!-- Logo and Title -->
        <RouterLink to="/dashboard" class="navbar-brand">
          <img src="https://www.gffc-akademie.de/files/theme/img/gffc_logo.png" alt="GFFC Logo" class="gffc-logo">
          <div class="brand-text">
            <span class="logo-text">Patient Outcome</span>
            <span class="subtitle">Patient reported outcome measure</span>
          </div>
        </RouterLink>
        <v-spacer></v-spacer>
        <v-btn :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'" text="" slim
               @click="toggleTheme"></v-btn>
        <LanguageSelector />
        <!-- Notifications Dropdown - only show when there are notifications -->
        <v-menu v-if="notifierStore.notifications.length > 0">
          <template #activator="{ props }">
            <v-btn icon v-bind="props">
              <v-icon>mdi-bell</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item v-for="(notification, index) in notifierStore.notifications" :key="index">
              <v-list-item-title :class="`text-${notification.type}`">
                {{ notification.message }} - <span class="text-muted">{{ formatDateTime(notification.time) }}</span>
              </v-list-item-title>
            </v-list-item>
        <v-btn icon slim @click="editUserSettings"><v-icon>mdi-account</v-icon></v-btn>
        <v-btn icon slim @click="logout"><v-icon>mdi-logout</v-icon></v-btn>
        <!-- Language selector component (shows current language + flag) -->
        <!-- The interactive menu moved into LanguageSelector.vue -->

        <!-- Show role switcher for kiosk/doctor users, logout for others -->
        <!-- <role-switcher v-if="isKioskOrDoctor" class="ml-2" />
        <v-btn v-else icon slim @click="logout"><v-icon>mdi-logout</v-icon></v-btn> -->

      </v-app-bar>
    </template>

    <!-- For kiosk users without navbar, show role switcher in top-right corner -->
    <!-- <div
         v-if="userStore.isAuthenticated() && userStore.isKioskUser()"
         class="kiosk-role-switcher">
      <role-switcher />
    </div> -->

    <v-main class="app-main-content">
      <RouterView />
    </v-main>

    <!-- App Footer -->
    <AppFooter />
  </v-app>
  <EditUserSettingsDialog :key="showEditUserSettingsKey" v-model:show="showEditUserSettings" />
</template>

<style scoped>
.app-main-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
}

@media (min-width: 1024px) {
  .v-app-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
  }
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 12px;
  text-decoration: none;
  color: inherit;
}

.navbar-brand:hover {
  opacity: 0.9;
}

.gffc-logo {
  height: 40px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
  display: block;
}

.subtitle {
  font-size: 12px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
  display: block;
}

/* Hide text on small screens, only show logo */
@media (max-width: 599px) {
  .navbar-brand {
    display: none;
  }
}

.logo-link {
  font-size: 18px;
  font-weight: 600;
  color: white;
  text-decoration: none;
  display: block;
}

.logo-link:hover {
  opacity: 0.9;
}
</style>
