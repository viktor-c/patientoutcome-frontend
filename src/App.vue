<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ref, computed } from 'vue'
import LanguageSelector from '@/components/LanguageSelector.vue'
import RoleSwitcher from '@/components/RoleSwitcher.vue'
import { useNotifierStore, useUserStore } from '@/stores/'

import AppAlert from '@/components/AppAlert.vue'
import { EditUserSettingsDialog } from '@/components/dialogs/';

const { locale, t } = useI18n()

const theme = ref('light')
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

// LanguageSelector component handles locales and flags

const isDev = import.meta.env.MODE === 'development'

// Access notifier store
const notifierStore = useNotifierStore()
const userStore = useUserStore()
const router = useRouter()

const showEditUserSettingsKey = ref(0);

const shouldShowNavBar = computed(() => userStore.isAuthenticated() && !userStore.isKioskUser())
const isKioskOrDoctor = computed(() => {
  const roles = userStore.roles || []
  return roles.includes('kiosk') || roles.includes('doctor')
})

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
            <v-list-item :to="{ name: 'kioskassignments' }">
              <template #prepend>
                <v-icon>mdi-monitor-dashboard</v-icon>
              </template>
              <v-list-item-title>{{ t('dashboard.kioskAssignments') }}</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="userStore.hasRole('developer')" :to="{ name: 'activitylog' }">
              <template #prepend>
                <v-icon>mdi-text-box-multiple</v-icon>
              </template>
              <v-list-item-title>Activity Log</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="userStore.hasRole('developer')" :to="{ name: 'statistics', params: { caseId: '677da5d8cb4569ad1c65515f' } }">
              <template #prepend>
                <v-icon>mdi-chart-line</v-icon>
              </template>
              <v-list-item-title>GFFC Statistics</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-toolbar-title>
          <RouterLink to="/">Patient Outcome</RouterLink>
        </v-toolbar-title>
        <!-- <RouterLink to="/patients">Patients</RouterLink> -->
        <template v-if="isDev">
          <RouterLink to="/testing">Testing</RouterLink>
        </template>
        <v-spacer></v-spacer>
        <v-btn :prepend-icon="theme === 'light' ? 'mdi-weather-sunny' : 'mdi-weather-night'" text="" slim
               @click="toggleTheme"></v-btn>
        <LanguageSelector />
        <!-- Notifications Dropdown -->
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon v-bind="props" :disabled="notifierStore.notifications.length ? false : true">
              <v-icon>mdi-bell</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item v-for="(notification, index) in notifierStore.notifications" :key="index">
              <v-list-item-title :class="`text-${notification.type}`">
                {{ notification.message }} - <span class="text-muted">{{ formatDateTime(notification.time) }}</span>
              </v-list-item-title>
            </v-list-item>
            <v-list-item>
              <v-btn color="error" @click="notifierStore.clearNotifications">{{ t('appBar.clear_notifications')
                }}</v-btn>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn icon slim @click="editUserSettings"><v-icon>mdi-account</v-icon></v-btn>

        <!-- Language selector component (shows current language + flag) -->
        <!-- The interactive menu moved into LanguageSelector.vue -->
        
        <!-- Show role switcher for kiosk/doctor users, logout for others -->
        <role-switcher v-if="isKioskOrDoctor" class="ml-2" />
        <v-btn v-else icon slim @click="logout"><v-icon>mdi-logout</v-icon></v-btn>

      </v-app-bar>
    </template>

    <!-- For kiosk users without navbar, show role switcher in top-right corner -->
    <div
      v-if="userStore.isAuthenticated() && userStore.isKioskUser()"
      class="kiosk-role-switcher"
    >
      <role-switcher />
    </div>

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
  <EditUserSettingsDialog :key="showEditUserSettingsKey" v-model:show="showEditUserSettings" />
</template>

<style scoped>
@media (min-width: 1024px) {
  .v-app-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
  }
}

.kiosk-role-switcher {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
}
</style>
